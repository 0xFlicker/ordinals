
variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
  default     = "6c3ad12797ce1296e7129defb2d7975f"
}


variable "api_origin" {
  description = "Origin hostname or IP address for the GraphQL API (e.g., my-api.example.com)"
  type        = string
}

variable "record_type" {
  description = "DNS record type for the API subdomain"
  type        = string
  default     = "CNAME"
}

variable "ttl" {
  description = "DNS TTL in seconds"
  type        = number
  default     = 3600
}

variable "proxied" {
  description = "Whether Cloudflare proxy (orange cloud) is enabled"
  type        = bool
  default     = true
}