#!/bin/bash

# Check if schema name is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <schema-name>"
  echo "Example: $0 VortexSchema"
  exit 1
fi

SCHEMA_NAME=$1
SCHEMA_DIR="libs/backend/dynamo-db-lib/src/lib/schema"
SCHEMA_FILE="$SCHEMA_DIR/${SCHEMA_NAME}.ts"

# Remove 'Schema' from the name and convert to kebab case for folder name
BASE_NAME=$(echo "$SCHEMA_NAME" | sed 's/Schema$//')
FOLDER_NAME=$(echo "$BASE_NAME" | sed -r 's/([a-z0-9])([A-Z])/\1-\2/g' | tr '[:upper:]' '[:lower:]')
DTO_DIR="libs/dto/src/lib/${FOLDER_NAME}"

# Check if schema file exists
if [ ! -f "$SCHEMA_FILE" ]; then
  echo "Schema file not found at: $SCHEMA_FILE"
  exit 1
fi

# Clean up existing DTO directory
echo "Cleaning up existing DTO directory: $DTO_DIR"
if [ -d "$DTO_DIR" ]; then
    rm -rf "$DTO_DIR"
    echo "Removed existing directory: $DTO_DIR"
fi

# Create DTO directory
mkdir -p "$DTO_DIR"

# Create temporary files
TEMP_FILE=$(mktemp)
FINAL_JSON=$(mktemp)

# Variables to track state
in_params=0
prev_line=""
collecting_field=0
combined_field=""
found_schema=0

process_line() {
    local line="$1"
    echo "$line" | \
        sed -e 's/\/\/.*$//' \
            -e 's/as const,//' \
            -e 's/required:[[:space:]]*true,\?//' \
            -e 's/required:[[:space:]]*false,\?//' \
            -e 's/hidden:[[:space:]]*false,\?//' \
            -e 's/;//' \
            -e 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

cleanup_line() {
    local line="$1"
    local prev="$2"
    # First remove any comma right before }
    line=$(echo "$line" | sed 's/,[[:space:]]*}/}/g')
    # Then remove any comma right before },
    line=$(echo "$line" | sed 's/,[[:space:]]*},/},/g')
    
    # Add quotes around words before colon if they don't already have quotes
    line=$(echo "$line" | sed 's/\([^"[:space:]]\+\):/"\1":/g')
    
    # Replace single quotes with double quotes
    line=$(echo "$line" | tr "'" '"')
    
    # Add quotes around words after "type": if they don't already have quotes
    line=$(echo "$line" | sed 's/"type":[[:space:]]*\([^"{},[:space:]]\+\)/"type": "\1"/g')
    
    # If current line is } or }, and previous line ends with comma, remove the comma
    if [[ "$line" =~ ^[[:space:]]*\}[,]?[[:space:]]*$ ]] && [ -n "$prev" ] && [[ "$prev" =~ ,$ ]]; then
        prev=$(echo "$prev" | sed 's/,$//')
        echo "$prev" > "$TEMP_FILE.prev"
    fi
    
    echo "$line"
}

