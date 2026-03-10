module "lambda_s3_bucket" {
  source = "../modules/aws_s3"

  bucket_name = "${var.project}-${var.environment}-data"
  tags = {
    Name = "${var.project}-${var.environment}-data"
  }
}

module "report_s3_bucket" {
  source = "../modules/aws_s3"

  bucket_name = "${var.project}-${var.environment}-report-data"
  tags = {
    Name = "${var.project}-${var.environment}-report-data"
  }
}