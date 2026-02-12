const fs = require('fs');
const files = [
    'd:/other_coding_projects/php/apps/web-app/src/app/(authenticated-routes)/customers/classifications/components/CustomerClassificationTable.tsx',
    'd:/other_coding_projects/php/apps/web-app/src/app/(authenticated-routes)/customers/terms/components/TermsTable.tsx',
    'd:/other_coding_projects/php/apps/web-app/src/app/(authenticated-routes)/customers/types/components/CustomerTypeTable.tsx',
    'd:/other_coding_projects/php/apps/web-app/src/app/(authenticated-routes)/inventory/stock-purchase-order/components/StockPurchaseOrderTable.tsx',
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const re = /(interface TableRowData \{[^}]+)(})/;
    const m = content.match(re);
    if (m) {
        let body = m[1];
        // Make string fields optional
        body = body.replace(/(\w+): string;/g, function (s, name) {
            return name + '?: string;';
        });
        // Add index signature
        if (!body.includes('[key: string]')) {
            body += '    [key: string]: unknown;\n';
        }
        content = content.replace(re, body + m[2]);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed: ' + file.split('/').pop());
    } else {
        console.log('No match in: ' + file.split('/').pop());
    }
}
