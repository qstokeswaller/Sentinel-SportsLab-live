const fs = require('fs');
let app = fs.readFileSync('docs/App.tsx', 'utf8');

const startText = '<nav className={`${isSidebarCollapsed';
const endText = '</nav >';

const startPos = app.indexOf(startText);
if (startPos !== -1) {
    const endPos = app.indexOf(endText, startPos) + endText.length;

    // Replace the block
    app = app.substring(0, startPos) + '<Sidebar />\n' + app.substring(endPos);

    // Add import
    if (!app.includes('import { Sidebar }')) {
        app = app.replace("import { useAppState } from './context/AppStateContext';", "import { useAppState } from './context/AppStateContext';\nimport { Sidebar } from './components/layout/Sidebar';");
    }

    fs.writeFileSync('docs/App.tsx', app);
    console.log('Sidebar extracted successfully!');
} else {
    console.error('Could not find Sidebar JSX starting with: ' + startText);
}
