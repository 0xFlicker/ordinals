#!/usr/bin/env bash
set -euo pipefail

# URL for the latest DynamoDB Local distribution
DYNAMO_URL="https://s3-us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.zip"
OUTPUT_ZIP="dynamodb_local_latest.zip"

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  exit 0
fi

# Use provided directory or dynamodb_local_latest dir
TARGET_DIR="${1:-./dynamodb_local_latest}"

# Exit if target directory already exists
if [[ -d "$TARGET_DIR" ]]; then
  echo "Target directory ${TARGET_DIR} already exists, skipping download..."
  exit 0
fi

echo "Downloading DynamoDB Local from ${DYNAMO_URL}..."
if command -v curl >/dev/null 2>&1; then
  curl -L -o "$OUTPUT_ZIP" "$DYNAMO_URL"
elif command -v wget >/dev/null 2>&1; then
  wget -O "$OUTPUT_ZIP" "$DYNAMO_URL"
else
  echo "Error: curl or wget is required to download files." >&2
  exit 1
fi

echo "Ensuring target directory ${TARGET_DIR} exists..."
mkdir -p "$TARGET_DIR"

echo "Extracting $OUTPUT_ZIP to ${TARGET_DIR}/..."
if command -v unzip >/dev/null 2>&1; then
  unzip -o "$OUTPUT_ZIP" -d "$TARGET_DIR"
elif command -v jar >/dev/null 2>&1; then
  (cd "$TARGET_DIR" && jar xf "../$OUTPUT_ZIP")
else
  echo "Error: unzip or jar is required to extract files." >&2
  exit 1
fi

echo "Cleaning up..."
rm "$OUTPUT_ZIP"

echo "Done!"