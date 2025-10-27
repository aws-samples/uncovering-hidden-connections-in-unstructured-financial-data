if [[ $# -eq 1 ]]; then
    export CDK_DEPLOY_REGION=$1
    echo "Destroying main application stack in $CDK_DEPLOY_REGION"
    echo "Destroying web application stack in us-east-1"
    uv run cdk destroy --all --require-approval never
    exit $?
else
    echo 1>&2 "Expecting one input parameter; please provide region (e.g. us-east-1) to deploy stack to."
    exit 1
fi