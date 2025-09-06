
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }
  backend "s3" {
    bucket         = "trannambucket-12334"
    key            = "terraform.tfstate"
    region         = "ap-southeast-1"
  }
}

provider "aws" {
  region = var.aws_region
}