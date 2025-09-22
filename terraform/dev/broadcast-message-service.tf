

module "broadcast-message-service_sqs_queue" {
  source        = "../modules/aws_sqs"
  queue_name    = "${var.project}-${var.environment}-broadcast-message-service-queue"

}



module "broadcast-message-service-ecr" {
  source          = "../modules/aws_ecr"
  repository_name = "${var.project}-${var.environment}-broadcast-message-service"
}


resource "null_resource" "broadcast-message-service-docker_image" {
  depends_on = [ module.broadcast-message-service-ecr ]
  provisioner "local-exec" {
   command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.broadcast-message-service-ecr.repository_url} >> output_broadcast-message-service.txt 2>&1 && docker info >> output_broadcast-message-service.txt && docker pull public.ecr.aws/docker/library/hello-world:latest >> output_broadcast-message-service.txt && docker tag public.ecr.aws/docker/library/hello-world:latest ${module.broadcast-message-service-ecr.repository_url}:latest >> output_broadcast-message-service.txt && docker push ${module.broadcast-message-service-ecr.repository_url}:latest >> output_broadcast-message-service.txt"
  }
}

module "broadcast-message-service-lambda" {
  source             = "../modules/aws_lambda_docker"
  function_name      = "${var.project}-${var.environment}-broadcast-message-service"
  role_arn           = module.lamda_task_role.role_arn
  docker_image_uri   = "${module.broadcast-message-service-ecr.repository_url}:latest"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.lambda_security_group_outbound_only.security_group_id]
  timeout            = 900
  memory_size        = 128
  environment_variables = {
    DYNAMO_DB_USER_TABLE   = "${var.project}-${var.environment}-users"
    AWS_SECRET_ID          = "${module.secret_manager.secret_name}"
    DEFAULT_REGION         = "${var.aws_region}"
    WEBSOCKET_CONNECTION_URL = "${module.websocket-api-gateway.management_api_endpoint}"
    DYNAMO_DB_WEBSOCKET_CONNECTION_TABLE = "${var.project}-${var.environment}-web-socket-connection"
  }
  
  depends_on = [ null_resource.broadcast-message-service-docker_image ]

}

resource "aws_lambda_event_source_mapping" "broadcast-message-service_sqs_trigger" {
  event_source_arn = module.broadcast-message-service_sqs_queue.queue_arn
  function_name    = module.broadcast-message-service-lambda.lambda_function_name
}