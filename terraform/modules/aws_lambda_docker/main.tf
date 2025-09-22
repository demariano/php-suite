 variable "function_name" {
  description = "The name of the lambda function"
  type        = string
}

variable "docker_image_uri" {
  description = "The URI of the Docker image"
  type        = string
}

variable "role_arn" {
  description = "The Arn of the IAM role that Lambda assumes when it executes your function"
  type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC"
  type        = string
}

variable "subnet_ids" {
  description = "The IDs of the subnets"
  type        = list(string)
}

variable "security_group_ids" {
  description = "The IDs of the security groups"
  type        = list(string)
}

variable "timeout" {
  description = "The amount of time your Lambda function has to run in seconds"
  type        = number
  default     = 900
}

variable "memory_size" {
  description = "The amount of memory that your function has access to in MB"
  type        = number
  default     = 128
}

variable "environment_variables" {
  description = "Environment variables for the Lambda function"
  type        = map(string)
  default     = {}
  
}

resource "aws_lambda_function" "lambda_docker" {
  function_name = var.function_name
  role          = var.role_arn
  package_type  = "Image"
  timeout       = var.timeout
  memory_size   = var.memory_size

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }

  image_uri = var.docker_image_uri
  
  environment {
    variables = var.environment_variables
  }
}

resource "aws_lambda_function_url" "function" {
    function_name      = aws_lambda_function.lambda_docker.function_name
    authorization_type = "NONE"
  #   cors {
  #   allow_credentials = true
  #   allow_origins     = ["*"]
  #   allow_methods     = ["*"]
  #   allow_headers     = ["date", "keep-alive"]
  #   expose_headers    = ["keep-alive", "date"]
  #   max_age           = 86400


  # }


}

output "lambda_function_arn" {
  description = "The ARN of the Lambda function"
  value       = aws_lambda_function.lambda_docker.arn
}

output "lambda_function_invoke_arn" {
  description = "The ARN to be used for invoking Lambda Function from Function URL "
  value       = aws_lambda_function_url.function.function_url
}

output "lambda_function_name" {
  description = "The name of the Lambda function"
  value       = aws_lambda_function.lambda_docker.function_name
}