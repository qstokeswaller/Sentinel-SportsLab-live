const fs = require('fs');

const code = fs.readFileSync('docs/App.tsx', 'utf8');
const startMatch = code.match(/const renderPeriodization = \(\) => \{/);

if (!startMatch) {
    console.error("Could not find renderPeriodization");
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

console.log('Periodization starts at: ' + startIdx + ' and ends at: ' + endIdx);

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
    StethoscopeIcon, ActivityPulseIcon, TestTubeIcon, DnaIcon, HeartIcon, PlusIcon, MapPinIcon, UploadIcon, PrinterIcon, DownloadIcon, SaveIcon, XIcon, CheckIcon, ChevronRightIcon, PlayIcon, FastForwardIcon, FileTextIcon, MoreVerticalIcon, HashIcon, PhoneIcon, MailIcon, StarIcon, FilterIcon, RefreshCcwIcon, Share2Icon, UploadCloudIcon, ExternalLinkIcon, ListIcon, BookOpenIcon, ClockIcon, PenToolIcon, TrashIcon, ChevronDownIcon, PlayCircleIcon, Target as TargetIconLucide, ShieldIcon, CheckCircleIcon
} from 'lucide-react';
import { ACWR_UTILS, BORG_RPE_SCALE } from '../../utils/constants';

export ` + funcCode.replace('const renderPeriodization = () =>', 'const PeriodizationPage = () =>');

fs.writeFileSync('docs/pages/PeriodizationPage.tsx', dashboardImports);

let newApp = code.slice(0, startIdx) + code.slice(endIdx);

// Add import
if (!newApp.includes('import { PeriodizationPage }')) {
    newApp = newApp.replace(
        "import { DashboardPage } from './pages/DashboardPage';",
        "import { DashboardPage } from './pages/DashboardPage';\nimport { PeriodizationPage } from './pages/PeriodizationPage';"
    );
}

// Replace the render call
newApp = newApp.replace(
    /\{activeTab === '?periodization'? && renderPeriodization\(\)\}/g,
    "{activeTab === 'periodization' && <PeriodizationPage />}"
);

fs.writeFileSync('docs/App.tsx', newApp);

console.log('Periodization extracted manually with slicing');
