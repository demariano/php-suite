module "ses_email" {
  source        = "../modules/aws_ses"
  email_address = ["dennis@old.st"]
}