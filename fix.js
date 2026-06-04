const fs = require('fs');
const { execSync } = require('child_process');

// Find files containing @/rendering
const files1 = execSync('grep -rl "@/rendering" apps/web/src').toString().split('\n').filter(Boolean);

for (const file of files1) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace Transform imports
    if (content.includes('Transform') && content.includes('@/rendering')) {
        content = content.replace(/import \{([^}]*)\}\s+from\s+["']@\/rendering["'];/g, (match, imports) => {
            let newImports = [];
            let oldImports = [];
            let pieces = imports.split(',').map(s => s.trim()).filter(Boolean);
            
            let hasTransform = false;
            let hasBlendMode = false;
            for (let piece of pieces) {
                if (piece === 'Transform' || piece === 'type Transform') {
                    hasTransform = true;
                } else if (piece === 'BlendMode' || piece === 'type BlendMode') {
                    hasBlendMode = true;
                } else {
                    oldImports.push(piece);
                }
            }
            
            let res = '';
            if (hasTransform) {
                res += `import type { Transform } from "@/primitives/transform";\n`;
            }
            if (hasBlendMode) {
                res += `import type { BlendMode } from "@/primitives/blend-mode";\n`;
            }
            if (oldImports.length > 0) {
                res += `import { ${oldImports.join(', ')} } from "@/rendering";\n`;
            }
            
            return res.trim();
        });
        
        content = content.replace(/import type \{([^}]*)\}\s+from\s+["']@\/rendering["'];/g, (match, imports) => {
            let oldImports = [];
            let pieces = imports.split(',').map(s => s.trim()).filter(Boolean);
            
            let hasTransform = false;
            let hasBlendMode = false;
            for (let piece of pieces) {
                if (piece === 'Transform') {
                    hasTransform = true;
                } else if (piece === 'BlendMode') {
                    hasBlendMode = true;
                } else {
                    oldImports.push(piece);
                }
            }
            
            let res = '';
            if (hasTransform) {
                res += `import type { Transform } from "@/primitives/transform";\n`;
            }
            if (hasBlendMode) {
                res += `import type { BlendMode } from "@/primitives/blend-mode";\n`;
            }
            if (oldImports.length > 0) {
                res += `import type { ${oldImports.join(', ')} } from "@/rendering";\n`;
            }
            
            return res.trim();
        });
    }
    
    fs.writeFileSync(file, content);
}

// Find files containing animation-values
const files2 = execSync('grep -rl "animation-values" apps/web/src || true').toString().split('\n').filter(Boolean);

for (const file of files2) {
    if (file.endsWith('animation-values.ts')) continue;
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/@\/rendering\/animation-values/g, '@/animation/values');
    fs.writeFileSync(file, content);
}

console.log("Imports fixed!");
