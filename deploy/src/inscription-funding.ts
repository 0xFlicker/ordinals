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
import { parseEnv } from "./utils/files.js";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface IInscriptionFundingProps {
  readonly domainName: string;
  readonly fundingTable: dynamodb.Table;
  readonly rbacTable: dynamodb.Table;
  readonly userNonceTable: dynamodb.Table;
  readonly claimsTable: dynamodb.Table;
  readonly openEditionClaimsTable: dynamodb.Table;
}

export class InscriptionFunding extends Construct {
  public readonly fundingPollLambda: lambdaNodejs.NodejsFunction;
  public readonly fundedQueue: sqs.Queue;
  public readonly insufficientFundsQueue: sqs.Queue;
  public readonly genesisQueue: sqs.Queue;

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
      retentionPeriod: cdk.Duration.days(4),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    // Create a NodejsFunction for the funding poller lambda
    this.fundingPollLambda = new lambdaNodejs.NodejsFunction(
      this,
      "FundingPollLambda",
      {
        entry: path.join(
          __dirname,
          "../../apps/functions/src/lambdas/funding-queue.ts",
        ),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,

        bundling: {
          externalModules: ["aws-sdk", "@aws-sdk/*", "dtrace-provider"],
          sourceMap: true,
          inject: [path.join(__dirname, "./esbuild/cjs-shim.ts")],
          format: lambdaNodejs.OutputFormat.ESM,
          target: "node20",
          platform: "node",
        },
        environment: {
          LOG_LEVEL: "debug",
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
          ...parseEnv(`${props.domainName}/.env.graphql`),
        },
      },
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
