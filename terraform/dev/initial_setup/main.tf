terraform {

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.47.0"  
    }
  }
}

variable "aws_profile" {
  description = "The AWS profile to use "
  type        = string
  default     = "default"
}

variable "github_token" {
  description = "The GitHub token to use"
  type        = string
  sensitive   = true
}

provider "aws" {
  region = "eu-west-2"
  profile = var.aws_profile
}

resource "aws_s3_bucket" "terraform_state" {
  bucket        = "haven-dev-tf-state" 
  force_destroy = true
}

resource "aws_s3_bucket_versioning" "terraform_bucket_versioning" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}


resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state_crypto_conf" {
  bucket        = aws_s3_bucket.terraform_state.bucket 
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-dev-locking"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
}

resource "aws_secretsmanager_secret" "terraform_config" {
  name = "terraform_config"
}

resource "aws_secretsmanager_secret_version" "github_token_version" {
  secret_id     = aws_secretsmanager_secret.terraform_config.id
  secret_string = jsonencode({
    github_token = var.github_token
  })
}
