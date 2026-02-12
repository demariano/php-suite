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
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            results.push(filePath);
        }
    }
    return results;
}

const baseDir = path.join(__dirname, 'apps/web-app/src/app');
const files = walkDir(baseDir);
let totalFixed = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    // Match: response.data as { data: SomeType[] }
    const regex = /response\.data as \{[^}]+\}/g;
    if (regex.test(content)) {
        content = content.replace(/response\.data as \{[^}]+\}/g, 'response.data as any');
        fs.writeFileSync(file, content);
        console.log('Fixed:', path.relative(__dirname, file));
        totalFixed++;
    }
}
console.log('Total fixed:', totalFixed);
