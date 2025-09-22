#!/bin/bash

# Script to generate .env.local file for local development
# Author: Generated for NX Template v2 workspace
# Description: Dynamically reads configuration.ts and creates .env.local with all required environment variables

set -e  # Exit on any error

# Configuration
CONFIG_FILE="libs/backend/configuration-lib/src/lib/config/configuration.ts"
ENV_FILE=".env.local"

# Function to print output without colors
print_info() {
    echo "[INFO] $1"
}

print_success() {
    echo "[SUCCESS] $1"
}

print_warning() {
    echo "[WARNING] $1"
}

print_error() {
    echo "[ERROR] $1"
}

print_debug() {
    echo "[DEBUG] $1"
}

# Function to get current date in ISO format
get_current_date() {
    date +"%Y-%m-%d_%H-%M-%S"
}

# Function to create backup of existing .env.local
create_backup() {
    local env_file="$1"
    local backup_file="${env_file}.$(get_current_date)"
    
    if [ -f "$env_file" ]; then
        cp "$env_file" "$backup_file"
        print_success "Backup created: $backup_file"
        return 0
    fi
    return 1
}

# Function to prompt user for confirmation
confirm_overwrite() {
    local env_file="$1"
    
    if [ -f "$env_file" ]; then
        print_warning "File $env_file already exists!"
        echo -n "Do you want to overwrite it? (y/N): "
        read -r response
        
        case "$response" in
            [yY]|[yY][eE][sS])
                print_info "Creating backup of existing file..."
                create_backup "$env_file"
                return 0
                ;;
            *)
                print_info "Operation cancelled by user."
                exit 0
                ;;
        esac
    fi
    return 0
}

