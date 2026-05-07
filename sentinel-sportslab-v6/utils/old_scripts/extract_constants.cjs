const fs = require('fs');
let app = fs.readFileSync('docs/App.tsx', 'utf8');

// The exports might not have "export" keyword if they were internal, but we added 'export' earlier.
const borgMatch = app.match(/(export\s+)?const BORG_RPE_SCALE[\s\S]*?\n\};\n/);
const acwrMatch = app.match(/(export\s+)?const ACWR_UTILS[\s\S]*?\n\};\n/);

if (borgMatch && acwrMatch) {
    fs.mkdirSync('docs/utils', { recursive: true });
    fs.writeFileSync('docs/utils/constants.ts', `export const BORG_RPE_SCALE = ${borgMatch[0].replace(/^(export\s+)?const BORG_RPE_SCALE\s*=\s*/, '')}\nexport const ACWR_UTILS = ${acwrMatch[0].replace(/^(export\s+)?const ACWR_UTILS\s*=\s*/, '')}`);

    app = app.replace(borgMatch[0], '');
    app = app.replace(acwrMatch[0], '');

    app = app.replace("import { useAppState } from './context/AppStateContext';", "import { useAppState } from './context/AppStateContext';\nimport { BORG_RPE_SCALE, ACWR_UTILS } from './utils/constants';");

    fs.writeFileSync('docs/App.tsx', app);

    let ctx = fs.readFileSync('docs/context/AppStateContext.tsx', 'utf8');
    ctx = ctx.replace("import { ACWR_UTILS, BORG_RPE_SCALE } from '../App';", "import { ACWR_UTILS, BORG_RPE_SCALE } from '../utils/constants';");
    fs.writeFileSync('docs/context/AppStateContext.tsx', ctx);

    console.log("Successfully extracted constants and fixed circular dependency!");
} else {
    console.log("Failed to match constants in App.tsx");
}
