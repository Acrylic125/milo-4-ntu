variable "environment" {
  description = "Environment name, used as the `env` tag value (e.g. `prd`)."
  type        = string
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

variable "ecr_repository_name" {
  description = "Name of the ECR private repository."
  type        = string
  default     = "milo-image-repository"
}
