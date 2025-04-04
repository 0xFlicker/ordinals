import * as kms from "aws-cdk-lib/aws-kms";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface EnvelopeProps {
  description?: string;
}

export class Envelope extends Construct {
  public readonly key: kms.Key;

  constructor(scope: Construct, id: string, props: EnvelopeProps = {}) {
    super(scope, id);

    this.key = new kms.Key(this, "Key", {
      description: props.description ?? "Key for envelope encryption",
      enableKeyRotation: true,
    });

    new cdk.CfnOutput(this, "KeyId", {
      value: this.key.keyId,
    });
  }
}
