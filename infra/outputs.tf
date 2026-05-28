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

output "ecr_repository_url" {
  description = "URL of the milo-image-repository ECR repository."
  value       = module.ecr.repository_url
}

output "ecr_repository_arn" {
  description = "ARN of the milo-image-repository ECR repository."
  value       = module.ecr.repository_arn
}
