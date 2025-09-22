
variable "topic_name" {
  description = "The name of the SNS Topic"
  type        = string
}

variable "kms_key_arn" {
  description = "The ARN of the KMS key to use for encryption"
  type        = string
}

resource "aws_sns_topic" "this" {
  name         = "${var.topic_name}.fifo"  
  display_name = "${var.topic_name}.fifo"
  fifo_topic   = true 
  kms_master_key_id = var.kms_key_arn
 
}

output "topic_arn" {
  value = aws_sns_topic.this.arn
}

