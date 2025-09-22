variable "vpc_id" {
  description = "The ID of the VPC"
  type        = string
}

variable "security_group_name" {
  description = "The name of the security group"
  type        = string
}

variable "security_group_description" {
  description = "The description of the security group"
  type        = string
}

resource "aws_security_group" "outbound_all" {
  name        = var.security_group_name
  description = var.security_group_description
  vpc_id      = var.vpc_id
  
  tags = {
    Name = var.security_group_name
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
  value       = aws_security_group.outbound_all.id
}