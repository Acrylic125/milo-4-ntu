output "security_group_id" {
  description = "Security group ID attached to the backend Fargate tasks."
  value       = aws_security_group.task.id
}

output "service_name" {
  description = "Name of the ECS service running the backend task."
  value       = aws_ecs_service.this.name
}

output "task_definition_arn" {
  description = "ARN of the backend ECS task definition."
  value       = aws_ecs_task_definition.this.arn
}

output "log_group_name" {
  description = "CloudWatch log group used by the backend task."
  value       = aws_cloudwatch_log_group.this.name
}

output "service_discovery_service_arn" {
  description = "ARN of the Cloud Map service entry for the backend."
  value       = aws_service_discovery_service.this.arn
}

output "service_discovery_service_name" {
  description = "Cloud Map service name (left-most label of the FQDN)."
  value       = aws_service_discovery_service.this.name
}
