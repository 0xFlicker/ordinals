import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import path from "path";
import { fileURLToPath } from "url";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Envelope } from "./envelope.js";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { BitcoinNetwork } from "./utils/types.js";
import * as ec2 from "aws-cdk-lib/aws-ec2";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface IInscriptionFundingProps {
  readonly domainName: string;
  readonly fundingTable: dynamodb.Table;
  readonly batchTable: dynamodb.Table;
  readonly rbacTable: dynamodb.Table;
  readonly userNonceTable: dynamodb.Table;
  readonly usersTable: dynamodb.Table;
  readonly claimsTable: dynamodb.Table;
  readonly openEditionClaimsTable: dynamodb.Table;
  readonly parentInscriptionSecKeyEnvelope: Envelope;
  readonly inscriptionBucket: s3.Bucket;
  readonly rpcLambdas: Record<BitcoinNetwork, lambda.Function | undefined>;
  readonly batchRevealTimeMinutes: number;
  readonly transactionBucket: s3.Bucket;
  readonly sopsLayer: lambda.LayerVersion;
  readonly vpc?: ec2.IVpc;
  readonly networks?: BitcoinNetwork[];
}

export class InscriptionFunding extends Construct {
  public readonly fundingPollLambda: lambdaNodejs.NodejsFunction;
  public readonly batchRevealLambda: lambdaNodejs.NodejsFunction;
  public readonly fundedQueue: sqs.Queue;
  public readonly insufficientFundsQueue: sqs.Queue;
  public readonly genesisQueue: sqs.Queue;
  public readonly batchSuccessQueue: sqs.Queue;
  public readonly batchFailureQueue: sqs.Queue;
  public readonly batchRemainingFundingsQueue: sqs.Queue;
  public readonly batchRevealDlq: sqs.Queue;
  constructor(scope: Construct, id: string, props: IInscriptionFundingProps) {
    super(scope, id);

    // Create the InsufficientFundsQueue
    this.insufficientFundsQueue = new sqs.Queue(
      this,
      "InsufficientFundsQueue",
      {
        visibilityTimeout: cdk.Duration.seconds(30),
        retentionPeriod: cdk.Duration.days(14),
        encryption: sqs.QueueEncryption.SQS_MANAGED,
      },
    );

    // Create the FundedQueue
    this.fundedQueue = new sqs.Queue(this, "FundedQueue", {
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.days(4),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    // Set up CloudWatch alarm for InsufficientFundsQueue
    new cloudwatch.Alarm(this, "InsufficientFundsQueueAlarm", {
      metric:
        this.insufficientFundsQueue.metricApproximateNumberOfMessagesVisible(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription:
        "Alert when messages are sent to the InsufficientFundsQueue",
      alarmName: "InsufficientFundsQueueAlarm",
    });

    // Create the GenesisQueue
    this.genesisQueue = new sqs.Queue(this, "GenesisQueue", {
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.days(7),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    // Create layers for funding lambdas: SOPS binary, GraphQL and Electrum secrets
    const secretsDir = path.join(__dirname, "../../secrets", props.domainName);
    const graphqlSecretLayer = new lambda.LayerVersion(
      this,
      "FundingGraphqlSecretLayer",
      {
        code: lambda.Code.fromAsset(secretsDir, {
          exclude: ["*", "!.env.graphql"],
        }),
        compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
        compatibleArchitectures: [lambda.Architecture.ARM_64],
        description: "Layer containing encrypted .env.graphql for Funding",
      },
    );
    const electrumSecretLayer = new lambda.LayerVersion(
      this,
      "FundingElectrumSecretLayer",
      {
        code: lambda.Code.fromAsset(secretsDir, {
          exclude: ["*", "!.env.electrum"],
        }),
        compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
        compatibleArchitectures: [lambda.Architecture.ARM_64],
        description: "Layer containing encrypted .env.electrum for Funding",
      },
    );
    // Create a NodejsFunction for the funding poller lambda
    this.fundingPollLambda = new lambdaNodejs.NodejsFunction(
      this,
      "FundingPollLambda",
      {
        entry: path.join(
          __dirname,
          "../../apps/functions/src/lambdas/funding-queue/handler.ts",
        ),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        architecture: lambda.Architecture.ARM_64,
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        ...(props.vpc && {
          vpc: props.vpc,
          vpcSubnets: {
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          },
        }),
        bundling: {
          externalModules: ["aws-sdk", "@aws-sdk/*", "dtrace-provider"],
          sourceMap: true,
          minify: true,
          sourcesContent: true,
          inject: [path.join(__dirname, "./esbuild/cjs-shim.ts")],
          format: lambdaNodejs.OutputFormat.ESM,
          target: "node20",
          platform: "node",
        },
        environment: {
          LOG_LEVEL: "debug",
          NODE_OPTIONS: "--enable-source-maps",
          TABLE_NAMES: JSON.stringify({
            rbac: props.rbacTable.tableName,
            userNonce: props.userNonceTable.tableName,
            funding: props.fundingTable?.tableName ?? "null",
            claims: props.claimsTable.tableName,
            openEditionClaims: props.openEditionClaimsTable.tableName,
          }),
          EVENT_BUS_NAME: "default",
          FUNDED_QUEUE_URL: this.fundedQueue.queueUrl,
          INSUFFICIENT_FUNDS_QUEUE_URL: this.insufficientFundsQueue.queueUrl,
          GENESIS_QUEUE_URL: this.genesisQueue.queueUrl,
        },
        // attach SOPS, GraphQL, and Electrum secret layers
        layers: [props.sopsLayer, graphqlSecretLayer, electrumSecretLayer],
      },
    );

    this.fundingPollLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["kms:Decrypt"],
        resources: [
          "arn:aws:kms:us-east-2:167146046754:key/42d63d0c-0f8e-493f-ac73-91c83da1341e",
        ],
      }),
    );

    this.fundingPollLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: ["arn:aws:iam::167146046754:role/sopsAdmin"],
      }),
    );

