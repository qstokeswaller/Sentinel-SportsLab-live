const fs = require('fs');

const code = fs.readFileSync('docs/App.tsx', 'utf8');
const startMatch = code.match(/const renderDashboard = \(\) => \{/);

if (!startMatch) {
    console.error("Could not find renderDashboard");
    process.exit(1);
}

const startIdx = startMatch.index;
let braceCount = 0;
let endIdx = startIdx + startMatch[0].length;
braceCount = 1;

while (braceCount > 0 && endIdx < code.length) {
    if (code[endIdx] === '{') braceCount++;
    else if (code[endIdx] === '}') braceCount--;
    endIdx++;
}

console.log('Dashboard starts at: ' + startIdx + ' and ends at: ' + endIdx);

const funcCode = code.slice(startIdx, endIdx);

const dashboardImports = `// @ts-nocheck
import React, { useMemo } from 'react';
import { useAppState } from '../../context/AppStateContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, Cell, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, Radar, Legend, ComposedChart
} from 'recharts';
import {
    UsersIcon, TrendingUpIcon, ActivityIcon, AlertTriangleIcon, SearchIcon, AlertCircleIcon,
    CalendarIcon, HeartPulseIcon, DumbbellIcon, FlameIcon, BatteryIcon, ShieldAlertIcon,
    ActivitySquareIcon, TargetIcon, ZapIcon, InfoIcon, AwardIcon, BrainIcon, MicroscopeIcon,
    StethoscopeIcon, ActivityPulseIcon, TestTubeIcon, DnaIcon, HeartIcon
} from 'lucide-react';
import { ACWR_UTILS, BORG_RPE_SCALE } from '../../utils/constants';

export ` + funcCode.replace('const renderDashboard = () =>', 'const DashboardPage = () =>');

fs.writeFileSync('docs/pages/DashboardPage.tsx', dashboardImports);

let newApp = code.slice(0, startIdx) + code.slice(endIdx);

// Add import
if (!newApp.includes('import { DashboardPage }')) {
    newApp = newApp.replace(
        "import { Sidebar } from './components/layout/Sidebar';",
        "import { Sidebar } from './components/layout/Sidebar';\nimport { DashboardPage } from './pages/DashboardPage';"
    );
}

// Replace the render call
newApp = newApp.replace(
    /\{activeTab === '?dashboard'? && renderDashboard\(\)\}/g,
    "{activeTab === 'dashboard' && <DashboardPage />}"
);

fs.writeFileSync('docs/App.tsx', newApp);

console.log('Dashboard extracted manually with slicing');
