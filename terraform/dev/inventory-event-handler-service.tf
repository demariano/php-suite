

module "inventory-event-handler-service_sqs_queue" {
  source        = "../modules/aws_sqs"
  queue_name    = "${var.project}-${var.environment}-inventory-event-handler-service-queue"

}



module "inventory-event-handler-service-ecr" {
  source          = "../modules/aws_ecr"
  repository_name = "${var.project}-${var.environment}-inventory-event-handler-service"
}


resource "null_resource" "inventory-event-handler-service-docker_image" {
  depends_on = [ module.inventory-event-handler-service-ecr ]
  provisioner "local-exec" {
   command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.inventory-event-handler-service-ecr.repository_url} >> output_inventory-event-handler-service.txt 2>&1 && docker info >> output_inventory-event-handler-service.txt && docker pull public.ecr.aws/docker/library/hello-world:latest >> output_inventory-event-handler-service.txt && docker tag public.ecr.aws/docker/library/hello-world:latest ${module.inventory-event-handler-service-ecr.repository_url}:latest >> output_inventory-event-handler-service.txt && docker push ${module.inventory-event-handler-service-ecr.repository_url}:latest >> output_inventory-event-handler-service.txt"
  }
}

module "inventory-event-handler-service-lambda" {
  source             = "../modules/aws_lambda_docker"
  function_name      = "${var.project}-${var.environment}-inventory-event-handler-service"
  role_arn           = module.lamda_task_role.role_arn
  docker_image_uri   = "${module.inventory-event-handler-service-ecr.repository_url}:latest"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.lambda_security_group_outbound_only.security_group_id]
  timeout            = 900
  memory_size        = 128
  environment_variables = {
    AWS_SECRET_ID             = "${module.secret_manager.secret_name}"
    DEFAULT_REGION            = "${var.aws_region}"
    DYNAMO_DB_INVENTORY_TABLE = "${var.project}-${var.environment}-inventory"
    DYNAMO_DB_PRODUCT_TABLE   = "${var.project}-${var.environment}-product"
    INVENTORY_EVENT_SQS       = "${module.inventory-event-handler-service_sqs_queue.queue_url}"
    BYPASS_AUTH               = "ENABLED"
    BYPASS_AUTH_ROLES         = "SUPER_ADMIN"
  }
  
  depends_on = [ null_resource.inventory-event-handler-service-docker_image ]

}

resource "aws_lambda_event_source_mapping" "inventory-event-handler-service_sqs_trigger" {
  event_source_arn = module.inventory-event-handler-service_sqs_queue.queue_arn
  function_name    = module.inventory-event-handler-service-lambda.lambda_function_name
}