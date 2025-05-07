variable "linode_token" {
  description = "Linode API token"
  type        = string
}

variable "ssh_public_key_path" {
  description = "Path to the SSH public key file"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "ssh_private_key_path" {
  description = "Path to the SSH private key file"
  type        = string
  default     = "~/.ssh/id_rsa"
}

variable "linode_region" {
  description = "Linode region"
  type        = string
  default     = "us-east"
}

variable "linode_image" {
  description = "Linode image to use"
  type        = string
  default     = "linode/debian11"
}

variable "linode_type" {
  description = "Linode instance type"
  type        = string
  default     = "g6-standard-1"
}

variable "root_password" {
  description = "Root password (optional if using SSH keys)"
  type        = string
  default     = null
}