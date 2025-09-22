variable "secret_name" {
  description = "The name of the secret"
  type        = string
}

variable "secret_description" {
  description = "The description of the secret"
  type        = string
  default     = ""
}

variable "secret_variables" {
  description = "The secret variables"
  type        = map(string)
  default     = {}
  
}

resource "aws_secretsmanager_secret" "secret" {
  name        = var.secret_name
  description = var.secret_description
  recovery_window_in_days = 0
  
}

resource "aws_secretsmanager_secret_version" "variables" {
  secret_id     = aws_secretsmanager_secret.secret.id
  secret_string = jsonencode(var.secret_variables)
}

output "secret_arn" {
  description = "The ARN of the secret"
  value       = aws_secretsmanager_secret.secret.arn
}

output "secret_name" {
  description = "The ARN of the secret"
  value       = aws_secretsmanager_secret.secret.name
}