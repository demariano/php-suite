terraform {
  # Assumes s3 bucket and dynamo DB table already set up
  # See /code/03-basics/aws-backend
  backend "s3" {
    bucket         = "nx-template-dev-tf-state"
    key            = "dev/network.tfstate"
    region         = "eu-west-2"
    use_lockfile   = true
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.47.0"  
    }
  }
}

variable "aws_region" {
  description = "The AWS region"
  type        = string
  default     = "eu-west-2"
}

variable "use_local_profile" {
  description = "Whether to use AWS profile for authentication"
  type        = bool
  default     = false
}

variable "aws_profile" {
  description = "The AWS profile to use for local development"
  type        = string
  default     = "default"
}

variable "s3_bucket_name" {
  description = "The name of the S3 bucket to use for the Terraform state"
  type        = string
  default     = "saxon-dev-tf-state"
}

provider "aws" {
  region  = var.aws_region
  profile = var.use_local_profile ? var.aws_profile : null
}


variable "environment" {
  description = "The environment name"
  type        = string
}

variable "project" {
  description = "The project name"
  type        = string
}

variable "health_check_path" {
  description = "The path for the health check"
  type        = string
}

variable "repository-url" {
  description = "Repository URL"
  type        = string
}

variable "repository-name" {
  description = "Repository Name"
  type        = string
}

variable "ses_email_address" {
  description = "The email address for SES configuration"
  type        = string
  default     = "dennis@old.st"
}

variable "mfa_configuration" {
  description = "Multi-factor authentication configuration for Cognito user pool"
  type        = string

}

variable "enable_software_token_mfa" {
  description = "Enable software token MFA (TOTP)"
  type        = bool
  default     = true
}

## VPC
module "vpc" {
  source = "../modules/aws_vpc"

  name            = "${var.project}-${var.environment}-vpc"
  cidr            = "10.0.0.0/16"
  azs             = ["eu-west-2a", "eu-west-2b", "eu-west-2c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.3.0/24", "10.0.4.0/24"]
}

output "vpc_id" {
  description = "The VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "The Public Subnet IDs"
  value       = module.vpc.public_subnet_ids

}

output "private_subnet_ids" {
  description = "The Private Subnet IDs"
  value       = module.vpc.private_subnet_ids

}
## VPC

##Security Groups

# Allow All traffic for WebApp
module "webapp_load_balancer_security_group" {
  source = "../modules/aws_security_groups_all_traffic"

  vpc_id                     = module.vpc.vpc_id
  security_group_name        = "${var.project}-${var.environment}-allow-all"
  security_group_description = "Allow all traffic for WebApp"
}

# Allow traffic only from the load balancer for WebApp
module "webapp_security_group_from_alb" {
  source = "../modules/aws_security_group_from_alb"

  load_balancer_security_group_id = module.webapp_load_balancer_security_group.security_group_id
  specific_port                   = 3000
  security_group_name             = "${var.project}-${var.environment}-webapp-loadbalancer-sg"
  security_group_description      = "Allow traffic from the load balancer for webapp"
  vpc_id                          = module.vpc.vpc_id
}

output "webapp_security_group_id_from_alb" {
  description = "The ALB ID of the security group for webapp"
  value       = module.webapp_security_group_from_alb.security_group_id
}

# Allow Outbound traffic for WebApp
module "webapp_security_group_outbound_only" {
  source = "../modules/aws_security_group_outbound_only"

  vpc_id                     = module.vpc.vpc_id
  security_group_name        = "${var.project}-${var.environment}-webapp-outbound-only"
  security_group_description = "Allow outbound traffic only for webapp"
}

output "webapp_security_group_id_outbound_only" {
  description = "The ID of the security group outbound only for webapp"
  value       = module.webapp_security_group_outbound_only.security_group_id

}

module "lambda_security_group_outbound_only" {
  source                     = "../modules/aws_security_group_outbound_only"
  vpc_id                     = module.vpc.vpc_id
  security_group_name        = "${var.project}-${var.environment}-lambda-outbound-only"
  security_group_description = "Allow outbound traffic only for Lambda Functions"
}

output "lambda_security_group_id_outbound_only" {
  description = "The ID of the security group outbound only for lambda"
  value       = module.lambda_security_group_outbound_only.security_group_id

}

