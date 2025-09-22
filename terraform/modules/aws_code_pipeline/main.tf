variable "repository_name" {
  description = "The name of the CodeCommit repository"
  type        = string
}

variable "pipeline_name" {
  description = "The name of the CodePipeline"
  type        = string
}

variable "codebuild_project_name" {
  description = "The name of the CodeBuild project"
  type        = string
}

variable "iam_role_arn" {
  description = "The ARN of the IAM role"
  type        = string
}



variable "branch_name" {
  description = "The branch of the GitHub repository"
  type        = string
}

variable "github_owner" {
  description = "The GitHub owner (user or organization)"
  type        = string
}



resource "aws_codestarconnections_connection" "github_connection" {
  name          = "${var.pipeline_name}"
  provider_type = "GitHub"
}

resource "aws_codepipeline" "pipeline" {
  name     = var.pipeline_name
  role_arn = var.iam_role_arn
  pipeline_type = "V2"

  artifact_store {
    location = aws_s3_bucket.artifact_store.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github_connection.arn
        FullRepositoryId = "${var.github_owner}/${var.repository_name}"
        BranchName       = var.branch_name
      }
    }
  }

  stage {
    name = "Build"

    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      version          = "1"

      configuration= {
        ProjectName = var.codebuild_project_name
      }
    }
  }
}

resource "aws_s3_bucket" "artifact_store" {
  bucket = "${var.pipeline_name}-artifact-store"
  force_destroy = true
}


