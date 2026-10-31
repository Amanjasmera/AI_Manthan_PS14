@echo off
title Push RetinaVision-AI to GitHub
echo ==========================================================
echo Pushing project to https://github.com/Amanjasmera/AI_Manthan_PS14.git
echo ==========================================================
echo.
cd /d "%~dp0"
git remote set-url origin https://github.com/Amanjasmera/AI_Manthan_PS14.git
git add .
git commit -m "feat: production-ready backend, SQLite database, IQA billing protection, and bilingual reports for PS-14"
git push -u origin main
echo.
echo ==========================================================
echo Complete!
echo ==========================================================
pause
