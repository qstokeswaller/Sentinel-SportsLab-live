const fs = require('fs');

const appContext = fs.readFileSync('docs/context/AppStateContext.tsx', 'utf8');
const match = appContext.match(/const contextValue = \{([\s\S]*?)\};/);
if (!match) throw new Error("Could not find contextValue");
const vars = match[1].trim();

const destructureBlock = `    const { 
        ${vars}
    } = useAppState();`;

let appContent = fs.readFileSync('docs/App.tsx', 'utf8');
let lines = appContent.split(/\r?\n/);

// Find "function App() {"
let appStartIdx = lines.findIndex(l => l.includes('function App() {'));
if (appStartIdx === -1) throw new Error("Could not find function App()");

// Find "// ==========================================" after App function
let renderStartIdx = lines.findIndex((l, idx) => idx > appStartIdx && l.includes('RENDER FUNCTIONS (UI Sections)'));
if (renderStartIdx === -1) throw new Error("Could not find RENDER FUNCTIONS separator");

// Actually, let's step back a couple lines to catch the start of the comment block
let endSliceIdx = renderStartIdx - 1;
// we want to ensure we don't delete the comment block itself.

// Splice lines: array.splice(start, deleteCount, items...)
const deleteCount = endSliceIdx - (appStartIdx + 1);
lines.splice(appStartIdx + 1, deleteCount, destructureBlock);

let finalContent = lines.join('\n');

// Ensure import is added
if (!finalContent.includes('useAppState')) {
    finalContent = finalContent.replace(
        "import React, { useState, useMemo, useEffect, useCallback } from 'react';",
        "import React, { useState, useMemo, useEffect, useCallback } from 'react';\nimport { useAppState } from './context/AppStateContext';"
    );
}

fs.writeFileSync('docs/App.tsx', finalContent);
console.log('Successfully updated App.tsx via line slicing!');
