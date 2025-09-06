output "ec2_public_ip" {
  description = "EC2 public IP"
  value       = aws_instance.app.public_ip
}

output "ec2_public_dns" {
  description = "EC2 public DNS"
  value       = aws_instance.app.public_dns
}

output "s3_bucket_name" {
  value = aws_s3_bucket.app_bucket.bucket
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.users.name
}
