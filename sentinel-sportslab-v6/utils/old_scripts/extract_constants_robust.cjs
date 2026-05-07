const fs = require('fs');
let app = fs.readFileSync('docs/App.tsx', 'utf8');

// The objects are defined at the root level, so they end with "};" at the start of a line or preceeded by simple spaces.
const borgMatch = app.match(/const BORG_RPE_SCALE = \{[\s\S]*?\n\};\n/);
const acwrMatch = app.match(/const ACWR_UTILS = \{[\s\S]*?\n\};\n/);

if (borgMatch && acwrMatch) {
    fs.mkdirSync('docs/utils', { recursive: true });
    const constantsContent = `export ${borgMatch[0]}\nexport ${acwrMatch[0]}`;
    fs.writeFileSync('docs/utils/constants.ts', constantsContent);

    app = app.replace(borgMatch[0], '');
    app = app.replace(acwrMatch[0], '');

    // Check if we already added the import
    if (!app.includes("import { BORG_RPE_SCALE, ACWR_UTILS } from './utils/constants';")) {
        app = app.replace("import { useAppState } from './context/AppStateContext';", "import { useAppState } from './context/AppStateContext';\nimport { BORG_RPE_SCALE, ACWR_UTILS } from './utils/constants';");
    }

    fs.writeFileSync('docs/App.tsx', app);

    let ctx = fs.readFileSync('docs/context/AppStateContext.tsx', 'utf8');
    ctx = ctx.replace("import { ACWR_UTILS, BORG_RPE_SCALE } from '../App';", "import { ACWR_UTILS, BORG_RPE_SCALE } from '../utils/constants';");
    fs.writeFileSync('docs/context/AppStateContext.tsx', ctx);

    console.log("Successfully extracted constants and fixed circular dependency!");
} else {
    console.error("Match failed:");
    console.error("borgMatch:", !!borgMatch);
    console.error("acwrMatch:", !!acwrMatch);
}
