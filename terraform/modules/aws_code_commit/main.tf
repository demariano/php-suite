variable "repository_name" {
  description = "The name of the repository"
  type        = string
}

variable "description" {
  description = "A description of the repository"
  type        = string
  default     = ""
}




resource "aws_codecommit_repository" "repository" {
  repository_name = var.repository_name
  description     = var.description
}

output "repository_id" {
  description = "The id of the repository"
  value       = aws_codecommit_repository.repository.id
  
}

output "repository_arn" {
  description = "The ARN of the repository"
  value       = aws_codecommit_repository.repository.arn
}

output "repository_url" {
  description = "The URL to clone the repository over HTTPS"
  value       = aws_codecommit_repository.repository.clone_url_http
}

output "repository_clone_url_ssh" {
  description = "The URL to clone the repository over SSH"
  value       = aws_codecommit_repository.repository.clone_url_ssh
}