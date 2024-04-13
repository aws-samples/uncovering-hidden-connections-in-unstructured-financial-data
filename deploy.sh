if [[ $# -eq 1 ]]; then
    export CDK_DEPLOY_REGION=$1
    echo "Deploying main application stack in $CDK_DEPLOY_REGION"
    echo "Deploying web application stack in us-east-1"
    cdk deploy --all --require-approval never
    exit $?
else
    echo 1>&2 "Expecting one input parameter; please provide region (e.g. us-east-1) to deploy stack to."
    exit 1
fi