if [[ $# -eq 0 || $# -eq 1 ]]; then
    if [[ $# -eq 0 ]]; then
        export CDK_DEPLOY_REGION="us-east-1" #default to us-east-1
    else
        export CDK_DEPLOY_REGION=$1
    fi
    echo "Deploying main application stack in $CDK_DEPLOY_REGION"
    echo "Deploying web application stack in us-east-1"
    uv run cdk deploy --all --require-approval never
    exit $?
else
    echo 1>&2 "Expecting one input parameter; please provide region (e.g. us-east-1) to deploy stack to."
    exit 1
fi