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
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            results.push(filePath);
        }
    }
    return results;
}

const dirs = ['libs/frontend/data-access/src/types'];

let totalFixed = 0;
for (const dir of dirs) {
    const fullDir = path.join(__dirname, dir);
    if (!fs.existsSync(fullDir)) continue;
    const files = walkDir(fullDir);
    for (const file of files) {
        let content = fs.readFileSync(file, 'utf8');
        if (content.includes('forApprovalVersion?: Record<string, unknown>')) {
            content = content.replace(
                /forApprovalVersion\?: Record<string, unknown>/g,
                'forApprovalVersion?: Record<string, any>'
            );
            fs.writeFileSync(file, content);
            console.log('Fixed:', path.basename(file));
            totalFixed++;
        }
    }
}
console.log('Total files fixed:', totalFixed);
