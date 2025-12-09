resource "aws_dynamodb_table" "dynamodb_table_invoicing" {
  name         = "${var.project}-${var.environment}-invoicing"
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
  attribute {
    name = "GSI1SK"
    type = "S"
  }
  attribute {
    name = "GSI2PK"
    type = "S"
  }
  attribute {
    name = "GSI2SK"
    type = "S"
  }
  attribute {
    name = "GSI3PK"
    type = "S"
  }
  attribute {
    name = "GSI3SK"
    type = "S"
  }
  attribute {
    name = "GSI4PK"
    type = "S"
  }
  attribute {
    name = "GSI4SK"
    type = "S"
  }
  attribute {
    name = "GSI5PK"
    type = "S"
  }
  attribute {
    name = "GSI5SK"
    type = "S"
  }
  attribute {
    name = "GSI6PK"
    type = "S"
  }
  attribute {
    name = "GSI6SK"
    type = "S"
  }
  attribute {
    name = "GSI7PK"
    type = "S"
  }
  attribute {
    name = "GSI7SK"
    type = "S"
  }
  attribute {
    name = "GSI8PK"
    type = "S"
  }
  attribute {
    name = "GSI8SK"
    type = "S"
  }
  attribute {
    name = "GSI9PK"
    type = "S"
  }
  attribute {
    name = "GSI9SK"
    type = "S"
  }
  attribute {
    name = "GSI10PK"
    type = "S"
  }
  attribute {
    name = "GSI10SK"
    type = "S"
  }
  attribute {
    name = "GSI11PK"
    type = "S"
  }
  attribute {
    name = "GSI11SK"
    type = "S"
  }
  attribute {
    name = "GSI12PK"
    type = "S"
  }
  attribute {
    name = "GSI12SK"
    type = "S"
  }
  attribute {
    name = "GSI13PK"
    type = "S"
  }
  attribute {
    name = "GSI13SK"
    type = "S"
  }
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "GSI2"
    hash_key        = "GSI2PK"
    range_key       = "GSI2SK"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "GSI3"
    hash_key        = "GSI3PK"
    range_key       = "GSI3SK"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "GSI4"
    hash_key        = "GSI4PK"
    range_key       = "GSI4SK"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "GSI5"
    hash_key        = "GSI5PK"
    range_key       = "GSI5SK"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "GSI6"
    hash_key        = "GSI6PK"
    range_key       = "GSI6SK"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "GSI7"
    hash_key        = "GSI7PK"
    range_key       = "GSI7SK"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "GSI8"
    hash_key        = "GSI8PK"
    range_key       = "GSI8SK"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "GSI9"
    hash_key        = "GSI9PK"
    range_key       = "GSI9SK"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "GSI10"
    hash_key        = "GSI10PK"
    range_key       = "GSI10SK"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "GSI11"
    hash_key        = "GSI11PK"
    range_key       = "GSI11SK"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "GSI12"
    hash_key        = "GSI12PK"
    range_key       = "GSI12SK"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "GSI13"
    hash_key        = "GSI13PK"
    range_key       = "GSI13SK"
    projection_type = "ALL"
  }
}