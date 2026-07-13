// GPS Chart Builder — export layer (PNG / CSV / PDF), dependency-free.
// recharts renders plain SVG, so we rasterise it ourselves onto a canvas
// (drawing the chart title on top) rather than pulling in html2canvas/jspdf.

import type { GpsChartConfig, GpsRow } from './types';
import { buildChartData, type ChartData } from './compute';

function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slug(s: string) { return (s || 'chart').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'chart'; }

/** Rasterise a chart card's <svg> to a PNG canvas, with the title drawn on top. */
async function renderCanvas(container: HTMLElement, title: string, scale = 2, bg = '#ffffff'): Promise<HTMLCanvasElement> {
    const svg = container.querySelector('svg');
    if (!svg) throw new Error('No chart to export yet.');
    const rect = svg.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const titleH = title ? 34 : 8;

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(w));
    clone.setAttribute('height', String(h));
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const data = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round((h + titleH) * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h + titleH);
    if (title) {
        ctx.fillStyle = '#0f172a';
        ctx.font = '600 15px -apple-system, "Segoe UI", sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(title, 4, 8);
    }
    ctx.drawImage(img, 0, titleH);
    URL.revokeObjectURL(url);
    return canvas;
}

/** Download the current chart as a PNG image. */
export async function downloadChartPng(container: HTMLElement, title: string) {
    const canvas = await renderCanvas(container, title);
    await new Promise<void>((resolve) => canvas.toBlob(b => { if (b) triggerDownload(b, `${slug(title)}.png`); resolve(); }, 'image/png'));
}

/** Open a print-ready view of the chart so the browser's "Save as PDF" can capture it. */
export async function exportChartPdf(container: HTMLElement, title: string) {
    const canvas = await renderCanvas(container, title, 2, '#ffffff');
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) throw new Error('Popup blocked — allow popups to export PDF, or use PNG.');
    win.document.write(`<!doctype html><html><head><title>${title || 'GPS chart'}</title>
        <style>@page{margin:12mm}body{margin:0;font-family:-apple-system,'Segoe UI',sans-serif}img{max-width:100%;height:auto}
        @media print{button{display:none}}</style></head>
        <body><img src="${dataUrl}" alt="${title}"/>
        <script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script>
        </body></html>`);
    win.document.close();
}

function csvCell(v: any): string {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV of the numbers behind the chart and download it. */
export function downloadChartCsv(
    config: GpsChartConfig, rows: GpsRow[], teams: any[], colLabel: (k: string) => string,
    isExcluded: ((a: string, d: string) => boolean) | undefined,
) {
    const data: ChartData = buildChartData(config, rows, teams, colLabel, config.excludeInjured ? isExcluded : undefined);
    const table: any[][] = [];

    if (config.chartType === 'scatter') {
        const [xL, yL] = data.metricLabel.split(' vs ');
        table.push(['Athlete', xL || 'X', yL || 'Y']);
        for (const p of data.points) table.push([p.fullName || p.label, p.x, p.y]);
    } else if (data.series.length > 1) {
        table.push(['Name', ...data.series.map(s => s.label)]);
        for (const p of data.points) table.push([p.fullName || p.label, ...data.series.map(s => p[s.key])]);
    } else {
        table.push([config.dimension === 'date' ? 'Date' : 'Athlete', data.metricLabel + (data.unit ? ` (${data.unit})` : '')]);
        for (const p of data.points) table.push([p.fullName || p.label, p.value]);
    }

    const csv = table.map(r => r.map(csvCell).join(',')).join('\n');
    triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${slug(config.title)}.csv`);
}
