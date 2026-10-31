"""
RetinaVision-AI: Grad-CAM Explainability Module
Gradient-weighted Class Activation Mapping for EfficientNet-B0 retinal fundus classification.

Implements:
  1. Standard Grad-CAM (Selvaraju et al. 2017) targeting backbone.blocks[-1]
  2. Absolute-Gradient Grad-CAM fallback when all weighted activations are negative
  3. EigenCAM fallback when gradient flow is completely degenerate
  4. Gaussian-smoothed heatmap compositing for clinical-quality overlay

References:
  - Selvaraju et al. "Grad-CAM: Visual Explanations from Deep Networks via
    Gradient-based Localization." ICCV 2017.
  - Wang et al. "Score-CAM: Score-Weighted Visual Explanations for Convolutional
    Neural Networks." CVPR Workshop 2020.
"""

import cv2
import numpy as np
import torch
import torch.nn.functional as F
from typing import Tuple, Optional


class RealGradCAM:
    """
    Gradient-weighted Class Activation Mapping (Grad-CAM)
    Targeting EfficientNet-B0's final convolutional block (`model.backbone.blocks[-1]`).

    Implements three-tier fallback strategy:
      1. Standard Grad-CAM: Global Average Pooled (GAP) gradients × activations
      2. AbsGrad-CAM: When all standard CAM values are negative post-ReLU
      3. EigenCAM: SVD-based spatial pattern extraction when gradients are degenerate
    """

    def __init__(self, model: torch.nn.Module, target_layer: torch.nn.Module):
        self.model = model
        self.model.eval()
        self.gradients: Optional[torch.Tensor] = None
        self.activations: Optional[torch.Tensor] = None
        self._hooks = []

        h1 = target_layer.register_forward_hook(self._save_activation)
        h2 = target_layer.register_full_backward_hook(self._save_gradient)
        self._hooks.extend([h1, h2])

    def _save_activation(self, module, input, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate(self, input_tensor: torch.Tensor, class_idx: Optional[int] = None) -> np.ndarray:
        """
        Computes the gradient of the predicted class score with respect to
        the target convolutional feature maps. Returns a normalized 2D CAM
        array in [0.0, 1.0].

        Falls back to AbsGrad-CAM then EigenCAM if standard Grad-CAM produces
        a degenerate (all-zero) heatmap.
        """
        output = self.model(input_tensor)

        if class_idx is None:
            class_idx = int(output.argmax(dim=1).item())

        self.model.zero_grad()
        one_hot = torch.zeros_like(output)
        one_hot[0, class_idx] = 1.0
        output.backward(gradient=one_hot)

        if self.gradients is None or self.activations is None:
            return np.zeros((input_tensor.shape[2], input_tensor.shape[3]), dtype=np.float32)

        # --- Strategy 1: Standard Grad-CAM ---
        weights = self.gradients.mean(dim=[2, 3], keepdim=True)  # (1, C, 1, 1)
        cam = (weights * self.activations).sum(dim=1, keepdim=True)
        cam_relu = F.relu(cam)
        cam_np = cam_relu.squeeze().cpu().numpy()

        if cam_np.max() > 1e-8:
            cam_np = (cam_np - cam_np.min()) / (cam_np.max() - cam_np.min() + 1e-12)
            return cam_np

        # --- Strategy 2: AbsGrad-CAM (handles all-negative weighted activations) ---
        weights_abs = torch.abs(self.gradients).mean(dim=[2, 3], keepdim=True)
        cam_abs = (weights_abs * self.activations).sum(dim=1, keepdim=True)
        cam_abs_np = cam_abs.squeeze().cpu().numpy()
        cam_abs_np = np.abs(cam_abs_np)

        if cam_abs_np.max() > 1e-8:
            cam_abs_np = (cam_abs_np - cam_abs_np.min()) / (cam_abs_np.max() - cam_abs_np.min() + 1e-12)
            return cam_abs_np

        # --- Strategy 3: EigenCAM (gradient-free, SVD on activation maps) ---
        act_2d = self.activations.squeeze(0).view(self.activations.shape[1], -1)  # (C, H*W)
        try:
            _, _, Vh = torch.linalg.svd(act_2d, full_matrices=False)
            h_feat = self.activations.shape[2]
            w_feat = self.activations.shape[3]
            cam_eigen = Vh[0].view(h_feat, w_feat).cpu().numpy()
            cam_eigen = np.abs(cam_eigen)
            if cam_eigen.max() > 1e-8:
                cam_eigen = (cam_eigen - cam_eigen.min()) / (cam_eigen.max() - cam_eigen.min() + 1e-12)
                return cam_eigen
        except Exception:
            pass

        # Final fallback: uniform medium activation
        h_feat = self.activations.shape[2]
        w_feat = self.activations.shape[3]
        return np.full((h_feat, w_feat), 0.5, dtype=np.float32)

    def cleanup(self):
        for h in self._hooks:
            h.remove()
        self._hooks.clear()


def generate_gradcam_visuals(
    model: torch.nn.Module,
    image_rgb_160: np.ndarray,
    target_dim: Tuple[int, int] = (512, 512),
    class_idx: Optional[int] = None
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Executes Grad-CAM and returns:
      1. heatmap_rgb: 3-channel colorized JET heatmap resized to target_dim
         (blue=low activation, red=high activation indicating pathological regions)
      2. overlay_rgb: 55/45% alpha-blended overlay on original preprocessed retina

    Applies Gaussian smoothing to the raw CAM for clinical-quality visualization.
    Uses three-tier fallback: Grad-CAM → AbsGrad-CAM → EigenCAM.
    """
    # 1. ImageNet normalize
    img_norm = image_rgb_160.astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    img_norm = (img_norm - mean) / std

    device = next(model.parameters()).device
    tensor = torch.from_numpy(img_norm).permute(2, 0, 1).unsqueeze(0).float().to(device)

    # 2. Target layer: last block of EfficientNet-B0 backbone
    target_layer = model.backbone.blocks[-1]
    explainer = RealGradCAM(model, target_layer)

    try:
        cam_raw = explainer.generate(tensor, class_idx=class_idx)
    finally:
        explainer.cleanup()

    # 3. Gaussian smoothing for clinical-quality spatial coherence
    cam_smooth = cv2.GaussianBlur(cam_raw, (0, 0), sigmaX=1.5)
    cam_smooth = np.clip(cam_smooth, 0, 1)

    # 4. Resize CAM to high-resolution target_dim
    cam_resized = cv2.resize(cam_smooth, target_dim, interpolation=cv2.INTER_CUBIC)
    cam_u8 = np.uint8(255 * np.clip(cam_resized, 0, 1))

    # 5. Apply JET colormap: blue=low activation, red=high activation (pathological regions)
    heatmap_bgr = cv2.applyColorMap(cam_u8, cv2.COLORMAP_JET)
    heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB)

    # 6. High-resolution base image for overlay
    base_rgb = cv2.resize(image_rgb_160, target_dim, interpolation=cv2.INTER_CUBIC)

    # 7. Weighted composite overlay: 55% fundus + 45% heatmap
    overlay_rgb = cv2.addWeighted(base_rgb, 0.55, heatmap_rgb, 0.45, 0)

    return heatmap_rgb, overlay_rgb


def generate_gradcam_heatmap_only(
    model: torch.nn.Module,
    image_rgb_160: np.ndarray,
    target_dim: Tuple[int, int] = (512, 512),
    class_idx: Optional[int] = None
) -> np.ndarray:
    """
    Returns only the pure Grad-CAM heatmap (no overlay) in RGB format.
    Useful for side-by-side comparison with the original fundus image.
    """
    heatmap_rgb, _ = generate_gradcam_visuals(model, image_rgb_160, target_dim, class_idx)
    return heatmap_rgb
