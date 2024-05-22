@echo off
echo "Building..."
if exist dist\Assets rmdir /s /q dist\Assets
if not exist dist mkdir dist
xcopy /E /I /Y src\Assets dist\Assets
npx tsc
echo "Done!"