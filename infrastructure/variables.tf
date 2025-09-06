variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "A short name to prefix resources"
  type        = string
  default     = "node-crud-demo"
}

variable "instance_type" {
  description = "EC2 instance type (free-tier eligible)"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Name of an existing EC2 Key Pair for SSH"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH (e.g., your_ip/32)."
  type        = string
  default     = "0.0.0.0/0"
}

variable "app_port" {
  description = "Port your Node app listens on"
  type        = number
  default     = 3000
}

variable "bucket_name" {
  description = "Globally-unique S3 bucket name for app storage"
  type        = string
}

# If you want to pin to AL2023 x86_64
variable "al2023_ami_name_pattern" {
  description = "AMI name pattern for Amazon Linux 2023"
  type        = string
  default     = "al2023-ami-*-x86_64"
}
