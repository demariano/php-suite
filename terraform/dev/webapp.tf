module "webapp-service-ecr" {
  source          = "../modules/aws_ecr"
  repository_name = "${var.project}-${var.environment}-web-app"
}
# //ECR




# ECS Task Definition
module "webapp_task_definition" {
  source = "../modules/aws_ecs_task_definition"

  task_definition_name = "${var.project}-${var.environment}-web-app-task"
  task_role_arn        = module.ecs_task_role.role_arn
  execution_role_arn   = module.ecs_task_role.role_arn
  ecr_repository_url   = "${module.webapp-service-ecr.repository_url}:latest"
  container_port       = 3000
  host_port            = 3000
  cpu                  = "256"
  memory               = "512"
  log_group            = "${var.project}-${var.environment}-web-app-log-group"
  log_region           = var.aws_region
  os_family            = "LINUX"
  cpu_architecture     = "X86_64"

  // Add environment variables
  environment_variables = {
    NODE_ENV                  = "dev"
    AWS_SECRET_ID             = module.secret_manager.secret_name
    S3_BUCKET_NAME            = "${var.project}-${var.environment}-data"
    API_AUTHENTICATION_URL    = "${module.authentication-api-service-lambda.lambda_function_invoke_arn}api/authentication"
    API_USER_URL              = "${module.user-api-service-lambda.lambda_function_invoke_arn}api/user"
    DEFAULT_REGION                = var.aws_region
    WEBSOCKET_URL             = "${module.websocket-api-gateway.management_api_endpoint}"
    PING_INTERVAL             = "300"
  }
}

## ECS Cluster
module "ecs_cluster" {
  source = "../modules/aws_ecs_cluster"

  cluster_name = "${var.project}-${var.environment}-web-app-cluster"
}

module "webapp_ecs_service" {
  source = "../modules/aws_ecs"
  service_name     = "${var.project}-${var.environment}-web-app"
  cluster          = module.ecs_cluster.ecs_cluster_id
  task_definition  = module.webapp_task_definition.ecs_task_definition_arn
  desired_count    = 1
  subnets          = module.vpc.private_subnet_ids
  security_groups  = [module.webapp_security_group_from_alb.security_group_id]
  target_group_arn = module.webapp_load_balancer.target_group_arn
  container_name   = "${var.project}-${var.environment}-web-app-task"
  container_port   = 3000

 
 }