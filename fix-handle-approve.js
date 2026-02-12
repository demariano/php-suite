const fs = require('fs');
const path = require('path');

const files = [
    'apps/web-app/src/app/(authenticated-routes)/inventory/stock-types/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/inventory/suppliers/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/invoicing/contract/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/invoicing/sales-type/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/invoicing/territory-manager/[id]/edit/page.tsx',
];

let fixed = 0;

for (const relPath of files) {
    const fullPath = path.join(__dirname, relPath);
    if (!fs.existsSync(fullPath)) {
        console.log('NOT FOUND:', relPath);
        continue;
    }

    let content = fs.readFileSync(fullPath, 'utf8');

    // Find the handleDeny function we added earlier and insert handleApprove before it
    if (content.includes('const handleDeny = () =>')) {
        const handleApproveCode = `const handleApprove = async () => {
        // Placeholder for approve logic
        console.log('Approve action triggered');
    };

    `;

        // Insert before handleDeny
        content = content.replace('const handleDeny = () =>', handleApproveCode + 'const handleDeny = () =>');
        fs.writeFileSync(fullPath, content);
        console.log('Fixed:', path.basename(relPath));
        fixed++;
    } else if (content.includes('const handleDenyConfirm')) {
        // If handleDeny insertion point doesn't exist, try handleDenyConfirm
        const handleApproveCode = `const handleApprove = async () => {
        console.log('Approve action triggered');
    };

    `;
        content = content.replace('const handleDenyConfirm', handleApproveCode + 'const handleDenyConfirm');
        fs.writeFileSync(fullPath, content);
        console.log('Fixed (alt):', path.basename(relPath));
        fixed++;
    } else {
        console.log('NO ANCHOR:', relPath);
    }
}

console.log('\nTotal fixed:', fixed);
