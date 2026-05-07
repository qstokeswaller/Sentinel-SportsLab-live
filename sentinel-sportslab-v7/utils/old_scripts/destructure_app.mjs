import fs from 'fs';

const appContext = fs.readFileSync('docs/context/AppStateContext.tsx', 'utf8');
const match = appContext.match(/const contextValue = \{([\s\S]*?)\};/);
const vars = match[1].trim();

let appContent = fs.readFileSync('docs/App.tsx', 'utf8');
const appStart = appContent.indexOf('function App() {');
const returnStart = appContent.indexOf('    return (', appStart);

const destructureBlock = `function App() {
    const { 
        ${vars}
    } = useAppState();

`;

appContent = appContent.substring(0, appStart) + destructureBlock + appContent.substring(returnStart);

// Add import if missing
if (!appContent.includes('useAppState')) {
    appContent = appContent.replace(
        "import React, { useState, useMemo, useEffect, useCallback } from 'react';",
        "import React, { useState, useMemo, useEffect, useCallback } from 'react';\nimport { useAppState } from './context/AppStateContext';"
    );
}

fs.writeFileSync('docs/App.tsx', appContent);
console.log('Successfully updated App.tsx variables!');
