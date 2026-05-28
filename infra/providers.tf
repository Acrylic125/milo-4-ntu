provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      env     = var.environment
      service = "milo-app"
    }
  }
}
