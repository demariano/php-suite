variable "bucket_name" {
  description = "The name of the bucket"
  type        = string
}


variable "tags" {
  description = "A mapping of tags to assign to the bucket"
  type        = map(string)
  default     = {}
}

resource "aws_s3_bucket" "bucket" {
  bucket = var.bucket_name
  tags = var.tags
}

output "bucket_arn" {
  value = aws_s3_bucket.bucket.arn
  
}

output "bucket_name" {
  value = aws_s3_bucket.bucket.bucket
}
