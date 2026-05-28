terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Bootstrap stack uses LOCAL state by design: it is what creates the
  # S3 bucket that every other stack stores its state in.
  # To migrate this stack's state into the bucket later, add a
  # backend "s3" block here and run `terraform init -migrate-state`.
}
