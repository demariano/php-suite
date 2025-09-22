resource "aws_dynamodb_table" "dynamodb_table_email-template" {
  name         = "${var.project}-${var.environment}-email-template"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  point_in_time_recovery {
    enabled = true
  }
  attribute {
    name = "PK"
    type = "S"
  }
  attribute {
    name = "SK"
    type = "S"
  }
  attribute {
    name = "GSI1PK"
    type = "S"
  }
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    projection_type = "ALL"
  }
}