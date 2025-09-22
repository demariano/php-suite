variable "service_name" {
  description = "The name of the ECS service"
  type        = string
}

variable "task_definition" {
  description = "The family and revision (family:revision) or full ARN of the task definition that you want to run in your service"
  type        = string
}

variable "cluster" {
  description = "The ARN of the ECS cluster where the service will be created"
  type        = string
}

variable "desired_count" {
  description = "The number of instances of the task definition to place and keep running"
  type        = number
  default     = 1
}

variable "subnets" {
  description = "List of subnet IDs for the ECS service"
  type        = list(string)
}

variable "security_groups" {
  description = "List of security group IDs for the ECS service"
  type        = list(string)
}

variable "target_group_arn" {
  description = "The name of the Target Group"
  type        = string
}

variable "container_name" {
  description = "The name of the container to associate with the load balancer"
  type        = string
}

variable "container_port" {
  description = "The port on the container to associate with the load balancer"
  type        = number
}




resource "aws_ecs_service" "service" {
  name            = var.service_name
  cluster         = var.cluster
  task_definition = var.task_definition
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  deployment_circuit_breaker {
    enable   = true
    rollback = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = var.container_name
    container_port   = var.container_port
  }


  network_configuration {
    assign_public_ip = false
    subnets          = var.subnets
    security_groups  = var.security_groups
  }
}

//output the service arn
output "ecs_service_arn" {
  description = "The ARN of the ECS service"
  value       = aws_ecs_service.service.id
}