convertToJson() {
    local input_file="$1"
    local output_file="$2"
    
    # Read all lines into an array
    mapfile -t lines < "$input_file"
    
    # Process each line
    {
        # First line should be opening brace
        echo "{"
        
        # Process all lines except the first and last
        for ((i=1; i<${#lines[@]}-1; i++)); do
            # Remove trailing comma from the last property
            if [ $((i+1)) -eq $((${#lines[@]}-1)) ]; then
                echo "${lines[$i]}" | sed 's/,\s*$//'
            else
                echo "${lines[$i]}"
            fi
        done
        
        # Last line should be closing brace
        echo "}"
    } > "$output_file"
    
    # Validate JSON and format it
    if command -v jq &> /dev/null; then
        jq '.' "$output_file" || {
            echo "Error: Invalid JSON generated"
            exit 1
        }
    else
        cat "$output_file"
    fi
}

cleanUpDto() {
    local json_file="$1"
    local model_entry="$2"
    
    # Get the indexes from the JSON
    local indexes=$(jq -r '.indexes // {}' "$json_file")
    
    # If indexes is empty or null, return the original model_entry
    if [ -z "$indexes" ] || [ "$indexes" = "null" ] || [ "$indexes" = "{}" ]; then
        echo "$model_entry"
        return
    fi
    
    # Extract all field names from indexes (both hash and sort)
    local index_fields=$(echo "$indexes" | jq -r 'to_entries[] | .value | .hash, .sort // empty' | sort -u)
    
    # Add PK, SK to the list of fields to exclude
    index_fields="$index_fields
PK
SK
GSI1PK
GSI1SK
GSI2PK
GSI2SK
GSI3PK
GSI3SK
GSI4PK
GSI4SK
GSI5PK
GSI5SK"
    
    # Get the model fields excluding the ones in index_fields
    local cleaned_model=$(echo "$model_entry" | jq --arg fields "$(echo "$index_fields" | tr '\n' ' ')" '
        . as $model |
        ($fields | split(" ") | map(select(length > 0))) as $index_fields |
        .value |= (
            to_entries |
            map(select(.key as $key | $index_fields | index($key) | not)) |
            from_entries
        )
    ')
    
    echo "$cleaned_model"
}

createEnum() {
    local json_file="$1"
    local base_folder=$(echo "$SCHEMA_NAME" | sed 's/Schema$//' | tr '[:upper:]' '[:lower:]')
    local enum_folder="libs/dto/src/lib/${base_folder}/enums"
    
    echo "Creating enum folder: ${enum_folder}"
    mkdir -p "${enum_folder}"
    
    # Process each model to find enum types
    jq -r '.models | to_entries[] | @json' "$json_file" | while IFS= read -r model_entry; do
        # Extract fields with enum values
        echo "$model_entry" | jq -r '.value | to_entries[] | select(.value.enum != null) | @json' | while IFS= read -r field; do
            # Skip empty lines
            [ -z "$field" ] && continue
            
            # Extract field name and enum values
            field_name=$(echo "$field" | jq -r '.key')
            enum_values=$(echo "$field" | jq -r '.value.enum[]')
            
            # Create enum name (capitalize first letter and append Enum)
            enum_name="$(tr '[:lower:]' '[:upper:]' <<< ${field_name:0:1})${field_name:1}Enum"
            
            # Convert CamelCase to dot.case for the file name
            enum_file_name=$(echo "$field_name" | sed -E 's/([a-z0-9])([A-Z])/\1.\2/g' | tr '[:upper:]' '[:lower:]')
            enum_file="${enum_folder}/${enum_file_name}.enum.ts"
            
            echo "Creating enum file: $enum_file"
            
            # Create enum file
            {
                echo "export enum ${enum_name} {"
                # Process each enum value
                while IFS= read -r value; do
                    # Remove quotes and create enum key
                    clean_value=$(echo "$value" | tr -d "'\"")
                    # Convert to uppercase for enum key
                    enum_key=$(echo "$clean_value" | tr '[:lower:]' '[:upper:]' | tr ' ' '_')
                    echo "    ${enum_key} = '${clean_value}',"
                done <<< "$enum_values"
                echo "}"
            } > "$enum_file"
            
            echo "Created enum file: $enum_file"
        done
    done
}

cleanUpImports() {
    local dto_file="$1"
    local temp_file=$(mktemp)
    
    # Read all lines from the file
    mapfile -t lines < "$dto_file"
    
    # Collect all import statements and their line numbers
    declare -A imports
    declare -A import_lines
    line_number=0
    in_imports=0
    
    for line in "${lines[@]}"; do
        ((line_number++))
        
        # Skip empty lines between imports
        if [[ -z "$line" && $in_imports -eq 1 ]]; then
            continue
        fi
        
        # Check if this is an import line
        if [[ "$line" =~ ^import[[:space:]]+\{[[:space:]]*([^}]+)\}[[:space:]]+from ]]; then
            imported_item="${BASH_REMATCH[1]}"
            imports["$imported_item"]="0"
            import_lines["$imported_item"]=$line_number
            in_imports=1
            continue
        elif [[ "$line" =~ ^import[[:space:]]+\{[[:space:]]*([^}]+)\}[[:space:]]+from[[:space:]]+\'./enums/ ]]; then
            imported_item="${BASH_REMATCH[1]}"
            imports["$imported_item"]="0"
            import_lines["$imported_item"]=$line_number
            in_imports=1
            continue
        fi
        
        # If we've moved past imports section
        if [[ -n "$line" && ! "$line" =~ ^import && $in_imports -eq 1 ]]; then
            in_imports=0
        fi
        
        # Check for usage of imported items
        for item in "${!imports[@]}"; do
            clean_item=$(echo "$item" | tr -d ' ')
            if [[ "$line" =~ $clean_item ]]; then
                imports["$item"]=1
            fi
        done
    done
    
    # Write to temp file, excluding unused imports
    in_imports=0
    line_number=0
    skip_empty=0
    
    for line in "${lines[@]}"; do
        ((line_number++))
        
        # Handle empty lines in import section
        if [[ -z "$line" && $in_imports -eq 1 ]]; then
            skip_empty=1
            continue
        fi
        
        # Check if this is an import line
        is_import=0
        imported_item=""
        if [[ "$line" =~ ^import[[:space:]]+\{[[:space:]]*([^}]+)\}[[:space:]]+from ]]; then
            imported_item="${BASH_REMATCH[1]}"
            is_import=1
        elif [[ "$line" =~ ^import[[:space:]]+\{[[:space:]]*([^}]+)\}[[:space:]]+from[[:space:]]+\'./enums/ ]]; then
            imported_item="${BASH_REMATCH[1]}"
            is_import=1
        fi
        
        if [ $is_import -eq 1 ]; then
            in_imports=1
            # Only write import if it's used
            if [ "${imports[$imported_item]}" = "1" ]; then
                echo "$line" >> "$temp_file"
                skip_empty=0
            else
                skip_empty=1
            fi
            continue
        fi
        
        # If we've moved past imports section
        if [[ -n "$line" && ! "$line" =~ ^import && $in_imports -eq 1 ]]; then
            in_imports=0
            # Add a blank line after imports if we have any imports
            if [ $skip_empty -eq 0 ]; then
                echo "" >> "$temp_file"
            fi
        fi
        
        # Write non-import lines
        if [ $in_imports -eq 0 ]; then
            echo "$line" >> "$temp_file"
        fi
    done
    
    # Replace original file with cleaned up version
    mv "$temp_file" "$dto_file"
}

createDto() {
    local json_file="$1"
    
    # First create any necessary enums
    createEnum "$json_file"
    
    # Remove 'Schema' from the name and convert to lowercase
    local base_folder=$(echo "$SCHEMA_NAME" | sed 's/Schema$//' | tr '[:upper:]' '[:lower:]')
    local base_dto_folder="libs/dto/src/lib/${base_folder}"
    local enum_folder="${base_dto_folder}/enums"
    
    echo "Creating base DTO folder: ${base_dto_folder}"
    mkdir -p "${base_dto_folder}"
    
    # Process each model
    jq -r '.models | to_entries[] | @json' "$json_file" | while IFS= read -r model_entry; do
        # Clean up the model entry by removing index fields
        model_entry=$(cleanUpDto "$json_file" "$model_entry")
        
        # Extract model name
        model_name=$(echo "$model_entry" | jq -r '.key')
        
        # Convert CamelCase to dot.case for folder and file names
        folder_name=$(echo "$model_name" | sed -E 's/([a-z0-9])([A-Z])/\1.\2/g' | tr '[:upper:]' '[:lower:]')
        
        # Create model-specific folder
        model_folder="${base_dto_folder}/${folder_name}"
        mkdir -p "${model_folder}"
        
        # Create DTO file name
        dto_name="$(tr '[:lower:]' '[:upper:]' <<< ${model_name:0:1})${model_name:1}Dto"
        dto_file="${model_folder}/${folder_name}.dto.ts"
        
        echo "Creating DTO for model: $model_name in folder: $model_folder"
        
        # Collect all enum fields first
        declare -A enum_imports
        while IFS= read -r field; do
            [ -z "$field" ] && continue
            field_name=$(echo "$field" | jq -r '.key')
            field_props=$(echo "$field" | jq -r '.value')
            if [ "$(echo "$field_props" | jq -r '.enum != null')" = "true" ]; then
                enum_name="$(tr '[:lower:]' '[:upper:]' <<< ${field_name:0:1})${field_name:1}Enum"
                # Convert CamelCase to dot.case for the import path
                enum_file_name=$(echo "$field_name" | sed -E 's/([a-z0-9])([A-Z])/\1.\2/g' | tr '[:upper:]' '[:lower:]')
                enum_imports["$field_name"]="$enum_name:$enum_file_name"
            fi
        done < <(echo "$model_entry" | jq -r '.value | to_entries[] | @json')
        
        # Start writing the DTO file
        {
            echo "import { ApiProperty } from '@nestjs/swagger';"
            
            # Add enum imports if any exist
            if [ ${#enum_imports[@]} -gt 0 ]; then
                echo ""
                for field_name in "${!enum_imports[@]}"; do
                    IFS=':' read -r enum_name enum_file_name <<< "${enum_imports[$field_name]}"
                    echo "import { $enum_name } from '../enums/${enum_file_name}.enum';"
                done
            fi
            
            echo ""
            echo "export class ${dto_name} {"
            
            # Process each field in the model
            echo "$model_entry" | jq -r '.value | to_entries[] | select(.value.type != null) | @json' | while IFS= read -r field; do
                # Extract field name and properties
                field_name=$(echo "$field" | jq -r '.key')
                field_props=$(echo "$field" | jq -r '.value')
                
                # Extract type and generate values
                field_type=$(echo "$field_props" | jq -r '.type')
                generate_value=$(echo "$field_props" | jq -r '.generate // empty')
                
                # Clean up the type
                field_type=$(echo "$field_type" | tr -d '"' | tr '[:upper:]' '[:lower:]')
                
                # Determine suffix based on generate value
                suffix="?"
                if [ "$generate_value" = "ulid" ]; then
                    suffix="!"
                fi
                
                # Check if this field has an enum type
                if [ -n "${enum_imports[$field_name]}" ]; then
                    IFS=':' read -r enum_name _ <<< "${enum_imports[$field_name]}"
                    echo "    @ApiProperty({ enum: ${enum_name} })"
                    echo "    ${field_name}${suffix}: ${enum_name};"
                else
                    echo "    @ApiProperty()"
                    case "$field_type" in
                        "string")
                            echo "    ${field_name}${suffix}: string;"
                            ;;
                        "number")
                            echo "    ${field_name}${suffix}: number;"
                            ;;
                        "date")
                            echo "    ${field_name}${suffix}: Date;"
                            ;;
                        "boolean")
                            echo "    ${field_name}${suffix}: boolean;"
                            ;;
                        "object"|"array")
                            echo "    ${field_name}${suffix}: any;"
                            ;;
                        *)
                            echo "    ${field_name}${suffix}: string;"
                            ;;
                    esac
                fi
                echo ""
            done
            
            echo "}"
        } > "$dto_file"
        
        echo "Created DTO file: $dto_file"
        
        # Clean up imports in the DTO file
        cleanUpImports "$dto_file"
    done
}

createAdditionalFiles() {
    local json_file="$1"
    local base_folder=$(echo "$SCHEMA_NAME" | sed 's/Schema$//' | tr '[:upper:]' '[:lower:]')
    local base_dto_folder="libs/dto/src/lib/${base_folder}"
    
    # Process each model
    jq -r '.models | to_entries[] | @json' "$json_file" | while IFS= read -r model_entry; do
        # Extract model name
        model_name=$(echo "$model_entry" | jq -r '.key')
        
        # Convert CamelCase to dot.case for folder and file names
        folder_name=$(echo "$model_name" | sed -E 's/([a-z0-9])([A-Z])/\1.\2/g' | tr '[:upper:]' '[:lower:]')
        
        # Get the model folder path
        model_folder="${base_dto_folder}/${folder_name}"
        
        # Create the Create DTO file name
        create_dto_file="${model_folder}/create.${folder_name}.dto.ts"
        
        echo "Creating Create DTO for model: $model_name"
        
        # Find all fields marked with ! (generated fields)
        generated_fields=()
        while IFS= read -r field; do
            [ -z "$field" ] && continue
            field_name=$(echo "$field" | jq -r '.key')
            field_props=$(echo "$field" | jq -r '.value')
            generate_value=$(echo "$field_props" | jq -r '.generate // empty')
            
            if [ "$generate_value" = "ulid" ]; then
                generated_fields+=("'$field_name'")
            fi
        done < <(echo "$model_entry" | jq -r '.value | to_entries[] | @json')
        
        # Create the Create DTO file
        {
            echo "import { OmitType } from '@nestjs/swagger';"
            echo "import { ${model_name}Dto } from './${folder_name}.dto';"
            echo ""
            echo "export class Create${model_name}Dto extends OmitType(${model_name}Dto, [${generated_fields[*]}] as const) {}"
        } > "$create_dto_file"
        
        echo "Created Create DTO file: $create_dto_file"
        
        # Clean up imports in the Create DTO file
        cleanUpImports "$create_dto_file"
    done
}

updateMainIndex() {
    local json_file="$1"
    local index_file="libs/dto/src/index.ts"
    local base_folder=$(echo "$SCHEMA_NAME" | sed 's/Schema$//' | tr '[:upper:]' '[:lower:]')
    
    # Create index.ts if it doesn't exist
    if [ ! -f "$index_file" ]; then
        touch "$index_file"
    fi
    
    # Add a newline if the file is not empty and doesn't end with one
    if [ -s "$index_file" ]; then
        if [ "$(tail -c1 "$index_file" | wc -l)" -eq 0 ]; then
            echo "" >> "$index_file"
        fi
    fi
    
    # Add schema comment
    echo "//$SCHEMA_NAME" >> "$index_file"
    
    # Process each model
    jq -r '.models | to_entries[] | @json' "$json_file" | while IFS= read -r model_entry; do
        # Extract model name
        model_name=$(echo "$model_entry" | jq -r '.key')
        
        # Convert CamelCase to dot.case for folder and file names
        folder_name=$(echo "$model_name" | sed -E 's/([a-z0-9])([A-Z])/\1.\2/g' | tr '[:upper:]' '[:lower:]')
        
        # Add exports for both main DTO and Create DTO
        echo "export * from './lib/${base_folder}/${folder_name}/${folder_name}.dto';" >> "$index_file"
        echo "export * from './lib/${base_folder}/${folder_name}/create.${folder_name}.dto';" >> "$index_file"
    done
    
    # Add exports for enums
    jq -r '.models | to_entries[] | @json' "$json_file" | while IFS= read -r model_entry; do
        echo "$model_entry" | jq -r '.value | to_entries[] | select(.value.enum != null) | @json' | while IFS= read -r field; do
            [ -z "$field" ] && continue
            
            # Extract field name
            field_name=$(echo "$field" | jq -r '.key')
            
            # Convert CamelCase to dot.case for the enum file name
            enum_file_name=$(echo "$field_name" | sed -E 's/([a-z0-9])([A-Z])/\1.\2/g' | tr '[:upper:]' '[:lower:]')
            
            # Add export for enum
            echo "export * from './lib/${base_folder}/enums/${enum_file_name}.enum';" >> "$index_file"
        done
    done
    
    # Add a newline at the end
    echo "" >> "$index_file"
    
    echo "Updated main index.ts file with exports for $SCHEMA_NAME"
}

# First output the opening brace
echo "{" > "$TEMP_FILE"

while IFS= read -r line; do
    # Skip empty lines
    if [ -z "$line" ]; then
        continue
    fi
    
    # Process the current line
    current_line=$(process_line "$line")
    
    # Skip import and export type lines
    if [[ "$current_line" =~ ^[[:space:]]*import ]] || [[ "$current_line" =~ ^[[:space:]]*export[[:space:]]+type ]]; then
        continue
    fi
    
    # Skip version lines
    if [[ "$current_line" =~ ^[[:space:]]*version ]]; then
        continue
    fi
    
    # For export const line, mark that we've found the schema
    if [[ "$current_line" =~ ^[[:space:]]*export[[:space:]]+const[[:space:]]+${SCHEMA_NAME}[[:space:]]*= ]]; then
        found_schema=1
        continue
    fi
    
    # Skip lines until we find the schema
    if [ $found_schema -eq 0 ]; then
        continue
    fi
    
    # Handle params section
    if [[ "$current_line" =~ ^[[:space:]]*params:[[:space:]]*\{ ]]; then
        in_params=1
        continue
    fi
    if [ $in_params -eq 1 ]; then
        if [[ "$current_line" =~ ^[[:space:]]*\}, ]]; then
            in_params=0
        fi
        continue
    fi
    
    # Handle multi-line type fields
    if [[ "$current_line" =~ type: ]]; then
        # Case 1: Line has type but no braces at all
        if ! [[ "$current_line" =~ [{}] ]]; then
            if [[ "$prev_line" =~ \{$ ]]; then
                collecting_field=1
                combined_field="$prev_line"
                # Remove trailing comma if exists
                combined_field=$(echo "$combined_field" | sed 's/,$//')
                combined_field="$combined_field $current_line"
                prev_line=""
                continue
            fi
        # Case 2: Line has type and closing brace but no opening
        elif [[ "$current_line" =~ \} ]] && ! [[ "$current_line" =~ \{ ]]; then
            if [[ "$prev_line" =~ \{$ ]]; then
                current_line=$(cleanup_line "$prev_line $current_line" "")
                echo "$current_line" >> "$TEMP_FILE"
                prev_line=""
                continue
            fi
        fi
    fi
    
    # If we're collecting a multi-line field
    if [ $collecting_field -eq 1 ]; then
        # If this line has the closing brace
        if [[ "$current_line" =~ \} ]]; then
            collecting_field=0
            # Remove trailing comma if exists
            current_line=$(echo "$current_line" | sed 's/,$//')
            # If we have enum values, ensure they're comma-separated
            if [[ "$combined_field" =~ enum: ]]; then
                # Add commas between enum values if they don't exist
                combined_field=$(echo "$combined_field" | sed "s/'\([^']*\)'[[:space:]]*'/'\1', '/g")
            fi
            combined_field="$combined_field $current_line"
            # Add comma after the combined field if it contains type: and doesn't end with comma
            if [[ "$combined_field" =~ type: ]] && ! [[ "$combined_field" =~ ,$ ]]; then
                combined_field="$combined_field,"
            fi
            combined_field=$(cleanup_line "$combined_field" "")
            echo "$combined_field" >> "$TEMP_FILE"
            combined_field=""
            prev_line=""
            continue
        else
            # Remove trailing comma if exists
            current_line=$(echo "$current_line" | sed 's/,$//')
            # If this is an enum value, ensure it ends with a comma
            if [[ "$combined_field" =~ enum: ]] && [[ "$current_line" =~ \'[^\']+\' ]]; then
                current_line="$current_line,"
            fi
            combined_field="$combined_field $current_line"
            continue
        fi
    fi
    
    # Add comma to lines containing type: that don't end with comma
    if [[ "$current_line" =~ type: ]] && ! [[ "$current_line" =~ ,$ ]]; then
        current_line="$current_line,"
    fi
    
    # Clean up the line if needed
    current_line=$(cleanup_line "$current_line" "$prev_line")
    
    # Check if we need to update prev_line from cleanup
    if [ -f "$TEMP_FILE.prev" ]; then
        prev_line=$(cat "$TEMP_FILE.prev")
        rm "$TEMP_FILE.prev"
    fi
    
    # Output the current line if not part of a multi-line field
    if [ -n "$current_line" ]; then
        # If we have a previous line and we're not collecting a field
        if [ -n "$prev_line" ]; then
            echo "$prev_line" >> "$TEMP_FILE"
        fi
        prev_line="$current_line"
    fi
    
done < "$SCHEMA_FILE"

# Output the last line if it exists
if [ -n "$prev_line" ]; then
    echo "$prev_line" >> "$TEMP_FILE"
fi

# Convert the processed content to valid JSON
convertToJson "$TEMP_FILE" "$FINAL_JSON"

# Just display the models for now
echo "Content of FINAL_JSON:"
echo "---------------------"
cat "$FINAL_JSON"
echo "---------------------"

createDto "$FINAL_JSON"
createAdditionalFiles "$FINAL_JSON"
updateMainIndex "$FINAL_JSON"

# Clean up
rm "$TEMP_FILE"
rm "$FINAL_JSON"
[ -f "$TEMP_FILE.prev" ] && rm "$TEMP_FILE.prev"

echo "Processing complete. DTOs, additional files, and main index.ts have been updated with clean imports." 