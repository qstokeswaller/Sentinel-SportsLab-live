const fs = require('fs');
const code = fs.readFileSync('docs/App.tsx', 'utf8');
const tabs = ['1rm', 'dsi', 'rsi', 'map'];

tabs.forEach(tab => {
    // Look for {activeTab === 'tab' && ( ... )} or similar
    const regex = new RegExp('\\{activeTab === \\'' + tab + '\\\' && [\\s\\S]*?(?=\\}\\s*\\{activeTab ===|\\}\\s*<\\/div>|\\}\\s*<\\/main>)', 'g');
    const match = code.match(regex);
    if (match) {
        fs.writeFileSync(tab + '_full_jsx.txt', match[0]);
        console.log('Found ' + tab);
    } else {
        console.log('Not found ' + tab);
    }
});
