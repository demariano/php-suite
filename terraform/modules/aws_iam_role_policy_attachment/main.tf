variable "policy_arn" {
  description = "The ARN of the policy"
  type        = string
  
}

variable "role_name" {
  description = "The arn of the role"
  type        = string
  
}

resource "aws_iam_role_policy_attachment" "role_policy_attachment" {
  role       = var.role_name
  policy_arn = var.policy_arn
}