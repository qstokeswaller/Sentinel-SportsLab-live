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

// We need to get the destructure vars from AppStateContext
const appContext = fs.readFileSync('docs/context/AppStateContext.tsx', 'utf8');
const match = appContext.match(/const contextValue = \{([\s\S]*?)\};/);
if (!match) throw new Error("Could not find contextValue");
const destructureVars = match[1].trim();

let newAppStatements = [];
let topLevelNodes = [];
let appFuncDecl = null;

function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name && node.name.text === 'App') {
        appFuncDecl = node;
        const body = node.body;
        for (const stmt of body.statements) {
            if (ts.isVariableStatement(stmt)) {
                let keep = false;
                stmt.declarationList.declarations.forEach(decl => {
                    if (decl.name && decl.name.text && decl.name.text.startsWith('render')) {
                        keep = true;
                    }
                });
                if (keep) {
                    newAppStatements.push(stmt);
                }
            } else if (ts.isReturnStatement(stmt)) {
                newAppStatements.push(stmt);
            }
        }
    } else if (node.parent === sourceFile) {
        topLevelNodes.push(node);
    }

    if (!appFuncDecl || node.parent === sourceFile) {
        ts.forEachChild(node, visit);
    }
}
visit(sourceFile);

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

// Generate the new App body
let bodyStr = `    const { 
        ${destructureVars}
    } = useAppState();\n\n`;

for (const stmt of newAppStatements) {
    bodyStr += '    ' + printer.printNode(ts.EmitHint.Unspecified, stmt, sourceFile).replace(/\n/g, '\n    ') + '\n\n';
}

const newAppStr = `function App() {
${bodyStr}
}`;

// Reconstruct the file: everything before App(), the new App(), and export default App;
const appStartIdx = content.indexOf('function App()');

// Try finding where App function ends exactly by counting braces or just using the string substitution
// A safe way is to just grab the AST node position
const appStartPos = appFuncDecl.getStart(sourceFile);
const appEndPos = appFuncDecl.getEnd();

let prefix = content.substring(0, appStartPos);
let suffix = content.substring(appEndPos);

// Ensure import is added
if (!prefix.includes('useAppState')) {
    prefix = prefix.replace(
        "import React, { useState, useMemo, useEffect, useCallback } from 'react';",
        "import React, { useState, useMemo, useEffect, useCallback } from 'react';\nimport { useAppState } from './context/AppStateContext';"
    );
}

const finalFile = prefix + newAppStr + suffix;
fs.writeFileSync('docs/App.tsx', finalFile);
console.log('App.tsx successfully gutted via AST!');
