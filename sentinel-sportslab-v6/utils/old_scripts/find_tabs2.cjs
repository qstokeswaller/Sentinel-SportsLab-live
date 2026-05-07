const fs = require('fs');
const code = fs.readFileSync('docs/App.tsx', 'utf8');

// Find all activeTab references in the return statement
const matches = [...code.matchAll(/activeTab\s*===\s*'([^']+)'\s*&&\s*([a-zA-Z0-9_</>() ]+)/g)];
const results = matches.map(m => `Tab "${m[1]}" => ${m[2].trim()}`);
fs.writeFileSync('tab_renders.txt', results.join('\n'));
console.log('Written to tab_renders.txt');
