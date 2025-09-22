variable "email_address" {
  description = "The email addresses to verify for SES"
  type        = list(string)
}

resource "aws_ses_email_identity" "ses_email" {
  for_each = toset(var.email_address)
  email    = each.value
}

output "email_address" {
  description = "The verified email addresses"
  value       = [for email in aws_ses_email_identity.ses_email : email.email]
}