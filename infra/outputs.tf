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

output "app_ecs_cluster_name" {
  description = "Name of the shared Fargate ECS cluster (web + backend)."
  value       = aws_ecs_cluster.app.name
}

output "app_ecs_cluster_arn" {
  description = "ARN of the shared Fargate ECS cluster."
  value       = aws_ecs_cluster.app.arn
}

output "service_discovery_namespace" {
  description = "Private DNS namespace for Fargate service discovery."
  value       = aws_service_discovery_private_dns_namespace.app.name
}

output "web_service_name" {
  description = "Name of the web ECS Fargate service."
  value       = module.web.service_name
}

output "web_security_group_id" {
  description = "Security group attached to the web Fargate tasks."
  value       = module.web.security_group_id
}

output "web_image_uri" {
  description = "Container image URI used by the web task definition."
  value       = local.web_image_uri
}

output "backend_service_name" {
  description = "Name of the backend ECS Fargate service."
  value       = module.backend.service_name
}

output "backend_security_group_id" {
  description = "Security group attached to the backend Fargate tasks."
  value       = module.backend.security_group_id
}

output "backend_service_dns" {
  description = "Private DNS name of the backend service (resolves to backend task IPs from inside the VPC)."
  value       = local.backend_service_dns
}

output "backend_url" {
  description = "Base URL the web service uses to reach the backend (EMBEDDING_BACKEND_URL)."
  value       = local.backend_url
}

output "backend_image_uri" {
  description = "Container image URI used by the backend task definition."
  value       = local.backend_image_uri
}
