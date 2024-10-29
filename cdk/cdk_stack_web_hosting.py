from aws_cdk import (
    Stack,
    RemovalPolicy,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_s3_deployment as s3d,
    CfnOutput,
    Stack,
    aws_wafv2 as waf,
    Duration,
)
from constructs import Construct
import time

class CdkStackWebHosting(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        project_name = self.stack_name

        # Helper method to print to Cloudformation output
        def output(key, value):
            CfnOutput(self, key, value=value, description=key)
            print(f"{key} = {value}")

        




        # ██████   █████  ████████  █████      ███████ ████████  ██████  ██████  ███████ 
        # ██   ██ ██   ██    ██    ██   ██     ██         ██    ██    ██ ██   ██ ██      
        # ██   ██ ███████    ██    ███████     ███████    ██    ██    ██ ██████  █████   
        # ██   ██ ██   ██    ██    ██   ██          ██    ██    ██    ██ ██   ██ ██      
        # ██████  ██   ██    ██    ██   ██     ███████    ██     ██████  ██   ██ ███████ 


        # Create S3 Bucket for access logging - web app
        s3_server_access_log_bucket_web_app = s3.Bucket(self, f"{project_name}-server-access-log-bucket-web-app",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            enforce_ssl=True,
            access_control=s3.BucketAccessControl.LOG_DELIVERY_WRITE,
            versioned=True,
        )

        # Create S3 Bucket for access logging - cloudfront
        s3_server_access_log_bucket_cloudfront = s3.Bucket(self, f"{project_name}-server-access-log-bucket-cloudfront",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            enforce_ssl=True,
            access_control=s3.BucketAccessControl.LOG_DELIVERY_WRITE,
            versioned=True,
        )

   




        # ██     ██ ███████ ██████      ██   ██  ██████  ███████ ████████ ██ ███    ██  ██████  
        # ██     ██ ██      ██   ██     ██   ██ ██    ██ ██         ██    ██ ████   ██ ██       
        # ██  █  ██ █████   ██████      ███████ ██    ██ ███████    ██    ██ ██ ██  ██ ██   ███ 
        # ██ ███ ██ ██      ██   ██     ██   ██ ██    ██      ██    ██    ██ ██  ██ ██ ██    ██ 
        #  ███ ███  ███████ ██████      ██   ██  ██████  ███████    ██    ██ ██   ████  ██████  

        # # Create S3 Bucket & CloudFront for hosting demo web application
        s3_demo_web_app_bucket = s3.Bucket(self, f"{project_name}-demo-web-app",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            server_access_logs_bucket=s3_server_access_log_bucket_web_app,
            enforce_ssl=True,
            versioned=True,
        )
        self.s3_demo_web_app_bucket = s3_demo_web_app_bucket
        
        # Deploy the React app to S3 bucket
        s3_deployment = s3d.BucketDeployment(self, f"{project_name}-DemoWebAppDeployment",
            sources=[s3d.Source.asset("ui/build")],
            destination_bucket=s3_demo_web_app_bucket,
            retain_on_delete=False,
            metadata={"deployment_time": str(time.time())}
        )

        # Create OAI for access management
        oai = cloudfront.OriginAccessIdentity(self, f"{project_name}-OAI")
        oai.apply_removal_policy(RemovalPolicy.DESTROY)
        s3_demo_web_app_bucket.grant_read(oai)

        # Create a WAFv2 web ACL
        web_acl_cloudfront = waf.CfnWebACL(self, f"{project_name}-waf-acl-cloudfront",
            scope="CLOUDFRONT",
            default_action=waf.CfnWebACL.DefaultActionProperty(allow={}),
            visibility_config=waf.CfnWebACL.VisibilityConfigProperty(
                cloud_watch_metrics_enabled=True,
                metric_name=f"{project_name}-waf-acl-cloudfront",
                sampled_requests_enabled=True
            )
        )
        web_acl_cloudfront.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Create a CloudFront distribution
        cloudfront_distribution = cloudfront.CloudFrontWebDistribution(self, f"{project_name}-CloudFront",
            origin_configs=[
                cloudfront.SourceConfiguration(
                    s3_origin_source=cloudfront.S3OriginConfig(
                        s3_bucket_source=s3_demo_web_app_bucket,
                        origin_access_identity=oai
                    ),
                    behaviors=[
                        cloudfront.Behavior(is_default_behavior=True,
                                            min_ttl=Duration.seconds(0),
                                            max_ttl=Duration.seconds(0),
                                            default_ttl=Duration.seconds(0),
                                            path_pattern="ttl0",
                                            compress=True                                             ),
                    ]
                )
            ],
            default_root_object="index.html",
            logging_config=cloudfront.LoggingConfiguration(
                bucket=s3_server_access_log_bucket_cloudfront,
                include_cookies=False,
                prefix="cloudfrontlogs/"
            ),
            web_acl_id=web_acl_cloudfront.attr_arn,
        )
        cloudfront_distribution.apply_removal_policy(RemovalPolicy.DESTROY)
        
        # Output the CloudFront distribution URL
        output("Web Application URL", cloudfront_distribution.distribution_domain_name)



