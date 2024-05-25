echo "Building..."
mkdir -p dist/
rm -rf dist/Assets/
cp -r src/Assets/ dist/Assets/
npx tsc
echo "Done!"