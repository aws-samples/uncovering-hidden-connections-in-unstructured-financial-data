from aws_cdk import (
    Duration,
    Stack,
    aws_ec2 as ec2,
    aws_neptune_alpha as neptune, # pip install aws-cdk.aws-neptune-alpha
    aws_dynamodb as dynamodb,
    RemovalPolicy,
    aws_s3 as s3,
    CfnOutput,
    aws_sqs as sqs,
    aws_lambda as _lambda,
    aws_iam as iam,
    aws_s3_notifications as s3_notifications,
    aws_lambda_event_sources as lambda_event_sources,
    aws_apigateway as apigateway,
    aws_stepfunctions as sfn,
    aws_stepfunctions_tasks as tasks,
    aws_events_targets as targets,
    aws_events as events,
    Stack,
    aws_logs as logs,
    aws_wafv2 as waf,
    aws_ecs as ecs,
    aws_ecr_assets as ecr_assets,
)
from constructs import Construct

class CdkStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        project_name = self.stack_name

        # Helper method to print to Cloudformation output
        def output(key, value):
            CfnOutput(self, key, value=value, description=key)
            print(f"{key} = {value}")

        








        # ███    ██ ███████ ████████ ██     ██  ██████  ██████  ██   ██ ██ ███    ██  ██████  
        # ████   ██ ██         ██    ██     ██ ██    ██ ██   ██ ██  ██  ██ ████   ██ ██       
        # ██ ██  ██ █████      ██    ██  █  ██ ██    ██ ██████  █████   ██ ██ ██  ██ ██   ███ 
        # ██  ██ ██ ██         ██    ██ ███ ██ ██    ██ ██   ██ ██  ██  ██ ██  ██ ██ ██    ██ 
        # ██   ████ ███████    ██     ███ ███   ██████  ██   ██ ██   ██ ██ ██   ████  ██████  

        # Create VPC with two private subnets
        vpc = ec2.Vpc(self, f"{project_name}-MyVpc",
            ip_addresses=ec2.IpAddresses.cidr("10.0.0.0/16"),
            max_azs=2,
            nat_gateways=0
        )
        vpc.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Security Group - Lambda
        sg_lambda = ec2.SecurityGroup(
            self, f"{project_name}-lambda-security-group",
            security_group_name=f"{project_name}-lambda-security-group",
            vpc=vpc,
        )
        sg_lambda.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Security Group - Neptune
        sg_neptune = ec2.SecurityGroup(
            self, f"{project_name}-neptune-security-group",
            security_group_name=f"{project_name}-neptune-security-group",
            vpc=vpc,
        )
        sg_neptune.apply_removal_policy(RemovalPolicy.DESTROY)

        # Add security group rules 
        sg_neptune.add_ingress_rule(ec2.Peer.ipv4(vpc.vpc_cidr_block), connection=ec2.Port.tcp(8182))

        # Create Security Group - VPC Endpoint
        sg_vpc_endpoint = ec2.SecurityGroup(
            self, f"{project_name}-vpc-endpoint-security-group",
            security_group_name=f"{project_name}-vpc-endpoint-security-group",
            vpc=vpc,
        )
        sg_vpc_endpoint.apply_removal_policy(RemovalPolicy.DESTROY)
        sg_vpc_endpoint.add_ingress_rule(ec2.Peer.ipv4(vpc.vpc_cidr_block), connection=ec2.Port.tcp(443))

        # Add a flow log to the VPC
        vpc_flow_log_group = logs.LogGroup(self, f"{project_name}-MyVpc-Flow-Log-Group", 
            log_group_name=f"/aws/vpc/{project_name}-flowlogs",
            removal_policy=RemovalPolicy.DESTROY
        )
        vpc_flow_log = ec2.FlowLog(self, f"{project_name}-MyVpc-Flow-Log",
            resource_type=ec2.FlowLogResourceType.from_vpc(vpc),
            destination=ec2.FlowLogDestination.to_cloud_watch_logs(vpc_flow_log_group)
        )

        # Create VPC Gateway Endpoints for DynamoDB
        dynamodb_endpoint = vpc.add_gateway_endpoint(f"{project_name}-DynamoDbEndpoint",service=ec2.GatewayVpcEndpointAwsService.DYNAMODB, )
        dynamodb_endpoint.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create VPC Gateway Endpoints for S3
        s3_endpoint = vpc.add_gateway_endpoint(f"{project_name}-S3Endpoint",service=ec2.GatewayVpcEndpointAwsService.S3,)
        s3_endpoint.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create VPC Interface Endpoints for Bedrock Runtime
        interface_vpc_endpoint = ec2.InterfaceVpcEndpoint(self, f"{project_name}-BedrockInterfaceVpcEndpoint",
            vpc=vpc,
            service=ec2.InterfaceVpcEndpointService(f"com.amazonaws.{self.region}.bedrock-runtime", 443),
            private_dns_enabled=True,
            security_groups=[sg_vpc_endpoint]
        )
        interface_vpc_endpoint.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create VPC Interface Endpoints for ECR API
        ecr_api_interface_vpc_endpoint = ec2.InterfaceVpcEndpoint(self, f"{project_name}-ecr.api",
            vpc=vpc,
            service=ec2.InterfaceVpcEndpointService(f"com.amazonaws.{self.region}.ecr.api", 443),
            private_dns_enabled=True,
            security_groups=[sg_vpc_endpoint]
        )
        ecr_api_interface_vpc_endpoint.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create VPC Interface Endpoints for ECR DKR
        ecr_dkr_interface_vpc_endpoint = ec2.InterfaceVpcEndpoint(self, f"{project_name}-ecr.dkr",
            vpc=vpc,
            service=ec2.InterfaceVpcEndpointService(f"com.amazonaws.{self.region}.ecr.dkr", 443),
            private_dns_enabled=True,
            security_groups=[sg_vpc_endpoint]
        )
        ecr_dkr_interface_vpc_endpoint.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create VPC Interface Endpoints for step function state machine
        states_interface_vpc_endpoint = ec2.InterfaceVpcEndpoint(self, f"{project_name}-states",
            vpc=vpc,
            service=ec2.InterfaceVpcEndpointService(f"com.amazonaws.{self.region}.states", 443),
            private_dns_enabled=True,
            security_groups=[sg_vpc_endpoint]
        )
        states_interface_vpc_endpoint.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create VPC Interface Endpoints for Cloudwatch Logs
        logs_interface_vpc_endpoint = ec2.InterfaceVpcEndpoint(self, f"{project_name}-logs",
            vpc=vpc,
            service=ec2.InterfaceVpcEndpointService(f"com.amazonaws.{self.region}.logs", 443),
            private_dns_enabled=True,
            security_groups=[sg_vpc_endpoint]
        )
        logs_interface_vpc_endpoint.apply_removal_policy(RemovalPolicy.DESTROY)





        # ██████   █████  ████████  █████      ███████ ████████  ██████  ██████  ███████ 
        # ██   ██ ██   ██    ██    ██   ██     ██         ██    ██    ██ ██   ██ ██      
        # ██   ██ ███████    ██    ███████     ███████    ██    ██    ██ ██████  █████   
        # ██   ██ ██   ██    ██    ██   ██          ██    ██    ██    ██ ██   ██ ██      
        # ██████  ██   ██    ██    ██   ██     ███████    ██     ██████  ██   ██ ███████ 

        # Create serverless neptune cluster
        neptune_cluster = neptune.DatabaseCluster(self, f"{project_name}-NeptuneCluster",
            vpc=vpc,
            instance_type=neptune.InstanceType.SERVERLESS,
            serverless_scaling_configuration=neptune.ServerlessScalingConfiguration(
                min_capacity=1,
                max_capacity=5
            ),
            iam_authentication=True,
            security_groups=[sg_neptune],
            backup_retention=Duration.days(30),
            auto_minor_version_upgrade=True,
            removal_policy=RemovalPolicy.DESTROY,
            instances=2,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_ISOLATED)
        )
        # Output the Cluster Endpoint
        output("Neptune Cluster Endpoint", neptune_cluster.cluster_endpoint.socket_address)

        # Create DynamoDB table for ingestion
        table_name = f"{project_name}-ingestion"
        ddbtbl_ingestion = dynamodb.Table(self, id=table_name,
            table_name=table_name,
            partition_key=dynamodb.Attribute(name="id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True,
            time_to_live_attribute="ttl_timestamp",
            removal_policy=RemovalPolicy.DESTROY
        )
        output("DynamoDB table for ingestion", ddbtbl_ingestion.table_name)

        # Create DynamoDB table for news
        table_name = f"{project_name}-news"
        ddbtbl_news = dynamodb.Table(self, id=table_name,
            table_name=table_name,
            partition_key=dynamodb.Attribute(name="id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True,
            removal_policy=RemovalPolicy.DESTROY
        )
        output("DynamoDB table for news", ddbtbl_news.table_name)

        # Create DynamoDB table for settings
        table_name = f"{project_name}-settings"
        ddbtbl_settings = dynamodb.Table(self, id=table_name,
            table_name=table_name,
            partition_key=dynamodb.Attribute(name="id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True,
            removal_policy=RemovalPolicy.DESTROY
        )
        output("DynamoDB table for settings", ddbtbl_settings.table_name)

        # Create DynamoDB table for prompt history
        table_name = f"{project_name}-prompts"
        ddbtbl_prompts = dynamodb.Table(self, id=table_name,
            table_name=table_name,
            partition_key=dynamodb.Attribute(name="id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True,
            time_to_live_attribute="ttl_timestamp",
            removal_policy=RemovalPolicy.DESTROY
        )
        output("DynamoDB table for prompts", ddbtbl_prompts.table_name)

        # Create S3 Bucket for access logging - ingestion
        s3_server_access_log_bucket_ingestion = s3.Bucket(self, f"{project_name}-server-access-log-bucket-ingestion",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            enforce_ssl=True,
            access_control=s3.BucketAccessControl.LOG_DELIVERY_WRITE,
            versioned=True,
        )

        # Create S3 Bucket for access logging - ingestion
        s3_server_access_log_bucket_news = s3.Bucket(self, f"{project_name}-server-access-log-bucket-news",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            enforce_ssl=True,
            access_control=s3.BucketAccessControl.LOG_DELIVERY_WRITE,
            versioned=True,
        )

        # Create S3 Bucket for loading in news
        s3_news_bucket = s3.Bucket(self, f"{project_name}-news-bucket",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            server_access_logs_bucket=s3_server_access_log_bucket_news,
            enforce_ssl=True,
            versioned=True,
        )
        output("News Bucket", f"https://{self.region}.console.aws.amazon.com/s3/buckets/{s3_news_bucket.bucket_name}")

        # Create S3 Bucket for loading in reports
        s3_ingestion_bucket = s3.Bucket(self, f"{project_name}-ingestion-bucket",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            server_access_logs_bucket=s3_server_access_log_bucket_ingestion,
            enforce_ssl=True,
            versioned=True,
        )
        output("Ingestion Bucket", f"https://{self.region}.console.aws.amazon.com/s3/buckets/{s3_ingestion_bucket.bucket_name}")

        
   





        #  ██████  ██    ██ ███████ ██    ██ ███████ 
        # ██    ██ ██    ██ ██      ██    ██ ██      
        # ██    ██ ██    ██ █████   ██    ██ █████   
        # ██ ▄▄ ██ ██    ██ ██      ██    ██ ██      
        #  ██████   ██████  ███████  ██████  ███████ 
                                        
        # Create SQS DLQ
        news_queue_dlq = sqs.Queue(
            self,
            f"{project_name}-news-ingestion-dlq",
            visibility_timeout=Duration.minutes(1),
            removal_policy=RemovalPolicy.DESTROY,
            enforce_ssl=True
        )
        reports_queue_dlq = sqs.Queue(
            self,
            f"{project_name}-reports-ingestion-dlq.fifo",
            visibility_timeout=Duration.minutes(1),
            fifo=True,
            content_based_deduplication=True,
            deduplication_scope=sqs.DeduplicationScope.QUEUE,
            removal_policy=RemovalPolicy.DESTROY,
            enforce_ssl=True
        )

        # Create SQS Queues
        news_queue = sqs.Queue(
            self,
            f"{project_name}-news-ingestion",
            visibility_timeout=Duration.minutes(15),
            removal_policy=RemovalPolicy.DESTROY,
            dead_letter_queue=sqs.DeadLetterQueue(
                max_receive_count=2,
                queue=news_queue_dlq
            ),
            enforce_ssl=True
        )
        reports_queue = sqs.Queue(
            self,
            f"{project_name}-reports-ingestion.fifo",
            visibility_timeout=Duration.minutes(120),
            fifo=True,
            content_based_deduplication=True,
            deduplication_scope=sqs.DeduplicationScope.QUEUE,
            removal_policy=RemovalPolicy.DESTROY,
            dead_letter_queue=sqs.DeadLetterQueue(
                max_receive_count=2,
                queue=reports_queue_dlq
            ),
            enforce_ssl=True
        )




        # ██       █████  ███    ███ ██████  ██████   █████  
        # ██      ██   ██ ████  ████ ██   ██ ██   ██ ██   ██ 
        # ██      ███████ ██ ████ ██ ██████  ██   ██ ███████ 
        # ██      ██   ██ ██  ██  ██ ██   ██ ██   ██ ██   ██ 
        # ███████ ██   ██ ██      ██ ██████  ██████  ██   ██ 
                                                   


        # Create Lambda Layer
        layer_lambda = _lambda.LayerVersion(self, f"{project_name}-layer",
            removal_policy=RemovalPolicy.DESTROY,
            code=_lambda.Code.from_asset("./layers"),
            compatible_architectures=[_lambda.Architecture.X86_64],
            compatible_runtimes=[_lambda.Runtime.PYTHON_3_12]
        )

        # Create Lambda Permission
        role_lambda = iam.Role(self, 
            f"{project_name}-lambda_role",
            role_name=f"{project_name}-lambda_role",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            inline_policies={
                "inline_policy_loggroup": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=["logs:CreateLogGroup"],
                            resources=[f"arn:aws:logs:*:{self.account}:log-group:*"]
                        )
                    ]
                ),
                "inline_policy_logstream": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=["logs:CreateLogStream", "logs:PutLogEvents"],
                            resources=[f"arn:aws:logs:*:{self.account}:log-group:*:log-stream:*"]
                        )
                    ]
                ),
                "inline_policy_readwrite_dynamodb": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "dynamodb:PutItem", 
                                "dynamodb:UpdateItem",
                                "dynamodb:Scan",
                                "dynamodb:Query",
                                "dynamodb:GetItem",
                            ],
                            resources=[
                                ddbtbl_ingestion.table_arn,
                                ddbtbl_news.table_arn,
                                ddbtbl_settings.table_arn,
                                ddbtbl_prompts.table_arn
                            ]
                        )
                    ]
                ),
                "inline_policy_invoke_bedrock": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
                            resources=[
                                f"arn:aws:bedrock:{self.region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0", 
                                f"arn:aws:bedrock:{self.region}::foundation-model/anthropic.claude-v2:1",
                                f"arn:aws:bedrock:{self.region}::foundation-model/amazon.titan-embed-text-v1"
                            ]
                        )
                    ]
                ), 
                "inline_policy_attach_vpc": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "ec2:CreateNetworkInterface",
                                "ec2:DescribeNetworkInterfaces",
                                "ec2:DeleteNetworkInterface",
                                "ec2:AssignPrivateIpAddresses",
                                "ec2:UnassignPrivateIpAddresses"
                            ],
                            resources=["*"]
                        )
                    ]
                ), 
                "inline_policy_sqs": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "sqs:GetQueueUrl",
                                "sqs:DeleteMessage",
                                "sqs:ReceiveMessage",
                                "sqs:SendMessage",
                                "sqs:changemessagevisibility",
                            ],
                            resources=[
                                news_queue.queue_arn,
                                reports_queue.queue_arn,
                            ]
                        )
                    ]
                ),
                "inline_policy_s3": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "s3:ListBucket",
                                "s3:GetObject",
                                "s3:PutObject",
                                "s3:DeleteObject",
                            ],
                            resources=[
                                s3_ingestion_bucket.bucket_arn,
                                s3_ingestion_bucket.bucket_arn+'/*',
                                s3_news_bucket.bucket_arn,
                                s3_news_bucket.bucket_arn+'/*'
                            ]
                        )
                    ]
                ),
                "inline_policy_neptune": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "neptune-db:ReadDataViaQuery", 
                                "neptune-db:WriteDataViaQuery",
                                "neptune-db:DeleteDataViaQuery",
                                "neptune-db:connect",
                                "neptune-db:GetQueryStatus",
                                "neptune-db:CancelQuery",
                            ],
                            resources=[
                                f"arn:aws:neptune-db:{self.region}:{self.account}:{neptune_cluster.cluster_resource_identifier}/*"
                            ]
                        )
                    ]
                ),
                "inline_policy_invoke_function": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "lambda:InvokeFunction", 
                            ],
                            resources=[
                                f"arn:aws:lambda:{self.region}:{self.account}:function:{project_name}-api-download-news"
                            ]
                        )
                    ]
                ),
                "inline_policy_start_execution_state_machine": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "states:StartExecution"
                            ],
                            resources=[
                                f"arn:aws:states:{self.region}:{self.account}:stateMachine:{project_name}-state-machine"
                            ]
                        )
                    ]
                )
                
            }
        )
        role_lambda.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Lambda Functions - API - Generate News
        function_name=f"{project_name}-api-generate-news"
        fn_api_generate_news = _lambda.DockerImageFunction(self, function_name,
            function_name=function_name,
            code=_lambda.DockerImageCode.from_image_asset(
                "./lambda-ecs/api/generate-news",
                platform=ecr_assets.Platform.LINUX_AMD64
            ),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'NEPTUNE_ENDPOINT': neptune_cluster.cluster_endpoint.socket_address,
                'S3_BUCKET': s3_news_bucket.bucket_name,
                'DDBTBL_PROMPTS': ddbtbl_prompts.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,
            vpc=neptune_cluster.vpc,
            vpc_subnets=neptune_cluster.vpc_subnets,
            security_groups=[sg_lambda],
            memory_size=1024
        )
        fn_api_generate_news.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Lambda Functions - API - Download News
        function_name=f"{project_name}-api-download-news"
        fn_api_download_news = _lambda.DockerImageFunction(self, function_name,
            function_name=function_name,
            code=_lambda.DockerImageCode.from_image_asset(
                directory="./lambda-ecs/api/download-news",
                platform=ecr_assets.Platform.LINUX_AMD64
            ),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'S3_BUCKET': s3_news_bucket.bucket_name,
                'DDBTBL_PROMPTS': ddbtbl_prompts.table_name
            },
            tracing=_lambda.Tracing.ACTIVE, 
            memory_size=1024
        )
        fn_api_download_news.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Lambda Functions - API - Trigger Download News
        function_name=f"{project_name}-api-trigger-download-news"
        fn_api_trigger_download_news = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/api/trigger-download-news"),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'DOWNLOAD_NEWS_ARTICLES_LAMBDA_NAME': fn_api_download_news.function_name,
                'DDBTBL_PROMPTS': ddbtbl_prompts.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,  
            memory_size=1024          
        )        
        fn_api_trigger_download_news.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Lambda Functions - API - Entities
        function_name = f"{project_name}-api-entities"
        fn_api_entities = _lambda.DockerImageFunction(self, function_name,
            function_name=function_name,
            code=_lambda.DockerImageCode.from_image_asset(
                "./lambda-ecs/api/entities",
                platform=ecr_assets.Platform.LINUX_AMD64
            ),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'NEPTUNE_ENDPOINT': neptune_cluster.cluster_endpoint.socket_address,
                'DDBTBL_PROMPTS': ddbtbl_prompts.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,
            vpc=neptune_cluster.vpc,
            vpc_subnets=neptune_cluster.vpc_subnets,
            security_groups=[sg_lambda],
            memory_size=1024
        )
        fn_api_entities.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Lambda Functions - API - N
        function_name = f"{project_name}-api-n"
        fn_api_n = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/api/n"),
            layers=[layer_lambda],
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'DDBTBL_SETTINGS': ddbtbl_settings.table_name,
                'DDBTBL_PROMPTS': ddbtbl_prompts.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,
            memory_size=1024
        )
        fn_api_n.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Lambda Functions - API - News
        function_name = f"{project_name}-api-news"
        fn_api_news = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/api/news"),
            layers=[layer_lambda],
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'DDBTBL_NEWS': ddbtbl_news.table_name,
                'DDBTBL_PROMPTS': ddbtbl_prompts.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,
            memory_size=1024
        )
        fn_api_news.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Lambda Functions - S3 Pipeline - Ingestion Trigger
        function_name = f"{project_name}-s3_pipeline-ingestion-trigger"
        fn_s3_pipeline_ingestion_trigger = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/s3_pipeline/ingestion-trigger"),
            layers=[layer_lambda],
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'QUEUE_NAME': reports_queue.queue_name,
                'DDBTBL_PROMPTS': ddbtbl_prompts.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,
            memory_size=1024
        )
        fn_s3_pipeline_ingestion_trigger.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Lambda Functions - S3 Pipeline - Read Ingestion Queue
        function_name = f"{project_name}-s3_pipeline-read-ingestion-queue"
        fn_s3_pipeline_read_ingestion_queue = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/s3_pipeline/read-ingestion-queue"),
            layers=[layer_lambda],
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'QUEUE_NAME': reports_queue.queue_name,
                'DDBTBL_PROMPTS': ddbtbl_prompts.table_name,
                'STATE_MACHINE_ARN': f"arn:aws:states:{self.region}:{self.account}:stateMachine:{project_name}-state-machine"
            },
            tracing=_lambda.Tracing.ACTIVE,
            memory_size=1024
        )
        fn_s3_pipeline_read_ingestion_queue.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Lambda Functions - S3 Pipeline - Process News
        function_name = f"{project_name}-s3_pipeline-process_news"
        fn_s3_pipeline_process_news = _lambda.DockerImageFunction(self, function_name,
            function_name=function_name,
            code=_lambda.DockerImageCode.from_image_asset(
                directory="./lambda-ecs/s3_pipeline/process-news",
                platform=ecr_assets.Platform.LINUX_AMD64
            ),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'DDBTBL_NEWS': ddbtbl_news.table_name,
                'DDBTBL_SETTINGS': ddbtbl_settings.table_name,
                'NEPTUNE_ENDPOINT': neptune_cluster.cluster_endpoint.socket_address,
                'DDBTBL_PROMPTS': ddbtbl_prompts.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,
            vpc=neptune_cluster.vpc,
            vpc_subnets=neptune_cluster.vpc_subnets,
            security_groups=[sg_lambda],
            memory_size=1024
        )
        fn_s3_pipeline_process_news.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Lambda Functions - Step Function - Receive Messages
        function_name = f"{project_name}-step_function-receive_messages"
        fn_step_function_receive_messages  = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/step-function/00.receive-messages"),
            layers=[layer_lambda],
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'QUEUE_NAME': reports_queue.queue_name,
                'DDBTBL_PROMPTS': ddbtbl_prompts.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,
            memory_size=1024
        )
        fn_step_function_receive_messages.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create Lambda Functions - Step Function - Chunk Document
        function_name = f"{project_name}-step_function-chunk_doc"
        fn_step_function_chunk_doc = _lambda.DockerImageFunction(self, function_name,
            function_name=function_name,
            code=_lambda.DockerImageCode.from_image_asset(
                directory="./lambda-ecs/step-function/01.chunk-document",
                platform=ecr_assets.Platform.LINUX_AMD64
            ),
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'DDBTBL_INGESTION': ddbtbl_ingestion.table_name,
                'DDBTBL_PROMPTS': ddbtbl_prompts.table_name
            },
            tracing=_lambda.Tracing.ACTIVE, 
            memory_size=10240
        )
        fn_step_function_chunk_doc.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Lambda Functions - Step Function - Process Chunks
        function_name = f"{project_name}-step_function-process-chunks"
        fn_step_function_process_chunks = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/step-function/02.process-chunks"),
            layers=[layer_lambda],
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'DDBTBL_PROMPTS': ddbtbl_prompts.table_name
            }, 
            tracing=_lambda.Tracing.ACTIVE,
            memory_size=1024
        )
        fn_step_function_process_chunks.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Lambda Functions - Step Function - Consolidate Chunks
        function_name = f"{project_name}-step_function-consolidate-chunks"
        fn_step_function_consolidate_chunks = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/step-function/03.consolidate-chunks"),
            layers=[layer_lambda],
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'DDBTBL_PROMPTS': ddbtbl_prompts.table_name,
                'DDBTBL_INGESTION': ddbtbl_ingestion.table_name,
            }, 
            tracing=_lambda.Tracing.ACTIVE,
            memory_size=1024
        )
        fn_step_function_consolidate_chunks.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Lambda Functions - Step Function - Filter Records
        function_name = f"{project_name}-step_function-filter_records"
        fn_step_function_filter_records = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/step-function/04.filter-records"),
            layers=[layer_lambda],
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'DDBTBL_INGESTION': ddbtbl_ingestion.table_name,
                'DDBTBL_PROMPTS': ddbtbl_prompts.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,
            memory_size=1024
        )
        fn_step_function_filter_records.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Lambda Functions - Step Function - Clean up
        function_name = f"{project_name}-step_function-clean_up"
        fn_step_function_clean_up  = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/step-function/06.clean-up"),
            layers=[layer_lambda],
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'QUEUE_NAME': reports_queue.queue_name,
                'DDBTBL_PROMPTS': ddbtbl_prompts.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,
            memory_size=1024
        )
        fn_step_function_clean_up.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Lambda Functions - Step Function - Return Message
        function_name = f"{project_name}-step_function-return_message"
        fn_step_function_return_message = _lambda.Function(self, function_name,
            function_name=function_name,
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset("./lambda-ecs/step-function/07.return-message"),
            layers=[layer_lambda],
            timeout=Duration.minutes(15),
            role=role_lambda,
            environment={
                'QUEUE_NAME': reports_queue.queue_name,
                'DDBTBL_PROMPTS': ddbtbl_prompts.table_name
            },
            tracing=_lambda.Tracing.ACTIVE,
            memory_size=1024
        )
        fn_step_function_return_message.apply_removal_policy(RemovalPolicy.DESTROY)

        

        




        # ███████  ██████ ███████     ███████  █████  ██████   ██████   █████  ████████ ███████ 
        # ██      ██      ██          ██      ██   ██ ██   ██ ██       ██   ██    ██    ██      
        # █████   ██      ███████     █████   ███████ ██████  ██   ███ ███████    ██    █████   
        # ██      ██           ██     ██      ██   ██ ██   ██ ██    ██ ██   ██    ██    ██      
        # ███████  ██████ ███████     ██      ██   ██ ██   ██  ██████  ██   ██    ██    ███████ 

        # Insert Vertices 
        # Create Fargate Definition
        taskdef_insert_vertices = ecs.FargateTaskDefinition(self, 
            f"{project_name}-insert-vertices-and-edges-taskdef",
            cpu=2048,  
            memory_limit_mib=4096
        )
        taskdef_insert_vertices.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create Log Group for ECS Task
        insert_vertices_log_group = logs.LogGroup(self, f"{project_name}-ecs-insert-vertices-and-edges-taskdef-loggroup", 
            log_group_name=f"/aws/ecs/{project_name}-ecs-insert-vertices-and-edges-taskdef-loggroup",
            removal_policy=RemovalPolicy.DESTROY,
        )

        # Add container to the task definition
        container = taskdef_insert_vertices.add_container("Container",
            image=ecs.ContainerImage.from_asset(
                "./lambda-ecs/step-function/05.insert-vertices-edges",
                platform=ecr_assets.Platform.LINUX_AMD64
            ),
            logging=ecs.LogDriver.aws_logs(stream_prefix=project_name, log_group=insert_vertices_log_group),
        )
        container.add_to_execution_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["logs:CreateLogGroup"],
                resources=[f"arn:aws:logs:*:{self.account}:log-group:*"]
            )
        )
        container.add_to_execution_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["logs:CreateLogStream", "logs:PutLogEvents"],
                resources=[f"arn:aws:logs:*:{self.account}:log-group:*:log-stream:*"]
            )
        )
        taskdef_insert_vertices.add_to_task_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "dynamodb:PutItem", 
                    "dynamodb:UpdateItem",
                    "dynamodb:Scan",
                    "dynamodb:Query",
                    "dynamodb:GetItem",
                ],
                resources=[
                    ddbtbl_ingestion.table_arn,
                    ddbtbl_news.table_arn,
                    ddbtbl_settings.table_arn,
                    ddbtbl_prompts.table_arn
                ]
            )
        )
        taskdef_insert_vertices.add_to_task_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "neptune-db:ReadDataViaQuery", 
                    "neptune-db:WriteDataViaQuery",
                    "neptune-db:DeleteDataViaQuery",
                    "neptune-db:connect",
                    "neptune-db:GetQueryStatus",
                    "neptune-db:CancelQuery",
                ],
                resources=[
                    f"arn:aws:neptune-db:{self.region}:{self.account}:{neptune_cluster.cluster_resource_identifier}/*"
                ]
            )
        )
        taskdef_insert_vertices.add_to_task_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
                resources=[
                    f"arn:aws:bedrock:{self.region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0", 
                    f"arn:aws:bedrock:{self.region}::foundation-model/anthropic.claude-v2:1",
                    f"arn:aws:bedrock:{self.region}::foundation-model/amazon.titan-embed-text-v1"
                ]
            )
        )
        taskdef_insert_vertices.add_to_task_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["states:SendTaskSuccess"],
                resources=[
                    f"arn:aws:states:{self.region}:{self.account}:stateMachine:{project_name}-state-machine"
                ]
            )
        )

        # Create ECS Cluster
        cluster = ecs.Cluster(self, f"{project_name}-ecs-cluster", 
            cluster_name=f"{project_name}-ecs-cluster", 
            vpc=vpc, 
            container_insights=True
        )
        cluster.apply_removal_policy(RemovalPolicy.DESTROY)





        #  █████  ██████  ██      ██████   █████  ████████ ███████ ██     ██  █████  ██    ██ 
        # ██   ██ ██   ██ ██     ██       ██   ██    ██    ██      ██     ██ ██   ██  ██  ██  
        # ███████ ██████  ██     ██   ███ ███████    ██    █████   ██  █  ██ ███████   ████   
        # ██   ██ ██      ██     ██    ██ ██   ██    ██    ██      ██ ███ ██ ██   ██    ██    
        # ██   ██ ██      ██      ██████  ██   ██    ██    ███████  ███ ███  ██   ██    ██    
        
        
        # Create API Gateway CloudWatch Role Permission
        role_api_gateway_cloudwatch = iam.Role(self, 
            f"{project_name}-api_gateway_cloudwatch",
            role_name=f"{project_name}-api_gateway_cloudwatch",
            assumed_by=iam.ServicePrincipal("apigateway.amazonaws.com"),
            inline_policies={
                "inline_policy_loggroup": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=["logs:CreateLogGroup", "logs:DescribeLogGroups"],
                            resources=[f"arn:aws:logs:*:{self.account}:log-group:*"]
                        )
                    ]
                ),
                "inline_policy_logstream": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=["logs:CreateLogStream", "logs:DescribeLogStreams", "logs:PutLogEvents", "logs:GetLogEvents", "logs:FilterLogEvents"],
                            resources=[f"arn:aws:logs:*:{self.account}:log-group:*:log-stream:*"]
                        )
                    ]
                )
            }
        )
        role_api_gateway_cloudwatch.apply_removal_policy(RemovalPolicy.DESTROY)
        account = apigateway.CfnAccount(self, "ApiGatewayAccount", cloud_watch_role_arn=role_api_gateway_cloudwatch.role_arn)
        account.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create API Gateway
        apigateway_log_group = logs.LogGroup(self, f"{project_name}-API-Gateway-Prod-Log-Group", 
            log_group_name=f"/aws/apigateway/{project_name}-prod",
            removal_policy=RemovalPolicy.DESTROY,
        )
        apigateway_log_group.apply_removal_policy(RemovalPolicy.DESTROY)
        api = apigateway.RestApi(
            self, f"{project_name}-api",
            endpoint_types=[apigateway.EndpointType.REGIONAL],
            default_cors_preflight_options={
                "allow_origins": apigateway.Cors.ALL_ORIGINS,
                "allow_methods": apigateway.Cors.ALL_METHODS,
                "allow_headers": ["*"],
                "allow_credentials": True,
            },
            deploy_options=apigateway.StageOptions(
                access_log_destination=apigateway.LogGroupLogDestination(
                    apigateway_log_group
                ),
                access_log_format=apigateway.AccessLogFormat.json_with_standard_fields(
                    caller=True,http_method=True,ip=True,protocol=True,request_time=True,resource_path=True,response_length=True,status=True,user=True
                ),
                logging_level=apigateway.MethodLoggingLevel.ERROR,
                tracing_enabled=True
            ),
            
        )
        api.apply_removal_policy(RemovalPolicy.DESTROY)
        output("API Endpoint", api.url)

        api.add_request_validator(
            id=f"{project_name}-RestAPIRequestValidator",
            request_validator_name="RestAPIRequestValidator",
            validate_request_body=True,
            validate_request_parameters=True
        )

        # Create a WAFv2 web ACL for API GATEWAY REST API
        web_acl_api = waf.CfnWebACL(self, f"{project_name}-waf-acl-api",
            scope="REGIONAL",
            default_action=waf.CfnWebACL.DefaultActionProperty(allow={}),
            visibility_config=waf.CfnWebACL.VisibilityConfigProperty(
                cloud_watch_metrics_enabled=True,
                metric_name=f"{project_name}-waf-acl-api",
                sampled_requests_enabled=True
            )
        )

        # Associate the WAFv2 web ACL with the API Gateway REST API
        waf_association = waf.CfnWebACLAssociation(self, f"{project_name}-WAFAssociation-API",
            resource_arn=f"arn:aws:apigateway:{self.region}::/restapis/{api.rest_api_id}/stages/{api.deployment_stage.stage_name}",
            web_acl_arn=web_acl_api.attr_arn            
        )
        
        # Create /entity resource with Lambda proxy integration
        entity_resource = api.root.add_resource('entity')
        entity_resource.add_method('GET', apigateway.LambdaIntegration(fn_api_entities), api_key_required=True)
        entity_resource.add_method('POST', apigateway.LambdaIntegration(fn_api_entities), api_key_required=True)
        entity_resource.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create /n resource with Lambda proxy integration
        n_resource = api.root.add_resource('n')
        n_resource.add_method('GET', apigateway.LambdaIntegration(fn_api_n), api_key_required=True)
        n_resource.add_method('POST', apigateway.LambdaIntegration(fn_api_n), api_key_required=True)
        n_resource.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create /news resource with Lambda proxy integration
        news_resource = api.root.add_resource('news')
        news_resource.add_method('GET', apigateway.LambdaIntegration(fn_api_news), api_key_required=True)
        news_resource.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create /generateNews resource with Lambda integration - async
        generateNews_resource = api.root.add_resource('generateNews')        
        generateNews_resource.add_method(
            "GET",
            integration=apigateway.LambdaIntegration(
                fn_api_generate_news,
                proxy=False,
                integration_responses=[apigateway.IntegrationResponse(
                    status_code="200",
                    response_parameters={
                        "method.response.header.Access-Control-Allow-Origin": "'*'",
                        "method.response.header.Access-Control-Allow-Methods": "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'",
                        "method.response.header.Access-Control-Allow-Headers": "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
                    }
                )],
                request_parameters={
                    "integration.request.header.X-Amz-Invocation-Type": "'Event'"
                },
            ),
            method_responses=[
                apigateway.MethodResponse(
                    status_code="200",
                    response_parameters={
                        "method.response.header.Access-Control-Allow-Headers": True,
                        "method.response.header.Access-Control-Allow-Methods": True,
                        "method.response.header.Access-Control-Allow-Origin": True                        
                    }
                )
            ],
            api_key_required=True,
        )
        generateNews_resource.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create /downloadNews resource with Lambda integration - this will invoke another lambda async to download news
        downloadNews_resource = api.root.add_resource('downloadNews')
        downloadNews_resource.add_method('GET', apigateway.LambdaIntegration(fn_api_trigger_download_news), api_key_required=True)
        downloadNews_resource.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create API key and usage plan
        api_key = api.add_api_key(f"{project_name}-apiKey", api_key_name=f"{project_name}-apiKey")
        api_key.apply_removal_policy(RemovalPolicy.DESTROY)

        usage_plan = api.add_usage_plan(
            f"{project_name}-apiUsagePlan",
            name=f"{project_name}-apiUsagePlan",
            api_stages=[apigateway.UsagePlanPerApiStage(api=api, stage=api.deployment_stage)],
        )
        usage_plan.add_api_key(api_key)
        usage_plan.apply_removal_policy(RemovalPolicy.DESTROY)



        

        # ███████ ████████ ███████ ██████      ███████ ██    ██ ███    ██  ██████ ████████ ██  ██████  ███    ██ 
        # ██         ██    ██      ██   ██     ██      ██    ██ ████   ██ ██         ██    ██ ██    ██ ████   ██ 
        # ███████    ██    █████   ██████      █████   ██    ██ ██ ██  ██ ██         ██    ██ ██    ██ ██ ██  ██ 
        #      ██    ██    ██      ██          ██      ██    ██ ██  ██ ██ ██         ██    ██ ██    ██ ██  ██ ██ 
        # ███████    ██    ███████ ██          ██       ██████  ██   ████  ██████    ██    ██  ██████  ██   ████ 


        def sfnReturnMessage():
            task = tasks.LambdaInvoke(
                self, "returnMessage",
                state_name="Return Message",
                result_path="$.output",
                payload=sfn.TaskInput.from_object({
                    "ReceiptHandle.$": "$.StateInfo.ReceiptHandle"
                }),
                lambda_function=fn_step_function_return_message,
            )
            task.add_retry(
                errors=["States.ALL"],
                interval=Duration.seconds(1),
                max_attempts=3,
                backoff_rate=2
            )
            return task.next(
                sfn.Fail(self, "ProcessingFailed", state_name="Processing Failed")
            )

        errorHandler = sfnReturnMessage()


        def sfnPassFormatInputS3FileReceiptHandle():
            return sfn.Pass(self, "FormatInputS3FileReceiptHandle",
                state_name="Format Input S3 File Receipt Handle",
                parameters={
                    "StateInfo": {
                        "S3File.$": "States.StringToJson($.Messages[0].Body)",
                        "ReceiptHandle.$": "$.Messages[0].ReceiptHandle"
                    }
                }
            )
        
        def sfnInvokeLambdaReceiveMessages():
            task = tasks.LambdaInvoke(
                self, "ReceiveMessages",
                state_name="Receive Messages",
                output_path="$.Payload",
                lambda_function=fn_step_function_receive_messages,
            )
            task.add_retry(
                errors=["States.ALL"],
                interval=Duration.seconds(1),
                max_attempts=3,
                backoff_rate=2
            )
            return task
        
        def sfnInvokeLambdaChunkDocuments():
            task = tasks.LambdaInvoke(
                self, "ChunkDocument",
                state_name="Chunk Document",
                result_path="$.output",
                lambda_function=fn_step_function_chunk_doc,
                task_timeout=sfn.Timeout.duration(Duration.minutes(4))
            )
            task.add_retry(
                errors=["States.ALL"],
                interval=Duration.seconds(1),
                max_attempts=3,
                backoff_rate=2
            )
            task.add_catch(handler=errorHandler, result_path="$.output")
            return task
        
        def sfnPassFormatInputSummary():
            return sfn.Pass(self, "FormatInputSummary",
                state_name="Format Input Summary",
                parameters={
                    "StateInfo.$": "$.StateInfo",
                    "Summary.$": "$.output.Payload.summary",
                    "output.$": "$.output"
                }
            )
        
        def sfnDynamoGetItem():
            return tasks.DynamoGetItem(self, "Get Item",
                key={"id": tasks.DynamoAttributeValue.from_string(sfn.JsonPath.string_at("$.id"))},
                table=ddbtbl_ingestion,
                result_path="$.output",
            )
        
        def sfnInvokeLambdaProcessChunks():
            task = tasks.LambdaInvoke(
                self, "ProcessChunks",
                state_name="Process Chunks",
                payload=sfn.TaskInput.from_object({
                    "id.$": "$.id",
                    "summary.$": "$.summary",
                    "text.$": "$.output.Item.text",
                    "item.$": "$.output.Item",
                    "source.$": "$.source",
                }),
                output_path="$.Payload",
                lambda_function=fn_step_function_process_chunks,
            )
            task.add_retry(
                errors=["States.ALL"],
                interval=Duration.seconds(1),
                max_attempts=3,
                backoff_rate=2
            )
            return task
        
        def sfnMapProcessChunks():
            task = sfn.Map(self, "MapProcessChunks",
                state_name="Map - Process Chunks",
                items_path=sfn.JsonPath.string_at("$.output.Payload.uuid"),
                result_path="$.output",                
            )
            task.add_catch(handler=errorHandler, result_path="$.output")
            return task

        def sfnInvokeLambdaConsolidateChunks():
            task = tasks.LambdaInvoke(
                self, "ConsolidateChunks",
                state_name="Consolidate Chunks",
                payload=sfn.TaskInput.from_object({
                    "output.$": "$.output",
                    "StateInfo.$": "$.StateInfo",
                    "Summary.$": "$.Summary"
                }),
                result_path="$.output",
                lambda_function=fn_step_function_consolidate_chunks,
            )
            task.add_retry(
                errors=["States.ALL"],
                interval=Duration.seconds(1),
                max_attempts=3,
                backoff_rate=2
            )
            task.add_catch(handler=errorHandler, result_path="$.output")
            return task
        
        def sfnMapFilterRecords():
            task = sfn.Map(self, "MapFilterRecords",
                state_name="Map - Filter Records",
                items_path=sfn.JsonPath.string_at("$.output.Payload"),
                result_path="$.output",                
            )
            task.add_catch(handler=errorHandler, result_path="$.output")
            return task
        
        def sfnInvokeLambdaFilterRecords():
            task = tasks.LambdaInvoke(
                self, "FilterRecords",
                state_name="Filter Records",
                output_path="$.Payload",
                lambda_function=fn_step_function_filter_records,
            )
            task.add_retry(
                errors=["States.ALL"],
                interval=Duration.seconds(1),
                max_attempts=3,
                backoff_rate=2
            )
            return task       

        def sfnInvokeLambdaInsertVerticesEdges():
            task = tasks.EcsRunTask(
                self, "InsertVerticesEdges",
                state_name="Insert Vertices & Edges",
                integration_pattern=sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
                cluster=ecs.Cluster.from_cluster_attributes(self, "cluster-insert-vertices", cluster_name=cluster.cluster_name, vpc=vpc),
                task_definition=taskdef_insert_vertices,
                subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_ISOLATED),
                launch_target=tasks.EcsFargateLaunchTarget(platform_version=ecs.FargatePlatformVersion.LATEST),
                container_overrides=[tasks.ContainerOverride(
                    container_definition=taskdef_insert_vertices.default_container,
                    environment=
                    [
                        tasks.TaskEnvironmentVariable(
                            name="NEPTUNE_ENDPOINT",
                            value=neptune_cluster.cluster_endpoint.socket_address
                        ),
                        tasks.TaskEnvironmentVariable(
                            name="output",
                            value=sfn.JsonPath.string_at("States.JsonToString($.output)")
                        ),
                        tasks.TaskEnvironmentVariable(
                            name="Summary",
                            value=sfn.JsonPath.string_at("States.JsonToString($.Summary)")
                        ),
                        tasks.TaskEnvironmentVariable(
                            name="TASK_TOKEN",
                            value=sfn.JsonPath.string_at("$$.Task.Token")
                        ),
                        tasks.TaskEnvironmentVariable(
                            name="DDBTBL_INGESTION",
                            value=ddbtbl_ingestion.table_name
                        ),
                        tasks.TaskEnvironmentVariable(
                            name="DDBTBL_PROMPTS",
                            value=ddbtbl_prompts.table_name
                        )
                    ]
                )],
                result_path="$.output",
            )
            task.add_retry(
                errors=["States.ALL"],
                interval=Duration.seconds(1),
                max_attempts=3,
                backoff_rate=2
            )
            task.add_catch(handler=errorHandler, result_path="$.output")
            return task
       
        def sfnInvokeLambdaCleanup():
            task = tasks.LambdaInvoke(
                self, "Cleanup",
                state_name="Clean up",
                result_path="$.output",
                payload=sfn.TaskInput.from_object({
                    "Bucket.$": "$.StateInfo.S3File.S3_BUCKET",
                    "Key.$": "$.StateInfo.S3File.S3_KEY",
                    "ReceiptHandle.$": "$.StateInfo.ReceiptHandle"
                }),
                lambda_function=fn_step_function_clean_up,
            )
            task.add_retry(
                errors=["States.ALL"],
                interval=Duration.seconds(1),
                max_attempts=3,
                backoff_rate=2
            )
            return task  

        def create_state_machine_definition():
            return sfnPassFormatInputS3FileReceiptHandle().next(
                sfnInvokeLambdaChunkDocuments()
                .next(sfnPassFormatInputSummary())
                .next(sfnMapProcessChunks()
                        .item_processor(
                            sfnDynamoGetItem()
                            .next(sfnInvokeLambdaProcessChunks())
                        )
                )
                .next(sfnInvokeLambdaConsolidateChunks())
                .next(sfnMapFilterRecords()
                        .item_processor(
                            sfnInvokeLambdaFilterRecords()
                        )
                )
                .next(sfnInvokeLambdaInsertVerticesEdges())
                .next(sfnInvokeLambdaCleanup())
                .next(sfn.Succeed(self, "SuccessProcessCompleted", state_name="Success Process Completed"))
            )
            
        state_machine_log_group = logs.LogGroup(
            self, f"{project_name}-state-machine-log-group", 
            log_group_name=f"/aws/stepfunctions/{project_name}-state-machine",
            removal_policy=RemovalPolicy.DESTROY,
        )
        state_machine = sfn.StateMachine(
            self, f"{project_name}-state-machine",
            state_machine_name=f"{project_name}-state-machine",
            definition_body=sfn.DefinitionBody.from_chainable(create_state_machine_definition()),
            removal_policy=RemovalPolicy.DESTROY,
            tracing_enabled=True,
            logs=sfn.LogOptions(
                destination=state_machine_log_group,
                level=sfn.LogLevel.ALL
            )
        )
        taskdef_insert_vertices.add_to_task_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["states:SendTaskSuccess",],
                resources=[state_machine.state_machine_arn]
            )
        )
        state_machine.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["ecs:RunTask",],
                resources=[
                    taskdef_insert_vertices.task_definition_arn,
                ]
            )
        )





        # ███████ ██    ██ ███████ ███    ██ ████████ ███████ 
        # ██      ██    ██ ██      ████   ██    ██    ██      
        # █████   ██    ██ █████   ██ ██  ██    ██    ███████ 
        # ██       ██  ██  ██      ██  ██ ██    ██         ██ 
        # ███████   ████   ███████ ██   ████    ██    ███████ 

        # Add Event Notification: S3 -> SQS Queue -> Lambda Functions - S3 Pipeline - Process News
        s3_news_bucket.add_event_notification(
            s3.EventType.OBJECT_CREATED,
            s3_notifications.SqsDestination(news_queue),
            s3.NotificationKeyFilter(suffix=".txt")
        )

        fn_s3_pipeline_process_news.add_event_source(
            lambda_event_sources.SqsEventSource(news_queue, batch_size=10)
        )

        # Add S3 Event Notification to Lambda Functions - S3 Pipeline - Ingestion Trigger
        s3_ingestion_bucket.add_event_notification(
            s3.EventType.OBJECT_CREATED,
            s3_notifications.LambdaDestination(fn_s3_pipeline_ingestion_trigger),
            s3.NotificationKeyFilter(suffix=".pdf")
        )

        # Create the EventBridge rule
        rule = events.Rule(
            self, f"{project_name}-trigger-step-function-rule",
            rule_name=f"{project_name}-trigger-step-function-rule",
            schedule=events.Schedule.rate(Duration.minutes(1)),
            targets=[targets.LambdaFunction(fn_s3_pipeline_read_ingestion_queue)]
        )




        #  ██████  ██████   █████  ██████  ██   ██     ███████ ██   ██ ██████  ██       ██████  ██████  ███████ ██████  
        # ██       ██   ██ ██   ██ ██   ██ ██   ██     ██       ██ ██  ██   ██ ██      ██    ██ ██   ██ ██      ██   ██ 
        # ██   ███ ██████  ███████ ██████  ███████     █████     ███   ██████  ██      ██    ██ ██████  █████   ██████  
        # ██    ██ ██   ██ ██   ██ ██      ██   ██     ██       ██ ██  ██      ██      ██    ██ ██   ██ ██      ██   ██ 
        #  ██████  ██   ██ ██   ██ ██      ██   ██     ███████ ██   ██ ██      ███████  ██████  ██   ██ ███████ ██   ██ 

        # Create Security Group - Graph Explorer
        sg_explorer = ec2.SecurityGroup(
            self, f"{project_name}-explorer-security-group",
            security_group_name=f"{project_name}-explorer-security-group",
            vpc=vpc,
        )
        sg_explorer.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(443), "Allow HTTPS")
        sg_explorer.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create IAM Role for EC2 & Grant access to Neptune DB via IAM Auth
        explorer_role = iam.Role(self, f"{project_name}-explorer-role",
            assumed_by=iam.ServicePrincipal("ec2.amazonaws.com")
        )
        explorer_role.add_to_policy(iam.PolicyStatement(
            actions=[
                "neptune-db:ReadDataViaQuery", 
                "neptune-db:WriteDataViaQuery",
                "neptune-db:DeleteDataViaQuery",
                "neptune-db:connect",
                "neptune-db:GetQueryStatus",
                "neptune-db:CancelQuery",
            ],
            resources=[
                f"arn:aws:neptune-db:{self.region}:{self.account}:{neptune_cluster.cluster_resource_identifier}/*"
            ]
        ))

        # Create User Data script to set up Graph Explorer
        user_data = ec2.UserData.for_linux()
        
        # Start up configurations to run scripts after each restart
        user_data.add_commands("""echo -e "#!/bin/bash\n/home/ec2-user/run_graph_explorer.sh" > /var/lib/cloud/scripts/per-boot/99-setup_graph_explorer.cfg""")
        user_data.add_commands("""chmod +x /var/lib/cloud/scripts/per-boot/99-setup_graph_explorer.cfg""")

        # Create script to set up & run Graph Explorer
        user_data.add_commands("""cd /home/ec2-user""")
        user_data.add_commands("""
cat > run_graph_explorer.sh << EOF 
#!/bin/bash
cd /home/ec2-user
TOKEN=\$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
EC2_IP=\$(curl -H "X-aws-ec2-metadata-token: \$TOKEN" -v http://169.254.169.254/latest/meta-data/public-ipv4)
EC2_HOSTNAME="https://"\$EC2_IP
echo \$EC2_HOSTNAME
yum update -y
yum install git docker -y
[ -d "graph-explorer" ] && rm -r "graph-explorer"
git clone https://github.com/aws/graph-explorer/
systemctl start docker
docker buildx build graph-explorer -t "graph-explorer" 
docker run -p 80:80 -p 443:443 --env HOST=\$EC2_HOSTNAME --env PUBLIC_OR_PROXY_ENDPOINT=\$EC2_HOSTNAME --env GRAPH_TYPE=gremlin --env USING_PROXY_SERVER=true --env IAM=true --env AWS_REGION={region} --env GRAPH_CONNECTION_URL=https://{NEPTUNE_ENDPOINT} --env PROXY_SERVER_HTTPS_CONNECTION=true --env GRAPH_EXP_FETCH_REQUEST_TIMEOUT=240000 graph-explorer
EOF""".format(NEPTUNE_ENDPOINT=neptune_cluster.cluster_endpoint.socket_address, region=self.region))
        user_data.add_commands("""chmod +x run_graph_explorer.sh""")
        user_data.add_commands("""./run_graph_explorer.sh > output""")
       
        # Launch EC2 in the public subnet
        ec2_instance = ec2.Instance(self, f"{project_name}-Graph-Explorer-EC2",
            instance_type=ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.SMALL),
            machine_image=ec2.MachineImage.latest_amazon_linux2(),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            role=explorer_role,
            security_group=sg_explorer,
            user_data=user_data,
            block_devices=[
                ec2.BlockDevice(
                    device_name="/dev/sda1",
                    volume=ec2.BlockDeviceVolume.ebs(
                        volume_size=20,
                        encrypted=True
                    )
                ),
                ec2.BlockDevice(
                    device_name="/dev/xvda",
                    volume=ec2.BlockDeviceVolume.ebs(
                        volume_size=20,
                        encrypted=True
                    )
                ),
            ],
            detailed_monitoring=True,
        )
        output("Graph Explorer", f"https://{ec2_instance.instance_public_ip}/explorer")
        



