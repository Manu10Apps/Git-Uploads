@echo off
cd "c:\Users\Administrator\Desktop\Git Uploads"
for /f "delims=" %%i in ('git rev-parse --git-dir') do set GIT_DIR=%%i

REM Add GitHub to known_hosts automatically
if not exist "%USERPROFILE%\.ssh\known_hosts" (
    mkdir "%USERPROFILE%\.ssh" 2>nul
    type nul > "%USERPROFILE%\.ssh\known_hosts"
)

REM Push to GitHub
set GIT_SSH_COMMAND=ssh -o StrictHostKeyChecking=accept-new
git push -u origin main

pause
