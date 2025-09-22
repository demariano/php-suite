

resource "null_resource" "cognito-custom-message-docker_image" {
  depends_on = [ module.cognito-custom-message-service-ecr ]
  provisioner "local-exec" {
   command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.cognito-custom-message-service-ecr.repository_url} >> output_cognito-custom-message-service.txt 2>&1 && docker info >> output_cognito-custom-message-service.txt && docker pull public.ecr.aws/docker/library/hello-world:latest >> output_cognito-custom-message-service.txt && docker tag public.ecr.aws/docker/library/hello-world:latest ${module.cognito-custom-message-service-ecr.repository_url}:latest >> output_cognito-custom-message-service.txt && docker push ${module.cognito-custom-message-service-ecr.repository_url}:latest >> output_cognito-custom-message-service.txt"
  }
}


module "cognito-custom-message-service-ecr" {
  source          = "../modules/aws_ecr"
  repository_name = "${var.project}-${var.environment}-cognito-custom-message-service"
}



module "cognito-custom-message-service-lambda" {
  source             = "../modules/aws_lambda_docker"
  function_name      = "${var.project}-${var.environment}-cognito-custom-message-service"
  role_arn           = module.lamda_task_role.role_arn
  docker_image_uri   = "${module.cognito-custom-message-service-ecr.repository_url}:latest"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.lambda_security_group_outbound_only.security_group_id]
  timeout            = 900
  memory_size        = 128
  environment_variables = {
    AWS_SECRET_ID          = "${module.secret_manager.secret_name}"
    DEFAULT_REGION         = "${var.aws_region}"
    DYNAMO_DB_EMAIL_TEMPLATE_TABLE = "${var.project}-${var.environment}-email-template"
  }
  depends_on = [ null_resource.cognito-custom-message-docker_image ]

}
