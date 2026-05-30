locals {
  ecr_repository_names = {
    web     = "${var.environment}-milo-web"
    backend = "${var.environment}-milo-backend"
  }
}

module "vpc" {
  source = "./modules/vpc"

  environment         = var.environment
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

module "db" {
  source = "./modules/db"

  environment = var.environment
  aws_region  = var.aws_region
  paused      = var.paused

  vpc_id           = module.vpc.vpc_id
  vpc_cidr         = module.vpc.vpc_cidr_block
  public_subnet_id = module.vpc.public_subnet_id

  postgres_database             = var.db.postgres_database
  postgres_username             = var.db.postgres_username
  postgres_password             = var.db.postgres_password
  postgres_port                 = var.db.postgres_port
  data_volume_size_gib          = var.db.data_volume_size_gib
  connection_string_secret_name = try(var.db.connection_string_secret_name, null)
  cloudflared_tunnel_token      = var.db.cloudflared_tunnel_token
}
