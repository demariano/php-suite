

module "report-event-handler-service_sqs_queue" {
  source        = "../modules/aws_sqs"
  queue_name    = "${var.project}-${var.environment}-report-event-handler-service-queue"

}



module "report-event-handler-service-ecr" {
  source          = "../modules/aws_ecr"
  repository_name = "${var.project}-${var.environment}-report-event-handler-service"
}


resource "null_resource" "report-event-handler-service-docker_image" {
  depends_on = [ module.report-event-handler-service-ecr ]
  provisioner "local-exec" {
   command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.report-event-handler-service-ecr.repository_url} >> output_report-event-handler-service.txt 2>&1 && docker info >> output_report-event-handler-service.txt && docker pull public.ecr.aws/docker/library/hello-world:latest >> output_report-event-handler-service.txt && docker tag public.ecr.aws/docker/library/hello-world:latest ${module.report-event-handler-service-ecr.repository_url}:latest >> output_report-event-handler-service.txt && docker push ${module.report-event-handler-service-ecr.repository_url}:latest >> output_report-event-handler-service.txt"
  }
}

module "report-event-handler-service-lambda" {
  source             = "../modules/aws_lambda_docker"
  function_name      = "${var.project}-${var.environment}-report-event-handler-service"
  role_arn           = module.lamda_task_role.role_arn
  docker_image_uri   = "${module.report-event-handler-service-ecr.repository_url}:latest"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.lambda_security_group_outbound_only.security_group_id]
  timeout            = 900
  memory_size        = 128
  environment_variables = {
    AWS_SECRET_ID              = "${module.secret_manager.secret_name}"
    DEFAULT_REGION             = "${var.aws_region}"
    DYNAMO_DB_REPORT_TABLE     = "${var.project}-${var.environment}-report"
    DYNAMO_DB_ACCOUNTING_TABLE = "${var.project}-${var.environment}-accounting"
    DYNAMO_DB_CUSTOMER_TABLE   = "${var.project}-${var.environment}-customer"
    DYNAMO_DB_INVENTORY_TABLE  = "${var.project}-${var.environment}-inventory"
    DYNAMO_DB_INVOICING_TABLE  = "${var.project}-${var.environment}-invoicing"
    DYNAMO_DB_PRODUCT_TABLE    = "${var.project}-${var.environment}-product"
    REPORT_EVENT_SQS           = "${module.report-event-handler-service_sqs_queue.queue_url}"
    REPORT_S3_BUCKET           = "${module.report_s3_bucket.bucket_name}"
  }
  
  depends_on = [ null_resource.report-event-handler-service-docker_image ]

}

resource "aws_lambda_event_source_mapping" "report-event-handler-service_sqs_trigger" {
  event_source_arn = module.report-event-handler-service_sqs_queue.queue_arn
  function_name    = module.report-event-handler-service-lambda.lambda_function_name
}