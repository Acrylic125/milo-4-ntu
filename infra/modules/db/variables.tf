variable "environment" {
  description = "Environment name used in resource naming."
  type        = string
}

variable "aws_region" {
  description = "AWS region in which to create resources."
  type        = string
}

variable "paused" {
  description = "When true, the DB ECS service's desired_count is forced to 0 and the EC2 host is stopped."
  type        = bool
  default     = false
}

variable "vpc_id" {
  description = "VPC ID in which to provision the database resources."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC. Used to allow internal PostgreSQL access."
  type        = string
}

variable "public_subnet_id" {
  description = "Public subnet ID used by the ECS host."
  type        = string
}

variable "postgres_database" {
  description = "Database name created by the PostgreSQL container."
  type        = string
  default     = "milo"
}

variable "postgres_username" {
  description = "Application username configured in PostgreSQL."
  type        = string
  default     = "milo"
}

variable "postgres_password" {
  description = "Application password configured in PostgreSQL."
  type        = string
  sensitive   = true
}

variable "postgres_port" {
  description = "Port exposed by PostgreSQL inside the ECS task."
  type        = number
  default     = 5432

  validation {
    condition     = var.postgres_port >= 1 && var.postgres_port <= 65535
    error_message = "postgres_port must be a valid TCP port number."
  }
}

variable "data_volume_size_gib" {
  description = "Size of the gp3 EBS volume mounted into PostgreSQL."
  type        = number
  default     = 20

  validation {
    condition     = var.data_volume_size_gib >= 1
    error_message = "data_volume_size_gib must be at least 1 GiB."
  }
}

variable "cloudflared_tunnel_token" {
  description = "Cloudflare tunnel token used by the cloudflared sidecar."
  type        = string
  sensitive   = true
}

variable "connection_string_secret_name" {
  description = "Optional override for the connection string secret name."
  type        = string
  default     = null
}
