output "security_group_id" {
  description = "Security group ID attached to the web Fargate tasks."
  value       = aws_security_group.this.id
}

output "service_name" {
  description = "Name of the ECS service running the web task."
  value       = aws_ecs_service.this.name
}

output "task_definition_arn" {
  description = "ARN of the web ECS task definition."
  value       = aws_ecs_task_definition.this.arn
}

output "log_group_name" {
  description = "CloudWatch log group used by the web task."
  value       = aws_cloudwatch_log_group.this.name
}
