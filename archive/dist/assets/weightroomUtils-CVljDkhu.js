import{a_ as l}from"./index-drsj_SSw.js";const f=n=>Math.round(n/2.5)*2.5,b=n=>{const t={};return(n||[]).forEach(e=>{t[e.athleteId]||(t[e.athleteId]={});const a=t[e.athleteId][e.exercise];(!a||e.date>a.date)&&(t[e.athleteId][e.exercise]={weight:e.weight,date:e.date})}),t},p=(n,t,e)=>{var o;if(!n.exerciseId)return"";const a=(o=e[t])==null?void 0:o[n.exerciseId];return a?`${f(a.weight*(n.percentage/100))}`:"—"},g=(n,t,e,a)=>{const s=n.columns.map(r=>`${r.label} (${r.percentage}%)`),o=t.map(r=>({name:r.name,cells:n.columns.map(c=>p(c,r.id,e))})),i="padding:8px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;background:#1e293b;color:white;border:1px solid #334155;",d="padding:8px 12px;font-size:12px;border:1px solid #e2e8f0;",h="padding:8px 12px;font-size:12px;font-weight:600;border:1px solid #e2e8f0;text-transform:uppercase;",m=`<tr><th style="${i}">Name</th>${s.map(r=>`<th style="${i}">${r}</th>`).join("")}</tr>`,x=o.map(r=>`<tr><td style="${h}">${r.name}</td>${r.cells.map(c=>`<td style="${d}">${c}</td>`).join("")}</tr>`).join("");return`<!DOCTYPE html><html><head><title>Weightroom Sheet</title>
<style>
@page { size: ${n.orientation}; margin: 15mm; }
body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
h1 { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin: 0 0 4px; }
.divider { border: none; border-top: 2px solid #1e293b; margin: 8px auto 20px; width: 60%; }
table { width: 100%; border-collapse: collapse; }
@media print { button { display: none; } }
</style></head><body>
<h1>${a||"Weight Training - Record Sheet"}</h1>
<hr class="divider" />
<table>${m}${x}</table>
</body></html>`},w=(n,t,e,a)=>{const s=g(n,t,e,a),o=window.open("","_blank");o&&(o.document.write(s),o.document.close(),o.print())},y=(n,t,e)=>{const a={};for(const s of n.columns){if(!s.exerciseId)continue;const o={};for(const i of t){const d=p(s,i.id,e);d&&d!=="—"&&(o[i.id]=d)}Object.keys(o).length>0&&(a[s.exerciseId]=o)}return a},$=n=>{const t=[],e=new Set;for(const a of n){const s=a.exerciseName;if(!(!s||e.has(s))){if(l.includes(s)){e.add(s),t.push({id:"c"+Date.now()+t.length,label:s,exerciseId:s,percentage:100});continue}for(const o of l)if(!e.has(o)&&s.toLowerCase().includes(o.toLowerCase())){e.add(o),t.push({id:"c"+Date.now()+t.length,label:o,exerciseId:o,percentage:100});break}}}return t};export{b,y as c,p as g,$ as m,w as p};
