#!/bin/bash

while true; do
  echo "Starting electrs..."
  electrs "$@"
  
  # If electrs exits, wait before restarting
  echo "electrs exited, restarting in 2 seconds..."
  sleep 2
done
