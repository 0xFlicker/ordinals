output "vpn_client_ip" {
  description = "Public IP of the Linode VPN client"
  # ipv4 is a set, so convert to list before selecting the first value
  value       = tolist(linode_instance.vpn_client.ipv4)[0]
}

// expose the generated SSH private key for local access
output "vpn_private_key_openssh" {
  description = "OpenSSH-formatted ED25519 private key for SSH access to the VPN client"
  value       = tls_private_key.vpn_key.private_key_openssh
  sensitive   = true
}