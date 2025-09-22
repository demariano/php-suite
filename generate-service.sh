#!/bin/bash

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "jq is not installed. Please install it to proceed."
  exit 1
fi

# Check if parent folder, service name, and service type are provided
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
  echo "Usage: $0 <parent-folder> <service-name> <service-type>"
  exit 1
fi

PARENT_FOLDER=$1
SERVICE_NAME=$2
SERVICE_TYPE=$3
SQS_QUEUE_NAME=$4
CAPITALIZED_SERVICE_NAME=$(echo "$SERVICE_NAME" | tr '[:lower:]' '[:upper:]')
LOWERCASE_SERVICE_NAME=$(echo "$SERVICE_NAME" | tr '[:upper:]' '[:lower:]')

echo 'generating service with the following parameters:'
echo 'PARENT_FOLDER: '$PARENT_FOLDER
echo 'SERVICE_NAME: '$SERVICE_NAME
echo 'SERVICE_TYPE: '$SERVICE_TYPE
echo 'SQS_QUEUE_NAME: '$SQS_QUEUE_NAME

if [ "$SERVICE_TYPE" == "SQS" ]; then
  # exit if sqs name is not provided
  if [ -z "$SQS_QUEUE_NAME" ]; then
    echo "SQS queue name is not provided. Please provide a queue name."
    exit 1
  fi
fi

 #check if the queue name does not contain any special characters except for underscore 
if [[ "$SQS_QUEUE_NAME" =~ [^a-zA-Z0-9_] ]]; then
  echo "SQS queue name contains invalid characters. Please use only alphanumeric characters and underscores."
  exit 1
fi

echo 'generating nest application'

# Run the NX CLI command with the provided service name
yarn nx generate @nx/nest:application --name=$SERVICE_NAME --directory=apps/$PARENT_FOLDER/$SERVICE_NAME --e2eTestRunner=none --no-interactive
echo 'nest application generated'

# # Delete the eslint.config.js file in the created directory
# ESLINT_CONFIG_PATH="apps/$PARENT_FOLDER/$SERVICE_NAME/eslint.config.js"
# if [ -f "$ESLINT_CONFIG_PATH" ]; then
#   rm "$ESLINT_CONFIG_PATH"
#   # echo "Deleted $ESLINT_CONFIG_PATH."
# else
#   echo "eslint.config.js not found at $ESLINT_CONFIG_PATH."
# fi

# Path to the generated webpack.config.js
WEBPACK_CONFIG_PATH="apps/$PARENT_FOLDER/$SERVICE_NAME/webpack.config.js"

# Check if webpack.config.js exists
if [ ! -f "$WEBPACK_CONFIG_PATH" ]; then
  echo "webpack.config.js not found at $WEBPACK_CONFIG_PATH"
  exit 1
fi

# Add libraryTarget: 'commonjs2' to the output node
sed -i "/output: {/a \    libraryTarget: 'commonjs2'," "$WEBPACK_CONFIG_PATH"

echo "Modified $WEBPACK_CONFIG_PATH to include libraryTarget: 'commonjs2' in the output node."

# Path to the project.json file
PROJECT_JSON_PATH="apps/$PARENT_FOLDER/$SERVICE_NAME/project.json"

# Check if project.json exists
if [ ! -f "$PROJECT_JSON_PATH" ]; then
  echo "project.json not found at $PROJECT_JSON_PATH"
  exit 1
fi

# Add build-serverless-files target to the project.json
sed -i '/"targets": {/a \    "build-serverless-files": {\n      "executor": "nx:run-commands",\n      "options": {\n        "cwd": "dist/apps/'"$PARENT_FOLDER/$SERVICE_NAME"'",\n        "commands": [\n          {\n            "command": "yarn add tslib"\n          }\n        ],\n        "parallel": false\n      }\n    },' "$PROJECT_JSON_PATH"

echo "Added build-serverless-files target to $PROJECT_JSON_PATH."

# Path to the package.json file
PACKAGE_JSON_PATH="package.json"

# Check if package.json exists
if [ ! -f "$PACKAGE_JSON_PATH" ]; then
  echo "package.json not found at $PACKAGE_JSON_PATH"
  exit 1
fi

# Add specific lines to the package.json using sed
sed -i '/"scripts": {/a \    "build-'"$SERVICE_NAME"'": "nx build '"$SERVICE_NAME"' --skip-nx-cache --configuration=production",\n    "post-build-'"$SERVICE_NAME"'": "nx build-serverless-files '"$SERVICE_NAME"'",' "$PACKAGE_JSON_PATH"

echo "Added build and post-build scripts to $PACKAGE_JSON_PATH."

