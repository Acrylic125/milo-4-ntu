# milo infrastructure

Terraform configuration for the `milo` AWS infrastructure.

## Layout

```
infra/
├── main.tf                 # composition: calls module "vpc" and module "ecr"
├── providers.tf            # AWS provider + default tags
├── versions.tf             # required versions + S3 backend (state bucket)
├── variables.tf            # inputs consumed by the root module
├── outputs.tf              # top-level outputs (vpc id, subnet ids, ecr urls, ...)
├── modules/                # reusable, composable modules
│   ├── tfstate/            # S3 bucket for Terraform remote state
│   ├── vpc/                # VPC + public/private subnets + IGW + route tables
│   └── ecr/                # reusable ECR private repository module
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

## Tagging

Tags are applied via `default_tags` on the AWS provider — every resource in a stack inherits them. Only two tags are set:

| Tag | Value |
| --- | --- |
| `env` | `prd` (from `var.environment`) |
| `service` | `tfstate` for the bootstrap stack, `milo-app` for everything in `infra/` |

No per-resource tags (`Name`, `Tier`, etc.) are applied. **Consequence:** VPC, subnets, the Internet Gateway, and route tables will appear in the AWS Console without a friendly display name (just IDs). Resources that have a native name attribute — the S3 bucket (`milo-terraform-state`) and the ECR repositories (`<env>-milo-web`, `<env>-milo-backend`) — still display correctly.

## Adding a new environment

1. Add `environments/<env>/terraform.tfvars.json` with the env-specific values.
2. `terraform init -reconfigure -backend-config="key=<env>/terraform.tfstate"`.
3. `terraform apply -var-file=environments/<env>/terraform.tfvars.json`.

## Notes

- Backend blocks (`backend "s3"`) cannot use variables, so the bucket name and region are hardcoded in `versions.tf`. If you rename the bucket, update it there too.
- The private subnet has no NAT gateway by design; workloads needing outbound internet must run in the public subnet, or a NAT must be added later.
- To migrate the bootstrap stack's own state into the bucket it manages, add a `backend "s3"` block to `bootstrap/versions.tf` and run `terraform init -migrate-state`.
