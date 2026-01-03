@echo off
@echo off
@echo off
echo.
echo  ***********************************
echo  *                                 *
echo  *      ####  ####   #   #         *
echo  *     #      #   #  ##  #         *
echo  *     # ###  ####   # # #         *
echo  *     #   #  #      #  ##         *
echo  *      ###   #      #   #         *
echo  *                                 *
echo  *       PROMPT  LIBRARY           *
echo  *                                 *
echo  ***********************************
echo.
REM Check if node_modules exists
if not exist "node_modules\" (
    echo Node modules not found. Installing dependencies...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install dependencies!
        echo Please make sure Node.js and npm are installed.
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed successfully!
    echo.
)

echo Starting GPN PROMPT  LIBRARY server...
echo.
echo The application will be available at:
echo Local:http://localhost:3000/
echo.
echo Opening browser in 3 seconds...
echo Press Ctrl+C to stop the server.
echo.

REM Start the dev server in the background and open browser after delay
start /B npm run dev

REM Wait 3 seconds for server to start
timeout /t 3 /nobreak >nul

REM Open browser
start http://localhost:3000

REM Keep the window open to show server logs
echo.
echo Browser opened! Server is running...
echo.
pause
