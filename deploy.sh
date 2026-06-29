#!/bin/bash

# Set CDK_DEPLOY_REGION from parameter or default to us-east-1
CDK_DEPLOY_REGION=${1:-us-east-1}
export CDK_DEPLOY_REGION

# Cognito authentication prompt
echo ""
echo "=== Authentication Configuration ==="
read -p "Do you want to enable Cognito authentication? (y/n) [n]: " ENABLE_COGNITO
ENABLE_COGNITO=${ENABLE_COGNITO:-n}

COGNITO_CONTEXT=""
if [[ "$ENABLE_COGNITO" =~ ^[Yy]$ ]]; then
    read -p "Allow all email domains to register, or restrict to specific domains? (all/restrict) [all]: " DOMAIN_CHOICE
    DOMAIN_CHOICE=${DOMAIN_CHOICE:-all}
    
    if [[ "$DOMAIN_CHOICE" == "restrict" ]]; then
        read -p "Enter allowed email domains (comma-separated, e.g. example.com,corp.com): " ALLOWED_DOMAINS
        if [ -z "$ALLOWED_DOMAINS" ]; then
            echo "❌ No domains provided. Exiting."
            exit 1
        fi
        COGNITO_CONTEXT="-c enableCognito=true -c allowedEmailDomains=$ALLOWED_DOMAINS"
    else
        COGNITO_CONTEXT="-c enableCognito=true -c allowedEmailDomains=*"
    fi
    echo "✅ Cognito authentication will be enabled."
else
    COGNITO_CONTEXT="-c enableCognito=false"
    echo "✅ Deploying without Cognito authentication."
fi
echo ""

# Install/sync all dependencies (creates venv automatically if needed)
echo "Syncing dependencies..."
uv sync

# Build the React-based web application
npm install --prefix ui/
npm run build --prefix ui/

# Download python dependencies required for creating the AWS Lambda Layer
rm -rf layers/python/
mkdir layers/python/
uv pip install --python-platform x86_64-unknown-linux-gnu --only-binary=:all: -r layers/requirements.txt --target layers/python/.

# Copy custom library "connectionsinsights" to lambda layer / lambda image / ecs image
cp -r lib/connectionsinsights layers/python/.
cp -r lib/connectionsinsights lambda-ecs/step-function/01.chunk-document/.
cp -r lib/connectionsinsights lambda-ecs/step-function/06.insert-vertices-edges/.
cp -r lib/connectionsinsights lambda-ecs/api/generate-news/.
cp -r lib/connectionsinsights lambda-ecs/api/entities/.
cp -r lib/connectionsinsights lambda-ecs/api/purge-entities/.
cp -r lib/connectionsinsights lambda-ecs/api/purge-news/.
cp -r lib/connectionsinsights lambda-ecs/api/relationships/.
cp -r lib/connectionsinsights lambda-ecs/s3_pipeline/process-news/.

echo "Deploying CDK stack to region: $CDK_DEPLOY_REGION"
uv run cdk deploy --all --require-approval never $COGNITO_CONTEXT
DEPLOY_EXIT_CODE=$?

# Remove copied connectionsinsights files
rm -rf layers/python/connectionsinsights
rm -rf lambda-ecs/step-function/01.chunk-document/connectionsinsights
rm -rf lambda-ecs/step-function/06.insert-vertices-edges/connectionsinsights
rm -rf lambda-ecs/api/generate-news/connectionsinsights
rm -rf lambda-ecs/api/entities/connectionsinsights
rm -rf lambda-ecs/api/purge-entities/connectionsinsights
rm -rf lambda-ecs/api/purge-news/connectionsinsights
rm -rf lambda-ecs/api/relationships/connectionsinsights
rm -rf lambda-ecs/s3_pipeline/process-news/connectionsinsights

if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
    echo "✅ CDK deployment completed successfully!"

    # Invalidate CloudFront cache
    DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[?contains(DomainName, 'connectionsinsightswebap')]].Id | [0]" --output text 2>/dev/null)
    if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
        echo "Invalidating CloudFront cache for distribution: $DISTRIBUTION_ID"
        aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*" > /dev/null 2>&1
        echo "✅ CloudFront cache invalidation initiated"
    else
        echo "⚠️  Could not find CloudFront distribution for cache invalidation"
    fi
else
    echo "❌ CDK deployment failed!"
    exit 1
fi
