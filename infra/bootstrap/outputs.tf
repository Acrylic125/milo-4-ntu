output "state_bucket_name" {
  description = "Name of the Terraform state S3 bucket."
  value       = module.tfstate.bucket_name
}

output "state_bucket_arn" {
  description = "ARN of the Terraform state S3 bucket."
  value       = module.tfstate.bucket_arn
}

output "state_bucket_region" {
  description = "Region the Terraform state S3 bucket lives in."
  value       = module.tfstate.bucket_region
}
