variable "description" {
  description = "The description of the KMS key"
  type        = string
}


variable "deletion_window_in_days" {
  description = "The number of days to wait before deleting the KMS key"
  type        = number
}
variable "rotation_period_in_days" {
  description = "The number of days to wait before rotating the KMS key"
  type        = number
}


resource "aws_kms_key" "my_key" {
  description             = var.description
  deletion_window_in_days = var.deletion_window_in_days
  enable_key_rotation     = true
  rotation_period_in_days = var.rotation_period_in_days
  tags = {
    "Description" = var.description
  }
}

resource "aws_kms_alias" "my_key_alias" {
  
  name          = "alias/${var.description}"
  target_key_id = aws_kms_key.my_key.id
}

output "key_arn" {
  value = aws_kms_key.my_key.arn
}

