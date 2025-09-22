

variable "cognito_pool_name" {
  description = "Cognito pool name"
  type        = string
}

variable "cognito_client_name" {
  description = "Cogntio client name"
  type        = string
}

variable "cognito_domain_name" {
  description = "Cognito domain name"
  type        = string
}

variable "sms_iam_role" {
  description = "IAM role for SMS"
  type        = string
  
}
variable "sms_external_id" {
  description = "External ID for SMS"
  type        = string
  
}

variable "custom_message_lambda_arn" {
  description = "Custom message lambda arn"
  type        = string
}

variable "ses_source_arn" {
  description = "SES source ARN for email sending"
  type        = string
}

variable "from_email_address" {
  description = "From email address for Cognito emails"
  type        = string
}

variable "mfa_configuration" {
  description = "Multi-factor authentication configuration for Cognito user pool"
  type        = string
  default     = "OPTIONAL"
  
  validation {
    condition     = contains(["OFF", "ON", "OPTIONAL"], var.mfa_configuration)
    error_message = "MFA configuration must be one of: OFF, ON, or OPTIONAL."
  }
}

variable "enable_software_token_mfa" {
  description = "Enable software token MFA (TOTP)"
  type        = bool
  default     = true
}

variable "enable_email_mfa" {
  description = "Enable email MFA"
  type        = bool
  default     = true
}

variable "email_mfa_message" {
  description = "Email MFA message template"
  type        = string
  default     = "Your verification code is {####}. Please enter this code to complete your sign-in."
}

variable "email_mfa_subject" {
  description = "Email MFA subject"
  type        = string
  default     = "Your verification code for sign-in"
}


resource "aws_cognito_user_pool" "main" {
  name = var.cognito_pool_name

  password_policy {
    minimum_length                   = 8
    require_uppercase                = true
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  username_attributes = ["email"]

  # REQUIRED: At least 2 account recovery settings for email MFA
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
    recovery_mechanism {
      name     = "verified_phone_number"
      priority = 2
    }
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_message        = "Your verification code is {####}."
    email_subject        = "Your verification code"
  }

  email_configuration {
    email_sending_account = "DEVELOPER"
    source_arn           = var.ses_source_arn
    from_email_address   = var.from_email_address
  }

 

  admin_create_user_config {
    allow_admin_create_user_only = false

    invite_message_template {
      email_message = "Your username is {username} and temporary password is {####}."
      email_subject = "Your temporary password"
      sms_message   = "Your username is {username} and temporary password is {####}."
    }
  }

  lambda_config {
    custom_message = var.custom_message_lambda_arn
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    mutable             = true
    required            = true
  }

  mfa_configuration          = var.mfa_configuration
  sms_authentication_message = "Your code is {####}"
  
  # NOW you can add email MFA configuration!
  dynamic "email_mfa_configuration" {
    for_each = var.enable_email_mfa ? [1] : []
    content {
      message = var.email_mfa_message
      subject = var.email_mfa_subject
    }
  }
  
  software_token_mfa_configuration {
    enabled = var.enable_software_token_mfa
  }

  sms_configuration {
    external_id = var.sms_external_id
    sns_caller_arn = var.sms_iam_role
  }

  auto_verified_attributes = ["email"]

  tags = {
    Environment = "production"
  }

  lifecycle {
    ignore_changes = [
      password_policy,
      schema
    ]
  }
}

resource "aws_cognito_user_pool_client" "main" {
  name = var.cognito_client_name

  allowed_oauth_flows  = ["code"]
  allowed_oauth_scopes = ["email", "phone", "openid"]
  callback_urls        = ["http://localhost:3000/auth/login"]
  default_redirect_uri = "http://localhost:3000/auth/login"
  logout_urls          = ["http://localhost:3000/auth/logout"]

  explicit_auth_flows = [
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",
    "ALLOW_CUSTOM_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
  access_token_validity  = 7
  id_token_validity      = 7
  refresh_token_validity = 30
  

  generate_secret = false
  user_pool_id    = aws_cognito_user_pool.main.id

  supported_identity_providers = ["COGNITO"]
  allowed_oauth_flows_user_pool_client = true

 

  
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.cognito_domain_name
  user_pool_id = aws_cognito_user_pool.main.id
}

output "arn" {
  value = aws_cognito_user_pool.main.arn
}

output "client_id" {
  value = aws_cognito_user_pool_client.main.id
}

output "pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "endpoint" {
  value = aws_cognito_user_pool.main.endpoint
}

output "domain" {
  value = aws_cognito_user_pool_domain.main.domain
}

# Add backward compatibility outputs with the expected names
output "cognito_user_pool_endpoint" {
  value = aws_cognito_user_pool.main.endpoint
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_client_id" {
  value = aws_cognito_user_pool_client.main.id
}
