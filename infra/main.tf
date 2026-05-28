module "vpc" {
  source = "./modules/vpc"

  availability_zone   = var.availability_zone
  vpc_cidr            = var.vpc_cidr
  public_subnet_cidr  = var.public_subnet_cidr
  private_subnet_cidr = var.private_subnet_cidr
}

module "ecr" {
  source = "./modules/ecr"

  repository_name = var.ecr_repository_name
}
