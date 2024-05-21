@echo off
echo "Building..."
if not exist dist mkdir dist
xcopy /E /I /Y src\Assets dist\Assets
npx tsc
echo "Done!"