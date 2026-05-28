variable "bucket_name" {
  description = "Globally-unique name of the S3 bucket that will store Terraform state files."
  type        = string
}

variable "noncurrent_version_expiration_days" {
  description = "Days after which non-current versions of state objects are deleted."
  type        = number
  default     = 90
}
