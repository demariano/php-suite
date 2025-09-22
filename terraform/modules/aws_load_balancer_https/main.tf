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

variable "certificate_arn" {
   description = "The ARN of the SSL certificate"
   type        = string
}

variable "domain_name" {
  description = "The domain name"
   type        = string
  
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
}

resource "aws_alb_target_group" "target_group" {
  name     = var.target_group_name
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id
  target_type = "ip"
  health_check {
    path = var.health_check_path
    protocol = "HTTP"
  }
}



resource "aws_alb_listener" "http_listener_redirect" {
  load_balancer_arn = aws_alb.alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type          = "redirect"
    redirect {
      protocol   = "HTTPS"
      port       = "443"
      status_code = "HTTP_301"
      host       = "#{host}"
      path       = "/#{path}"
      query      = "#{query}"
    }
  }
}

resource "aws_alb_listener" "https_listener" {
  load_balancer_arn = aws_alb.alb.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.certificate_arn

 default_action {
   type             = "forward"
    target_group_arn = aws_alb_target_group.target_group.arn
  }
}



# Use this if we want to limit the access to the ALB via a domain name
# resource "aws_alb_listener" "https_listener" {
#   load_balancer_arn = aws_alb.alb.arn
#   port              = 443
#   protocol          = "HTTPS"
#   ssl_policy        = "ELBSecurityPolicy-2016-08"
#   certificate_arn   = var.certificate_arn

#  default_action {
#     type = "fixed-response"

#     fixed_response {
#       content_type = "text/plain"
#       message_body = "Unauthorized"
#       status_code  = "401"
#     }
#   }
# }

# resource "aws_alb_listener_rule" "domain_name_redirect" {
#   listener_arn = aws_alb_listener.https_listener.arn
#   priority     = 100

#   action {
#     type             = "forward"
#     target_group_arn = aws_alb_target_group.target_group.arn
#   }

#   condition {
#     host_header {
#       values = [var.domain_name]
#     }
#   }
# }

  

output "alb_arn" {
  description = "The ARN of the ALB"
  value       = aws_alb.alb.arn
}

output "target_group_arn" {
  description = "The ARN of the target group"
  value       = aws_alb_target_group.target_group.arn
}



output "https_listener_arn" {
  description = "The ARN of the HTTPS listener"
  value       = aws_alb_listener.https_listener.arn 
}

output "http_listener_arn" {
  description = "The ARN of the HTTP listener"
  value       =  aws_alb_listener.http_listener_redirect.arn 
}