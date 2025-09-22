variable "load_balancer_security_group_id" {
  description = "The ID of the security group attached to the load balancer"
  type        = string
}

variable "specific_port" {
  description = "The specific port to allow traffic"
  type        = number
}
variable "security_group_description" {
   description = "The description of the security group"
   type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC"
  type        = string
}

variable "security_group_name" {
  description = "The name of the security group"
  type        = string
}



resource "aws_security_group" "from_load_balancer" {
  name        = var.security_group_name
  description = var.security_group_description
  vpc_id      = var.vpc_id

   tags = {
    Name = var.security_group_name
  }

  ingress {
    from_port                = var.specific_port
    to_port                  = var.specific_port
    protocol                 = "tcp" 
    security_groups = [var.load_balancer_security_group_id]
  }


  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

output "security_group_id" {
  description = "The ID of the security group"
  value       = aws_security_group.from_load_balancer.id
}