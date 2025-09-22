module "websocket-api-gateway" {
  source = "../modules/aws_api_gateway_websocket"
  
  api_name                    = "${var.project}-${var.environment}-websocket-api"
  stage_name                  = var.environment
  connect_lambda_arn          = module.connect-service-lambda.lambda_function_arn
  connect_lambda_name         = module.connect-service-lambda.lambda_function_name
  send_message_lambda_arn     = module.client-message-processor-service-lambda.lambda_function_arn
  send_message_lambda_name    = module.client-message-processor-service-lambda.lambda_function_name
  disconnect_lambda_arn       = module.disconnect-service-lambda.lambda_function_arn
  disconnect_lambda_name      = module.disconnect-service-lambda.lambda_function_name
}

# Output the WebSocket API Gateway endpoint URL for reference
output "websocket_api_endpoint" {
  description = "The WebSocket API Gateway endpoint URL"
  value       = module.websocket-api-gateway.stage_invoke_url
} 