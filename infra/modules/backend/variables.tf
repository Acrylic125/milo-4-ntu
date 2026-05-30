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
  description = "Public subnet ID in which to run the backend Fargate tasks. The task gets a public IP so it can pull from ECR / write logs via the IGW, but its security group only allows inbound traffic from the web SG."
  type        = string
}

variable "cluster_id" {
  description = "ARN/ID of the shared Fargate ECS cluster."
  type        = string
}

variable "image_uri" {
  description = "Fully-qualified container image URI (including tag) for the backend service."
  type        = string
}

variable "container_port" {
  description = "TCP port the backend container listens on."
  type        = number
  default     = 8002

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

variable "web_security_group_id" {
  description = "Security group ID of the web Fargate service. Used as the only allowed ingress source on container_port."
  type        = string
}

variable "service_discovery_namespace_id" {
  description = "ID of the Cloud Map private DNS namespace this service registers into."
  type        = string
}

variable "service_discovery_service_name" {
  description = "Cloud Map service name for the backend (becomes <name>.<namespace>)."
  type        = string
  default     = "backend"
}
