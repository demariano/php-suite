variable "github_token" {
  description = "The Github Token"
  type        = string
}

variable "branch_name" {
  description = "The branch name"
  type        = string
}

variable "aws_account_id" {
  description = "The AWS Account ID"
  type        = string
}



module "code-build-credentials" {
  source       = "../modules/aws_code_build_credential"
  github_token = var.github_token

}




module "code-build" {
  source             = "../modules/aws_code_build"
  codebuild_name     = "${var.project}-${var.environment}-main-code-build"
  repository_url     = var.repository-url
  codebuild_role_arn = module.codebuild_iam_role.role_arn
  branch_name        = var.branch_name
  buildspec_file     = "buildspec.yml"
  environment_variables = {
    BRANCH_NAME    = var.branch_name
    PROJECT_NAME   = var.project
    AWS_ACCOUNT_ID = var.aws_account_id
    AWS_REGION     = var.aws_region
    ENVIRONMENT    = var.environment
  }
}

module "backend-code-pipeline" {
  source                 = "../modules/aws_code_pipeline"
  repository_name        = var.repository-name
  pipeline_name          = "${var.project}-${var.environment}-main-pipeline"
  codebuild_project_name = module.code-build.codebuild_project_name
  iam_role_arn           = module.codebuild_iam_role.role_arn
  branch_name            = var.branch_name
  github_owner           = "Old-St-Labs"

}
