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
