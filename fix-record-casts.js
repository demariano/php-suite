const fs = require('fs');
const path = require('path');

const srcDir = 'd:/other_coding_projects/php/apps/web-app/src';

function walk(dir) {
    let files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) files = files.concat(walk(full));
        else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(full);
    }
    return files;
}

const allFiles = walk(srcDir);
let totalChanges = 0;
let totalFiles = 0;

for (const file of allFiles) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Replace 'as Record<string, unknown> | undefined' with 'as any'
    content = content.replace(/ as Record<string, unknown> \| undefined/g, ' as any');
    // Replace 'as Record<string, unknown>' with 'as any'
    content = content.replace(/ as Record<string, unknown>/g, ' as any');

    if (content !== original) {
        const changes = (original.match(/ as Record<string, unknown>/g) || []).length;
        fs.writeFileSync(file, content, 'utf8');
        totalChanges += changes;
        totalFiles++;
        console.log('Fixed ' + changes + ' cast(s) in ' + path.basename(file));
    }
}
console.log('Total: ' + totalChanges + ' casts fixed in ' + totalFiles + ' files');
