const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

const code = fs.readFileSync('docs/App.tsx', 'utf8');

const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
});

let dashboardCode = '';

traverse(ast, {
    VariableDeclarator(path) {
        if (path.node.id.name === 'renderDashboard') {
            // Found it! Let's generate the code for the arrow function
            const funcCode = generate(path.node.init).code;

            // Replace `renderDashboard` with `DashboardPage` signature and return statement
            dashboardCode = `// @ts-nocheck
import React, { useMemo } from 'react';
import { useAppState } from '../context/AppStateContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Cell, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ComposedChart } from 'recharts';
import { 
    UsersIcon, TrendingUpIcon, ActivityIcon, AlertTriangleIcon, SearchIcon, AlertCircleIcon, CalendarIcon, HeartPulseIcon, DumbbellIcon, FlameIcon, BatteryIcon, ShieldAlertIcon, ActivitySquareIcon, TargetIcon, ZapIcon, InfoIcon, AwardIcon, BrainIcon, MicroscopeIcon, StethoscopeIcon, ActivityPulseIcon, TestTubeIcon, DnaIcon, HeartIcon
} from 'lucide-react';
import { ACWR_UTILS } from './utils/constants';

export const DashboardPage = ${funcCode};
`;

            // Remove renderDashboard from App.tsx
            path.parentPath.remove();
        }
    }
});

fs.writeFileSync('docs/pages/DashboardPage.tsx', dashboardCode);

// Add the import to App.tsx and replace the call
let newAppCode = generate(ast, { retainLines: true }).code;

if (!newAppCode.includes("import { DashboardPage }")) {
    newAppCode = newAppCode.replace("import { Sidebar } from './components/layout/Sidebar';", "import { Sidebar } from './components/layout/Sidebar';\nimport { DashboardPage } from './pages/DashboardPage';");
}

// Replace `{activeTab === 'dashboard' && renderDashboard()}` with `{activeTab === 'dashboard' && <DashboardPage />}`
newAppCode = newAppCode.replace(/\{activeTab === '?dashboard'? && renderDashboard\(\)\}/g, "{activeTab === 'dashboard' && <DashboardPage />}");

fs.writeFileSync('docs/App.tsx', newAppCode);

console.log("Successfully extracted DashboardPage!");
