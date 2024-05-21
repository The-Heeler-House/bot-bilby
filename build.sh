echo "Building..."
mkdir -p dist/
cp -r src/Assets/ dist/Assets/
npx tsc
echo "Done!"