const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    try {
        const list = fs.readdirSync(dir);
        for (const file of list) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                results = results.concat(walkDir(filePath));
            } else if (filePath.endsWith('.tsx')) {
                results.push(filePath);
            }
        }
    } catch {}
    return results;
}

const baseDir = path.join(__dirname, 'apps/web-app/src/app');
const files = walkDir(baseDir);
let totalFixed = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // Match pattern: type XxxTableRow = XxxDto & {
    // Replace with: type XxxTableRow = Omit<XxxDto, 'status'> & {
    const regex = /type (\w+TableRow) = (\w+Dto) & \{/g;
    let match;
    let changed = false;

    while ((match = regex.exec(content)) !== null) {
        const fullMatch = match[0];
        const typeName = match[1];
        const dtoName = match[2];

        // Only fix if not already using Omit
        if (!fullMatch.includes('Omit')) {
            const replacement = `type ${typeName} = Omit<${dtoName}, 'status'> & {`;
            content = content.replace(fullMatch, replacement);
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log('Fixed:', path.relative(__dirname, file));
        totalFixed++;
    }
}

console.log('\nTotal fixed:', totalFixed);
