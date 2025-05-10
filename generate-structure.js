// File: generate-structure.js
// usage:  node generate-structure.js > project-structure.txt
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);          // текущая папка

function walk(dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
                    .sort((a, b) => a.name.localeCompare(b.name));

  entries.forEach((entry, idx) => {
    const isLast = idx === entries.length - 1;
    const line   = `${prefix}${isLast ? '└──' : '├──'} ${entry.name}`;
    console.log(line);

    if (entry.isDirectory()) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      walk(path.join(dir, entry.name), newPrefix);
    }
  });
}

console.log(path.basename(ROOT));
walk(ROOT);
