const fs = require('fs');
let code = fs.readFileSync('docs/App.tsx', 'utf8');

// 1. Remove renderTimeline function
const startMatch = code.match(/const renderTimeline = \(\) => \{/);
if (startMatch) {
    const startIdx = startMatch.index;
    let braceCount = 1;
    let i = startIdx + startMatch[0].length;
    while (braceCount > 0 && i < code.length) {
        if (code[i] === '{') braceCount++;
        else if (code[i] === '}') braceCount--;
        i++;
    }
    // Consume trailing semicolon and whitespace
    while (i < code.length && (code[i] === ';' || code[i] === '\n' || code[i] === '\r' || code[i] === ' ')) {
        i++;
    }
    code = code.slice(0, startIdx) + code.slice(i);
    console.log('Removed renderTimeline');
}

// 2. Replace Periodization JSX call
// The pattern found in tab_renders.txt was Tab "periodization" => (
// In the actual code it looks like {activeTab === 'periodization' && ( ... )}
const periodRegex = /\{activeTab === 'periodization' && \([\s\S]*?\)\}/;
if (code.match(periodRegex)) {
    code = code.replace(periodRegex, "{activeTab === 'periodization' && <PeriodizationPage />}");
    console.log('Replaced Periodization JSX with <PeriodizationPage />');
} else {
    // Try without parentheses if needed
    const periodRegex2 = /\{activeTab === 'periodization' && [\s\S]*?(?=\s+\{activeTab ===|$)\}/;
    // This is riskier, let's look for the closer
    console.log('Standard Periodization regex failed, checking for manual replacement');
    // Manual search for the block
    const searchStr = "activeTab === 'periodization' && (";
    const startPos = code.indexOf(searchStr);
    if (startPos !== -1) {
        let openBraces = 0;
        let pPos = startPos + searchStr.length - 1; // pointing at '('
        let i = pPos;
        let braceCount = 0;
        let parenCount = 1;
        i++;
        while (i < code.length && parenCount > 0) {
            if (code[i] === '(') parenCount++;
            else if (code[i] === ')') parenCount--;
            i++;
        }
        // Found the closing paren of the JSX block
        // Now find the closing brace of the { ... }
        while (i < code.length && code[i] !== '}') {
            i++;
        }
        if (i < code.length) {
            i++; // consume '}'
            const fullBlockStart = code.lastIndexOf('{', startPos);
            code = code.slice(0, fullBlockStart) + "{activeTab === 'periodization' && <PeriodizationPage />}" + code.slice(i);
            console.log('Manually replaced Periodization block');
        }
    }
}

// 3. Add import
if (!code.includes('import { PeriodizationPage }')) {
    code = code.replace(
        "import { RosterPage } from './pages/RosterPage';",
        "import { RosterPage } from './pages/RosterPage';\nimport { PeriodizationPage } from './pages/PeriodizationPage';"
    );
    console.log('Added PeriodizationPage import');
}

fs.writeFileSync('docs/App.tsx', code);
