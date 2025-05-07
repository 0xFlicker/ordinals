// Generate an ED25519 SSH key pair for the VPN client
resource "tls_private_key" "vpn_key" {
  algorithm = "ED25519"
}

resource "linode_instance" "vpn_client" {
  label           = "vpn-client"
  region          = var.linode_region
  type            = var.linode_type
  image           = var.linode_image
  # inject the generated public key into the VM (strip any newlines)
  authorized_keys = [
    trimspace(tls_private_key.vpn_key.public_key_openssh)
  ]
  # optional password fallback if desired; otherwise can be omitted
  root_pass       = var.root_password
}

resource "null_resource" "vpn_install" {
  depends_on = [linode_instance.vpn_client]

  connection {
    type        = "ssh"
    # ipv4 is a set, so convert to list before selecting the first IP address
    host        = tolist(linode_instance.vpn_client.ipv4)[0]
    user        = "root"
    # use the generated SSH private key in OpenSSH format
    private_key = tls_private_key.vpn_key.private_key_openssh
  }

  provisioner "remote-exec" {
    inline = [
      "apt-get update -y",
      "apt-get install -y strongswan",
      "sysctl -w net.ipv4.ip_forward=1",
      "echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.conf",
    ]
  }
}