variable "environment" {
  description = "Environment name used in resource naming."
  type        = string
}

variable "aws_region" {
  description = "AWS region in which to create resources."
  type        = string
}

variable "paused" {
  description = "When true, the service's desired_count is forced to 0."
  type        = bool
  default     = false
}

variable "vpc_id" {
  description = "VPC ID in which to provision the service."
  type        = string
}

variable "public_subnet_id" {
  description = "Public subnet ID in which to run the web Fargate tasks."
  type        = string
}

variable "cluster_id" {
  description = "ARN/ID of the shared Fargate ECS cluster."
  type        = string
}

variable "image_uri" {
  description = "Fully-qualified container image URI (including tag) for the web service."
  type        = string
}

variable "container_port" {
  description = "TCP port the Next.js container listens on."
  type        = number
  default     = 3000

  validation {
    condition     = var.container_port >= 1 && var.container_port <= 65535
    error_message = "container_port must be a valid TCP port number."
  }
}

variable "cpu" {
  description = "Fargate CPU units for the task."
  type        = number
  default     = 512
}

variable "memory" {
  description = "Fargate memory (MiB) for the task."
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Desired number of running tasks (ignored when paused)."
  type        = number
  default     = 1
}

variable "cpu_architecture" {
  description = "CPU architecture for the Fargate task (X86_64 or ARM64)."
  type        = string
  default     = "X86_64"

  validation {
    condition     = contains(["X86_64", "ARM64"], var.cpu_architecture)
    error_message = "cpu_architecture must be either X86_64 or ARM64."
  }
}

variable "db_connection_string_secret_arn" {
  description = "ARN of the Secrets Manager secret holding the PostgreSQL connection string (injected as DATABASE_URL)."
  type        = string
}

variable "backend_url" {
  description = "Base URL of the backend embedding service, injected as EMBEDDING_BACKEND_URL."
  type        = string
}

variable "cloudflared_tunnel_token" {
  description = "Cloudflare tunnel token used by the cloudflared sidecar."
  type        = string
  sensitive   = true
}

variable "microsoft_client_secret" {
  description = "Azure AD client secret injected into the web container as MICROSOFT_CLIENT_SECRET."
  type        = string
  sensitive   = true
}
