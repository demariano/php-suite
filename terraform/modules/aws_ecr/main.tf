variable "repository_name" {
  description = "The name of the ECR repository"
  type        = string
}
data "aws_ecr_authorization_token" "token" {}

resource "aws_ecr_repository" "repository" {
  name                 = var.repository_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  force_delete = true

}


output "repository_url" {
  description = "The URL of the ECR repository"
  value       = aws_ecr_repository.repository.repository_url
  sensitive   = false
}

output "token_proxy_endpoint" {
  description = "The ECR authorization token"
  value       = data.aws_ecr_authorization_token.token.proxy_endpoint
  sensitive   = true
}

output "token_password" {
  description = "The ECR authorization token"
  value       = data.aws_ecr_authorization_token.token.password

}

output "repository_name" {
  description = "The name of the ECR repository"
  value       = aws_ecr_repository.repository.name
}

