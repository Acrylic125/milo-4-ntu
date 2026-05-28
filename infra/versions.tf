terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # State is stored in the S3 bucket provisioned by infra/bootstrap. The
  # `key` is per-environment and is supplied via `-backend-config` at
  # `terraform init` time (see infra/environments/<env>/backend.hcl).
  # `use_lockfile = true` enables S3 native state locking (Terraform >= 1.10).
  backend "s3" {
    bucket       = "milo-terraform-state-prd-775615218646-ap-southeast-1"
    region       = "ap-southeast-1"
    encrypt      = true
    use_lockfile = true
  }
}
