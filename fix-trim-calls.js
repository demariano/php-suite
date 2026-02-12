const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            results = results.concat(walkDir(filePath));
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            results.push(filePath);
        }
    }
    return results;
}

const baseDir = path.join(__dirname, 'apps/web-app/src/app');
const files = walkDir(baseDir);
let totalFiles = 0;
let totalReplaces = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    // Match patterns like formData.someProp.trim() or selectedXxx.someProp.trim()
    // but NOT already using ?. (formData.someProp?.trim())
    // Pattern: word.word.trim() where the second word is NOT followed by ?.
    const regex =
        /((?:formData|selectedSupplier|selectedUnit|selectedLocation|selectedAccount|selectedStock|selectedCustomer|selectedArea|selectedClassification|selectedType|selectedTerms|selectedMaterial|selectedContract|selectedProduct|selectedVoucher)\.\w+)\.trim\(\)/g;

    let newContent = content;
    let count = 0;
    newContent = content.replace(regex, (match, prefix) => {
        // Check if it already has optional chaining
        if (match.includes('?.trim()')) return match;
        count++;
        return prefix + '?.trim()';
    });

    if (count > 0) {
        fs.writeFileSync(file, newContent);
        console.log(`Fixed ${count} in: ${path.relative(__dirname, file)}`);
        totalFiles++;
        totalReplaces += count;
    }
}

console.log(`\nTotal: ${totalReplaces} replacements in ${totalFiles} files`);
