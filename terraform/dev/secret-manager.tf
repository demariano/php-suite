
variable "secret_variables" {
  description = "The secret variables"
  type        = map(string)
  default = {
    TEST = "test"
  }
}

module "secret_manager" {
  source             = "../modules/aws_secret_manager"
  secret_name        = "${var.project}-${var.environment}-secret"
  secret_description = "${var.project}-${var.environment}-secret"
  secret_variables   = var.secret_variables
}

output "secret_manager_name" {
  value = module.secret_manager.secret_name
}
