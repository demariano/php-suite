variable "cluster_name" {
  description = "The name of the ECS cluster"
  type        = string
}

resource "aws_ecs_cluster" "cluster" {
  name = var.cluster_name
}

output "ecs_cluster_arn" {
  description = "The ARN of the ECS cluster"
  value       = aws_ecs_cluster.cluster.arn
}

//output the cluster id
output "ecs_cluster_id" {
  description = "The ID of the ECS cluster"
  value       = aws_ecs_cluster.cluster.id
}

