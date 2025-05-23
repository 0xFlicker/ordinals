import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";

import { Storage } from "./storage.js";
import { DynamoDB } from "./dynamodb/index.js";
import { Www } from "./distribution.js";
import { Graphql } from "./graphql.js";
import { Frame } from "./frame.js";
import { Envelope } from "./envelope.js";
import { InscriptionFunding } from "./inscription-funding.js";
import { BitcoinRpcFunction } from "./rpc.js";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { SiteToSiteVpn } from "./site-to-site-vpn.js";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { BitcoinNetwork } from "./utils/types.js";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";

/**
 * Common props for stacks that require a VPC and Bitcoin client security group.
 */
interface IProps extends cdk.StackProps {
  /** Application origin URL */
  origin: string;
  /** SOPS layer for secrets decryption */
  sopsLayer: lambda.LayerVersion;
  /** Shared VPC for application resources */
  vpc?: ec2.IVpc;
  /** Security group permitting Bitcoin client access */
  networks?: BitcoinNetwork[];
  /** Electrum NLBs for each network */
  electrumNlbs: Record<BitcoinNetwork, elbv2.INetworkLoadBalancer | undefined>;
  /** Bitcoin RPC ALBs for each network */
  bitcoinRpcAlbs: Record<
    BitcoinNetwork,
    elbv2.IApplicationLoadBalancer | undefined
  >;
}

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IProps) {
    const {
      origin,
      sopsLayer,
      vpc,
      networks,
      electrumNlbs,
      bitcoinRpcAlbs,
      ...rest
    } = props;
    super(scope, id, rest);

    const { bucket: inscriptionBucket } = new Storage(this, "Storage", {
      name: "inscriptions",
    });
    const { bucket: uploadBucket } = new Storage(this, "UploadBucket", {
      name: "uploads",
      localstack: process.env.DEPLOYMENT === "localstack",
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedOrigins: [
            "http://localhost:3000",
            "https://localhost:3000",
            "https://www.bitflick.xyz",
          ],
          allowedMethods: [s3.HttpMethods.PUT],
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
        },
      ],
    });
    const { bucket: transactionBucket } = new Storage(
      this,
      "TransactionBucket",
      {
        name: "transactions",
        localstack: process.env.DEPLOYMENT === "localstack",
        encryption: s3.BucketEncryption.S3_MANAGED,
      },
    );

    const {
      claimsTable,
      fundingTable,
      batchTable,
      openEditionClaimsTable,
      rbacTable,
      userNonceTable,
      walletTable,
      usersTable,
      uploadsTable,
      socialsTable,
    } = new DynamoDB(this, "DynamoDB", {
      domainName: new URL(origin).host,
      sopsLayer,
    });

    const parentInscriptionSecKeyEnvelope = new Envelope(
      this,
      "ParentInscriptionSecKeyEnvelope",
      {
        description: "Key for envelope encryption of bitcoin taproot secKeys",
      },
    );

    const fundingSecKeyEnvelope = new Envelope(this, "FundingSecKeyEnvelope", {
      description: "Key for envelope encryption of bitcoin taproot secKeys",
    });

    const rpcStacks = new BitcoinRpcFunction(this, "RpcStack", {
      domainName: new URL(origin).host,
      networks,
      sopsLayer,
      vpc,
      bitcoinRpcAlbs: props.bitcoinRpcAlbs,
    });

    // Always deploy the InscriptionFunding construct
    new InscriptionFunding(this, "TxWorker", {
      domainName: new URL(origin).host,
      fundingTable,
      rbacTable,
      userNonceTable,
      usersTable,
      claimsTable,
      openEditionClaimsTable,
      batchTable,
      parentInscriptionSecKeyEnvelope,
      fundingSecKeyEnvelope,
      inscriptionBucket,
      rpcLambdas: rpcStacks.rpcLambdas,
      transactionBucket,
      batchRevealTimeMinutes: process.env.DEPLOYMENT === "localstack" ? 1 : 15,
      sopsLayer,
      vpc,
      networks,
      electrumNlbs,
    });

    if (process.env.DEPLOYMENT !== "localstack") {
      const { httpApi: graphqlApi } = new Graphql(this, "Graphql", {
        domainName: new URL(origin),
        claimsTable,
        fundingTable,
        openEditionClaimsTable,
        rbacTable,
        userNonceTable,
        usersTable,
        walletTable,
        inscriptionBucket,
        uploadBucket,
        fundingSecKeyEnvelope,
        parentInscriptionSecKeyEnvelope,
        uploadsTable,
        sopsLayer,
        rpcLambdas: rpcStacks.rpcLambdas,
        electrumNlbs,
      });
      const graphqlApiUrl = cdk.Fn.select(
        1,
        cdk.Fn.split("//", graphqlApi.apiEndpoint),
      );
      new cdk.CfnOutput(this, "GraphqlApiUrl", {
        value: graphqlApiUrl,
      });

      // new Www(this, "Www", {
      //   // Adding cert manually because cloudflare
      //   // noCert: true,
      //   domain: `www.${new URL(origin).host}`,
      //   graphqlApi,
      // });

      const testKeyName = this.node.tryGetContext("testKeyName");
      if (testKeyName) {
        // const beachheadSg = new ec2.SecurityGroup(this, "BeachheadSG", {
        //   vpc,
        //   description: "Beachhead SG for VPN testing",
        //   allowAllOutbound: true,
        // });
        // beachheadSg.addIngressRule(
        //   ec2.Peer.anyIpv4(),
        //   ec2.Port.icmpPing(),
        //   "Allow ICMP Ping",
        // );
        // beachheadSg.addIngressRule(
        //   ec2.Peer.anyIpv4(),
        //   ec2.Port.tcp(22),
        //   "Allow SSH",
        // );
        // const beachhead = new ec2.Instance(this, "arm-beachhead", {
        //   vpc,
        //   instanceType: new ec2.InstanceType("t4g.nano"),
        //   machineImage: ec2.MachineImage.latestAmazonLinux2023({
        //     cpuType: ec2.AmazonLinuxCpuType.ARM_64,
        //   }),
        //   associatePublicIpAddress: true,
        //   securityGroup: beachheadSg,
        //   keyName: testKeyName,
        //   vpcSubnets: {
        //     subnetType: ec2.SubnetType.PUBLIC,
        //   },
        // });
        // new cdk.CfnOutput(this, "BeachheadPublicIp", {
        //   description: "Public IP for VPN test instance",
        //   value: beachhead.instancePublicIp,
        // });
      }
    }
  }
}

export class FrameStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id, props);
    new Frame(this, "Frame", {
      imageDomainName: `frame.${new URL(props.origin).hostname}.bitflick.xyz`,
    });
  }
}
