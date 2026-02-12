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

    // Fix 1: Remove variant="mobile" and variant="desktop" from TableSkeleton
    content = content.replace(
        /<TableSkeleton([^>]*?) variant="(?:mobile|desktop)"([^>]*?)\/>/g,
        '<TableSkeleton$1$2/>'
    );

    // Fix 2: Fix PageSizeSelector wrong prop names (only on PageSizeSelector, not parent components)
    // Pattern: <PageSizeSelector pageSize={...} onPageSizeChange={...} variant="..." />
    content = content.replace(/<PageSizeSelector\s+pageSize=/g, '<PageSizeSelector value=');
    // Only replace onPageSizeChange= when it follows value= or other PageSizeSelector props on the same line
    // Using a more targeted approach: replace only within lines containing <PageSizeSelector
    const lines = content.split('\n');
    let inPageSizeSelector = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<PageSizeSelector')) inPageSizeSelector = true;
        if (inPageSizeSelector) {
            lines[i] = lines[i].replace(/onPageSizeChange=/g, 'onChange=');
            lines[i] = lines[i].replace(/ variant="(?:mobile|desktop)"/g, '');
            if (lines[i].includes('/>') || lines[i].includes('</PageSizeSelector>')) {
                inPageSizeSelector = false;
            }
        }
    }
    content = lines.join('\n');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        totalChanges++;
        console.log('Fixed: ' + path.basename(file));
    }
}
console.log('Total files changed: ' + totalChanges);
