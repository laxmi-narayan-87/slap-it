@echo off
echo ========================================================
echo        Starting Slap-a-Face Stress Relief App
echo ========================================================
echo Serving at: http://localhost:3000
echo.
start http://localhost:3000
python -m http.server 3000
pause
