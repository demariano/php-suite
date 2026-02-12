const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
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
    return results;
}

const baseDir = path.join(__dirname, 'apps/web-app/src/app');
const files = walkDir(baseDir);
let totalFiles = 0;
let totalReplaces = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    // Match onRowClick(record.someId) where someId does NOT have ! already
    // Pattern: onRowClick(record.wordChars) but not onRowClick(record.wordChars!)
    const regex = /onRowClick\(record\.(\w+)(?<!!)\)/g;

    let newContent = content;
    let count = 0;
    newContent = content.replace(regex, (match, field) => {
        if (match.includes('!')) return match;
        count++;
        return `onRowClick(record.${field}!)`;
    });

    if (count > 0) {
        fs.writeFileSync(file, newContent);
        console.log(`Fixed ${count} in: ${path.relative(__dirname, file)}`);
        totalFiles++;
        totalReplaces += count;
    }
}

console.log(`\nTotal: ${totalReplaces} replacements in ${totalFiles} files`);
