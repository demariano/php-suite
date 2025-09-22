

module "connect-service_sqs_queue" {
  source        = "../modules/aws_sqs"
  queue_name    = "${var.project}-${var.environment}-connect-service-queue"

}



module "connect-service-ecr" {
  source          = "../modules/aws_ecr"
  repository_name = "${var.project}-${var.environment}-connect-service"
}


resource "null_resource" "connect-service-docker_image" {
  depends_on = [ module.connect-service-ecr ]
  provisioner "local-exec" {
   command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.connect-service-ecr.repository_url} >> output_connect-service.txt 2>&1 && docker info >> output_connect-service.txt && docker pull public.ecr.aws/docker/library/hello-world:latest >> output_connect-service.txt && docker tag public.ecr.aws/docker/library/hello-world:latest ${module.connect-service-ecr.repository_url}:latest >> output_connect-service.txt && docker push ${module.connect-service-ecr.repository_url}:latest >> output-connect-service.txt"
  }
}

module "connect-service-lambda" {
  source             = "../modules/aws_lambda_docker"
  function_name      = "${var.project}-${var.environment}-connect-service"
  role_arn           = module.lamda_task_role.role_arn
  docker_image_uri   = "${module.connect-service-ecr.repository_url}:latest"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.lambda_security_group_outbound_only.security_group_id]
  timeout            = 900
  memory_size        = 128
  environment_variables = {
    DYNAMO_DB_USER_TABLE   = "${var.project}-${var.environment}-users"
    AWS_SECRET_ID          = "${module.secret_manager.secret_name}"
    DEFAULT_REGION         = "${var.aws_region}",
    WEBSOCKET_MESSAGE_SQS   = "${module.broadcast-message-service_sqs_queue.queue_url}",
    AWS_COGNITO_AUTHORITY   = "${module.cognito_user_pool.cognito_user_pool_endpoint}"
    DYNAMO_DB_WEBSOCKET_CONNECTION_TABLE = "${var.project}-${var.environment}-web-socket-connection"
  }
  
  depends_on = [ null_resource.connect-service-docker_image ]

}

