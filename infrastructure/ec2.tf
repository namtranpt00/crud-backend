resource "aws_instance" "app" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.app_sg.id]
  key_name                    = var.key_name
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name
  associate_public_ip_address = true

  # Placeholder — we'll add real user_data when we do Task 2 (Node app).
  user_data = <<-EOF
              #!/bin/bash
              dnf update -y
              # Node setup will go here in Task 2
              EOF

  tags = {
    Name = "${var.project_name}-ec2"
  }
}
