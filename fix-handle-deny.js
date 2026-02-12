const fs = require('fs');
const path = require('path');

const files = [
    'apps/web-app/src/app/(authenticated-routes)/inventory/raw-materials-locations/[rawMaterialsLocationId]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/inventory/stock-types/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/invoicing/contract/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/invoicing/sales-type/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/invoicing/territory-manager/[id]/edit/page.tsx',
];

let fixed = 0;

for (const relPath of files) {
    const fullPath = path.join(__dirname, relPath);
    if (!fs.existsSync(fullPath)) {
        console.log(`NOT FOUND: ${relPath}`);
        continue;
    }

    let content = fs.readFileSync(fullPath, 'utf8');

    // Find "const handleDenyConfirm" and insert handleDeny before it
    if (content.includes('const handleDenyConfirm')) {
        content = content.replace(
            'const handleDenyConfirm',
            `const handleDeny = () => {\n        setShowDenyDialog(true);\n    };\n\n    const handleDenyConfirm`
        );
        fs.writeFileSync(fullPath, content);
        console.log(`Fixed: ${path.basename(relPath)}`);
        fixed++;
    } else {
        // Try finding handleDeleteCancel as insertion point
        if (content.includes('const handleDeleteCancel')) {
            content = content.replace(
                /const handleDeleteCancel[^\n]*\n/,
                (match) => match + `\n    const handleDeny = () => {\n        setShowDenyDialog(true);\n    };\n\n`
            );
            fs.writeFileSync(fullPath, content);
            console.log(`Fixed (alt): ${path.basename(relPath)}`);
            fixed++;
        } else {
            console.log(`NO ANCHOR FOUND: ${relPath}`);
        }
    }
}

console.log(`\nTotal fixed: ${fixed}`);
