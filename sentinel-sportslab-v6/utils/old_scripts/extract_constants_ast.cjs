const fs = require('fs');
const ts = require('typescript');

let srcFile = 'docs/App.tsx';
let content = fs.readFileSync(srcFile, 'utf8');

const sourceFile = ts.createSourceFile(
    srcFile,
    content,
    ts.ScriptTarget.Latest,
    true
);

let rangesToRemove = [];
let extractedCode = [];

for (const stmt of sourceFile.statements) {
    if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
            if (decl.name && (decl.name.text === 'BORG_RPE_SCALE' || decl.name.text === 'ACWR_UTILS' || decl.name.text === 'DSI_NORMS' || decl.name.text === 'RSI_NORMS')) {
                // Ensure export modifier
                let text = stmt.getText(sourceFile);
                if (!text.startsWith('export')) {
                    text = 'export ' + text;
                }
                extractedCode.push(text);

                // Include leading comments or spaces if possible
                rangesToRemove.push({ start: stmt.getFullStart(), end: stmt.getEnd() });
            }
        }
    }
}

if (extractedCode.length > 0) {
    fs.mkdirSync('docs/utils', { recursive: true });
    let constantsFile = 'docs/utils/constants.ts';
    let constantsContent = extractedCode.join('\n\n');
    fs.writeFileSync(constantsFile, constantsContent);

    // Sort ranges by start descending to avoid mutating string indices
    rangesToRemove.sort((a, b) => b.start - a.start);
    let finalContent = content;
    for (const range of rangesToRemove) {
        finalContent = finalContent.substring(0, range.start) + finalContent.substring(range.end);
    }

    if (!finalContent.includes("import { BORG_RPE_SCALE, ACWR_UTILS } from './utils/constants';")) {
        finalContent = finalContent.replace("import { useAppState } from './context/AppStateContext';", "import { useAppState } from './context/AppStateContext';\nimport { BORG_RPE_SCALE, ACWR_UTILS, DSI_NORMS, RSI_NORMS } from './utils/constants';");
    }

    fs.writeFileSync(srcFile, finalContent);

    let ctx = fs.readFileSync('docs/context/AppStateContext.tsx', 'utf8');
    ctx = ctx.replace(/import \{.*?\} from '\.\.\/App';/, "import { ACWR_UTILS, BORG_RPE_SCALE, DSI_NORMS, RSI_NORMS } from '../utils/constants';");
    fs.writeFileSync('docs/context/AppStateContext.tsx', ctx);

    console.log("Successfully extracted constants with AST!");
} else {
    console.log("Failed to find constants via AST");
}
