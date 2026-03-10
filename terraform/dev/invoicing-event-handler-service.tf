

module "invoicing-event-handler-service_sqs_queue" {
  source        = "../modules/aws_sqs"
  queue_name    = "${var.project}-${var.environment}-invoicing-event-handler-service-queue"

}



module "invoicing-event-handler-service-ecr" {
  source          = "../modules/aws_ecr"
  repository_name = "${var.project}-${var.environment}-invoicing-event-handler-service"
}


resource "null_resource" "invoicing-event-handler-service-docker_image" {
  depends_on = [ module.invoicing-event-handler-service-ecr ]
  provisioner "local-exec" {
   command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.invoicing-event-handler-service-ecr.repository_url} >> output_invoicing-event-handler-service.txt 2>&1 && docker info >> output_invoicing-event-handler-service.txt && docker pull public.ecr.aws/docker/library/hello-world:latest >> output_invoicing-event-handler-service.txt && docker tag public.ecr.aws/docker/library/hello-world:latest ${module.invoicing-event-handler-service-ecr.repository_url}:latest >> output_invoicing-event-handler-service.txt && docker push ${module.invoicing-event-handler-service-ecr.repository_url}:latest >> output_invoicing-event-handler-service.txt"
  }
}

module "invoicing-event-handler-service-lambda" {
  source             = "../modules/aws_lambda_docker"
  function_name      = "${var.project}-${var.environment}-invoicing-event-handler-service"
  role_arn           = module.lamda_task_role.role_arn
  docker_image_uri   = "${module.invoicing-event-handler-service-ecr.repository_url}:latest"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.lambda_security_group_outbound_only.security_group_id]
  timeout            = 900
  memory_size        = 128
  environment_variables = {
    AWS_SECRET_ID             = "${module.secret_manager.secret_name}"
    DEFAULT_REGION            = "${var.aws_region}"
    DYNAMO_DB_INVOICING_TABLE = "${var.project}-${var.environment}-invoicing"
    INVOICE_EVENT_SQS         = "${module.invoicing-event-handler-service_sqs_queue.queue_url}"
    CUSTOMER_EVENT_SQS        = "${module.customer-event-handler-service_sqs_queue.queue_url}"
  }
  
  depends_on = [ null_resource.invoicing-event-handler-service-docker_image ]

}

resource "aws_lambda_event_source_mapping" "invoicing-event-handler-service_sqs_trigger" {
  event_source_arn = module.invoicing-event-handler-service_sqs_queue.queue_arn
  function_name    = module.invoicing-event-handler-service-lambda.lambda_function_name
}