    // Grant permissions to the Lambda function to read/write from the funding table
    props.fundingTable?.grantReadWriteData(this.fundingPollLambda);

    // Grant permissions to the Lambda function to send messages to the SQS queues
    this.fundedQueue.grantSendMessages(this.fundingPollLambda);
    this.insufficientFundsQueue.grantSendMessages(this.fundingPollLambda);
    this.genesisQueue.grantSendMessages(this.fundingPollLambda);

    // Create an EventBridge rule to trigger the lambda on a schedule
    const rule = new events.Rule(this, "FundingPollScheduleRule", {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
    });
    rule.addTarget(new targets.LambdaFunction(this.fundingPollLambda));

    // Create the BatchSuccessQueue
    this.batchSuccessQueue = new sqs.Queue(this, "BatchSuccessQueue", {
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.days(4),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    // Create the BatchFailureQueue
    this.batchFailureQueue = new sqs.Queue(this, "BatchFailureQueue", {
      visibilityTimeout: cdk.Duration.seconds(600),
      retentionPeriod: cdk.Duration.days(7),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    // Create the BatchRemainingFundingsQueue
    this.batchRemainingFundingsQueue = new sqs.Queue(
      this,
      "BatchRemainingFundingsQueue",
      {
        visibilityTimeout: cdk.Duration.seconds(60),
        retentionPeriod: cdk.Duration.days(1),
        encryption: sqs.QueueEncryption.SQS_MANAGED,
      },
    );

    // Create a Dead Letter Queue for the BatchRevealLambda
    this.batchRevealDlq = new sqs.Queue(this, "BatchRevealDlq", {
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    // Create the BatchRevealLambda
    this.batchRevealLambda = new lambdaNodejs.NodejsFunction(
      this,
      "BatchRevealLambda",
      {
        entry: path.join(
          __dirname,
          "../../apps/functions/src/lambdas/batch-reveal-queue/handler.ts",
        ),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        architecture: lambda.Architecture.ARM_64,
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        reservedConcurrentExecutions: 1,
        ...(props.vpc && {
          vpc: props.vpc,
          vpcSubnets: {
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          },
        }),
        bundling: {
          externalModules: ["aws-sdk", "@aws-sdk/*", "dtrace-provider"],
          sourceMap: true,
          minify: true,
          sourcesContent: true,
          inject: [path.join(__dirname, "./esbuild/cjs-shim.ts")],
          format: lambdaNodejs.OutputFormat.ESM,
          target: "node20",
          platform: "node",
        },
        // attach SOPS, GraphQL, and Electrum secret layers
        layers: [props.sopsLayer, graphqlSecretLayer, electrumSecretLayer],
        environment: {
          LOG_LEVEL: "debug",
          NODE_OPTIONS: "--enable-source-maps",
          TABLE_NAMES: JSON.stringify({
            funding: props.fundingTable?.tableName ?? "null",
            batch: props.batchTable?.tableName ?? "null",
          }),
          BATCH_SUCCESS_QUEUE_URL: this.batchSuccessQueue.queueUrl,
          BATCH_FAILURE_QUEUE_URL: this.batchFailureQueue.queueUrl,
          BATCH_REMAINING_FUNDINGS_QUEUE_URL:
            this.batchRemainingFundingsQueue.queueUrl,
          INSCRIPTION_BUCKET: props.inscriptionBucket.bucketName,
          ...Object.fromEntries(
            Object.entries(props.rpcLambdas)
              .filter(([, lambda]) => lambda !== undefined)
              .map(([network, lambda]) => [
                `${network.toUpperCase()}_RPC_LAMBDA_ARN`,
                lambda?.functionArn,
              ]),
          ),
          BATCH_REVEAL_TIME_MINUTES: props.batchRevealTimeMinutes.toString(),
          TRANSACTION_BUCKET: props.transactionBucket.bucketName,
        },
      },
    );

    // Grant permission to the lambda function to call the rpc lambda
    for (const network of Object.keys(props.rpcLambdas)) {
      props.rpcLambdas[network as BitcoinNetwork]?.grantInvoke(
        this.batchRevealLambda,
      );
    }

    this.batchRevealLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["kms:Decrypt"],
        resources: [
          "arn:aws:kms:us-east-2:167146046754:key/42d63d0c-0f8e-493f-ac73-91c83da1341e",
        ],
      }),
    );

    this.batchRevealLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: ["arn:aws:iam::167146046754:role/sopsAdmin"],
      }),
    );