# Function to extract environment variables from configuration.ts
extract_env_vars_from_config() {
    local config_file="$1"
    
    if [ ! -f "$config_file" ]; then
        print_error "Configuration file not found: $config_file"
        exit 1
    fi
    
# Removed debug print to prevent contamination of environment variables
    
    # Extract environment variables from process.env['VAR_NAME'] and awsSecrets['VAR_NAME']
    local env_vars=()
    
    # Extract process.env variables - only from lines that contain process.env
    while IFS= read -r line; do
        # Skip comment lines and lines that don't contain process.env or awsSecrets
        if [[ "$line" =~ ^[[:space:]]*// ]] || [[ "$line" =~ ^[[:space:]]*\* ]] || [[ "$line" =~ ^[[:space:]]*# ]]; then
            continue
        fi
        
                    if [[ "$line" =~ process\.env\[\'([^\']+)\'\] ]]; then
                local var_name="${BASH_REMATCH[1]}"
                # Only add valid environment variable names (alphanumeric and underscore)
                if [[ "$var_name" =~ ^[A-Z_][A-Z0-9_]*$ ]]; then
                    env_vars+=("$var_name")
                fi
            elif [[ "$line" =~ process\.env\[\"([^\"]+)\"\] ]]; then
                local var_name="${BASH_REMATCH[1]}"
                # Only add valid environment variable names (alphanumeric and underscore)
                if [[ "$var_name" =~ ^[A-Z_][A-Z0-9_]*$ ]]; then
                    env_vars+=("$var_name")
                fi
            fi
    done < "$config_file"
    
    # Skip awsSecrets variables as requested - these come from AWS Secrets Manager
    # and should not be included in the .env.local file
    
    # Remove duplicates and sort
    printf '%s\n' "${env_vars[@]}" | sort -u
}

# Helper function to extract secret name from AWS secret script
get_secret_name_from_script() {
    local script_file="$1"
    if [ -f "$script_file" ]; then
        # Extract secret name from --name parameter
        grep -o "\--name [^[:space:]]*" "$script_file" | cut -d' ' -f2
    fi
}

# Helper function to extract table name from DynamoDB script
get_table_name_from_script() {
    local script_file="$1"
    if [ -f "$script_file" ]; then
        # Extract table name from --table-name parameter
        grep -o "\--table-name [^[:space:]]*" "$script_file" | cut -d' ' -f2
    fi
}

# Helper function to extract queue name from SQS script
get_queue_name_from_script() {
    local script_file="$1"
    if [ -f "$script_file" ]; then
        # Extract queue name from --queue-name parameter
        grep -o "\--queue-name [^[:space:]]*" "$script_file" | cut -d' ' -f2
    fi
}

# Helper function to extract S3 bucket name from S3 script
get_s3_bucket_name_from_script() {
    local script_file="$1"
    if [ -f "$script_file" ]; then
        # Extract bucket name from s3://bucket-name pattern
        grep -o "s3://[^[:space:]]*" "$script_file" | head -1 | sed 's|s3://||'
    fi
}

# Helper function to check if a variable has a corresponding SQS script
has_sqs_script() {
    local var_name="$1"
    local var_lower=$(echo "$var_name" | tr '[:upper:]' '[:lower:]')
    local var_with_hyphens=$(echo "$var_lower" | tr '_' '-')
    
    # Check for SQS script with underscores or hyphens
    if [ -f "local-stack-scripts/sqs-${var_lower}.sh" ] || [ -f "local-stack-scripts/sqs-${var_with_hyphens}.sh" ]; then
        return 0  # true - has SQS script
    else
        return 1  # false - no SQS script
    fi
}

# Helper function to extract port from service main.ts file
get_service_port() {
    local service_path="$1"
    local main_file="$service_path/src/main.ts"
    
    if [ -f "$main_file" ]; then
        # Extract port from: const port = process.env.PORT || 4020;
        grep -o "process\.env\.PORT || [0-9]*" "$main_file" | grep -o "[0-9]*$"
    fi
}

# Helper function to detect if a service is SQS-based
is_sqs_service() {
    local service_dir="$1"
    
    # Check for SQS-specific files
    if [ -f "$service_dir/src/app/sqs.local.service.ts" ] || [ -f "$service_dir/src/app/message.handler.service.ts" ]; then
        return 0  # true - is SQS service
    else
        return 1  # false - is API service
    fi
}

# Helper function to auto-discover all API services
discover_api_services() {
    local api_services=()
    
    # Find all service directories
    for service_dir in $(find apps -name "*-service" -type d); do
        # Check if it's NOT an SQS service (therefore an API service)
        if ! is_sqs_service "$service_dir"; then
            # Extract service info
            local full_name=$(basename "$service_dir")
            local port=$(get_service_port "$service_dir")
            
            # Only include if it has a port (confirming it's an HTTP API service)
            if [ -n "$port" ]; then
                # Extract base name (e.g., "authentication" from "authentication-api-service")
                local base_name=$(echo "$full_name" | sed 's/-api-service$//' | sed 's/-service$//')
                echo "$base_name:$service_dir:$port"
            fi
        fi
    done
}

# Helper function to generate API endpoint URL (now dynamic)
get_api_endpoint_url() {
    local service_name="$1"
    local api_path="$2"
    
    # Try to find the service dynamically first
    local service_info=$(discover_api_services | grep "^${service_name}:")
    
    if [ -n "$service_info" ]; then
        local service_dir=$(echo "$service_info" | cut -d':' -f2)
        local port=$(echo "$service_info" | cut -d':' -f3)
        echo "http://localhost:${port}${api_path}"
    else
        # Fallback for services not found by auto-discovery
        echo "http://localhost:3000${api_path}"
    fi
}

# Function to get default value for environment variable
get_default_value() {
    local var_name="$1"
    
    case "$var_name" in
        "NODE_ENV")
            echo "development"
            ;;
        "DEFAULT_REGION")
            echo "eu-west-2"
            ;;
        "SERVICE_TRIGGER")
            echo "LOCALHOST"
            ;;
        "FE_BASE_URL")
            echo "http://localhost:3000"
            ;;
        "AWS_COGNITO_USER_POOL_ID")
            echo "# Will be set from LOCAL_DEV version"
            ;;
        "AWS_COGNITO_CLIENT_ID")
            echo "# Will be set from LOCAL_DEV version"
            ;;
        "AWS_COGNITO_AUTHORITY")
            echo "# Will be set from LOCAL_DEV version"
            ;;
        # AWS Secret handling - look for aws-secret-<secret-name>.sh scripts
        "AWS_SECRET_ID")
            # Look for AWS secret scripts in local-stack-scripts folder
            local secret_scripts=(local-stack-scripts/aws-secret-*.sh)
            if [ -f "${secret_scripts[0]}" ]; then
                local secret_name=$(get_secret_name_from_script "${secret_scripts[0]}")
                echo "${secret_name:-aws-secret}"
            else
                echo "aws-secret"
            fi
            ;;
        # DynamoDB table handling - dynamically read from LocalStack scripts
        DYNAMO_DB_*_TABLE)
            # Extract the table type from variable name (e.g., USER from DYNAMO_DB_USER_TABLE)
            local table_type=$(echo "$var_name" | sed 's/DYNAMO_DB_//; s/_TABLE$//' | tr '[:upper:]' '[:lower:]' | tr '_' '-')
            local dynamo_script="local-stack-scripts/dynamodb-${table_type}.sh"
            
            # Try direct match first
            if [ -f "$dynamo_script" ]; then
                local table_name=$(get_table_name_from_script "$dynamo_script")
                echo "${table_name:-$table_type}"
            else
                # Try to find matching script with fuzzy matching
                local matching_scripts=(local-stack-scripts/dynamodb-*${table_type}*.sh)
                if [ -f "${matching_scripts[0]}" ]; then
                    local table_name=$(get_table_name_from_script "${matching_scripts[0]}")
                    echo "${table_name:-$table_type}"
                else
                    # Look for any script that contains parts of the table type
                    local base_parts=($(echo "$table_type" | tr '-' ' '))
                    for script in local-stack-scripts/dynamodb-*.sh; do
                        if [ -f "$script" ]; then
                            local script_base=$(basename "$script" .sh | sed 's/dynamodb-//')
                            local match_count=0
                            for part in "${base_parts[@]}"; do
                                if [[ "$script_base" == *"$part"* ]]; then
                                    ((match_count++))
                                fi
                            done
                            # If most parts match, use this script
                            if [ $match_count -ge $((${#base_parts[@]} / 2)) ]; then
                                local table_name=$(get_table_name_from_script "$script")
                                echo "${table_name:-$table_type}"
                                break
                            fi
                        fi
                    done
                fi
            fi
            ;;
        # SQS queue handling - look for sqs-<queue-name>.sh scripts and generate full URL
        *_SQS)
            # Try multiple naming patterns for SQS scripts
            local var_lower=$(echo "$var_name" | tr '[:upper:]' '[:lower:]')
            local queue_base=$(echo "$var_name" | sed 's/_SQS$//' | tr '[:upper:]' '[:lower:]' | tr '_' '-')
            local queue_base_underscore=$(echo "$var_name" | sed 's/_SQS$//' | tr '[:upper:]' '[:lower:]')
            
            # Try different script naming patterns:
            # 1. Full variable name: sqs-user_event_sqs.sh
            local sqs_script_full="local-stack-scripts/sqs-${var_lower}.sh"
            # 2. Base name with hyphens: sqs-user-event.sh  
            local sqs_script_hyphen="local-stack-scripts/sqs-${queue_base}.sh"
            # 3. Base name with underscores: sqs-user_event.sh
            local sqs_script_underscore="local-stack-scripts/sqs-${queue_base_underscore}.sh"
            
            if [ -f "$sqs_script_full" ]; then
                local queue_name=$(get_queue_name_from_script "$sqs_script_full")
                echo "http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/${queue_name}"
            elif [ -f "$sqs_script_underscore" ]; then
                local queue_name=$(get_queue_name_from_script "$sqs_script_underscore")
                echo "http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/${queue_name}"
            elif [ -f "$sqs_script_hyphen" ]; then
                local queue_name=$(get_queue_name_from_script "$sqs_script_hyphen")
                echo "http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/${queue_name}"
            else
                # Look for any SQS script that might match
                local matching_scripts=(local-stack-scripts/sqs-*${queue_base}*.sh)
                if [ -f "${matching_scripts[0]}" ]; then
                    local queue_name=$(get_queue_name_from_script "${matching_scripts[0]}")
                    echo "http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/${queue_name}"
                else
                    # Fallback: use the original variable name pattern
                    local fallback_queue=$(echo "$var_name" | sed 's/_SQS$//')
                    echo "http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/${fallback_queue}"
                fi
            fi
            ;;
        # S3 bucket handling - look for s3-<bucket-name>.sh scripts
        "S3_"*)
            # Extract the bucket type from variable name (e.g., NX_TEMPLATE_V2_LOCAL_DATA from S3_NX_TEMPLATE_V2_LOCAL_DATA)
            local bucket_type=$(echo "$var_name" | sed 's/S3_//' | tr '[:upper:]' '[:lower:]' | tr '_' '-')
            local s3_script="local-stack-scripts/s3-${bucket_type}.sh"
            
            if [ -f "$s3_script" ]; then
                local bucket_name=$(get_s3_bucket_name_from_script "$s3_script")
                echo "${bucket_name:-$bucket_type}"
            else
                # Try to find matching script with fuzzy matching
                local matching_scripts=(local-stack-scripts/s3-*${bucket_type}*.sh)
                if [ -f "${matching_scripts[0]}" ]; then
                    local bucket_name=$(get_s3_bucket_name_from_script "${matching_scripts[0]}")
                    echo "${bucket_name:-$bucket_type}"
                else
                    echo "$bucket_type"
                fi
            fi
            ;;
        *)
            # Check if there's a matching SQS script for variables that might be queue names
            local var_lower=$(echo "$var_name" | tr '[:upper:]' '[:lower:]')
            local var_with_hyphens=$(echo "$var_lower" | tr '_' '-')
            
            # Try with underscores first (exact match)
            local sqs_script_underscore="local-stack-scripts/sqs-${var_lower}.sh"
            # Try with hyphens second (converted match)
            local sqs_script_hyphen="local-stack-scripts/sqs-${var_with_hyphens}.sh"
            
            if [ -f "$sqs_script_underscore" ]; then
                local queue_name=$(get_queue_name_from_script "$sqs_script_underscore")
                echo "http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/${queue_name}"
            elif [ -f "$sqs_script_hyphen" ]; then
                local queue_name=$(get_queue_name_from_script "$sqs_script_hyphen")
                echo "http://sqs.eu-west-2.localhost.localstack.cloud:4566/000000000000/${queue_name}"
            else
                echo "# TODO: Set appropriate value for $var_name"
            fi
            ;;
    esac
}

