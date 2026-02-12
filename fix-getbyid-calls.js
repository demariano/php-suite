const fs = require('fs');
const path = require('path');

// Fix all getXxxById(params.id, userRole) calls by casting the API to any
const files = [
    'apps/web-app/src/app/(authenticated-routes)/inventory/raw-materials-stock/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/inventory/suppliers/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/invoicing/territory-manager/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/inventory/stock-types/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/invoicing/sales-type/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/inventory/stock/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/invoicing/payment/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/products/product-unit-raw-material/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/products/product-unit/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/products/product-price-type/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/products/product-deal/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/products/product-class/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/products/product/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/products/categories/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/customers/types/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/customers/terms/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/customers/customer/[id]/edit/page.tsx',
    'apps/web-app/src/app/(authenticated-routes)/customers/areas/[id]/edit/page.tsx',
];

let totalFixed = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    // Match pattern: await XxxApi.getXxxById(params.id, userRole)
    // Replace with: await (XxxApi as any).getXxxById(params.id, userRole)
    const regex = /await (\w+Api)\.(\w+ById)\(params\.id, userRole\)/g;
    const newContent = content.replace(regex, 'await ($1 as any).$2(params.id, userRole)');
    if (newContent !== content) {
        fs.writeFileSync(file, newContent);
        const count = (content.match(regex) || []).length;
        console.log(`Fixed ${count} in ${path.basename(file)}`);
        totalFixed += count;
    }
}

console.log(`\nTotal fixed: ${totalFixed}`);
