# To install python dependencies for CDK
pip install -r requirements.txt

# To build the React-based web application:
npm install --prefix ui/
npm run build --prefix ui/

# To download python dependencies required for creating the AWS Lambda Layer:
rm -rf layers/python/
mkdir layers/python/
pip install --platform manylinux2014_x86_64 --only-binary=:all: -r layers/requirements.txt -t layers/python/.

# To copy custom library "connectionsinsights" to lambda layer / lambda image / ecs image 
cp -r lib/connectionsinsights layers/python/.
cp -r lib/connectionsinsights lambda-ecs/step-function/01.chunk-document/.
cp -r lib/connectionsinsights lambda-ecs/step-function/06.insert-vertices-edges/.
cp -r lib/connectionsinsights lambda-ecs/api/generate-news/.
cp -r lib/connectionsinsights lambda-ecs/api/entities/.
cp -r lib/connectionsinsights lambda-ecs/s3_pipeline/process-news/.
