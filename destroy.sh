#!/bin/bash

echo "Destroying CDK stack..."
uv run cdk destroy --all --require-approval never

if [ $? -eq 0 ]; then
    echo "✅ CDK destruction completed successfully!"
else
    echo "❌ CDK destruction failed!"
    exit 1
fi