import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export interface SiteToSiteVpnProps {
  /** The AWS VPC you want to expose to the remote network */
  readonly vpc: ec2.IVpc;
  /** Public IP of your Linode/Akamai VPN endpoint */
  readonly customerGatewayIp: string;
  /** Which CIDRs in the remote network should be reachable over the tunnel */
  readonly remoteCidrs: string[];
  /** (Optional) your ASN on the remote side if you run BGP */
  readonly remoteAsn?: number;
  /** (Optional) tunnel options overrides (e.g. preSharedKey) */
  readonly tunnelOptions?: ec2.CfnVPNConnection.VpnTunnelOptionsSpecificationProperty[];
}

export class SiteToSiteVpn extends Construct {
  public readonly vpnConnection: ec2.CfnVPNConnection;

  constructor(scope: Construct, id: string, props: SiteToSiteVpnProps) {
    super(scope, id);

    // 1) Customer Gateway (your Linode/Akamai public IP)
    const cgw = new ec2.CfnCustomerGateway(this, "CustomerGateway", {
      bgpAsn: props.remoteAsn ?? 65000,
      ipAddress: props.customerGatewayIp,
      type: "ipsec.1",
    });

    // 2) AWS VPN Gateway
    const vgw = new ec2.CfnVPNGateway(this, "VpnGateway", {
      amazonSideAsn: 64512,
      type: "ipsec.1",
    });

    // attach it to your VPC
    new ec2.CfnVPCGatewayAttachment(this, "AttachVpnGateway", {
      vpcId: props.vpc.vpcId,
      vpnGatewayId: vgw.ref,
    });

    // 3) the Tunnel (static routing only)
    this.vpnConnection = new ec2.CfnVPNConnection(this, "VpnConnection", {
      customerGatewayId: cgw.ref,
      vpnGatewayId: vgw.ref,
      type: "ipsec.1",
      staticRoutesOnly: true,
      vpnTunnelOptionsSpecifications: props.tunnelOptions,
    });

    // 4) tell AWS how to route remote networks into your VPC
    for (const [i, cidr] of props.remoteCidrs.entries()) {
      new ec2.CfnVPNConnectionRoute(this, `RouteToRemote${i}`, {
        vpnConnectionId: this.vpnConnection.ref,
        destinationCidrBlock: cidr,
      });
    }

    // 5) (Optional) open up your AWS SGs so instances can talk to the remote subnet
    props.vpc
      .selectSubnets({ subnetType: ec2.SubnetType.PUBLIC })
      .subnets.forEach((subnet, idx) => {
        // assume you have a security group per subnet or a shared one
        // you’d add ingress rules from each remote CIDR here
      });
  }
}
