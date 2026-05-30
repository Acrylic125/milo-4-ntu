locals {
  name_prefix                   = "${var.environment}-milo-db"
  cluster_name                  = "${local.name_prefix}-cluster"
  service_name                  = "${local.name_prefix}-service"
  task_family                   = "${local.name_prefix}-task"
  log_group_name                = "/ecs/${local.name_prefix}"
  data_mount_path               = "/mnt/postgresql-data"
  instance_type                 = "t4g.micro"
  postgres_image                = "bitnami/postgresql:latest"
  cloudflared_image             = "cloudflare/cloudflared:latest"
  connection_string_secret_name = coalesce(var.connection_string_secret_name, "${var.environment}/milo/db/connection-string")
}

data "aws_ssm_parameter" "ecs_optimized_ami" {
  name = "/aws/service/ecs/optimized-ami/amazon-linux-2023/arm64/recommended/image_id"
}

data "aws_iam_policy_document" "ecs_instance_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "task_execution_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_security_group" "ecs_instance" {
  name        = "${local.name_prefix}-instance-sg"
  description = "Security group for the ECS EC2 host running PostgreSQL."
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow PostgreSQL from within the VPC."
    from_port   = var.postgres_port
    to_port     = var.postgres_port
    protocol    = "tcp"
    # TODO: Remove later, use 0.0.0.0/0 temporarily
    cidr_blocks = [var.vpc_cidr, "0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-instance-sg"
  }
}

resource "aws_iam_role" "ecs_instance" {
  name               = "${local.name_prefix}-ecs-instance-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_instance_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ecs_instance_ecs" {
  role       = aws_iam_role.ecs_instance.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_role_policy_attachment" "ecs_instance_ssm" {
  role       = aws_iam_role.ecs_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ecs_instance" {
  name = "${local.name_prefix}-ecs-instance-profile"
  role = aws_iam_role.ecs_instance.name
}

resource "aws_iam_role" "task_execution" {
  name               = "${local.name_prefix}-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.task_execution_assume_role.json
}

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_cloudwatch_log_group" "this" {
  name              = local.log_group_name
  retention_in_days = 30

  tags = {
    Name = local.log_group_name
  }
}

resource "aws_secretsmanager_secret" "connection_string" {
  name        = local.connection_string_secret_name
  description = "Connection string for the ${local.name_prefix} PostgreSQL instance."

  tags = {
    Name = local.connection_string_secret_name
  }
}

resource "aws_secretsmanager_secret_version" "connection_string" {
  secret_id = aws_secretsmanager_secret.connection_string.id
  secret_string = format(
    "postgresql://%s:%s@%s:%d/%s",
    var.postgres_username,
    urlencode(var.postgres_password),
    aws_instance.this.private_ip,
    var.postgres_port,
    var.postgres_database
  )
}

resource "aws_ecs_cluster" "this" {
  name = local.cluster_name

  tags = {
    Name = local.cluster_name
  }
}

resource "aws_instance" "this" {
  ami                    = data.aws_ssm_parameter.ecs_optimized_ami.value
  instance_type          = local.instance_type
  subnet_id              = var.public_subnet_id
  vpc_security_group_ids = [aws_security_group.ecs_instance.id]
  iam_instance_profile   = aws_iam_instance_profile.ecs_instance.name

  associate_public_ip_address = true

  ebs_block_device {
    device_name           = "/dev/sdf"
    delete_on_termination = true
    encrypted             = true
    volume_size           = var.data_volume_size_gib
    volume_type           = "gp3"
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  monitoring = true

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -euxo pipefail

    cat <<'EOC' >> /etc/ecs/ecs.config
    ECS_CLUSTER=${local.cluster_name}
    EOC

    ROOT_PARTITION="$(findmnt -n -o SOURCE /)"
    ROOT_DISK="/dev/$(lsblk -no PKNAME "$ROOT_PARTITION")"
    DATA_DEVICE=""

    for candidate in /dev/nvme*n1 /dev/xvd[f-p] /dev/sd[f-p]; do
      if [ ! -b "$candidate" ]; then
        continue
      fi

      if [ "$candidate" = "$ROOT_DISK" ]; then
        continue
      fi

      DATA_DEVICE="$candidate"
      break
    done

    if [ -z "$DATA_DEVICE" ]; then
      echo "Unable to locate the PostgreSQL data volume." >&2
      exit 1
    fi

    if ! blkid "$DATA_DEVICE" >/dev/null 2>&1; then
      mkfs -t xfs "$DATA_DEVICE"
    fi

    mkdir -p ${local.data_mount_path}
    UUID="$(blkid -s UUID -o value "$DATA_DEVICE")"

    if ! grep -q "$UUID" /etc/fstab; then
      echo "UUID=$UUID ${local.data_mount_path} xfs defaults,nofail 0 2" >> /etc/fstab
    fi

    mount -a
    chown 1001:1001 ${local.data_mount_path}
    chmod 700 ${local.data_mount_path}
    EOF
  )

  tags = {
    Name = local.name_prefix
  }
}

