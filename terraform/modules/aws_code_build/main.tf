variable "codebuild_name" {
  description = "The name of the CodeBuild project"
  type        = string
  
}

variable "repository_url" {
  description = "The URL of the GitHub repository"
  type        = string
}

variable "branch_name" {
  description = "The name of the branch"
  type        = string
}

variable "codebuild_role_arn" {
  description = "The ARN of the IAM role"
  type        = string
}

variable "buildspec_file" {
  description = "The path to the buildspec file"
  type        = string
}

variable "environment_variables" {
  description = "Environment variables for the CodeBuild project"
  type        = map(string)
  default     = {}
}






resource "aws_codebuild_project" "project" {
  name          = var.codebuild_name
  description   = "CodeBuild project for ${var.codebuild_name}"
  build_timeout = "60"
  service_role  = var.codebuild_role_arn
  source_version = "${var.branch_name}"
  

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

     dynamic "environment_variable" {
      for_each = var.environment_variables
      iterator = env
      content {
        name  = env.key
        value = env.value
      }
    }
  }

  source {
    type            = "GITHUB"
    
    location        = var.repository_url
    git_clone_depth = 1
    buildspec       = var.buildspec_file

  

    git_submodules_config {
      fetch_submodules = true
    }

   
  }



}

output "codebuild_project_name" {
  value = aws_codebuild_project.project.name
 
}