# Function to categorize environment variables
categorize_env_var() {
    local var_name="$1"
    
    case "$var_name" in
        "NODE_ENV"|"SERVICE_TRIGGER")
            echo "APPLICATION"
            ;;
        "DEFAULT_REGION")
            echo "AWS_REGION"
            ;;
        # AWS Secrets Manager
        "AWS_SECRET_ID")
            echo "AWS_SECRETS"
            ;;
        # API Endpoints
        "API_"*|"FE_BASE_URL")
            echo "API_ENDPOINTS"
            ;;
        # SQS related variables (check before WEBSOCKET to avoid conflicts)
        *"_SQS"|*"SQS"*)
            echo "SQS"
            ;;
        # WebSocket related variables (but not SQS)
        "WEBSOCKET_"*|*"WEBSOCKET"*)
            echo "WEBSOCKET"
            ;;
        # DynamoDB related variables
        "DYNAMO_DB_"*)
            echo "DYNAMODB"
            ;;
        # AWS Cognito
        "AWS_COGNITO_"*)
            echo "COGNITO"
            ;;
        # S3 related variables
        "S3_"*)
            echo "S3"
            ;;
        *)
            # Check if this variable has a corresponding SQS script (dynamic detection)
            if has_sqs_script "$var_name"; then
                echo "SQS"
            else
                echo "ADDITIONAL"
            fi
            ;;
    esac
}

