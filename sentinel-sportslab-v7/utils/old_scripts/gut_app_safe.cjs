const fs = require('fs');
const ts = require('typescript');

const srcFile = 'docs/App.tsx';
const content = fs.readFileSync(srcFile, 'utf8');

const sourceFile = ts.createSourceFile(
    srcFile,
    content,
    ts.ScriptTarget.Latest,
    true
);

// We need the destructure vars from AppStateContext
const appContext = fs.readFileSync('docs/context/AppStateContext.tsx', 'utf8');
const match = appContext.match(/const contextValue = \{([\s\S]*?)\};/);
if (!match) throw new Error("Could not find contextValue");
const destructureVars = match[1].trim();

const destructureBlock = `    const { 
        ${destructureVars}
    } = useAppState();\n\n`;

let rangesToRemove = [];
let appFuncDecl = null;

function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name && node.name.text === 'App') {
        appFuncDecl = node;
        const body = node.body;

        for (const stmt of body.statements) {
            let keep = false;

            // Keep if it is a 'return' statement
            if (ts.isReturnStatement(stmt)) {
                keep = true;
            }
            // Keep if it is a VariableStatement declaring 'render...'
            else if (ts.isVariableStatement(stmt)) {
                stmt.declarationList.declarations.forEach(decl => {
                    if (decl.name && decl.name.text && decl.name.text.startsWith('render')) {
                        keep = true;
                    }
                });
            }

            // Also explicitly keep if it's the actual insertion point, though we'll prepend it via string replacement of function App
            if (!keep) {
                // We want to delete this statement
                // Include leading comments or spaces if possible by using getFullStart()
                rangesToRemove.push({ start: stmt.getFullStart(), end: stmt.getEnd() });
            }
        }
    }

    if (!appFuncDecl) {
        ts.forEachChild(node, visit);
    }
}
visit(sourceFile);

// Sort ranges by start descending to avoid mutating string indices
rangesToRemove.sort((a, b) => b.start - a.start);

let finalContent = content;

// Apply removals
for (const range of rangesToRemove) {
    finalContent = finalContent.substring(0, range.start) + finalContent.substring(range.end);
}

// Insert the destructure block right after "function App() {"
const appStartIdx = finalContent.indexOf('function App() {');
if (appStartIdx !== -1) {
    const insertPos = appStartIdx + 'function App() {'.length;
    finalContent = finalContent.substring(0, insertPos) + '\n' + destructureBlock + finalContent.substring(insertPos);
}

// Add import if missing
if (!finalContent.includes('useAppState')) {
    finalContent = finalContent.replace(
        "import React, { useState, useMemo, useEffect, useCallback } from 'react';",
        "import React, { useState, useMemo, useEffect, useCallback } from 'react';\nimport { useAppState } from './context/AppStateContext';"
    );
}

fs.writeFileSync('docs/App.tsx', finalContent);
console.log('App.tsx successfully gutted using safe byte-range removal!');
