#!/usr/bin/env bash
set -euo pipefail

# Script to configure the Linode strongSwan VPN client and test the VPN tunnel
# Requirements: aws cli v2, terraform, cdk, jq, ssh

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TF_DIR="$DEPLOY_DIR/terraform/akamai"
CDK_DIR="$DEPLOY_DIR"

# Parse arguments
AWS_KEY_PATH=""
LINODE_KEY_PATH=""
OUTPUTS_FILE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --aws-key)
      AWS_KEY_PATH="$2"; shift 2;;
    --linode-key)
      LINODE_KEY_PATH="$2"; shift 2;;
    --outputs-file)
      OUTPUTS_FILE="$2"; shift 2;;
    --help|-h)
      echo "Usage: $0 --aws-key <aws_key.pem> --outputs-file <cdk_outputs.json> [--linode-key <linode_key.pem>]";
      exit 0;;
    *)
      echo "Unknown argument: $1"; exit 1;;
  esac
done

if [[ -z "$AWS_KEY_PATH" || -z "$OUTPUTS_FILE" ]]; then
  echo "Error: --aws-key and --outputs-file are required" >&2
  exit 1
fi
if [[ -n "$LINODE_KEY_PATH" ]]; then
  LINODE_KEY="$LINODE_KEY_PATH"
else
  LINODE_KEY="$(mktemp)"
  terraform -chdir="$TF_DIR" output -raw vpn_private_key_openssh > "$LINODE_KEY"
  chmod 600 "$LINODE_KEY"
fi

# Linode public IP from Terraform
LINODE_IP=$(terraform -chdir="$TF_DIR" output -raw vpn_client_ip)

# AWS VPN Connection ID from CDK outputs file
VPN_CONN_ID=$(jq -r '.ordinals.VpnConnectionId' < "$OUTPUTS_FILE")

# Fetch VPN details
VPN_JSON=$(aws ec2 describe-vpn-connections --vpn-connection-ids "$VPN_CONN_ID" --output json)
PSK=$(echo "$VPN_JSON" | jq -r '.VpnConnections[0].Options.TunnelOptions[0].PreSharedKey')
AWS_OUTSIDE_IP=$(echo "$VPN_JSON" | jq -r '.VpnConnections[0].Options.TunnelOptions[0].OutsideIpAddress')
AWS_INSIDE_CIDR=$(echo "$VPN_JSON" | jq -r '.VpnConnections[0].Options.TunnelOptions[0].TunnelInsideCidr')

# Derive tunnel inside IPs
AWS_INSIDE_IP=$(echo "$AWS_INSIDE_CIDR" | awk -F'[./]' '{print $1 "." $2 "." $3 "." ($4+1)}')
LINODE_INSIDE_IP=$(echo "$AWS_INSIDE_CIDR" | awk -F'[./]' '{print $1 "." $2 "." $3 "." ($4+2)}')

echo "Configuring Linode VPN client at $LINODE_IP..."
ssh -o StrictHostKeyChecking=no -i "$LINODE_KEY" root@"$LINODE_IP" bash <<EOF
cat >ipsec.conf <<EOC
config setup
  charondebug="ike 1, cfg 0"

conn aws-vpn
  keyexchange=ikev1
  type=tunnel
  authby=psk
  left=%any
  leftid=$LINODE_IP
  leftsubnet=0.0.0.0/0
  right=$AWS_OUTSIDE_IP
  rightid=$AWS_OUTSIDE_IP
  rightsubnet=$AWS_INSIDE_CIDR
  ike=aes256-sha1-modp1024
  esp=aes256-sha1
  auto=add
EOC

cat >/etc/ipsec.secrets <<EOS
$LINODE_IP $AWS_OUTSIDE_IP : PSK "$PSK"
EOS

systemctl restart strongswan
EOF

echo "Testing from Linode VPN client..."
ssh -o StrictHostKeyChecking=no -i "$LINODE_KEY" root@"$LINODE_IP" ping -c 3 "$AWS_INSIDE_IP"

echo "Testing from AWS beachhead..."
# fetch beachhead IP from CDK outputs file
BEACHHEAD_IP=$(jq -r '.ordinals.BeachheadPublicIp' < "$OUTPUTS_FILE")
ssh -o StrictHostKeyChecking=no -i "$AWS_KEY_PATH" ec2-user@"$BEACHHEAD_IP" ping -c 3 "$LINODE_INSIDE_IP"