#!/bin/bash

# Set CDK_DEPLOY_REGION from parameter or default to us-east-1
CDK_DEPLOY_REGION=${1:-us-east-1}
export CDK_DEPLOY_REGION

echo "Deploying CDK stack to region: $CDK_DEPLOY_REGION"
uv run cdk deploy --all --require-approval never

if [ $? -eq 0 ]; then
    echo "✅ CDK deployment completed successfully!"
else
    echo "❌ CDK deployment failed!"
    exit 1
fi