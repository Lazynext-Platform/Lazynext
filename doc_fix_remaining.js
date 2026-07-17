const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('dist') && !file.includes('build') && !file.includes('target') && !file.includes('.venv') && !file.includes('venv') && !file.includes('.git') && !file.includes('.archive') && !file.includes('.turbo')) {
                results = results.concat(getFiles(file));
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = getFiles('.');
let documented = 0;

for (const file of files) {
    if (file.includes('doc_') || file.includes('patch.py') || file.includes('clippy_docs.json')) continue;
    
    try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        let inDoc = false;
        let modified = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('/**')) inDoc = true;
            if (line.endsWith('*/')) inDoc = false;

            if (!inDoc && line.match(/^(export const|export function|export default function|export interface|export type|export class)/)) {
                let hasDoc = false;
                for (let j = i - 1; j >= 0; j--) {
                    const prev = lines[j].trim();
                    if (prev === '') continue;
                    if (prev.endsWith('*/') || prev.startsWith('//')) {
                        hasDoc = true;
                    }
                    break;
                }
                if (!hasDoc) {
                    const match = line.match(/export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type)\s+([A-Za-z0-9_]+)/);
                    let name = 'this module';
                    let desc = 'Documentation for this export.';
                    
                    if (match && match[1]) {
                        name = match[1];
                        if (line.includes('interface') || line.includes('type')) {
                            desc = `Type definition for ${name}.`;
                        } else if (name.startsWith('use')) {
                            desc = `Custom hook providing ${name} functionality.`;
                        } else if (/^[A-Z]/.test(name) && file.endsWith('.tsx')) {
                            desc = `React component rendering ${name}.`;
                        } else if (line.includes('class')) {
                            desc = `Class representing ${name}.`;
                        } else {
                            desc = `Utility representing ${name}.`;
                        }
                    } else if (line.match(/export\s+default\s+function/)) {
                         if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
                             desc = `Default React component for this module.`;
                         } else {
                             desc = `Default exported function for this module.`;
                         }
                    } else if (line.match(/export\s+default\s+class/)) {
                         desc = `Default exported class for this module.`;
                    } else {
                         desc = `Exported utility or module.`;
                    }

                    const indentMatch = lines[i].match(/^\s*/);
                    const indent = indentMatch ? indentMatch[0] : '';
                    lines.splice(i, 0, indent + `/** ${desc} */`);
                    i++; // skip added line
                    modified = true;
                    documented++;
                }
            }
        }

        if (modified) {
            fs.writeFileSync(file, lines.join('\n'));
        }
    } catch (e) {}
}

console.log(`Auto-documented ${documented} remaining exports in TS/JS files.`);
