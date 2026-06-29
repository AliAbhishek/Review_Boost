@echo off
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo Starting ReviewBoost...
python main.py
pause
