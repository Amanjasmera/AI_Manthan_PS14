"""
Service layer re-export of PDFReportGenerator for backwards compatibility.
Centralized implementation lives in app.core.report_generator.
"""
from app.core.report_generator import PDFReportGenerator

__all__ = ["PDFReportGenerator"]