# Path to the template main.ts file based on service type
if [ "$SERVICE_TYPE" == "API" ]; then
  TEMPLATE_MAIN_PATH="script-files/api_main.ts"
  echo "TEMPLATE_MAIN_PATH: $TEMPLATE_MAIN_PATH"
elif [ "$SERVICE_TYPE" == "SQS" ]; then
  TEMPLATE_MAIN_PATH="script-files/sqs_main.ts"
else
  echo "Invalid service type. Use 'API' or 'SQS'."
  exit 1
fi


# Check if the template main.ts exists
if [ ! -f "$TEMPLATE_MAIN_PATH" ]; then
  echo "Template main.ts not found at $TEMPLATE_MAIN_PATH"
  exit 1
fi

# Path to the generated main.ts file
GENERATED_MAIN_PATH="apps/$PARENT_FOLDER/$SERVICE_NAME/src/main.ts"

# Replace [APP-NAME] with the service name in the template main.ts and copy it to the generated service folder
sed "s/\[APP-NAME\]/$CAPITALIZED_SERVICE_NAME/g" "$TEMPLATE_MAIN_PATH" > "$GENERATED_MAIN_PATH"

echo "Replaced main.ts in the generated service folder with the modified template."

# If the service type is API, replace app.controller.ts
if [ "$SERVICE_TYPE" == "API" ]; then
  TEMPLATE_CONTROLLER_PATH="script-files/app.controller.ts"
  GENERATED_CONTROLLER_PATH="apps/$PARENT_FOLDER/$SERVICE_NAME/src/app/app.controller.ts"

  # Check if the template app.controller.ts exists
  if [ ! -f "$TEMPLATE_CONTROLLER_PATH" ]; then
    echo "Template app.controller.ts not found at $TEMPLATE_CONTROLLER_PATH"
    exit 1
  fi

  # Copy the template app.controller.ts to the generated service folder
  cp "$TEMPLATE_CONTROLLER_PATH" "$GENERATED_CONTROLLER_PATH"

  echo "Replaced app.controller.ts in the generated service folder with the template from script-files."

  # Replace app.service.ts with the API template
  TEMPLATE_SERVICE_PATH="script-files/app.service.ts"
  GENERATED_SERVICE_PATH="apps/$PARENT_FOLDER/$SERVICE_NAME/src/app/app.service.ts"

  # Check if the template app.service.ts exists
  if [ ! -f "$TEMPLATE_SERVICE_PATH" ]; then
    echo "Template app.service.ts not found at $TEMPLATE_SERVICE_PATH"
    exit 1
  fi

  # Copy the template app.service.ts to the generated service folder
  cp "$TEMPLATE_SERVICE_PATH" "$GENERATED_SERVICE_PATH"

  echo "Replaced app.service.ts in the generated service folder with the template from script-files."
fi

