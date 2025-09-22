
variable "role_name" {
  description = "The name of the role"
  type        = string
}

variable "service" {
   description = "The service that will assume the role"
   type        = string
  
}

variable "external_id" {
  description = "The external ID for the sts:ExternalId condition"
  type        = string
  default     = null
}



resource "aws_iam_role" "role" {
  name = var.role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = var.service
        }
         Condition = var.external_id != null ? {
          StringEquals = {
            "sts:ExternalId" = var.external_id
          }
        } : null
      },
    ]
  })
}

output "role_arn" {
  description = "The ARN of the execution role"
  value       = aws_iam_role.role.arn
}

output "role_name" {
  description = "The name of the IAM role"
  value       = aws_iam_role.role.name
}