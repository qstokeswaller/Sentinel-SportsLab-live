const fs = require('fs');

// Configuration for each extraction
const extractions = [
    { funcName: 'renderExerciseLibrary', componentName: 'ExerciseLibraryPage', tab: 'library' },
    { funcName: 'renderAnalyticsHub', componentName: 'AnalyticsHubPage', tab: 'analytics' },
    { funcName: 'renderReportingHub', componentName: 'ReportingHubPage', tab: 'reports' },
    { funcName: 'renderConditioningHub', componentName: 'ConditioningHubPage', tab: 'conditioning' },
    { funcName: 'renderRoster', componentName: 'RosterPage', tab: 'clients' },
];

const commonImports = `// @ts-nocheck
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useAppState } from '../context/AppStateContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, Cell, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, Radar, Legend, ComposedChart
} from 'recharts';
import {
    UsersIcon, TrendingUpIcon, ActivityIcon, AlertTriangleIcon, SearchIcon, AlertCircleIcon,
    CalendarIcon, HeartPulseIcon, DumbbellIcon, FlameIcon, BatteryIcon, ShieldAlertIcon,
    TargetIcon, ZapIcon, InfoIcon, AwardIcon, BrainIcon, MicroscopeIcon,
    StethoscopeIcon, TestTubeIcon, DnaIcon, HeartIcon, PlusIcon, MapPinIcon, UploadIcon,
    PrinterIcon, DownloadIcon, SaveIcon, XIcon, CheckIcon, ChevronRightIcon, PlayIcon,
    FastForwardIcon, FileTextIcon, MoreVerticalIcon, HashIcon, PhoneIcon, MailIcon, StarIcon,
    FilterIcon, RefreshCcwIcon, Share2Icon, UploadCloudIcon, ExternalLinkIcon, ListIcon,
    BookOpenIcon, ClockIcon, PenToolIcon, TrashIcon, ChevronDownIcon, PlayCircleIcon,
    ShieldIcon, CheckCircleIcon, LayoutDashboardIcon, BarChart3Icon, FileIcon, FlaskConicalIcon,
    PanelLeftIcon, PanelLeftCloseIcon, ChevronUpIcon, EyeIcon, EyeOffIcon, CopyIcon,
    GridIcon, TableIcon, ArrowUpIcon, ArrowDownIcon, MinusIcon, MaximizeIcon, AlertOctagonIcon,
    EditIcon, Edit2Icon, Edit3Icon, UserPlusIcon, UserMinusIcon, UserCheckIcon, SettingsIcon,
    LayersIcon, FolderIcon, TagIcon, LinkIcon, GripVerticalIcon, MoveIcon, RotateCcwIcon,
    Trash2Icon, PlusCircleIcon, MinusCircleIcon, ArrowLeftIcon, ArrowRightIcon, MenuIcon,
    SlidersIcon, DatabaseIcon, WifiIcon, WifiOffIcon, CloudIcon, CloudOffIcon, BellIcon,
    LogOutIcon, LogInIcon, KeyIcon, LockIcon, UnlockIcon, ImageIcon, VideoIcon, MicIcon,
    Volume2Icon, VolumeXIcon, GlobeIcon, MapIcon, NavigationIcon, CompassIcon, CameraIcon
} from 'lucide-react';
import { ACWR_UTILS, BORG_RPE_SCALE } from '../utils/constants';
`;

function sliceFunction(code, funcName) {
    const regex = new RegExp(`const ${funcName} = \\(\\) => \\{`);
    const match = code.match(regex);
    if (!match) {
        console.error(`Could not find ${funcName}`);
        return null;
    }

    const startIdx = match.index;
    let braceCount = 1;
    let endIdx = startIdx + match[0].length;

    while (braceCount > 0 && endIdx < code.length) {
        if (code[endIdx] === '{') braceCount++;
        else if (code[endIdx] === '}') braceCount--;
        endIdx++;
    }

    // Also consume any trailing semicolon and whitespace
    while (endIdx < code.length && (code[endIdx] === ';' || code[endIdx] === '\n' || code[endIdx] === '\r' || code[endIdx] === ' ')) {
        endIdx++;
    }

    return { startIdx, endIdx, code: code.slice(startIdx, endIdx) };
}

let appCode = fs.readFileSync('docs/App.tsx', 'utf8');
const importLines = [];

for (const ext of extractions) {
    console.log(`\nExtracting ${ext.funcName} -> ${ext.componentName}...`);

    const result = sliceFunction(appCode, ext.funcName);
    if (!result) {
        console.error(`  SKIPPED: ${ext.funcName} not found`);
        continue;
    }

    console.log(`  Found at ${result.startIdx}-${result.endIdx} (${result.endIdx - result.startIdx} chars)`);

    // Create page file
    const pageContent = commonImports + '\nexport ' + result.code.replace(
        `const ${ext.funcName} = () =>`,
        `const ${ext.componentName} = () =>`
    );

    fs.writeFileSync(`docs/pages/${ext.componentName}.tsx`, pageContent);
    console.log(`  Written docs/pages/${ext.componentName}.tsx`);

    // Remove function from App.tsx
    appCode = appCode.slice(0, result.startIdx) + appCode.slice(result.endIdx);

    // Replace render call with component
    const callRegex = new RegExp(`${ext.funcName}\\(\\)`, 'g');
    appCode = appCode.replace(callRegex, `<${ext.componentName} />`);

    importLines.push(`import { ${ext.componentName} } from './pages/${ext.componentName}';`);

    console.log(`  Replaced ${ext.funcName}() calls with <${ext.componentName} />`);
}

// Add all imports after the DashboardPage import
const importBlock = importLines.join('\n');
appCode = appCode.replace(
    "import { DashboardPage } from './pages/DashboardPage';",
    "import { DashboardPage } from './pages/DashboardPage';\n" + importBlock
);

fs.writeFileSync('docs/App.tsx', appCode);
console.log('\n=== All extractions complete! ===');
console.log('App.tsx length:', appCode.length);
