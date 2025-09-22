variable "policy_document" {
  description = "The IAM policy document for the Lambda function"
  type        = string
}

variable "role_name" {
  description = "The name of the IAM role"
  type        = string
}


resource "aws_iam_policy" "policy" {
  name        = "${var.role_name}_policy"
  description = "Custom Policy "
  policy      = var.policy_document
}


output "policy_arn" {
  value = aws_iam_policy.policy.arn
  
}