# If the service type is SQS, replace app.service.ts
if [ "$SERVICE_TYPE" == "SQS" ]; then

  TEMPLATE_MODULE_PATH="script-files/app.module.sqs.ts"
  GENERATED_MODULE_PATH="apps/$PARENT_FOLDER/$SERVICE_NAME/src/app/app.module.ts"

  # Check if the template app.module.sqs.ts exists
  if [ ! -f "$TEMPLATE_MODULE_PATH" ]; then
    echo "Template app.module.sqs.ts not found at $TEMPLATE_MODULE_PATH"
    exit 1
  fi

  # Copy the template app.module.sqs.ts to the generated service folder
  cp "$TEMPLATE_MODULE_PATH" "$GENERATED_MODULE_PATH"

  echo "Copied app.module.sqs.ts to the generated service folder as app.module.ts"


  TEMPLATE_SERVICE_PATH="script-files/sqs_app.service.ts"
  GENERATED_SERVICE_PATH="apps/$PARENT_FOLDER/$SERVICE_NAME/src/app/app.service.ts"

  # Check if the template app.service.ts exists
  if [ ! -f "$TEMPLATE_SERVICE_PATH" ]; then
    echo "Template app.service.ts not found at $TEMPLATE_SERVICE_PATH"
    exit 1
  fi

  # Replace [APP-NAME] with the service name in the template app.service.ts and copy it to the generated service folder
  sed "s/\[APP-NAME\]/$CAPITALIZED_SERVICE_NAME/g" "$TEMPLATE_SERVICE_PATH" > "$GENERATED_SERVICE_PATH"

  echo "Replaced app.service.ts in the generated service folder with the modified template."

  TEMPLATE_SQS_LOCAL_SERVICE_PATH="script-files/sqs.local.service.ts"
  GENERATED_CONTROLLER_PATH="apps/$PARENT_FOLDER/$SERVICE_NAME/src/app/app.controller.ts"
  # Replace [SQS_QUEUE_NAME] with the SQS queue name as paramter in file sqs.local.service.ts
  sed "s/\[SQS_QUEUE_NAME\]/$SQS_QUEUE_NAME/g" "$TEMPLATE_SQS_LOCAL_SERVICE_PATH" > "apps/$PARENT_FOLDER/$SERVICE_NAME/src/app/sqs.local.service.ts"

  echo "Replaced SQS_QUEUE_NAME in the generated service folder with the modified template."

  # Replace app.controller.ts with sqs.controller.ts
  TEMPLATE_CONTROLLER_PATH="script-files/sqs.controller.ts"
  GENERATED_CONTROLLER_PATH="apps/$PARENT_FOLDER/$SERVICE_NAME/src/app/app.controller.ts"

  # Check if the template app.controller.ts exists
  if [ ! -f "$TEMPLATE_CONTROLLER_PATH" ]; then
    echo "Template app.controller.ts not found at $TEMPLATE_CONTROLLER_PATH"
    exit 1
  fi

  # Replace [APP-NAME] with the service name in the template app.controller.ts and copy it to the generated service folder
  sed "s/\[APP-NAME\]/$CAPITALIZED_SERVICE_NAME/g" "$TEMPLATE_CONTROLLER_PATH" > "$GENERATED_CONTROLLER_PATH"

  echo "Replaced app.controller.ts in the generated service folder with the modified template."


  # Copy message.handler.service.ts to the generated service folder
  TEMPLATE_MESSAGE_HANDLER_PATH="script-files/message.handler.service.ts"
  GENERATED_MESSAGE_HANDLER_PATH="apps/$PARENT_FOLDER/$SERVICE_NAME/src/app/message.handler.service.ts"
  
  # Check if the template message.handler.service.ts exists
  if [ ! -f "$TEMPLATE_MESSAGE_HANDLER_PATH" ]; then
    echo "Template message.handler.service.ts not found at $TEMPLATE_MESSAGE_HANDLER_PATH"
    exit 1
  fi

  # Copy the template to the destination with the correct filename
  cp "$TEMPLATE_MESSAGE_HANDLER_PATH" "$GENERATED_MESSAGE_HANDLER_PATH"

  echo "Copied message.handler.service.ts to the generated service folder."

  # Convert queue name to uppercase for all uses except filename
  QUEUE_NAME_UPPERCASE=$(echo "$SQS_QUEUE_NAME" | tr '[:lower:]' '[:upper:]')

  # Create local stack SQS creation script (filename uses original case)
  LOCAL_STACK_SCRIPT="local-stack-scripts/sqs-${SQS_QUEUE_NAME}.sh"
  mkdir -p "local-stack-scripts"
  echo "#!/bin/bash" > "$LOCAL_STACK_SCRIPT"
  echo "aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name $QUEUE_NAME_UPPERCASE" >> "$LOCAL_STACK_SCRIPT"
  chmod +x "$LOCAL_STACK_SCRIPT"
  echo "Created local stack SQS creation script at $LOCAL_STACK_SCRIPT"

  # Update configuration.ts file
  CONFIG_FILE_PATH="libs/backend/configuration-lib/src/lib/config/configuration.ts"
  if [ -f "$CONFIG_FILE_PATH" ]; then
    # Add new entry before the closing brace of the return object using uppercase queue name as the key
    sed -i "/^    };$/i\\        ${QUEUE_NAME_UPPERCASE}: process.env['${QUEUE_NAME_UPPERCASE}']," "$CONFIG_FILE_PATH"
    
    echo "Added ${QUEUE_NAME_UPPERCASE} entry to configuration.ts"
  else
    echo "Warning: configuration.ts not found at $CONFIG_FILE_PATH"
  fi

  
  
fi


# Copy version.dat file to assets folder for both API and SQS service types
TEMPLATE_VERSION_PATH="script-files/version.dat"
ASSETS_DIR="apps/$PARENT_FOLDER/$SERVICE_NAME/src/assets"
GENERATED_VERSION_PATH="$ASSETS_DIR/version.dat"

# Create the assets directory if it doesn't exist
mkdir -p "$ASSETS_DIR"

# Check if the template version.dat exists
if [ ! -f "$TEMPLATE_VERSION_PATH" ]; then
  echo "Template version.dat not found at $TEMPLATE_VERSION_PATH"
  exit 1
fi

# Copy the template version.dat to the generated service assets folder
cp "$TEMPLATE_VERSION_PATH" "$GENERATED_VERSION_PATH"

echo "Copied version.dat to $GENERATED_VERSION_PATH"