# Function to generate .env.local content
generate_env_content() {
    local config_file="$1"
    local current_date=$(date)
    
    # Start with header
    cat << EOF
# =============================================================================
# LOCAL DEVELOPMENT ENVIRONMENT CONFIGURATION
# =============================================================================
# Generated on: $current_date
# Source: Dynamically extracted from $config_file
# Description: Environment variables for local development setup
# =============================================================================

EOF

    # Extract environment variables from configuration.ts
    local env_vars=($(extract_env_vars_from_config "$config_file"))
    
    print_info "Found ${#env_vars[@]} environment variables in configuration file"
    
    # Group variables by category
    declare -A categorized_vars
    for var in "${env_vars[@]}"; do
        local category=$(categorize_env_var "$var")
        if [[ -z "${categorized_vars[$category]}" ]]; then
            categorized_vars[$category]="$var"
        else
            categorized_vars[$category]="${categorized_vars[$category]} $var"
        fi
    done
    
    # Generate APPLICATION configuration section
    if [[ -n "${categorized_vars[APPLICATION]}" ]]; then
        cat << EOF
# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================
EOF
        for var in ${categorized_vars[APPLICATION]}; do
            local value=$(get_default_value "$var")
            echo "$var=$value"
        done
        echo ""
    fi
    
    # Generate AWS REGION configuration section
    if [[ -n "${categorized_vars[AWS_REGION]}" ]]; then
        cat << EOF
# =============================================================================
# AWS REGION CONFIGURATION
# =============================================================================
EOF
        for var in ${categorized_vars[AWS_REGION]}; do
            local value=$(get_default_value "$var")
            echo "$var=$value"
        done
        echo ""
    fi
    
    # Add LOCALSTACK configuration (additional variables)
    cat << EOF
# =============================================================================
# LOCALSTACK CONFIGURATION
# =============================================================================
LOCALSTACK_STATUS=ENABLED
LOCALSTACK_ENDPOINT=http://localhost:4566
LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL=http://localhost:4028/api
LOCALSTACK_WEBSOCKET_CLIENT_MESSAGE_SERVICE_URL=http://localhost:4026/api

EOF

    # Add AUTHENTICATION configuration (additional variables)
    cat << EOF
# =============================================================================
# AUTHENTICATION CONFIGURATION
# =============================================================================
BYPASS_AUTH=ENABLED

EOF

    # Add AWS CREDENTIALS (additional variables)
    cat << EOF
# =============================================================================
# AWS CREDENTIALS FOR LOCAL DEVELOPMENT
# =============================================================================
AWS_ACCESS_KEY_LOCAL_DEV=
AWS_SECRET_ACCESS_KEY_LOCAL_DEV=

EOF

    # Generate COGNITO configuration section
    if [[ -n "${categorized_vars[COGNITO]}" ]]; then
        cat << EOF
# =============================================================================
# AWS COGNITO CONFIGURATION
# =============================================================================
EOF
        for var in ${categorized_vars[COGNITO]}; do
            local value=$(get_default_value "$var")
            echo "$var=$value"
        done
        
        # Add LOCAL_DEV versions (additional variables)
        cat << EOF
AWS_COGNITO_USER_POOL_ID_LOCAL_DEV=eu-west-2_l8i8eNbWG
AWS_COGNITO_CLIENT_ID_LOCAL_DEV=1lij4ifh3de9o5fo1nv7de13en
AWS_COGNITO_AUTHORITY_LOCAL_DEV=https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_l8i8eNbWG

EOF
    fi
    
    # Generate AWS SECRETS configuration section
    if [[ -n "${categorized_vars[AWS_SECRETS]}" ]]; then
        cat << EOF
# =============================================================================
# AWS SECRETS MANAGER CONFIGURATION
# =============================================================================
EOF
        for var in ${categorized_vars[AWS_SECRETS]}; do
            local value=$(get_default_value "$var")
            if [[ "$value" == *"#"* ]]; then
                echo "# $var=$value"
            else
                echo "$var=$value"
            fi
        done
        echo ""
    fi

    # Generate API ENDPOINTS configuration section
    cat << EOF
# =============================================================================
# API ENDPOINTS CONFIGURATION
# =============================================================================
EOF
    # Add variables from configuration file
    if [[ -n "${categorized_vars[API_ENDPOINTS]}" ]]; then
        for var in ${categorized_vars[API_ENDPOINTS]}; do
            local value=$(get_default_value "$var")
            echo "$var=$value"
        done
    fi
    # Add additional API endpoint variables (dynamically generated from service discovery)
    local api_services=($(discover_api_services))
    for service_info in "${api_services[@]}"; do
        local service_name=$(echo "$service_info" | cut -d':' -f1)
        local service_dir=$(echo "$service_info" | cut -d':' -f2)
        local port=$(echo "$service_info" | cut -d':' -f3)
        
        # Convert service name to uppercase for environment variable
        local env_var_name=$(echo "$service_name" | tr '[:lower:]' '[:upper:]' | tr '-' '_')
        
        # Generate API endpoint URL
        echo "API_${env_var_name}_URL=http://localhost:${port}/api/${service_name}"
    done
    echo ""
    
    # Generate WEBSOCKET configuration section
    if [[ -n "${categorized_vars[WEBSOCKET]}" ]]; then
        cat << EOF
# =============================================================================
# WEBSOCKET CONFIGURATION
# =============================================================================
EOF
        for var in ${categorized_vars[WEBSOCKET]}; do
            local value=$(get_default_value "$var")
            if [[ "$value" == *"#"* ]]; then
                echo "# $var=$value"
            else
                echo "$var=$value"
            fi
        done
        # Add additional WebSocket variables
        cat << EOF
WEBSOCKET_LOCAL_URL=http://localhost:4028
WEBSOCKET_URL=ws://localhost:4028
PING_INTERVAL=300

EOF
    fi
    
    # Generate DYNAMODB configuration section
    echo "# ============================================================================="
    echo "# DYNAMODB CONFIGURATION"
    echo "# ============================================================================="
    
    # Add variables from configuration.ts
    if [[ -n "${categorized_vars[DYNAMODB]}" ]]; then
        for var in ${categorized_vars[DYNAMODB]}; do
            local value=$(get_default_value "$var")
            echo "$var=$value"
        done
    fi
    
    echo ""
    
    # Generate SQS configuration section
    if [[ -n "${categorized_vars[SQS]}" ]]; then
        cat << EOF
# =============================================================================
# SQS CONFIGURATION
# =============================================================================
EOF
        for var in ${categorized_vars[SQS]}; do
            local value=$(get_default_value "$var")
            echo "$var=$value"
        done
        echo ""
    fi
    
    # Generate S3 configuration section
    if [[ -n "${categorized_vars[S3]}" ]]; then
        cat << EOF
# =============================================================================
# S3 CONFIGURATION
# =============================================================================
EOF
        for var in ${categorized_vars[S3]}; do
            local value=$(get_default_value "$var")
            echo "$var=$value"
        done
        echo ""
    fi
    

    

    # Generate FRONTEND variables section (from libs/frontend/data-access/src/config/env.ts)
    cat << EOF
# =============================================================================
# FRONTEND VARIABLES (from env.ts ENV_KEYS)
# =============================================================================
# These variables are used by the frontend application
# Developers should set appropriate values for their environment

EOF
    
    # Read ENV_KEYS from env.ts and add missing variables
    local env_ts_file="libs/frontend/data-access/src/config/env.ts"
    if [ -f "$env_ts_file" ]; then
        # Extract ENV_KEYS array values
        local env_keys=($(grep -A 20 "export const ENV_KEYS" "$env_ts_file" | grep -o "'[^']*'" | sed "s/'//g" | head -20))
        
        # Create a temporary file to track what's already been added
        local temp_file=$(mktemp)
        # Get all variables that have been added so far
        grep -E "^[A-Z_][A-Z0-9_]*=" "$temp_file" 2>/dev/null || true
        
        for key in "${env_keys[@]}"; do
            # Check if this variable is already present in categorized_vars
            local already_present=false
            for category in "${!categorized_vars[@]}"; do
                if [[ " ${categorized_vars[$category]} " =~ " ${key} " ]]; then
                    already_present=true
                    break
                fi
            done
            
            # Also check if it's in the hardcoded additional variables
            case "$key" in
                "API_AUTHENTICATION_URL"|"API_USER_URL"|"BYPASS_AUTH"|"LOCALSTACK_STATUS"|"WEBSOCKET_URL"|"WEBSOCKET_LOCAL_URL"|"PING_INTERVAL"|"DEFAULT_REGION"|"AWS_SECRET_ID"|"NODE_ENV")
                    already_present=true
                    ;;
            esac
            
            if [ "$already_present" = false ]; then
                echo "${key}="
            fi
        done
        
        rm -f "$temp_file"
    fi
    echo ""

    # Generate any remaining variables
    if [[ -n "${categorized_vars[ADDITIONAL]}" ]]; then
        cat << EOF
