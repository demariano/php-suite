variable "queue_name" {
  description = "The name of the SQS queue"
  type        = string
}


resource "aws_sqs_queue" "queue" {
  name                      = var.queue_name
  message_retention_seconds = 900  # 15 minutes in seconds
  visibility_timeout_seconds = 900  # 15 minutes in seconds
  
}
output "queue_arn" {
  value = aws_sqs_queue.queue.arn
}

output "queue_url" {
  value = aws_sqs_queue.queue.url
  
}