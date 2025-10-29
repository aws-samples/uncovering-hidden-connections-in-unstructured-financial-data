# Install/sync all dependencies (creates venv automatically if needed)
echo "Syncing dependencies..."
uv sync

# To build the React-based web application (now using Vite):
npm install --prefix ui/
npm run build --prefix ui/

# To download python dependencies required for creating the AWS Lambda Layer:
rm -rf layers/python/
mkdir layers/python/
# Use uv pip for lambda layer creation to maintain consistency
uv pip install --python-platform x86_64-unknown-linux-gnu --only-binary=:all: -r layers/requirements.txt --target layers/python/.

# To copy custom library "connectionsinsights" to lambda layer / lambda image / ecs image 
cp -r lib/connectionsinsights layers/python/.
cp -r lib/connectionsinsights lambda-ecs/step-function/01.chunk-document/.
cp -r lib/connectionsinsights lambda-ecs/step-function/06.insert-vertices-edges/.
cp -r lib/connectionsinsights lambda-ecs/api/generate-news/.
cp -r lib/connectionsinsights lambda-ecs/api/entities/.
cp -r lib/connectionsinsights lambda-ecs/api/relationships/.
cp -r lib/connectionsinsights lambda-ecs/s3_pipeline/process-news/.
