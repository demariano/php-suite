module "local-test-service-ecr" {
  source          = "../modules/aws_ecr"
  repository_name = "${var.project}-${var.environment}-local-test-service"
}


resource "null_resource" "local-test-service-docker_image" {
  depends_on = [ module.local-test-service-ecr ]
  provisioner "local-exec" {
   command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.local-test-service-ecr.repository_url} >> output_local-test-service.txt 2>&1 && docker info >> output_local-test-service.txt && docker pull public.ecr.aws/docker/library/hello-world:latest >> output_local-test-service.txt && docker tag public.ecr.aws/docker/library/hello-world:latest ${module.local-test-service-ecr.repository_url}:latest >> output_local-test-service.txt && docker push ${module.local-test-service-ecr.repository_url}:latest >> output_local-test-service.txt"
  }
}

module "local-test-service-lambda" {
  source             = "../modules/aws_lambda_docker"
  function_name      = "${var.project}-${var.environment}-local-test-service"
  role_arn           = module.lamda_task_role.role_arn
  docker_image_uri   = "${module.local-test-service-ecr.repository_url}:latest"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.lambda_security_group_outbound_only.security_group_id]
  timeout            = 900
  memory_size        = 128
  environment_variables = {
    DYNAMO_DB_USER_TABLE   = "${var.project}-${var.environment}-users"
    AWS_SECRET_ID          = "${module.secret_manager.secret_name}"
    DEFAULT_REGION         = "${var.aws_region}"
    BYPASS_AUTH            = "ENABLED"
    BYPASS_AUTH_ROLES      = "SUPER_ADMIN"
  }
  depends_on = [ null_resource.local-test-service-docker_image ]
}


