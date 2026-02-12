const fs = require('fs');
const path = require('path');

const files = [
    'apps/web-app/src/app/(authenticated-routes)/accounting/voucher/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/customers/areas/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/customers/classifications/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/customers/terms/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/customers/types/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/inventory/stock-purchase-order/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/invoicing/return-good-sold/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/invoicing/return-good-sold/[id]/edit/components/StockItemSelectionModal.tsx',
    'apps/web-app/src/app/(authenticated-routes)/products/product-deal/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/search-modals/ProductDealSearchableSelectionModal.tsx',
    'apps/web-app/src/app/(authenticated-routes)/search-modals/ProductSearchableSelectionModal.tsx',
    'apps/web-app/src/app/(authenticated-routes)/search-modals/StockSearchableSelectionModal.tsx',
];

let fixed = 0;

for (const rel of files) {
    const fullPath = path.join(__dirname, rel);
    if (!fs.existsSync(fullPath)) {
        console.log('NOT FOUND:', rel);
        continue;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let changed = false;

    // Replace "let response;" with "let response: any;"
    if (content.includes('let response;') && !content.includes('let response: any;')) {
        content = content.replace(/let response;/g, 'let response: any;');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed:', path.basename(rel));
        fixed++;
    }
}

console.log('\nTotal fixed:', fixed);
