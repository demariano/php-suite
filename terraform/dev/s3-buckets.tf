module "lambda_s3_bucket" {
  source = "../modules/aws_s3"

  bucket_name = "${var.project}-${var.environment}-data"
  tags = {
    Name = "${var.project}-${var.environment}-data"
  }
}