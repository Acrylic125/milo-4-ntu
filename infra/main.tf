locals {
  ecr_repository_names = {
    web     = "${var.environment}-milo-web"
    backend = "${var.environment}-milo-backend"
  }

  app_cluster_name = "${var.environment}-milo-app-cluster"

  web_image_uri     = "${module.ecr["web"].repository_url}:${var.web.image_tag}"
  backend_image_uri = "${module.ecr["backend"].repository_url}:${var.backend.image_tag}"

  # backend.<namespace>:<port> – web tasks reach the backend via Cloud Map.
  backend_service_dns = "backend.${var.service_discovery_namespace}"
  backend_url         = "http://${local.backend_service_dns}:${var.backend.container_port}"
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
  # cloudflared_tunnel_token      = var.db.cloudflared_tunnel_token
}

# Shared Fargate cluster that hosts both the web and backend services.
resource "aws_ecs_cluster" "app" {
  name = local.app_cluster_name

  setting {
    name  = "containerInsights"
    value = "disabled"
  }

  tags = {
    Name = local.app_cluster_name
  }
}

# Private DNS namespace used by web -> backend service discovery.
resource "aws_service_discovery_private_dns_namespace" "app" {
  name        = var.service_discovery_namespace
  description = "Private DNS namespace for milo Fargate services."
  vpc         = module.vpc.vpc_id

  tags = {
    Name = var.service_discovery_namespace
  }
}

module "web" {
  source = "./modules/web"

  environment = var.environment
  aws_region  = var.aws_region
  paused      = var.paused

  vpc_id           = module.vpc.vpc_id
  public_subnet_id = module.vpc.public_subnet_id
  cluster_id       = aws_ecs_cluster.app.id

  image_uri        = local.web_image_uri
  container_port   = var.web.container_port
  cpu              = var.web.cpu
  memory           = var.web.memory
  desired_count    = var.web.desired_count
  cpu_architecture = var.web.cpu_architecture

  db_connection_string_secret_arn = module.db.connection_string_secret_arn
  backend_url                     = local.backend_url
}

module "backend" {
  source = "./modules/backend"

  environment = var.environment
  aws_region  = var.aws_region
  paused      = var.paused

  vpc_id           = module.vpc.vpc_id
  public_subnet_id = module.vpc.public_subnet_id
  cluster_id       = aws_ecs_cluster.app.id

  image_uri        = local.backend_image_uri
  container_port   = var.backend.container_port
  cpu              = var.backend.cpu
  memory           = var.backend.memory
  desired_count    = var.backend.desired_count
  cpu_architecture = var.backend.cpu_architecture

  web_security_group_id          = module.web.security_group_id
  service_discovery_namespace_id = aws_service_discovery_private_dns_namespace.app.id
  service_discovery_service_name = "backend"
}
