variable "alb_name" {
  description = "The name of the ALB"
  type        = string
}

variable "subnets" {
  description = "The subnets for the ALB"
  type        = list(string)
}

variable "security_groups" {
  description = "The security groups for the ALB"
  type        = list(string)
}

variable "target_group_name" {
  description = "The name of the target group"
  type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC"
  type        = string
}

variable "listener_port" {
  description = "The port for the listener"
  type        = number
}


variable "health_check_path" {
  description = "The path for the health check"
  type        = string
}


resource "aws_alb" "alb" {
  name               = var.alb_name
  subnets            = var.subnets
  security_groups    = var.security_groups
  enable_deletion_protection = false
  idle_timeout            = 300
}

resource "aws_alb_target_group" "target_group" {
  name     = var.target_group_name
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id
  target_type = "ip"
  

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400 # Duration in seconds (e.g., 1 day)
  }


  health_check {
    path = var.health_check_path
    protocol = "HTTP"
  }
}


resource "aws_alb_listener" "http_listener_forward" {
  load_balancer_arn = aws_alb.alb.arn
  port              = var.listener_port
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.target_group.arn
  }
}


output "alb_arn" {
  description = "The ARN of the ALB"
  value       = aws_alb.alb.arn
}

output "target_group_arn" {
  description = "The ARN of the target group"
  value       = aws_alb_target_group.target_group.arn
}


output "http_listener_arn" {
  description = "The ARN of the HTTP listener"
  value       = aws_alb_listener.http_listener_forward.arn
}