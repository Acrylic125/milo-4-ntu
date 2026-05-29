locals {
  ecr_repository_names = {
    web     = "${var.environment}-milo-web"
    backend = "${var.environment}-milo-backend"
  }
}

module "vpc" {
  source = "./modules/vpc"

  availability_zone   = var.availability_zone
  vpc_cidr            = var.vpc_cidr
  public_subnet_cidr  = var.public_subnet_cidr
  private_subnet_cidr = var.private_subnet_cidr
}

module "ecr" {
  source = "./modules/ecr"

  for_each = local.ecr_repository_names

  repository_name = each.value
}
