output "bucket_name" {
  description = "Name of the Terraform state S3 bucket."
  value       = aws_s3_bucket.this.bucket
}

output "bucket_arn" {
  description = "ARN of the Terraform state S3 bucket."
  value       = aws_s3_bucket.this.arn
}

output "bucket_region" {
  description = "Region the Terraform state S3 bucket lives in."
  value       = aws_s3_bucket.this.region
}
