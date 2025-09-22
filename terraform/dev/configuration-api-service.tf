module "configuration-api-service-ecr" {
  source          = "../modules/aws_ecr"
  repository_name = "${var.project}-${var.environment}-configuration-api-service"
}


resource "null_resource" "configuration-api-service-docker_image" {
  depends_on = [ module.configuration-api-service-ecr ]
  provisioner "local-exec" {
   command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.configuration-api-service-ecr.repository_url} >> output_configuration-api-service.txt 2>&1 && docker info >> output_configuration-api-service.txt && docker pull public.ecr.aws/docker/library/hello-world:latest >> output_configuration-api-service.txt && docker tag public.ecr.aws/docker/library/hello-world:latest ${module.configuration-api-service-ecr.repository_url}:latest >> output_configuration-api-service.txt && docker push ${module.configuration-api-service-ecr.repository_url}:latest >> output_configuration-api-service.txt"
  }
}

module "configuration-api-service-lambda" {
  source             = "../modules/aws_lambda_docker"
  function_name      = "${var.project}-${var.environment}-configuration-api-service"
  role_arn           = module.lamda_task_role.role_arn
  docker_image_uri   = "${module.configuration-api-service-ecr.repository_url}:latest"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.lambda_security_group_outbound_only.security_group_id]
  timeout            = 900
  memory_size        = 128
  environment_variables = {
    DYNAMO_DB_USER_TABLE   = "${var.project}-${var.environment}-users"
    AWS_SECRET_ID          = "${module.secret_manager.secret_name}"
    DEFAULT_REGION         = "${var.aws_region}"
    DYNAMO_DB_CONFIGURATION_TABLE = "${var.project}-${var.environment}-configuration"
  }
  depends_on = [ null_resource.configuration-api-service-docker_image ]
}


