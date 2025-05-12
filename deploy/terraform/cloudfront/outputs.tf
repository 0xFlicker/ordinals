output "api_url" {
  description = "The URL for the GraphQL API"
  # We know the zone is bitflick.xyz, so build the URL directly
  value       = "https://${cloudflare_record.api.name}.bitflick.xyz"
}