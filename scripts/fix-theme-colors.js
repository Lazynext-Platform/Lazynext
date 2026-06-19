const fs = require('fs');
const path = require('path');

const DIRECTORY_TO_SEARCH = path.join(__dirname, '../apps/web/src');

const REPLACEMENTS = [
  // Backgrounds
  { regex: /(?<!\w)bg-zinc-950(?!\w)/g, replacement: 'bg-background' },
  { regex: /(?<!\w)bg-zinc-900(?!\w)/g, replacement: 'bg-background' },
  { regex: /(?<!\w)bg-black(?!\w)/g, replacement: 'bg-background' },
  { regex: /(?<!\w)bg-zinc-800(?!\w)/g, replacement: 'bg-panel' },
  { regex: /(?<!\w)bg-zinc-700(?!\w)/g, replacement: 'bg-glass' },
  { regex: /(?<!\w)bg-gray-900(?!\w)/g, replacement: 'bg-background' },
  { regex: /(?<!\w)bg-gray-800(?!\w)/g, replacement: 'bg-panel' },
  
  // Texts
  { regex: /(?<!\w)text-white(?!\w)/g, replacement: 'text-foreground' },
  { regex: /(?<!\w)text-zinc-100(?!\w)/g, replacement: 'text-foreground' },
  { regex: /(?<!\w)text-zinc-200(?!\w)/g, replacement: 'text-foreground' },
  { regex: /(?<!\w)text-zinc-300(?!\w)/g, replacement: 'text-foreground' },
  { regex: /(?<!\w)text-zinc-400(?!\w)/g, replacement: 'text-muted' },
  { regex: /(?<!\w)text-zinc-500(?!\w)/g, replacement: 'text-muted' },
  { regex: /(?<!\w)text-gray-400(?!\w)/g, replacement: 'text-muted' },
  { regex: /(?<!\w)text-gray-500(?!\w)/g, replacement: 'text-muted' },

  // Borders
  { regex: /(?<!\w)border-zinc-800(?!\w)/g, replacement: 'border-border' },
  { regex: /(?<!\w)border-zinc-700(?!\w)/g, replacement: 'border-border' },
  { regex: /(?<!\w)border-gray-700(?!\w)/g, replacement: 'border-border' },
  { regex: /(?<!\w)border-white\/10(?!\w)/g, replacement: 'border-border' },
  { regex: /(?<!\w)border-white\/5(?!\w)/g, replacement: 'border-border' },

  // Special white opacity (often used as borders or hover states)
  { regex: /(?<!\w)bg-white\/10(?!\w)/g, replacement: 'bg-glass' },
  { regex: /(?<!\w)bg-white\/5(?!\w)/g, replacement: 'bg-hover' },
];

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  for (const { regex, replacement } of REPLACEMENTS) {
    content = content.replace(regex, replacement);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

console.log('Starting theme colors replacement script...');
processDirectory(DIRECTORY_TO_SEARCH);
console.log('Done.');