    // Grant permissions to the Lambda function to read/write from the funding table
    props.fundingTable?.grantReadWriteData(this.batchRevealLambda);

    // Grant permissions to the Lambda function to send messages to the SQS queues
    this.batchSuccessQueue.grantSendMessages(this.batchRevealLambda);
    this.batchFailureQueue.grantSendMessages(this.batchRevealLambda);
    this.batchRemainingFundingsQueue.grantSendMessages(this.batchRevealLambda);
    // Grant permissions to the Lambda function to read/write from the inscription bucket to store inscriptions
    props.inscriptionBucket.grantReadWrite(this.batchRevealLambda);
    // When the genesis queue receives a message, trigger the batch reveal lambda
    this.genesisQueue.grantConsumeMessages(this.batchRevealLambda);

    // Grant permissions to the Lambda function to read/write from the transaction bucket to store transactions
    props.transactionBucket.grantReadWrite(this.batchRevealLambda);

    // Grant permissions to the Lambda function to decrypt the parent inscription sec key envelope
    props.parentInscriptionSecKeyEnvelope.key.grantDecrypt(
      this.batchRevealLambda,
    );

    // Also execute every 15 minutes
    const batchRevealRule = new events.Rule(this, "BatchRevealScheduleRule", {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
    });
    batchRevealRule.addTarget(
      new targets.LambdaFunction(this.batchRevealLambda),
    );

    // Create an SQS event source mapping for the genesis queue
    // new lambda.EventSourceMapping(this, "GenesisQueueEventSource", {
    //   target: this.batchRevealLambda,
    //   eventSourceArn: this.genesisQueue.queueArn,
    //   enabled: true,
    //   onFailure: new SqsDlq(this.batchRevealDlq),
    // });
    this.batchRevealLambda.addEventSource(
      new SqsEventSource(this.fundedQueue, {
        enabled: true,
        maxBatchingWindow: cdk.Duration.minutes(1),
      }),
    );

    // Output the queue URLs
    new cdk.CfnOutput(this, "FundedQueueUrl", {
      value: this.fundedQueue.queueUrl,
    });
    new cdk.CfnOutput(this, "InsufficientFundsQueueUrl", {
      value: this.insufficientFundsQueue.queueUrl,
    });
    new cdk.CfnOutput(this, "GenesisQueueUrl", {
      value: this.genesisQueue.queueUrl,
    });
  }
}
