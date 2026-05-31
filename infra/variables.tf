variable "environment" {
  description = "Environment name, used as the `env` tag value (e.g. `prd`)."
  type        = string
}

variable "paused" {
  description = "When true, the workload is paused: the DB ECS service's desired_count is forced to 0 and the EC2 host is stopped."
  type        = bool
  default     = false
}

variable "aws_region" {
  description = "AWS region in which to create resources."
  type        = string
  default     = "ap-southeast-1"
}

variable "availability_zone" {
  description = "Availability Zone for both the public and private subnets."
  type        = string
  default     = "ap-southeast-1a"
}

variable "vpc_cidr" {
  description = "IPv4 CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "IPv4 CIDR block for the public subnet."
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr" {
  description = "IPv4 CIDR block for the private subnet."
  type        = string
  default     = "10.0.2.0/24"
}

variable "db" {
  description = "Configuration for the PostgreSQL ECS workload."
  type = object({
    postgres_database             = optional(string, "milo")
    postgres_username             = optional(string, "postgres")
    postgres_password             = string
    postgres_port                 = optional(number, 5432)
    data_volume_size_gib          = optional(number, 20)
    connection_string_secret_name = optional(string)
    # cloudflared_tunnel_token      = string
  })

  sensitive = true

  validation {
    condition     = var.db.postgres_port >= 1 && var.db.postgres_port <= 65535
    error_message = "db.postgres_port must be a valid TCP port number."
  }

  validation {
    condition     = var.db.data_volume_size_gib >= 1
    error_message = "db.data_volume_size_gib must be at least 1 GiB."
  }
}

variable "web" {
  description = "Configuration for the web (Next.js) ECS Fargate service."
  type = object({
    image_tag        = optional(string, "latest")
    container_port   = optional(number, 3000)
    cpu              = optional(number, 512)
    memory           = optional(number, 1024)
    desired_count    = optional(number, 1)
    cpu_architecture = optional(string, "ARM64")
  })
  default = {}
}

variable "backend" {
  description = "Configuration for the backend (Python) ECS Fargate service."
  type = object({
    image_tag        = optional(string, "latest")
    container_port   = optional(number, 8002)
    cpu              = optional(number, 512)
    memory           = optional(number, 1024)
    desired_count    = optional(number, 1)
    cpu_architecture = optional(string, "ARM64")
  })
  default = {}
}

variable "service_discovery_namespace" {
  description = "Private DNS namespace shared by Fargate services (e.g. backend.<namespace>)."
  type        = string
  default     = "milo.local"
}

variable "web_cloudflared_token" {
  description = "Cloudflare tunnel token for the cloudflared sidecar attached to the web service."
  type        = string
  sensitive   = true
}

variable "microsoft_client_secret" {
  description = "Azure AD client secret injected into the web container."
  type        = string
  sensitive   = true
}
