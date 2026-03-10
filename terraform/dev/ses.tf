module "ses_email" {
  source        = "../modules/aws_ses"
  email_address = ["demariano@gmail.com"]
}