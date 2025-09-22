variable "task_definition_name" {
  description = "The name of the task"
  type        = string
}

variable "task_role_arn" {
  description = "The ARN of the IAM role that the task can assume"
  type        = string
}

variable "execution_role_arn" {
  description = "The ARN of the IAM role that the ECS service can assume"
  type        = string
}

variable "ecr_repository_url" {
  description = "The URL of the ECR repository where the Docker image is stored"
  type        = string
}

variable "container_port" {
  description = "The port number on the container that is bound to the user-specified or automatically assigned host port"
  type        = number
}

variable "host_port" {
  description = "The port number on the container instance to reserve for your container"
  type        = number
}

variable "cpu" {
  description = "The amount of CPU used by the task"
  type        = string
}

variable "memory" {
  description = "The amount of memory used by the task"
  type        = string
}

variable "log_group" {
  description = "The name of the CloudWatch log group where log streams will be created"
  type        = string
}

variable "log_region" {
  description = "The region where the CloudWatch log group is located"
  type        = string
}

variable "os_family" {
  description = "The operating system family to be used. Valid values are `WINDOWS_SERVER_2019_CORE` and `WINDOWS_SERVER_2019_FULL` for Windows, and `LINUX` for Linux."
  type        = string
  default     = "LINUX"
}

variable "cpu_architecture" {
  description = "The CPU architecture to be used. Valid values are `ARM64`, `X86_64`, and `AMD64`."
  type        = string
  default     = "X86_64"
}

variable "environment_variables" {
  description = "Environment variables for the ECS task"
  type        = map(string)
  default     = {}
}

resource "aws_ecs_task_definition" "task" {
  family                   = var.task_definition_name
  task_role_arn            = var.task_role_arn
  execution_role_arn       = var.execution_role_arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  
  runtime_platform {
    operating_system_family = var.os_family
    cpu_architecture        = var.cpu_architecture
  }
  
  container_definitions = jsonencode([{
    name  = var.task_definition_name
    image = var.ecr_repository_url
    portMappings = [{
      containerPort = var.container_port
      hostPort      = var.host_port
      protocol      = "tcp"
      appProtocol = "http"
    }]

    environment = [
      for key, value in var.environment_variables : {
        name  = key
        value = value
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group" = var.log_group
        "awslogs-region" = var.log_region
        "awslogs-stream-prefix" = "ecs"
        "awslogs-create-group"  = "true"
      }
    }
  }])
}

output "ecs_task_definition_arn" {
  description = "The ARN of the ECS task definition"
  value       = aws_ecs_task_definition.task.arn
}