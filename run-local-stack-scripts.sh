#!/bin/bash

# Directory containing the scripts
SCRIPT_DIR="local-stack-scripts"

# Check if directory exists
if [ ! -d "$SCRIPT_DIR" ]; then
  echo "Error: Directory $SCRIPT_DIR not found"
  exit 1
fi

# Execute all .sh files in the directory
for script in "$SCRIPT_DIR"/*.sh; do
  if [ -f "$script" ]; then
    echo "Running script: $script"
    bash "$script"
    if [ $? -ne 0 ]; then
      echo "Warning: Script $script failed, continuing with the next script"
    fi
  fi
done

echo "All scripts executed, check for any errors above." 