



module "disconnect-service-ecr" {
  source          = "../modules/aws_ecr"
  repository_name = "${var.project}-${var.environment}-disconnect-service"
}


resource "null_resource" "disconnect-service-docker_image" {
  depends_on = [ module.disconnect-service-ecr ]
  provisioner "local-exec" {
   command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.disconnect-service-ecr.repository_url} >> output_disconnect-service.txt 2>&1 && docker info >> output_disconnect-service.txt && docker pull public.ecr.aws/docker/library/hello-world:latest >> output_disconnect-service.txt && docker tag public.ecr.aws/docker/library/hello-world:latest ${module.disconnect-service-ecr.repository_url}:latest >> output_disconnect-service.txt && docker push ${module.disconnect-service-ecr.repository_url}:latest >> output_disconnect-service.txt"
  }
}

module "disconnect-service-lambda" {
  source             = "../modules/aws_lambda_docker"
  function_name      = "${var.project}-${var.environment}-disconnect-service"
  role_arn           = module.lamda_task_role.role_arn
  docker_image_uri   = "${module.disconnect-service-ecr.repository_url}:latest"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.lambda_security_group_outbound_only.security_group_id]
  timeout            = 900
  memory_size        = 128
  environment_variables = {
    DEFAULT_REGION         = "${var.aws_region}"
    DYNAMO_DB_WEBSOCKET_CONNECTION_TABLE = "${var.project}-${var.environment}-web-socket-connection"
     AWS_SECRET_ID          = "${module.secret_manager.secret_name}"
  }
  
  depends_on = [ null_resource.disconnect-service-docker_image ]

}
