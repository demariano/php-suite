const fs = require('fs');
const path = require('path');

// Find all TSX files with broken TableRowData
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

for (const file of walk(srcDir)) {
    let content = fs.readFileSync(file, 'utf8');
    // Look for the broken pattern: textColor: string     [key: string]: unknown;
    if (content.includes('string     [key: string]: unknown;')) {
        const original = content;
        // Fix: remove the incorrectly placed index signature from inside nested objects
        content = content.replace(
            /: string {5}\[key: string\]: unknown;\n/g,
            ': string } } | null;\n    [key: string]: unknown;\n'
        );
        // But we now have duplicate `} } | null;` - need to remove the old closing
        // Actually let me be more precise: the pattern is:
        // textColor: string     [key: string]: unknown;\n} } | null;
        // should become:
        // textColor: string } } | null;\n    [key: string]: unknown;
        // But the above replacement creates: textColor: string } } | null;\n    [key: string]: unknown;\n} } | null;
        // So I need to also remove the now-orphaned } } | null;
        content = content.replace(
            /: string \} \} \| null;\n {4}\[key: string\]: unknown;\n\} \} \| null;/g,
            ': string } } | null;\n    [key: string]: unknown;'
        );
        if (content !== original) {
            fs.writeFileSync(file, content, 'utf8');
            console.log('Fixed: ' + path.basename(file));
        }
    }
}