# =============================================================================
# ADDITIONAL CONFIGURATION
# =============================================================================
EOF
        for var in ${categorized_vars[ADDITIONAL]}; do
            local value=$(get_default_value "$var")
            echo "$var=$value"
        done
        echo ""
    fi
    
    # Add development notes
    cat << EOF
# =============================================================================
# DEVELOPMENT NOTES
# =============================================================================
# Variables marked with # are retrieved from AWS Secrets Manager in LocalStack
# 
# Setup Instructions:
# 1. Start LocalStack: docker-compose up
# 2. Run LocalStack setup scripts: ./run-local-stack-scripts.sh
# 3. Start all services: nx run-many -t serve
# 4. Access web app: http://localhost:3000
# 
# =============================================================================
EOF
}

# Main function
main() {
    print_info "Starting dynamic .env.local file generation..."
    print_info "Reading configuration from: $CONFIG_FILE"
    
    # Verify configuration file exists
    if [ ! -f "$CONFIG_FILE" ]; then
        print_error "Configuration file not found: $CONFIG_FILE"
        print_info "Please ensure you're running this script from the project root directory."
        exit 1
    fi
    
    # Check if .env.local already exists and handle backup
    confirm_overwrite "$ENV_FILE"
    
    # Generate the .env.local file
    print_info "Dynamically generating $ENV_FILE from $CONFIG_FILE..."
    generate_env_content "$CONFIG_FILE" > "$ENV_FILE"
    
    # Verify file was created successfully
    if [ -f "$ENV_FILE" ]; then
        local line_count=$(wc -l < "$ENV_FILE")
        print_success "Successfully created $ENV_FILE with $line_count lines"
        print_info "Environment variables dynamically extracted and grouped by function"
        
        # Display summary of extracted variables
        local extracted_vars=($(extract_env_vars_from_config "$CONFIG_FILE" 2>/dev/null))
        # Filter out any non-environment variable entries
        local valid_vars=()
        for var in "${extracted_vars[@]}"; do
            if [[ "$var" =~ ^[A-Z_][A-Z0-9_]*$ ]]; then
                valid_vars+=("$var")
            fi
        done
        
        echo ""
        print_info "Extracted ${#valid_vars[@]} environment variables from configuration:"
        for var in "${valid_vars[@]}"; do
            echo "  • $var"
        done
        
        echo ""
        print_info "Additional variables included:"
        echo "  • LocalStack configuration"
        echo "  • Authentication bypass settings"
        echo "  • AWS local development credentials"
        echo "  • API endpoint URLs with correct ports"
        echo "  • WebSocket configuration"
        echo "  • S3 bucket configuration"
        
        echo ""
        print_success "Environment setup complete!"
        print_info "Next steps:"
        echo "  1. Start LocalStack: docker-compose up"
        echo "  2. Run setup scripts: ./run-local-stack-scripts.sh"
        echo "  3. Start services: nx run-many -t serve"
        echo "  4. Access web app: http://localhost:3000"
        
    else
        print_error "Failed to create $ENV_FILE"
        exit 1
    fi
}

# Check if script is being run from project root
if [ ! -f "package.json" ] || [ ! -f "nx.json" ]; then
    print_error "This script must be run from the project root directory."
    print_info "Please navigate to the project root and run: ./generate-env-local.sh"
    exit 1
fi

# Run main function
main "$@"
