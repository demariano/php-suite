module "product-api-service-ecr" {
  source          = "../modules/aws_ecr"
  repository_name = "${var.project}-${var.environment}-product-api-service"
}


resource "null_resource" "product-api-service-docker_image" {
  depends_on = [ module.product-api-service-ecr ]
  provisioner "local-exec" {
   command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.product-api-service-ecr.repository_url} >> output_product-api-service.txt 2>&1 && docker info >> output_product-api-service.txt && docker pull public.ecr.aws/docker/library/hello-world:latest >> output_product-api-service.txt && docker tag public.ecr.aws/docker/library/hello-world:latest ${module.product-api-service-ecr.repository_url}:latest >> output_product-api-service.txt && docker push ${module.product-api-service-ecr.repository_url}:latest >> output_product-api-service.txt"
  }
}

module "product-api-service-lambda" {
  source             = "../modules/aws_lambda_docker"
  function_name      = "${var.project}-${var.environment}-product-api-service"
  role_arn           = module.lamda_task_role.role_arn
  docker_image_uri   = "${module.product-api-service-ecr.repository_url}:latest"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.lambda_security_group_outbound_only.security_group_id]
  timeout            = 900
  memory_size        = 128
  environment_variables = {
    AWS_SECRET_ID             = "${module.secret_manager.secret_name}"
    DEFAULT_REGION            = "${var.aws_region}"
    DYNAMO_DB_PRODUCT_TABLE   = "${var.project}-${var.environment}-product"
    PRODUCT_EVENT_SQS         = "${module.product-event-handler-service_sqs_queue.queue_url}"
    INVENTORY_EVENT_SQS       = "${module.inventory-event-handler-service_sqs_queue.queue_url}"
    INVOICE_EVENT_SQS         = "${module.invoicing-event-handler-service_sqs_queue.queue_url}"
    AWS_COGNITO_AUTHORITY     = "${module.cognito_user_pool.cognito_user_pool_endpoint}"
    BYPASS_AUTH               = "ENABLED"
    BYPASS_AUTH_ROLES         = "SUPER_ADMIN"
  }
  depends_on = [ null_resource.product-api-service-docker_image ]
}


