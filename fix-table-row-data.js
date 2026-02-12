const fs = require('fs');
const path = require('path');

const srcDir = 'd:/other_coding_projects/php/apps/web-app/src';

function walk(dir) {
    let files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) files = files.concat(walk(full));
        else if (/\.tsx$/.test(entry.name)) files.push(full);
    }
    return files;
}

let totalChanges = 0;

for (const file of walk(srcDir)) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Find TableRowData interface blocks
    const interfaceRegex = /interface TableRowData \{([^}]+)\}/g;
    content = content.replace(interfaceRegex, function (match, body) {
        // Make simple typed fields optional (string, number, string[])
        // But keep React.ReactNode fields (computed) and complex nested types as-is
        let newBody = body.replace(/^(\s+)(\w+)(: (?:string|number|string\[\]));$/gm, '$1$2?$3;');

        // Add index signature if not present
        if (!newBody.includes('[key: string]')) {
            newBody = newBody.trimEnd() + '\n    [key: string]: unknown;\n';
        }

        return 'interface TableRowData {' + newBody + '}';
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        totalChanges++;
        console.log('Fixed: ' + path.basename(file));
    }
}
console.log('Total files changed: ' + totalChanges);
