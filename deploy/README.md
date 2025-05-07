## Site-to-Site VPN Deployment

This section explains how to deploy a site-to-site VPN between AWS (using CDK) and Linode (using Terraform).

1. Provision the Linode VPN client:

   ```bash
   cd terraform/akamai
   export TF_VAR_linode_token=<YOUR_LINODE_TOKEN>
   terraform init
   terraform apply -auto-approve
   ```

   This creates a Linode g6-standard-1 instance running Debian 11 and outputs the client's public IP.

   After Terraform has applied, retrieve and save the generated SSH private key:

   ```bash
   touch .ssh
   terraform output -raw vpn_private_key_openssh > .ssh/vpn_key_ed25519
   chmod 600 .ssh/vpn_key_ed25519
   ```

   You may now SSH into the VPN client:

   ```bash
   ssh -i .ssh/vpn_key_ed25519 root@$(terraform output -raw vpn_client_ip)
   ```

2. Deploy AWS VPN (and optional beachhead) using CDK:

   Prerequisite: you must have an AWS EC2 Key Pair registered in the target account/region.

   - Using the AWS Console:
     1. Open EC2 → Key Pairs → Create key pair
     2. Give it a name (e.g. `vpn-test-key`), select RSA or ED25519
     3. Download the `<name>.pem` file and save it to `~/.ssh/`
     4. `chmod 400 ~/.ssh/<name>.pem`
   - Or via AWS CLI:
     ```bash
     aws ec2 create-key-pair \
       --key-name vpn-test-key \
       --query 'KeyMaterial' --output text \
       > ~/.ssh/vpn-test-key.pem
     chmod 400 ~/.ssh/vpn-test-key.pem
     ```
     You will reference this key by name when you pass `--context testKeyName` below.

   From your repo root, with the Terraform step already applied:

   ```bash
   # grab the Linode VPN endpoint IP
   export CUSTOMER_GATEWAY_IP=$(cd terraform/akamai && terraform output -raw vpn_client_ip)

   # move into the CDK directory
   cd deploy

   # deploy the VPN stack; provide your AWS KeyPair name to create a test EC2 instance
   cdk deploy \
     --context customerGatewayIp=$CUSTOMER_GATEWAY_IP \
     --context remoteCidrs='["0.0.0.0/0"]' \
     --context testKeyName=<YOUR_AWS_KEY_PAIR_NAME>
   ```

   - The CDK will create the SiteToSiteVpn resources. If you passed `testKeyName`, it also creates a `t3.nano` “Beachhead” EC2 instance in a public subnet, with ICMP & SSH open.
   - After deploy completes, note the `BeachheadPublicIp` output to SSH in for testing:
     ```bash
     # on the CDK (deploy) directory
     ssh -i ~/.ssh/<YOUR_KEY_NAME>.pem ec2-user@$BEACHHEAD_IP
     ```

3. Configure the Linode strongSwan VPN client and test the tunnel:

   a. Gather AWS VPN connection details:
      - In the AWS Console, open VPC → Site-to-Site VPN Connections → select your connection.
      - Under "Tunnel Details", note:
        • Pre-shared key (PSK)
        • Outside IP address of the AWS VPN endpoint
        • Inside IP/CIDR for the tunnel (e.g., 169.254.100.1/30)

   b. SSH into the Linode VPN client:
      ```bash
      ssh -i ~/.ssh/vpn_key_ed25519 root@$(terraform output -raw vpn_client_ip)
      ```

   c. Create or edit `/etc/ipsec.conf` with the following (replace placeholders):
      ```ini
      config setup
        charondebug="ike 1, cfg 0"

      conn aws-vpn
        keyexchange=ikev1
        type=tunnel
        authby=psk
        left=%any
        leftid=<LINODE_PUBLIC_IP>
        leftsubnet=0.0.0.0/0
        right=<AWS_VPN_OUTSIDE_IP>
        rightid=<AWS_VPN_OUTSIDE_IP>
        rightsubnet=<AWS_VPN_INSIDE_CIDR>
        ike=aes256-sha1-modp1024
        esp=aes256-sha1
        auto=add
      ```

   d. Create or edit `/etc/ipsec.secrets` with:
      ```text
      <LINODE_PUBLIC_IP> <AWS_VPN_OUTSIDE_IP> : PSK "<PSK>"
      ```

   e. Restart strongSwan to load the new config:
      ```bash
      systemctl restart strongswan
      ```

   f. Test tunnel connectivity:
      - From the Linode VPN client shell:
        ```bash
        ping -c 3 <AWS_VPN_INSIDE_IP>
        ```
      - From the AWS beachhead instance:
        ```bash
        ping -c 3 <LINODE_VPN_INSIDE_IP>
        ```

   You should see ICMP replies over the IPSec tunnel if configuration is correct.

4. (Optional) Fully automate VPN client configuration and testing:

   ```bash
   cd deploy
   chmod +x scripts/configure-vpn.sh
   # deploy CDK with outputs to JSON file (e.g. prod-ordinals-outputs.json)
   cdk deploy --outputs-file prod-ordinals-outputs.json \
     --context customerGatewayIp=$CUSTOMER_GATEWAY_IP \
     --context remoteCidrs='["0.0.0.0/0"]' \
     --context testKeyName=<YOUR_AWS_KEY_PAIR_NAME>
   # then run the configuration script
   scripts/configure-vpn.sh \
     --aws-key ~/.ssh/<YOUR_KEY_PAIR_NAME>.pem \
     --outputs-file prod-ordinals-outputs.json \
     --linode-key ~/.ssh/vpn_key_ed25519
   ```

   The script will:
   - Extract Linode IP & SSH key from Terraform outputs
   - Extract VPN Connection ID, PSK, outside IP, inside CIDR, and beachhead IP from the CDK outputs JSON
   - SSH into Linode & configure `/etc/ipsec.conf` and `/etc/ipsec.secrets`, restart strongSwan, and ping AWS inside IP
   - SSH into the AWS Beachhead instance and ping the Linode inside IP

Ensure you run Terraform _before_ CDK so that the Customer Gateway IP is available for AWS.
