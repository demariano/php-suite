const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    schemaDir: path.join(process.cwd(), 'libs/backend/dynamo-db-lib/src/lib/schema'),
    outputFolder: process.argv[2] || 'dev', // Folder name under /terraform
    parentFolder: process.cwd() // Get the current working directory as the parent folder
};

function main() {
    try {
        // Read all schema files in the directory
        const schemaFiles = fs.readdirSync(config.schemaDir).filter(file => file.endsWith('.ts'));

        if (schemaFiles.length === 0) {
            throw new Error('No schema files found in the directory');
        }

        // Process each schema file
        for (const schemaFile of schemaFiles) {
            // Extract table name from filename (e.g., EmailTemplateSchema.ts → email-template)
            const tableName = convertFilenameToTableName(schemaFile);

            // Read the schema file
            const schemaContent = fs.readFileSync(path.join(config.schemaDir, schemaFile), 'utf8');

            // Extract the indexes object
            const indexes = extractIndexes(schemaContent);
            console.log(`Processing ${schemaFile} for table ${tableName}`); // Debugging

            // Generate the Terraform configuration
            const terraformConfig = generateTerraformConfig(indexes, `\${var.project}-\${var.environment}-${tableName}`);

            // Ensure output directory exists
            const outputDir = path.join(config.parentFolder, 'terraform', config.outputFolder);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true, mode: 0o777 });
            }

            // Write the output file
            const outputPath = path.join(outputDir, `dynamodb-${tableName}.tf`);
            fs.writeFileSync(outputPath, terraformConfig);
            console.log(`Terraform configuration successfully written to ${outputPath}`);
        }
    } catch (error) {
        console.error('Error generating Terraform configuration:', error);
        process.exit(1);
    }
}

function convertFilenameToTableName(filename) {
    // Remove 'Schema.ts' from the filename
    const name = filename.replace(/Schema\.ts$/, '');

    // Convert camelCase/PascalCase to kebab-case
    return name
        .replace(/([a-z])([A-Z])/g, '$1-$2') // Insert hyphen between lowercase and uppercase
        .toLowerCase(); // Convert to lowercase
}

function extractIndexes(content) {
    // Find the start of the indexes object
    const startIndex = content.indexOf('indexes:');
    if (startIndex === -1) {
        throw new Error('Could not find indexes in schema file');
    }

    // Extract the content starting from the indexes object
    const remainingContent = content.slice(startIndex);

    // Find the opening and closing braces of the indexes object
    let startBrace = remainingContent.indexOf('{');
    let endBrace = startBrace;
    let bracketCount = 1;

    // Iterate through the content to find the matching closing brace
    for (let i = startBrace + 1; i < remainingContent.length; i++) {
        if (remainingContent[i] === '{') {
            bracketCount++;
        } else if (remainingContent[i] === '}') {
            bracketCount--;
            if (bracketCount === 0) {
                endBrace = i;
                break;
            }
        }
    }

    if (bracketCount !== 0) {
        throw new Error('Could not find the end of the indexes object');
    }

    // Extract the indexes object content
    const indexesContent = remainingContent.slice(startBrace, endBrace + 1);


    // Convert to valid JSON
    const jsonString = indexesContent
        .replace(/(\w+):/g, '"$1":')  // Convert keys to quoted strings
        .replace(/'/g, '"')           // Convert single quotes to double quotes
        .replace(/(\w+)(?=\s*:)/g, '"$1"') // Ensure all keys are quoted
        .replace(/,\s*}/g, '}');      // Remove trailing commas

    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Failed to parse indexes:', jsonString);
        throw error;
    }
}

function generateTerraformConfig(indexes, tableName) {
    const attributes = new Set();
    const gsiBlocks = [];

    // Add primary index attributes
    attributes.add(indexes.primary.hash);
    if (indexes.primary.sort) {
        attributes.add(indexes.primary.sort);
    }

    // Collect all attributes from other indexes
    for (const [indexName, indexConfig] of Object.entries(indexes)) {
        if (indexName !== 'primary') {
            attributes.add(indexConfig.hash);
            if (indexConfig.sort) {
                attributes.add(indexConfig.sort);
            }

            // Generate GSI block
            gsiBlocks.push(`  global_secondary_index {
    name            = "${indexName}"
    hash_key        = "${indexConfig.hash}"${indexConfig.sort ? `
    range_key       = "${indexConfig.sort}"` : ''}
    projection_type = "ALL"
  }`);
        }
    }

    // Generate attribute blocks
    const attributeBlocks = Array.from(attributes).map(attr => `  attribute {
    name = "${attr}"
    type = "S"
  }`).join('\n');

    // Extract the pure table name without the project and environment variables
    const pureTableName = tableName.split('-').slice(2).join('-');

    return `resource "aws_dynamodb_table" "dynamodb_table_${pureTableName}" {
  name         = "${tableName}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "${indexes.primary.hash}"
  range_key    = "${indexes.primary.sort}"

  point_in_time_recovery {
    enabled = true
  }
${attributeBlocks}
${gsiBlocks.join('\n')}
}`;
}

// Run the script
main(); 