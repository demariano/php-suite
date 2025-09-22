module "authentication-api-service-ecr" {
  source          = "../modules/aws_ecr"
  repository_name = "${var.project}-${var.environment}-authentication-api-service"
}


resource "null_resource" "authentication-api-service-docker_image" {
  depends_on = [ module.authentication-api-service-ecr ]
  provisioner "local-exec" {
   command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.authentication-api-service-ecr.repository_url} >> output_authentication-api-service.txt 2>&1 && docker info >> output_authentication-api-service.txt && docker pull public.ecr.aws/docker/library/hello-world:latest >> output_authentication-api-service.txt && docker tag public.ecr.aws/docker/library/hello-world:latest ${module.authentication-api-service-ecr.repository_url}:latest >> output_authentication-api-service.txt && docker push ${module.authentication-api-service-ecr.repository_url}:latest >> output_authentication-api-service.txt"
  }
}

module "authentication-api-service-lambda" {
  source             = "../modules/aws_lambda_docker"
  function_name      = "${var.project}-${var.environment}-authentication-api-service"
  role_arn           = module.lamda_task_role.role_arn
  docker_image_uri   = "${module.authentication-api-service-ecr.repository_url}:latest"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.lambda_security_group_outbound_only.security_group_id]
  timeout            = 900
  memory_size        = 128
  environment_variables = {
    DYNAMO_DB_AUTHENTICATION_TABLE   = "${var.project}-${var.environment}-authentication"
    AWS_SECRET_ID          = "${module.secret_manager.secret_name}"
    DEFAULT_REGION         = "${var.aws_region}"
    AWS_COGNITO_AUTHORITY   = "${module.cognito_user_pool.cognito_user_pool_endpoint}"
    AWS_COGNITO_USER_POOL_ID = "${module.cognito_user_pool.cognito_user_pool_id}"
    AWS_COGNITO_CLIENT_ID = "${module.cognito_user_pool.cognito_user_pool_client_id}"
    DYNAMO_DB_CONFIGURATION_TABLE = "${var.project}-${var.environment}-configuration"
  }
  depends_on = [ null_resource.authentication-api-service-docker_image ]
}