##Security Groups

# ## LOAD BALANCER- HTTP ONLY
# # This is intended for Load Balancers where Certificates are not available
module "webapp_load_balancer" {
  source = "../modules/aws_load_balancer_http"

  alb_name          = "${var.project}-${var.environment}-webapp-alb"
  subnets           = module.vpc.public_subnet_ids
  security_groups   = [module.webapp_load_balancer_security_group.security_group_id]
  target_group_name = "${var.project}-${var.environment}-target-group"
  vpc_id            = module.vpc.vpc_id
  listener_port     = 80
  health_check_path = var.health_check_path
}


output "webapp_target_group_arn_http_only" {
  description = "The ARN of the target group for webapp"
  value       = module.webapp_load_balancer.target_group_arn
}

## LOAD BALANCER- HTTP ONLY

## LOAD BALANCER- HTTPS
# module "webapp_load_balancer_https" {
#   source            = "../modules/aws_load_balancer_https"
#   domain_name       = "${var.environment}.old.st"
#   certificate_arn   = "arn:aws:acm:eu-west-1:654654478981:certificate/eef695ba-8d20-4da7-a475-8adfea7fdae2"
#   alb_name          = "${var.project}-${var.environment}-webapp2-alb"
#   subnets           = module.vpc.public_subnet_ids
#   security_groups   = [module.webapp_load_balancer_security_group.security_group_id]
#   target_group_name = "${var.project}-${var.environment}-target-group"
#   vpc_id            = module.vpc.vpc_id
#   listener_port     = 80
#   health_check_path = var.health_check_path
# }
# # ## LOAD BALANCER- HTTPS


# output "alb_arn" {
#   description = "The ARN of the Target Group for HTTPS"
#   value       = module.webapp_load_balancer_https.target_group_arn
# }

## LOAD BALANCER- HTTPS


module "ecs_task_role" {
  source    = "../modules/aws_iam_role"
  services  = ["ecs-tasks.amazonaws.com"]
  role_name = "${var.project}-${var.environment}-ecs-task-role"
}

module "ecs_task_execution_role_policy_attachment" {
  source     = "../modules/aws_iam_role_policy_attachment"
  role_name  = module.ecs_task_role.role_name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"

}

module "ecs_s3_access_policy_attachment" {
  source     = "../modules/aws_iam_role_policy_attachment"
  role_name  = module.ecs_task_role.role_name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}


module "ecs_full_access_policy_attachment" {
  source     = "../modules/aws_iam_role_policy_attachment"
  role_name  = module.ecs_task_role.role_name
  policy_arn = "arn:aws:iam::aws:policy/AmazonECS_FullAccess"
}

output "ecs_task_role_arn" {
  description = "The ARN of the ECS Task Role"
  value       = module.ecs_task_role.role_arn
}


module "codebuild_iam_role" {
  source    = "../modules/aws_iam_role"
  services  = ["codebuild.amazonaws.com", "codepipeline.amazonaws.com"]
  role_name = "${var.project}-${var.environment}-codebuild-role"
}

data "aws_iam_policy_document" "codebuild_policy" {
  statement {
    actions = [
      "*"
    ]
    resources = ["*"]
    effect = "Allow"
  }
}

module "codebuild_policy" {
  source          = "../modules/aws_iam_policy"
  role_name       = "${var.project}-${var.environment}-codebuild-role"
  policy_document = data.aws_iam_policy_document.codebuild_policy.json
}

module "codebuild_policy_attachment" {
  source     = "../modules/aws_iam_role_policy_attachment"
  role_name  = module.codebuild_iam_role.role_name
  policy_arn = module.codebuild_policy.policy_arn
}

output "codebuild_role_arn" {
  description = "The ARN of the CodeBuild Role for CodePipeline"
  value       = module.codebuild_iam_role.role_arn
}


module "lamda_task_role" {
  source    = "../modules/aws_iam_role"
  services  = ["lambda.amazonaws.com"]
  role_name = "${var.project}-${var.environment}-lambda-role"
}

