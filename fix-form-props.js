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
    const basename = path.basename(file);
    // Only process Form component files
    if (!basename.endsWith('Form.tsx')) continue;

    let content = fs.readFileSync(file, 'utf8');

    // Check if it has a Props interface but missing onApprove
    const propsMatch = content.match(/interface (\w+Props)\s*\{/);
    if (!propsMatch) continue;

    const propsName = propsMatch[1];

    // Check if onApprove already exists
    if (content.includes('onApprove')) continue;

    // Find the closing brace of the props interface and add onApprove/onDeny before it
    // We need to find the interface block and add to it
    const interfaceRegex = new RegExp(`(interface ${propsName}\\s*\\{[^}]*)(\\})`);
    const match = content.match(interfaceRegex);
    if (match) {
        const replacement = match[1] + '  onApprove?: () => void;\n  onDeny?: () => void;\n' + match[2];
        content = content.replace(interfaceRegex, replacement);
        fs.writeFileSync(file, content);
        console.log('Fixed:', path.relative(__dirname, file));
        totalFixed++;
    }
}

console.log('\nTotal fixed:', totalFixed);
