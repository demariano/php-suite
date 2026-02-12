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
    const basename = path.basename(file);

    // Only process Table components
    if (!basename.endsWith('Table.tsx')) continue;

    // Find if we used Omit<XxxDto, 'status'>
    const omitMatch = content.match(/Omit<(\w+Dto), 'status'>/);
    if (!omitMatch) continue;

    const dtoName = omitMatch[1];

    // Fix onRowClick prop type: (xxx: XxxDto) => void -> (xxx: any) => void
    const regex = new RegExp(`onRowClick:\\s*\\(\\w+:\\s*${dtoName}\\)\\s*=>\\s*void`);
    if (regex.test(content)) {
        content = content.replace(regex, `onRowClick: (row: any) => void`);
        fs.writeFileSync(file, content);
        console.log('Fixed onRowClick:', path.relative(__dirname, file));
        totalFixed++;
    }
}

console.log('\nTotal fixed:', totalFixed);
