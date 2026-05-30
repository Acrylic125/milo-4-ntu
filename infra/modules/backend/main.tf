locals {
  name_prefix    = "${var.environment}-milo-backend"
  service_name   = "${local.name_prefix}-service"
  task_family    = "${local.name_prefix}-task"
  log_group_name = "/ecs/${local.name_prefix}"
  container_name = "backend"
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

# The backend runs in the public subnet (with a public IP so Fargate can pull
# from ECR and ship logs via the IGW), but it is NOT reachable from the
# internet: the security group only accepts traffic from the web service SG.
resource "aws_security_group" "task" {
  name        = "${local.name_prefix}-sg"
  description = "Security group for the milo backend Fargate service. Only the web SG can reach it."
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow the web Fargate service to reach the backend."
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [var.web_security_group_id]
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

resource "aws_service_discovery_service" "this" {
  name = var.service_discovery_service_name

  dns_config {
    namespace_id = var.service_discovery_namespace_id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = {
    Name = "${local.name_prefix}-sd"
  }
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
          name  = "PORT"
          value = tostring(var.container_port)
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
    security_groups  = [aws_security_group.task.id]
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.this.arn
  }

  tags = {
    Name = local.service_name
  }
}
