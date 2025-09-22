variable "queue_name" {
  description = "The name of the SQS queue"
  type        = string
}



variable "sns_topic_arn" {
  description = "The ARN of the SNS topic to subscribe to"
  type        = string
}


resource "aws_sqs_queue" "queue" {
  name                      = "${var.queue_name}.fifo"
  message_retention_seconds = 900  # 15 minutes in seconds
  visibility_timeout_seconds = 900  # 15 minutes in seconds
  sqs_managed_sse_enabled    = true  
  fifo_queue                  = true
  content_based_deduplication = false
  deduplication_scope   = "messageGroup"
  fifo_throughput_limit = "perMessageGroupId"

   policy = jsonencode({
    Version = "2012-10-17"
    Id      = "__default_policy_ID"
    Statement = [
      {
        Sid    = "__owner_statement"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "SQS:*"
        Resource = "arn:aws:sqs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${var.queue_name}.fifo"
      },
      {
        Sid    = "topic-subscription-${var.sns_topic_arn}"
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action   = "SQS:SendMessage"
        Resource = "arn:aws:sqs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${var.queue_name}.fifo"
        Condition = {
          ArnLike = {
            "aws:SourceArn" = var.sns_topic_arn
          }
        }
      }
    ]
  })
  
  
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

resource "aws_sns_topic_subscription" "queue_subscription" {
  topic_arn = var.sns_topic_arn 
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.queue.arn
}

output "queue_arn" {
  value = aws_sqs_queue.queue.arn
}

output "queue_url" {
  value = aws_sqs_queue.queue.url
  
}