resource "aws_ec2_instance_state" "this" {
  instance_id = aws_instance.this.id
  state       = var.paused ? "stopped" : "running"
}

resource "aws_ecs_task_definition" "this" {
  family                   = local.task_family
  network_mode             = "host"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.task_execution.arn

  runtime_platform {
    cpu_architecture        = "ARM64"
    operating_system_family = "LINUX"
  }

  volume {
    name      = "postgres-data"
    host_path = local.data_mount_path
  }

  tags = {
    Name = local.task_family
  }

  container_definitions = jsonencode([
    {
      name              = "postgres"
      image             = local.postgres_image
      essential         = true
      memoryReservation = 256
      environment = [
        {
          name  = "POSTGRESQL_DATABASE"
          value = var.postgres_database
        },
        {
          name  = "POSTGRESQL_USERNAME"
          value = var.postgres_username
        },
        {
          name  = "POSTGRESQL_PASSWORD"
          value = var.postgres_password
        },
        {
          name  = "POSTGRESQL_PORT_NUMBER"
          value = tostring(var.postgres_port)
        }
      ]
      portMappings = [
        {
          containerPort = var.postgres_port
          hostPort      = var.postgres_port
          protocol      = "tcp"
        }
      ]
      mountPoints = [
        {
          sourceVolume  = "postgres-data"
          containerPath = "/bitnami/postgresql"
          readOnly      = false
        }
      ]
      healthCheck = {
        command = [
          "CMD-SHELL",
          "pg_isready -U \"$POSTGRESQL_USERNAME\" -d \"$POSTGRESQL_DATABASE\" -h 127.0.0.1 -p \"$POSTGRESQL_PORT_NUMBER\" || exit 1"
        ]
        interval    = 30
        retries     = 5
        startPeriod = 60
        timeout     = 5
      }
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.this.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "postgres"
        }
      }
    },
    # {
    #   name              = "cloudflared"
    #   image             = local.cloudflared_image
    #   essential         = true
    #   memoryReservation = 64
    #   dependsOn = [
    #     {
    #       containerName = "postgres"
    #       condition     = "HEALTHY"
    #     }
    #   ]
    #   command = [
    #     "tunnel",
    #     "--no-autoupdate",
    #     "run",
    #     "--token",
    #     var.cloudflared_tunnel_token
    #   ]
    #   logConfiguration = {
    #     logDriver = "awslogs"
    #     options = {
    #       awslogs-group         = aws_cloudwatch_log_group.this.name
    #       awslogs-region        = var.aws_region
    #       awslogs-stream-prefix = "cloudflared"
    #     }
    #   }
    # }
  ])
}

resource "aws_ecs_service" "this" {
  name                               = local.service_name
  cluster                            = aws_ecs_cluster.this.id
  task_definition                    = aws_ecs_task_definition.this.arn
  desired_count                      = var.paused ? 0 : 1
  launch_type                        = "EC2"
  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0

  tags = {
    Name = local.service_name
  }

  depends_on = [aws_instance.this, aws_ec2_instance_state.this]
}
