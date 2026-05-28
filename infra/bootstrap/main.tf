module "tfstate" {
  source = "../modules/tfstate"

  bucket_name = var.bucket_name
}
