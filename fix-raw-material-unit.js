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
let totalFixed = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Fix: rawMaterial.rawMaterialUnitId -> (rawMaterial as any).rawMaterialUnitId
    // But only when rawMaterial is typed as RawMaterialDto (which doesn't have those fields)
    // Match: rawMaterial.rawMaterialUnitId or rawMaterial.rawMaterialUnitName
    // But not already cast: (rawMaterial as any).rawMaterialUnitId
    const patterns = [
        /(?<!\bas any\)\.)\brawMaterial\.rawMaterialUnitId/g,
        /(?<!\bas any\)\.)\brawMaterial\.rawMaterialUnitName/g,
    ];

    for (const pat of patterns) {
        if (pat.test(content)) {
            content = content.replace(pat, (match) => {
                return match.replace('rawMaterial.', '(rawMaterial as any).');
            });
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log('Fixed:', path.relative(__dirname, file));
        totalFixed++;
    }
}
console.log('Total fixed:', totalFixed);
