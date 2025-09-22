variable "api_name" {
  description = "The name of the API Gateway"
  type        = string
}

variable "stage_name" {
  description = "The name of the stage"
  type        = string
}

variable "connect_lambda_arn" {
  description = "The ARN of the connect Lambda function"
  type        = string
}

variable "connect_lambda_name" {
  description = "The name of the connect Lambda function"
  type        = string
}

variable "send_message_lambda_arn" {
  description = "The ARN of the sendMessage Lambda function"
  type        = string
}

variable "send_message_lambda_name" {
  description = "The name of the sendMessage Lambda function"
  type        = string
}

variable "disconnect_lambda_arn" {
  description = "The ARN of the disconnect Lambda function"
  type        = string
}

variable "disconnect_lambda_name" {
  description = "The name of the disconnect Lambda function"
  type        = string
}

# Create the WebSocket API Gateway
resource "aws_apigatewayv2_api" "websocket_api" {
  name                       = var.api_name
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

# Create the stage
resource "aws_apigatewayv2_stage" "websocket_stage" {
  api_id      = aws_apigatewayv2_api.websocket_api.id
  name        = var.stage_name
  auto_deploy = true
}

# Create integrations
resource "aws_apigatewayv2_integration" "connect_integration" {
  api_id           = aws_apigatewayv2_api.websocket_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = var.connect_lambda_arn
}

resource "aws_apigatewayv2_integration" "send_message_integration" {
  api_id           = aws_apigatewayv2_api.websocket_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = var.send_message_lambda_arn
}

resource "aws_apigatewayv2_integration" "disconnect_integration" {
  api_id           = aws_apigatewayv2_api.websocket_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = var.disconnect_lambda_arn
}

# Create routes
resource "aws_apigatewayv2_route" "connect_route" {
  api_id    = aws_apigatewayv2_api.websocket_api.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.connect_integration.id}"
}

resource "aws_apigatewayv2_route" "send_message_route" {
  api_id    = aws_apigatewayv2_api.websocket_api.id
  route_key = "sendMessage"
  target    = "integrations/${aws_apigatewayv2_integration.send_message_integration.id}"
}

resource "aws_apigatewayv2_route" "disconnect_route" {
  api_id    = aws_apigatewayv2_api.websocket_api.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.disconnect_integration.id}"
}

# Lambda permissions for API Gateway to invoke the functions
resource "aws_lambda_permission" "connect_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.connect_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "send_message_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.send_message_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "disconnect_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.disconnect_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket_api.execution_arn}/*/*"
}

# Outputs
output "api_id" {
  description = "The ID of the WebSocket API Gateway"
  value       = aws_apigatewayv2_api.websocket_api.id
}

output "api_endpoint" {
  description = "The WebSocket API Gateway endpoint URL"
  value       = aws_apigatewayv2_api.websocket_api.api_endpoint
}

output "stage_invoke_url" {
  description = "The WebSocket API Gateway stage invoke URL"
  value       = aws_apigatewayv2_stage.websocket_stage.invoke_url
}

output "management_api_endpoint" {
  description = "The WebSocket API Gateway management API endpoint URL"
  value       = replace(aws_apigatewayv2_stage.websocket_stage.invoke_url, "wss://", "https://")
}

output "execution_arn" {
  description = "The execution ARN of the WebSocket API Gateway"
  value       = aws_apigatewayv2_api.websocket_api.execution_arn
} 