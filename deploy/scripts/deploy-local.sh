#!/bin/bash

# Set up trap to clean up on script exit (success or failure)
cleanup() {
  echo "Cleaning up decrypted secrets..."
  rm -rf ./dist/decrypted-secrets
}

# Register the cleanup function to run on script exit
trap cleanup EXIT

CDK_ARGS="--outputs-file outputs.json"
if [ "$LOCAL_DEPLOY_YES" = "1" ]; then
  CDK_ARGS="$CDK_ARGS --require-approval never"
fi
# Run the deployment
npm run decrypt-secrets && \
DEPLOYMENT=localstack \
ORIGIN=http://localhost.localstack.cloud:4566 \
AWS_REGION=us-east-1 \
CDK_DEFAULT_ACCOUNT=000000000000 \
AWS_ACCESS_KEY_ID=000000000000 \
AWS_SECRET_ACCESS_KEY=000000000000 \
cdklocal deploy $CDK_ARGS ordinals && \
node ./scripts/generateTableNamesEnv.mjs 