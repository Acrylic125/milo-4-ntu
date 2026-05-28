variable "environment" {
  description = "Environment name used in the `env` tag."
  type        = string
  default     = "prd"
}

variable "aws_region" {
  description = "AWS region in which to create the state bucket."
  type        = string
  default     = "ap-southeast-1"
}

variable "bucket_name" {
  description = "Globally-unique name of the S3 bucket that will store Terraform state files for all milo stacks."
  type        = string
  default     = "milo-terraform-state-prd-775615218646-ap-southeast-1"
}
