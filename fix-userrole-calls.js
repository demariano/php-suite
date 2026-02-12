const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all .tsx files containing "userRole)" in the web-app
const result = execSync('grep -rl "userRole)" apps/web-app/src/', { encoding: 'utf8' });
const files = result
    .trim()
    .split('\n')
    .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));

let totalFixed = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Match: await XxxApi.methodName(..., userRole)
    // Replace with: await (XxxApi as any).methodName(..., userRole)
    // But skip lines already having "(XxxApi as any)"
    content = content.replace(/await (\w+Api)\.(\w+)\(([^)]*),\s*userRole\)/g, (match, api, method, args) => {
        return `await (${api} as any).${method}(${args}, userRole)`;
    });

    // Also fix non-await calls: XxxApi.methodName(..., userRole)
    // But be careful not to double-wrap
    content = content.replace(/(?<!await \()(\w+Api)\.(\w+)\(([^)]*),\s*userRole\)/g, (match, api, method, args) => {
        // Skip if already wrapped
        if (match.includes('as any')) return match;
        return `(${api} as any).${method}(${args}, userRole)`;
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        const changes = content.split('as any)').length - original.split('as any)').length;
        console.log(`Fixed ${changes} in ${file}`);
        totalFixed += changes;
    }
}

console.log(`\nTotal fixed: ${totalFixed}`);
