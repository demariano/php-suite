module "file-api-service-ecr" {
  source          = "../modules/aws_ecr"
  repository_name = "${var.project}-${var.environment}-file-api-service"
}


resource "null_resource" "file-api-service-docker_image" {
  depends_on = [ module.file-api-service-ecr ]
  provisioner "local-exec" {
   command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.file-api-service-ecr.repository_url} >> output_file-api-service.txt 2>&1 && docker info >> output_file-api-service.txt && docker pull public.ecr.aws/docker/library/hello-world:latest >> output_file-api-service.txt && docker tag public.ecr.aws/docker/library/hello-world:latest ${module.file-api-service-ecr.repository_url}:latest >> output_file-api-service.txt && docker push ${module.file-api-service-ecr.repository_url}:latest >> output-file-api-service.txt"
  }
}

module "file-api-service-lambda" {
  source             = "../modules/aws_lambda_docker"
  function_name      = "${var.project}-${var.environment}-file-api-service"
  role_arn           = module.lamda_task_role.role_arn
  docker_image_uri   = "${module.file-api-service-ecr.repository_url}:latest"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.lambda_security_group_outbound_only.security_group_id]
  timeout            = 900
  memory_size        = 128
  environment_variables = {
    AWS_SECRET_ID          = "${module.secret_manager.secret_name}"
    DEFAULT_REGION         = "${var.aws_region}"
    S3_BUCKET_NAME         = "${module.lambda_s3_bucket.bucket_name}"
    AWS_COGNITO_AUTHORITY   = "${module.cognito_user_pool.cognito_user_pool_endpoint}"
    AWS_COGNITO_USER_POOL_ID = "${module.cognito_user_pool.cognito_user_pool_id}"
    AWS_COGNITO_CLIENT_ID = "${module.cognito_user_pool.cognito_user_pool_client_id}"
  }
  depends_on = [ null_resource.file-api-service-docker_image ]
}


