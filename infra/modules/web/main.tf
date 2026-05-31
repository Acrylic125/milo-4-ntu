locals {
  name_prefix                = "${var.environment}-milo-web"
  service_name               = "${local.name_prefix}-service"
  task_family                = "${local.name_prefix}-task"
  log_group_name             = "/ecs/${local.name_prefix}"
  container_name             = "web"
  cloudflared_container_name = "cloudflared"
  cloudflared_image          = "cloudflare/cloudflared:latest"
  cloudflared_token_secret   = "${var.environment}/milo/web/cloudflared-token"
  azure_ad_secret_name       = "prd/milo/web/azure-ad-secret"
}

data "aws_iam_policy_document" "task_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_security_group" "this" {
  name        = "${local.name_prefix}-sg"
  description = "Security group for the milo web Fargate service."
  vpc_id      = var.vpc_id

  ingress {
    description = "Next.js HTTP from the internet."
    from_port   = var.container_port
    to_port     = var.container_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-sg"
  }
}

resource "aws_iam_role" "task_execution" {
  name               = "${local.name_prefix}-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.task_assume_role.json
}

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "secret_read" {
  statement {
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      var.db_connection_string_secret_arn,
      aws_secretsmanager_secret.cloudflared_token.arn,
      aws_secretsmanager_secret.azure_ad_client_secret.arn,
    ]
  }
}

resource "aws_iam_role_policy" "task_execution_secret" {
  name   = "${local.name_prefix}-secret-read"
  role   = aws_iam_role.task_execution.id
  policy = data.aws_iam_policy_document.secret_read.json
}

resource "aws_iam_role" "task" {
  name               = "${local.name_prefix}-task-role"
  assume_role_policy = data.aws_iam_policy_document.task_assume_role.json
}

resource "aws_cloudwatch_log_group" "this" {
  name              = local.log_group_name
  retention_in_days = 30

  tags = {
    Name = local.log_group_name
  }
}

resource "aws_secretsmanager_secret" "cloudflared_token" {
  name        = local.cloudflared_token_secret
  description = "Cloudflare tunnel token for the ${local.name_prefix} cloudflared sidecar."

  tags = {
    Name = local.cloudflared_token_secret
  }
}

resource "aws_secretsmanager_secret_version" "cloudflared_token" {
  secret_id     = aws_secretsmanager_secret.cloudflared_token.id
  secret_string = var.cloudflared_tunnel_token
}

resource "aws_secretsmanager_secret" "azure_ad_client_secret" {
  name        = local.azure_ad_secret_name
  description = "Azure AD client secret for the ${local.name_prefix} web container."

  tags = {
    Name = local.azure_ad_secret_name
  }
}

resource "aws_secretsmanager_secret_version" "azure_ad_client_secret" {
  secret_id     = aws_secretsmanager_secret.azure_ad_client_secret.id
  secret_string = var.microsoft_client_secret
}

resource "aws_ecs_task_definition" "this" {
  family                   = local.task_family
  cpu                      = tostring(var.cpu)
  memory                   = tostring(var.memory)
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    cpu_architecture        = var.cpu_architecture
    operating_system_family = "LINUX"
  }

  container_definitions = jsonencode([
    {
      name      = local.container_name
      image     = var.image_uri
      essential = true
      portMappings = [
        {
          containerPort = var.container_port
          hostPort      = var.container_port
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = tostring(var.container_port)
        },
        {
          name  = "HOSTNAME"
          value = "0.0.0.0"
        },
        {
          name  = "EMBEDDING_BACKEND_URL"
          value = var.backend_url
        },
        {
          name  = "MICROSOFT_CLIENT_ID"
          value = "b99728a7-e0ad-48f5-86d6-24bd5e316fc4"
        },
        {
          name  = "BETTER_AUTH_URL"
          value = "https://milo.benapps.dev/"
        },
      ]
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = var.db_connection_string_secret_arn
        },
        {
          name      = "BETTER_AUTH_SECRET"
          valueFrom = aws_secretsmanager_secret.cloudflared_token.arn
        },
        {
          name      = "MICROSOFT_CLIENT_SECRET"
          valueFrom = aws_secretsmanager_secret.azure_ad_client_secret.arn
        },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.this.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = local.container_name
        }
      }
    },
    {
      name      = local.cloudflared_container_name
      image     = local.cloudflared_image
      essential = true
      command   = ["tunnel", "--no-autoupdate", "run"]
      secrets = [
        {
          name      = "TUNNEL_TOKEN"
          valueFrom = aws_secretsmanager_secret.cloudflared_token.arn
        },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.this.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = local.cloudflared_container_name
        }
      }
    }
  ])

  tags = {
    Name = local.task_family
  }
}

resource "aws_ecs_service" "this" {
  name                               = local.service_name
  cluster                            = var.cluster_id
  task_definition                    = aws_ecs_task_definition.this.arn
  desired_count                      = var.paused ? 0 : var.desired_count
  launch_type                        = "FARGATE"
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 0

  network_configuration {
    subnets          = [var.public_subnet_id]
    security_groups  = [aws_security_group.this.id]
    assign_public_ip = true
  }

  tags = {
    Name = local.service_name
  }
}
