#!/bin/bash

# Function to handle termination signals
cleanup() {
  echo "Received termination signal, shutting down electrs..."
  # Kill the electrs process if it's running
  if [ -n "$ELECTRS_PID" ]; then
    kill -TERM "$ELECTRS_PID" 2>/dev/null || true
  fi
  exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

while true; do
  echo "Starting electrs..."
  electrs "$@" &
  
  # Store the PID of the electrs process
  ELECTRS_PID=$!
  
  # Wait for the electrs process to exit
  wait $ELECTRS_PID
  
  # If electrs exits, wait before restarting
  echo "electrs exited, restarting in 2 seconds..."
  sleep 2
done