module "lamda_task_role_role_policy_attachment" {
  source     = "../modules/aws_iam_role_policy_attachment"
  role_name  = module.lamda_task_role.role_name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

data "aws_iam_policy_document" "lambda-policy" {
  statement {
    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:DeleteItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query",
      "dynamodb:Scan"
    ]
      resources = [
      "arn:aws:dynamodb:${var.aws_region}:*:table/${var.project}-${var.environment}-*",
      "arn:aws:dynamodb:${var.aws_region}:*:table/${var.project}-${var.environment}-*/*"
    ]
  }

  statement {
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket",
      "s3:DeleteObject"
    ]
    resources = ["arn:aws:s3:::*", "arn:aws:s3:::*/*"]
  }

  statement {
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
      "secretsmanager:ListSecretVersionIds"
    ]
    resources = ["arn:aws:secretsmanager:*:*:secret:*"]
  }

  statement {
    actions = [
      "sns:Publish",
      "sns:Subscribe",
      "sns:Unsubscribe",
      "sns:ListTopics"
    ]
    resources = ["arn:aws:sns:*:*:*"]
  }

  statement {
    actions = [
      "sqs:SendMessage",
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ListQueues"
    ]
    resources = ["arn:aws:sqs:*:*:*"]
  }

  statement {
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail"
    ]
    resources = ["*"]
  }

  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams"
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }

  statement {
    actions = [
      "lambda:InvokeFunction"
    ]
    resources = [
      "arn:aws:lambda:*:*:function:*"
    ]
  }

  statement {
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:GenerateDataKey",
      "kms:DescribeKey"
    ]
    resources = ["arn:aws:kms:*:*:key/*"]
  }

  statement {
    actions = [
      "cognito-sync:*",
      "cognito-identity:*",
      "cognito-idp:*"
    ]
    resources = [
      "arn:aws:cognito-sync:*:*:*",
      "arn:aws:cognito-identity:*:*:*",
      "arn:aws:cognito-idp:*:*:*"
    ]
  }

  statement {
    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:DeleteItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query",
      "dynamodb:Scan"
    ]
  resources = [
      "arn:aws:dynamodb:${var.aws_region}:*:table/${var.project}-${var.environment}-*",
      "arn:aws:dynamodb:${var.aws_region}:*:table/${var.project}-${var.environment}-*/*"
    ]
   }

  statement {
    actions = [
      "execute-api:Invoke",
      "execute-api:ManageConnections"
    ]
    resources = ["arn:aws:execute-api:*:*:*"]
  }

}

module "lambda_policy_dynamodb" {
  source          = "../modules/aws_iam_policy"
  role_name       = "${var.project}-${var.environment}-policy-access"
  policy_document = data.aws_iam_policy_document.lambda-policy.json
}

module "lambda_dynamodb_policy_attachment" {
  source     = "../modules/aws_iam_role_policy_attachment"
  role_name  = module.lamda_task_role.role_name
  policy_arn = module.lambda_policy_dynamodb.policy_arn
}



output "lambda_role_name" {
  value = module.lamda_task_role.role_name
}

output "lambda_role_arn" {
  value = module.lamda_task_role.role_arn
}

output "debug_mfa_config" {
  value = var.mfa_configuration
}

# Add Secrets Manager policy for ECS task role
data "aws_iam_policy_document" "ecs_secrets_manager_policy" {
  statement {
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
      "secretsmanager:ListSecretVersionIds"
    ]
    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:*:secret:${var.project}-${var.environment}-secret*"
    ]
  }
}

module "ecs_secrets_manager_policy" {
  source          = "../modules/aws_iam_policy"
  role_name       = "${var.project}-${var.environment}-ecs-secrets-manager-policy"
  policy_document = data.aws_iam_policy_document.ecs_secrets_manager_policy.json
}

module "ecs_secrets_manager_policy_attachment" {
  source     = "../modules/aws_iam_role_policy_attachment"
  role_name  = module.ecs_task_role.role_name
  policy_arn = module.ecs_secrets_manager_policy.policy_arn
}

# Add this after your existing ECS policy attachments
module "ecs_secrets_manager_read_policy_attachment" {
  source     = "../modules/aws_iam_role_policy_attachment"
  role_name  = module.ecs_task_role.role_name
  policy_arn = "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
}