#replace <LAST_PORT_USED> with the value from last.port.used file and increment it by 1 in the file main.ts
LAST_PORT_USED=$(cat last.port.used)
NEW_PORT=$((LAST_PORT_USED + 1))
sed -i "s/<LAST_PORT_USED>/$NEW_PORT/g" "$GENERATED_MAIN_PATH"
echo "Updated <LAST_PORT_USED> in $GENERATED_MAIN_PATH with $NEW_PORT"  

#increment the last.port.used file by 1
echo $NEW_PORT > last.port.used

#add an entry to task.json for the service

# Path to the tasks.json file
TASKS_JSON_PATH=".vscode/tasks.json"

# Check if tasks.json exists
if [ -f "$TASKS_JSON_PATH" ]; then
  # Convert service name to Title Case for the label (e.g., "user-api-service" -> "User API Service")
  SERVICE_LABEL=$(echo "$SERVICE_NAME" | sed 's/-/ /g' | sed 's/\b\w/\u&/g')
  
  # Create the new task object
  NEW_TASK=$(jq -n \
    --arg label "$SERVICE_LABEL" \
    --arg command "npx nx serve $SERVICE_NAME" \
    '{
      label: $label,
      type: "shell",
      command: $command,
      presentation: {
        reveal: "always",
        panel: "new"
      },
      problemMatcher: []
    }')
  
  # Add the new task to the tasks array and update the "All Services" dependsOn array
  jq --argjson newTask "$NEW_TASK" --arg serviceLabel "$SERVICE_LABEL" '
    .tasks += [$newTask] |
    (.tasks[] | select(.label == "All Services") | .dependsOn) += [$serviceLabel]
  ' "$TASKS_JSON_PATH" > tmp.$$.json && mv tmp.$$.json "$TASKS_JSON_PATH"
  
  echo "Added task entry for $SERVICE_LABEL to $TASKS_JSON_PATH and updated All Services dependsOn array."
else
  echo "tasks.json not found at $TASKS_JSON_PATH"
fi


# Path to the deployment.json template
DEPLOYMENT_TEMPLATE_PATH="script-files/deployment.json"

# Check if deployment.json exists
if [ ! -f "$DEPLOYMENT_TEMPLATE_PATH" ]; then
  echo "deployment.json template not found at $DEPLOYMENT_TEMPLATE_PATH"
  exit 1
fi

# Path to the deployment.config.json file
DEPLOYMENT_CONFIG_PATH="deployment.config.json"

# Read the template, replace placeholders, and append to deployment.config.json
if [ -f "$DEPLOYMENT_CONFIG_PATH" ]; then
  # Create a new entry from the template
  NEW_ENTRY=$(jq --arg serviceName "$SERVICE_NAME" --arg parentFolder "apps/$PARENT_FOLDER" \
    '. | .service_name = $serviceName | .parent_folder = $parentFolder | .build_scripts = (.build_scripts | map(gsub("\\[APP-NAME\\]"; $serviceName)))' "$DEPLOYMENT_TEMPLATE_PATH")

  # Append the new entry to the data array
  jq --argjson newEntry "$NEW_ENTRY" '.data += [$newEntry]' "$DEPLOYMENT_CONFIG_PATH" > tmp.$$.json && mv tmp.$$.json "$DEPLOYMENT_CONFIG_PATH"
else
  echo "deployment.config.json not found at $DEPLOYMENT_CONFIG_PATH"
  exit 1
fi

echo "Appended new service configuration for $SERVICE_NAME to $DEPLOYMENT_CONFIG_PATH."

# Ensure the target directory exists
TARGET_DIR="terraform/dev"
mkdir -p "$TARGET_DIR"

# Select the appropriate Terraform template based on the service type
if [ "$SERVICE_TYPE" == "API" ]; then
  TF_TEMPLATE="script-files/default-api.tf"
elif [ "$SERVICE_TYPE" == "SQS" ]; then
  TF_TEMPLATE="script-files/default-sqs.tf"
else
  echo "Invalid service type. Use 'API' or 'SQS'."
  exit 1
fi

# Check if the Terraform template exists
if [ ! -f "$TF_TEMPLATE" ]; then
  echo "Terraform template not found at $TF_TEMPLATE"
  exit 1
fi

# Copy and replace [APP-NAME] in the selected Terraform template file
sed "s/\[APP-NAME\]/$LOWERCASE_SERVICE_NAME/g" "$TF_TEMPLATE" > "$TARGET_DIR/${LOWERCASE_SERVICE_NAME}.tf"

echo "Copied and modified $TF_TEMPLATE to $TARGET_DIR as ${LOWERCASE_SERVICE_NAME}.tf."