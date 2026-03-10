module "inventory-api-service-ecr" {
  source          = "../modules/aws_ecr"
  repository_name = "${var.project}-${var.environment}-inventory-api-service"
}


resource "null_resource" "inventory-api-service-docker_image" {
  depends_on = [ module.inventory-api-service-ecr ]
  provisioner "local-exec" {
   command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.inventory-api-service-ecr.repository_url} >> output_inventory-api-service.txt 2>&1 && docker info >> output_inventory-api-service.txt && docker pull public.ecr.aws/docker/library/hello-world:latest >> output_inventory-api-service.txt && docker tag public.ecr.aws/docker/library/hello-world:latest ${module.inventory-api-service-ecr.repository_url}:latest >> output_inventory-api-service.txt && docker push ${module.inventory-api-service-ecr.repository_url}:latest >> output_inventory-api-service.txt"
  }
}

module "inventory-api-service-lambda" {
  source             = "../modules/aws_lambda_docker"
  function_name      = "${var.project}-${var.environment}-inventory-api-service"
  role_arn           = module.lamda_task_role.role_arn
  docker_image_uri   = "${module.inventory-api-service-ecr.repository_url}:latest"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.lambda_security_group_outbound_only.security_group_id]
  timeout            = 900
  memory_size        = 128
  environment_variables = {
    AWS_SECRET_ID              = "${module.secret_manager.secret_name}"
    DEFAULT_REGION             = "${var.aws_region}"
    DYNAMO_DB_INVENTORY_TABLE  = "${var.project}-${var.environment}-inventory"
    INVENTORY_EVENT_SQS        = "${module.inventory-event-handler-service_sqs_queue.queue_url}"
    AWS_COGNITO_AUTHORITY      = "${module.cognito_user_pool.cognito_user_pool_endpoint}"
  }
  depends_on = [ null_resource.inventory-api-service-docker_image ]
}


