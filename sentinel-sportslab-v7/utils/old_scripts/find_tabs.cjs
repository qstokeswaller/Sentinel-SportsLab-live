const fs = require('fs');
const code = fs.readFileSync('docs/App.tsx', 'utf8');

// Find all activeTab references
const matches = [...code.matchAll(/activeTab\s*===\s*'([^']+)'/g)];
const tabs = [...new Set(matches.map(m => m[1]))];
console.log('Tabs found:', tabs);

// Find associated render calls
for (const tab of tabs) {
    const regex = new RegExp(`activeTab\\s*===\\s*'${tab}'\\s*&&\\s*([a-zA-Z0-9_()\\s</>]+)`, 'g');
    const calls = [...code.matchAll(regex)];
    for (const c of calls) {
        console.log(`  Tab "${tab}" renders: ${c[1].trim().substring(0, 80)}`);
    }
}
