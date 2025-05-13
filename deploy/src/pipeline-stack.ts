import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
} from "aws-cdk-lib/pipelines";
import { AppStage } from "./app-stage.js";

export interface PipelineStackProps extends cdk.StackProps {
  /** ARN of the CodeStar Connection to GitHub */
  readonly connectionArn: string;
  /** GitHub repo owner, e.g. '0xFlicker' */
  readonly repoOwner: string;
  /** GitHub repo name, e.g. 'ordinals' */
  readonly repoName: string;
  /** Branch to track for deployments, e.g. 'main' */
  readonly branch: string;
}

/**
 * AWS CodePipeline for deploying all Ordinals infrastructure
 */
export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, "Pipeline", {
      pipelineName: `${id}-pipeline`,
      synth: new ShellStep("Synth", {
        input: CodePipelineSource.connection(
          `${props.repoOwner}/${props.repoName}`,
          props.branch,
          { connectionArn: props.connectionArn },
        ),
        commands: [
          // Install Node.js 22 for monorepo compatibility
          "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
          "apt-get install -y nodejs",
          // Verify Node.js version
          "node -v",
          // Install Yarn CLI
          "npm install -g yarn",
          // Install root workspace dependencies
          "yarn install --frozen-lockfile",
          // Install deploy-specific dependencies
          "cd deploy",
          "yarn install --frozen-lockfile",
          // Synthesize CloudAssembly
          "npx cdk synth --quiet",
        ],
        primaryOutputDirectory: "deploy/cdk.out",
      }),
    });

    // Deployment stage: runs the full CDK AppStage in this account/region
    // The AppStage must be scoped to the root CDK App (not nested within this stack)
    const rootApp = this.node.root as cdk.App;
    const prodStage = new AppStage(rootApp, "Prod", {
      env: props.env,
    });
    pipeline.addStage(prodStage);
  }
}
