#!/bin/bash

# Set up trap to clean up on script exit (success or failure)
cleanup() {
  echo "Cleaning up decrypted secrets..."
  rm -rf ./dist/decrypted-secrets
}

# Register the cleanup function to run on script exit
trap cleanup EXIT

# Run the deployment
npm run decrypt-secrets && \
DEPLOYMENT=localstack \
ORIGIN=http://localhost.localstack.cloud:4566 \
AWS_REGION=us-east-1 \
CDK_DEFAULT_ACCOUNT=000000000000 \
AWS_ACCESS_KEY_ID=000000000000 \
AWS_SECRET_ACCESS_KEY=000000000000 \
cdklocal deploy --outputs-file outputs.json ordinals && \
node ./scripts/generateTableNamesEnv.mjs 