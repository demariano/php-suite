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

    // Remove all variant="mobile" and variant="desktop" props (these components don't support variant)
    // Handle both inline (same line) and multi-line (on its own line) patterns
    content = content.replace(/\s+variant="(?:mobile|desktop)"/g, '');

    if (content !== original) {
        const changes = (original.match(/variant="(?:mobile|desktop)"/g) || []).length;
        fs.writeFileSync(file, content, 'utf8');
        totalChanges += changes;
        console.log('Removed ' + changes + ' variant prop(s) from ' + path.basename(file));
    }
}
console.log('Total: ' + totalChanges + ' variant props removed');
