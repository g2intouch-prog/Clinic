@echo off
echo ==========================================
echo MEDIFLOW GITHUB INITIALIZATION WORKFLOW
echo ==========================================
echo.

:: Check if git is initialized
if not exist .git (
    echo [1/4] Git repository not found. Initializing git...
    git init
) else (
    echo [1/4] Git repository already initialized.
)

echo.
echo [2/4] Staging and committing clinic app files...
git add .
git commit -m "Initial commit: MediFlow Multi-Tenant PWA"

echo.
echo [3/4] Renaming default branch to main...
git branch -M main

echo.
echo [4/4] Configure remote repository link...
set /p github_url="Paste your GitHub Repository URL (e.g. https://github.com/username/repo-name.git): "
if "%github_url%"=="" (
    echo [Error] GitHub URL cannot be blank.
    pause
    exit /b
)

echo.
echo Linking repository URL to remote origin...
git remote remove origin >nul 2>&1
git remote add origin %github_url%

echo.
echo Pushing code to GitHub...
git push -u origin main

echo.
echo ==========================================
echo Setup Completed! Check your GitHub page.
echo ==========================================
pause
