@echo off
cd "c:\Users\Administrator\Desktop\Git Uploads"
for /f "delims=" %%i in ('git rev-parse --git-dir') do set GIT_DIR=%%i

REM Add GitHub to known_hosts automatically
if not exist "%USERPROFILE%\.ssh\known_hosts" (
    mkdir "%USERPROFILE%\.ssh" 2>nul
    type nul > "%USERPROFILE%\.ssh\known_hosts"
)

REM Auto-commit any new uploaded images so they survive deployment rebuilds
git add public/uploads/ 2>nul
for /f %%a in ('git diff --cached --name-only -- public/uploads/') do (
    echo Committing new uploaded images...
    git commit -m "Add new uploaded article images"
    goto :push
)

REM Auto-commit any other staged changes
for /f %%a in ('git diff --cached --name-only') do (
    goto :push
)

REM If nothing is staged, stage and commit everything
git add -A
for /f %%a in ('git diff --cached --name-only') do (
    echo Committing all changes...
    git commit -m "Update website code and assets"
    goto :push
)

echo No changes to push.
goto :end

:push
REM Push to GitHub
set GIT_SSH_COMMAND=ssh -o StrictHostKeyChecking=accept-new
git push -u origin main

:end
pause
