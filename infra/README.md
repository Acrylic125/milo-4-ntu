# milo infrastructure

Terraform configuration for the `milo` AWS infrastructure.

## Layout

```
infra/
├── main.tf                 # composition: vpc + ecr + db + shared Fargate cluster + web + backend
├── providers.tf            # AWS provider + default tags
├── versions.tf             # required versions + S3 backend (state bucket)
├── variables.tf            # inputs consumed by the root module
├── outputs.tf              # top-level outputs (vpc id, subnet ids, ecr urls, ECS service names, ...)
├── modules/                # reusable, composable modules
│   ├── tfstate/            # S3 bucket for Terraform remote state
│   ├── vpc/                # VPC + public/private subnets + IGW + route tables
│   ├── ecr/                # reusable ECR private repository module
│   ├── db/                 # ECS on EC2 PostgreSQL + cloudflared + Secrets Manager
│   ├── web/                # Fargate web (Next.js) service in the public subnet
│   └── backend/            # Fargate backend (Python) service in the private subnet + VPC endpoints
├── environments/
│   └── prod/
│       └── terraform.tfvars.json   # prod-specific variable values
└── bootstrap/              # one-time stack that provisions the state bucket
    ├── main.tf             # calls modules/tfstate
    ├── providers.tf
    ├── versions.tf         # LOCAL state on purpose (chicken-and-egg)
    ├── variables.tf
    └── outputs.tf
```

## Prerequisites

- Terraform **>= 1.10** (backends use S3 native lockfiles via `use_lockfile = true`).
- AWS credentials configured (`aws configure`, `AWS_PROFILE`, or SSO).

## One-time bootstrap

Before the root module can `terraform init`, the state bucket has to exist. Apply the bootstrap stack once:

```bash
cd infra/bootstrap
terraform init
terraform apply
```

This provisions `milo-terraform-state` (versioned, encrypted, public access blocked). The bootstrap stack itself uses **local** state by design.

## Apply from `infra/`

Once the bucket exists, everything happens from the `infra/` directory:

```bash
cd infra
terraform init \
  -backend-config="key=prod/terraform.tfstate"

terraform plan  -var-file=environments/prod/terraform.tfvars.json
terraform apply -var-file=environments/prod/terraform.tfvars.json
```

The `-backend-config="key=..."` keeps state for each environment under a distinct path in the bucket (e.g. `s3://milo-terraform-state/prod/terraform.tfstate`). Adding `staging` later is just a new `environments/staging/terraform.tfvars.json` plus `-backend-config="key=staging/terraform.tfstate"`.

> The default name `terraform.tfvars` is auto-loaded; this repo uses `terraform.tfvars.json` (same format, JSON instead of HCL). You must reference it explicitly with `-var-file=...` since it is not in the working directory.

## What gets created

| Stack | Resource | Identifier |
| --- | --- | --- |
| `bootstrap` | S3 bucket for Terraform state | `milo-terraform-state` |
| `infra` | VPC | CIDR `10.0.0.0/16` |
| `infra` | Public subnet | `10.0.1.0/24` in `ap-southeast-1a` |
| `infra` | Private subnet | `10.0.2.0/24` in `ap-southeast-1a` |
| `infra` | Internet Gateway + public route table (default route → IGW) | n/a |
| `infra` | Private route table (local route only, no NAT) | n/a |
| `infra` | Private ECR repository for web (scan-on-push, AES256) | `<env>-milo-web` |
| `infra` | Private ECR repository for backend (scan-on-push, AES256) | `<env>-milo-backend` |
| `infra` | ECS cluster + single EC2-backed PostgreSQL service | `<env>-milo-db-*` |
| `infra` | Encrypted gp3 EBS volume for PostgreSQL data | attached to the DB EC2 host |
| `infra` | Secrets Manager secret for the DB connection string | `<env>/milo/db/connection-string` by default |
| `infra` | Shared ECS Fargate cluster for application services | `<env>-milo-app-cluster` |
| `infra` | Cloud Map private DNS namespace for service discovery | `milo.local` (overridable) |
| `infra` | Fargate **web** service (Next.js) in the **public** subnet, public IP, reads `DATABASE_URL` from Secrets Manager | `<env>-milo-web-*` |
| `infra` | Fargate **backend** service (Python) in the **public** subnet, public IP, SG locked to web SG only, registered as `backend.milo.local` | `<env>-milo-backend-*` |

