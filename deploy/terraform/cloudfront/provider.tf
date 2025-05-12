terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 3.0"
    }
  }
}

// Credentials are read from environment variables:
// CLOUDFLARE_API_KEY and CLOUDFLARE_EMAIL (for Global API Key)
// or CLOUDFLARE_API_TOKEN (for scoped token)
provider "cloudflare" {
  # Credentials are sourced from environment variables:
  # CLOUDFLARE_API_KEY & CLOUDFLARE_EMAIL or CLOUDFLARE_API_TOKEN & CLOUDFLARE_EMAIL
}