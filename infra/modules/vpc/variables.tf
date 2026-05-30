variable "environment" {
  description = "Environment name used in resource naming."
  type        = string
}

variable "availability_zone" {
  description = "Availability Zone for both the public and private subnets."
  type        = string
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
