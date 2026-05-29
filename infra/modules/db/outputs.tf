output "ecs_cluster_name" {
  description = "Name of the ECS cluster hosting PostgreSQL."
  value       = aws_ecs_cluster.this.name
}

output "ecs_service_name" {
  description = "Name of the ECS service running PostgreSQL."
  value       = aws_ecs_service.this.name
}

output "connection_string_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the connection string."
  value       = aws_secretsmanager_secret.connection_string.arn
}

output "connection_string_secret_name" {
  description = "Name of the Secrets Manager secret containing the connection string."
  value       = aws_secretsmanager_secret.connection_string.name
}

output "ecs_instance_security_group_id" {
  description = "Security group ID attached to the ECS EC2 host."
  value       = aws_security_group.ecs_instance.id
}
