const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    schemaDir: path.join(process.cwd(), 'libs/backend/dynamo-db-lib/src/lib/schema'),
    localstackEndpoint: 'http://localhost:4566',
    outputDir: path.join(process.cwd(), 'local-stack-scripts'),
    region: process.argv[2] || 'us-east-1'
};

function main() {
    try {
        // Create output directory if it doesn't exist
        if (!fs.existsSync(config.outputDir)) {
            fs.mkdirSync(config.outputDir, { recursive: true });
        }

        // Read all schema files in the directory
        const schemaFiles = fs.readdirSync(config.schemaDir).filter(file => file.endsWith('.ts'));

        if (schemaFiles.length === 0) {
            throw new Error('No schema files found in the directory');
        }

        // Process each schema file
        for (const schemaFile of schemaFiles) {
            // Extract table name from filename
            const tableName = convertFilenameToTableName(schemaFile);

            // Read the schema file
            const schemaContent = fs.readFileSync(path.join(config.schemaDir, schemaFile), 'utf8');

            // Extract the indexes object
            const indexes = extractIndexes(schemaContent);

            // Generate the AWS CLI command
            const awsCommand = generateLocalStackCommand(indexes, tableName);

            // Save the command to a script file
            const scriptFileName = `dynamodb-${tableName}.sh`;
            const scriptPath = path.join(config.outputDir, scriptFileName);
            fs.writeFileSync(scriptPath, `#!/bin/bash\n${awsCommand}\n`);
            fs.chmodSync(scriptPath, '755'); // Make the script executable

            console.log(`Generated script: ${scriptPath}`);
        }
    } catch (error) {
        console.error('Error generating LocalStack commands:', error);
        process.exit(1);
    }
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

function convertFilenameToTableName(filename) {
    // Remove 'Schema.ts' from the filename
    const name = filename.replace(/Schema\.ts$/, '');

    // Convert camelCase/PascalCase to kebab-case
    return name
        .replace(/([a-z])([A-Z])/g, '$1-$2') // Insert hyphen between lowercase and uppercase
        .toLowerCase(); // Convert to lowercase
}

function generateLocalStackCommand(indexes, tableName) {
    const attributes = new Set();
    const attributeDefinitions = [];
    const gsiDefinitions = [];

    // Add primary index attributes
    attributes.add(indexes.primary.hash);
    if (indexes.primary.sort) {
        attributes.add(indexes.primary.sort);
    }

    // Add GSI attributes to the set
    for (const [indexName, indexConfig] of Object.entries(indexes)) {
        if (indexName !== 'primary') {
            attributes.add(indexConfig.hash);
            if (indexConfig.sort) {
                attributes.add(indexConfig.sort);
            }
        }
    }

    // Generate attribute definitions
    for (const attr of attributes) {
        attributeDefinitions.push(`AttributeName=${attr},AttributeType=S`);
    }

    // Generate GSI definitions
    for (const [indexName, indexConfig] of Object.entries(indexes)) {
        if (indexName !== 'primary') {
            const gsi = {
                IndexName: indexName,
                KeySchema: [
                    { AttributeName: indexConfig.hash, KeyType: 'HASH' },
                    ...(indexConfig.sort ? [{ AttributeName: indexConfig.sort, KeyType: 'RANGE' }] : [])
                ],
                Projection: {
                    ProjectionType: 'ALL'
                },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            };
            gsiDefinitions.push(gsi);
        }
    }

    // Build the AWS CLI command
    let command = `aws dynamodb create-table \\
    --endpoint-url ${config.localstackEndpoint} \\
     --region ${config.region} \\
    --table-name ${tableName} \\
    --attribute-definitions ${attributeDefinitions.join(' ')} \\
    --key-schema AttributeName=${indexes.primary.hash},KeyType=HASH ${indexes.primary.sort ? `AttributeName=${indexes.primary.sort},KeyType=RANGE` : ''} \\
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5`;

    if (gsiDefinitions.length > 0) {
        // Properly format the JSON string
        const gsiJson = JSON.stringify(gsiDefinitions)
            .replace(/"/g, '\\"');  // Only escape double quotes
        command += ` \\
    --global-secondary-indexes "${gsiJson}"`;
    }
    command += ' > /dev/null 2>&1';
    return command;
}

// Run the script
main(); 