terraform {
  required_providers {
    linode = {
      source  = "linode/linode"
      version = "~> 1.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.0.0"
}

provider "linode" {
  token = var.linode_token
}

# TLS provider for on-the-fly SSH key generation
provider "tls" {}