## Tagging

Tags are applied via `default_tags` on the AWS provider — every resource in a stack inherits them. Only two tags are set:

| Tag | Value |
| --- | --- |
| `env` | `prd` (from `var.environment`) |
| `service` | `tfstate` for the bootstrap stack, `milo-app` for everything in `infra/` |

Every taggable resource also sets its own `Name` tag so it has a friendly display name in the AWS Console (subnets, route tables, the Internet Gateway, the EC2 host, the ECS cluster/service/task definition, the security group, the CloudWatch log group, the Secrets Manager secret, the ECR repositories, and the Terraform state bucket). IAM roles, instance profiles, route table associations, secret versions, and other untaggable / non-display resources are not tagged.

## Adding a new environment

1. Add `environments/<env>/terraform.tfvars.json` with the env-specific values.
2. `terraform init -reconfigure -backend-config="key=<env>/terraform.tfstate"`.
3. `terraform apply -var-file=environments/<env>/terraform.tfvars.json`.

## Application services

Both application services run on a shared **Fargate** ECS cluster (`<env>-milo-app-cluster`).

| Service | Subnet | Public IP | Internet-reachable | Image | Port |
| --- | --- | --- | --- | --- | --- |
| web (Next.js) | public | yes | yes (ingress on `:3000`) | `<account>.dkr.ecr.<region>.amazonaws.com/<env>-milo-web:<tag>` | `3000` |
| backend (Python) | public | yes | **no** (SG only allows web SG) | `<account>.dkr.ecr.<region>.amazonaws.com/<env>-milo-backend:<tag>` | `8002` |

The image URIs are constructed at plan time from the ECR repositories provisioned in `modules/ecr` plus `var.web.image_tag` / `var.backend.image_tag` (both default to `latest`).

### Traffic flow

```
internet ─► IGW ─► web Fargate task (public subnet, public IP, SG: 0.0.0.0/0:3000)
                       │
                       │ EMBEDDING_BACKEND_URL=http://backend.milo.local:8002
                       ▼
                   Cloud Map (milo.local) ── Route 53 private DNS
                       │
                       ▼
                   backend Fargate task (public subnet, public IP, SG: web-sg only)
                       │
                       └──► IGW ──► ECR / CloudWatch Logs (outbound only)
```

- The web task SG allows `0.0.0.0/0:3000` ingress so the Next.js task is reachable directly on its public IP.
- The backend task SG only accepts ingress on port `8002` from the web task SG. Even though the backend task has a public IP (needed so Fargate can pull from ECR and ship logs through the IGW), nothing on the internet can connect to it — the SG drops it.
- `backend.milo.local` is provided by an `aws_service_discovery_service` registered against the Fargate service, so the backend task IPs are auto-published to Route 53 private DNS as they come and go.

### Secrets

The web task reads the PostgreSQL connection string from the `<env>/milo/db/connection-string` secret in Secrets Manager (created by `modules/db`). It is injected as the `DATABASE_URL` environment variable through the ECS `secrets` field, so the value never appears in the task definition itself. The web task-execution role is granted `secretsmanager:GetSecretValue` scoped to that one secret ARN.

## Notes

- Backend blocks (`backend "s3"`) cannot use variables, so the bucket name and region are hardcoded in `versions.tf`. If you rename the bucket, update it there too.
- The private subnet has no NAT gateway by design; workloads needing outbound internet must run in the public subnet, or a NAT must be added later. Both Fargate services currently sit in the public subnet for this reason; the backend's SG keeps it logically private.
- The DB ECS host runs in the public subnet on purpose so the EC2 host can pull container images and the `cloudflared` sidecar can establish outbound connectivity without adding NAT.
- The connection string secret is generated by Terraform from the EC2 host's private IP plus the configured PostgreSQL credentials, so internal services can use a VPC-routable address instead of a public hostname.
- There is no load balancer in front of the web service. AWS ALBs require subnets in at least two availability zones, and this VPC currently has a single AZ. If/when a second AZ is added, an ALB can sit in front of the web service and the task can drop `assign_public_ip`.
- To migrate the bootstrap stack's own state into the bucket it manages, add a `backend "s3"` block to `bootstrap/versions.tf` and run `terraform init -migrate-state`.
