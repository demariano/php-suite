

module "[APP-NAME]_sqs_queue" {
  source        = "../modules/aws_sqs"
  queue_name    = "${var.project}-${var.environment}-[APP-NAME]-queue"

}



module "[APP-NAME]-ecr" {
  source          = "../modules/aws_ecr"
  repository_name = "${var.project}-${var.environment}-[APP-NAME]"
}


resource "null_resource" "[APP-NAME]-docker_image" {
  depends_on = [ module.[APP-NAME]-ecr ]
  provisioner "local-exec" {
   command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.[APP-NAME]-ecr.repository_url} >> output_[APP-NAME].txt 2>&1 && docker info >> output_[APP-NAME].txt && docker pull public.ecr.aws/docker/library/hello-world:latest >> output_[APP-NAME].txt && docker tag public.ecr.aws/docker/library/hello-world:latest ${module.[APP-NAME]-ecr.repository_url}:latest >> output_[APP-NAME].txt && docker push ${module.[APP-NAME]-ecr.repository_url}:latest >> output_[APP-NAME].txt"
  }
}

module "[APP-NAME]-lambda" {
  source             = "../modules/aws_lambda_docker"
  function_name      = "${var.project}-${var.environment}-[APP-NAME]"
  role_arn           = module.lamda_task_role.role_arn
  docker_image_uri   = "${module.[APP-NAME]-ecr.repository_url}:latest"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.lambda_security_group_outbound_only.security_group_id]
  timeout            = 900
  memory_size        = 128
  environment_variables = {
    DYNAMO_DB_USER_TABLE   = "${var.project}-${var.environment}-users"
    AWS_SECRET_ID          = "${module.secret_manager.secret_name}"
    DEFAULT_REGION         = "${var.aws_region}"
  }
  
  depends_on = [ null_resource.[APP-NAME]-docker_image ]

}

resource "aws_lambda_event_source_mapping" "[APP-NAME]_sqs_trigger" {
  event_source_arn = module.[APP-NAME]_sqs_queue.queue_arn
  function_name    = module.[APP-NAME]-lambda.lambda_function_name
}