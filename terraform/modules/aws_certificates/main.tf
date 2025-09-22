variable "domain_name" {
  description = "The fully qualified domain name for the certificate"
  type        = string
}

variable "alt_domain_names" {
  description = "The alternative domain names for the certificate. Can be empty or a list of strings."
  type        = list(string)
}

variable "validation_method" {
  description = "Which method to use for validation. DNS or EMAIL are valid, EMAIL is not recommended for security reasons."
  type        = string
  default     = "DNS"
}




variable "region" {
  description = "Region to create the certificate in."
  type        = string
}

provider "aws" {
  alias  = "region"
  region = var.region
}

resource "aws_acm_certificate" "cert" {
  provider                  = aws.region
  domain_name               = var.domain_name
  subject_alternative_names = var.alt_domain_names
  validation_method         = var.validation_method
  tags = {
    Name = var.domain_name
  }
}

output "certificate_arn" {
  description = "The ARN of the certificate"
  value       = aws_acm_certificate.cert.arn
}
