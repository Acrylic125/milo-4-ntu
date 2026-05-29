output "vpc_id" {
  description = "ID of the milo VPC."
  value       = module.vpc.vpc_id
}

output "public_subnet_id" {
  description = "ID of milo-public-subnet-a."
  value       = module.vpc.public_subnet_id
}

output "private_subnet_id" {
  description = "ID of milo-private-subnet-a."
  value       = module.vpc.private_subnet_id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway attached to the milo VPC."
  value       = module.vpc.internet_gateway_id
}

output "ecr_web_repository_url" {
  description = "URL of the web ECR repository."
  value       = module.ecr["web"].repository_url
}

output "ecr_web_repository_arn" {
  description = "ARN of the web ECR repository."
  value       = module.ecr["web"].repository_arn
}

output "ecr_backend_repository_url" {
  description = "URL of the backend ECR repository."
  value       = module.ecr["backend"].repository_url
}

output "ecr_backend_repository_arn" {
  description = "ARN of the backend ECR repository."
  value       = module.ecr["backend"].repository_arn
}

output "db_ecs_cluster_name" {
  description = "Name of the ECS cluster hosting PostgreSQL."
  value       = module.db.ecs_cluster_name
}

output "db_ecs_service_name" {
  description = "Name of the ECS service running PostgreSQL."
  value       = module.db.ecs_service_name
}

output "db_connection_string_secret_arn" {
  description = "ARN of the Secrets Manager connection string secret."
  value       = module.db.connection_string_secret_arn
  sensitive   = false
}

output "db_connection_string_secret_name" {
  description = "Name of the Secrets Manager connection string secret."
  value       = module.db.connection_string_secret_name
  sensitive   = true
}
