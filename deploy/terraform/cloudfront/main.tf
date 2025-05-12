resource "cloudflare_zone" "bitflick" {
  # The DNS zone to manage
  zone       = "bitflick.xyz"
  # The Cloudflare account this zone belongs to
  account_id = var.account_id
}

resource "cloudflare_record" "api" {
  zone_id = cloudflare_zone.bitflick.id
  name    = "api"
  type    = var.record_type
  value   = var.api_origin
  # TTL must be 1 (auto) when Cloudflare proxy is enabled
  ttl     = var.proxied ? 1 : var.ttl
  proxied = var.proxied
}