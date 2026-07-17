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
            if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('dist') && !file.includes('build') && !file.includes('target') && !file.includes('.venv') && !file.includes('venv') && !file.includes('.git')) {
                results = results.concat(getFiles(file));
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = getFiles('.');
let undocumented = 0;

for (const file of files) {
    if (file.includes('node_modules') || file.includes('dist') || file.includes('build') || file.includes('.next')) continue;
    
    try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        let inDoc = false;

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
                    undocumented++;
                    // console.log(`Undocumented: ${file}:${i + 1} - ${line}`);
                }
            }
        }
    } catch (e) {}
}

console.log(`Remaining undocumented TS/JS exports in entire repo: ${undocumented}`);
