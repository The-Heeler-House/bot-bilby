echo "Building..."
rm -rf dist/
mkdir -p dist/
cp -r src/Assets/ dist/Assets/
npx tsc
echo "Done!"