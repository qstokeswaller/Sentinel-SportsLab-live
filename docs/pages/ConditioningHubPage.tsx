// @ts-nocheck
import React from 'react';
import { useAppState } from '../context/AppStateContext';
import {
    ActivityIcon, ZapIcon, PlusIcon, Trash2Icon, SaveIcon, PrinterIcon,
    ClockIcon, FileEditIcon, Calculator as CalculatorIcon
} from 'lucide-react';
import { SupabaseStorageService as StorageService } from '../services/storageService';

const ICON_MAP = {
    'Activity': ActivityIcon,
    'Zap': ZapIcon,
    'Calculator': CalculatorIcon,
    'Clock': ClockIcon,
    'FileEdit': FileEditIcon,
    'Plus': PlusIcon,
    'Trash2': Trash2Icon,
    'Save': SaveIcon,
    'Printer': PrinterIcon
};

export const ConditioningHubPage = () => {
    const {
        activeConditioningModule, setActiveConditioningModule,
        wattbikeView, setWattbikeView,
        selectedWattbikeSession, setSelectedWattbikeSession,
        newWattbikeSession, setNewWattbikeSession,
        wattbikeSessions, setWattbikeSessions,
        showToast,
        setIsWattbikeMapCalculatorOpen,
    } = useAppState();

    // Icons used in handleSaveSession
    const GaugeIcon = () => null; // placeholder if not in lucide version

    const renderWattbikeSessionCreator = () => {
        const addSection = () => { setNewWattbikeSession(prev => ({ ...prev, sections: [...prev.sections, { id: 's' + Date.now(), name: '', duration: '', target: '', rpm: '', resistance: '', type: 'Power', rounds: '', subSections: [] }] })); };
        const addSubSection = (sectionId) => { setNewWattbikeSession(prev => ({ ...prev, sections: prev.sections.map(s => s.id === sectionId ? { ...s, subSections: [...(s.subSections || []), { id: 'ss' + Date.now(), label: 'Work', duration: '', rpm: '', resistance: '' }] } : s) })); };
        const removeSubSection = (sectionId, subId) => { setNewWattbikeSession(prev => ({ ...prev, sections: prev.sections.map(s => s.id === sectionId ? { ...s, subSections: s.subSections.filter(ss => ss.id !== subId) } : s) })); };
        const updateSubSection = (sectionId, subId, field, value) => { setNewWattbikeSession(prev => ({ ...prev, sections: prev.sections.map(s => s.id === sectionId ? { ...s, subSections: s.subSections.map(ss => ss.id === subId ? { ...ss, [field]: value } : ss) } : s) })); };
        const removeSection = (id) => { setNewWattbikeSession(prev => ({ ...prev, sections: prev.sections.filter(s => s.id !== id) })); };
        const updateSection = (id, field, value) => { setNewWattbikeSession(prev => ({ ...prev, sections: prev.sections.map(s => s.id === id ? { ...s, [field]: value } : s) })); };
        const handleSaveSession = () => {
            if (!newWattbikeSession.title) { showToast("Please enter a session title."); return; }
            let updatedSessions;
            const isEdit = !!newWattbikeSession.id;
            if (isEdit) {
                updatedSessions = wattbikeSessions.map(s => s.id === newWattbikeSession.id ? { ...newWattbikeSession, icon: newWattbikeSession.type === 'Power' ? 'Zap' : 'Activity' } : s);
            } else {
                updatedSessions = [{ ...newWattbikeSession, id: 'ws_' + Date.now(), icon: newWattbikeSession.type === 'Power' ? 'Zap' : 'Activity' }, ...wattbikeSessions];
            }
            setWattbikeSessions(updatedSessions);
            if (StorageService && StorageService.saveWattbikeSessions) StorageService.saveWattbikeSessions(updatedSessions);
            setWattbikeView('grid');
            setNewWattbikeSession({ title: '', duration: '', type: 'Conditioning', sections: [] });
            showToast(isEdit ? "Session Updated Successfully!" : "Session Created Successfully!");
        };
        return (
            <div className="max-w-6xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
                <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl p-12 space-y-10">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">{newWattbikeSession.id ? 'Edit Session' : 'Create New Session'}</h3>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Configure performance protocol parameters</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => { setWattbikeView('grid'); setNewWattbikeSession({ title: '', duration: '', type: 'Conditioning', sections: [] }); }} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                            <button onClick={handleSaveSession} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-xl shadow-slate-900/10"><SaveIcon size={14} /> {newWattbikeSession.id ? 'Update Session' : 'Save Session'}</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-8 bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100">
                        <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Session Name</label><input type="text" value={newWattbikeSession.title} onChange={(e) => setNewWattbikeSession(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. MULTI-SYSTEM TOP UP" className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none ring-offset-2 focus:ring-2 focus:ring-indigo-500/20 transition-all" /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Total Duration</label><input type="text" value={newWattbikeSession.duration} onChange={(e) => setNewWattbikeSession(prev => ({ ...prev, duration: e.target.value }))} placeholder="e.g. 40 MIN" className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none ring-offset-2 focus:ring-2 focus:ring-indigo-500/20 transition-all" /></div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-4"><h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Session Sections</h4><button onClick={addSection} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-900 transition-all"><PlusIcon size={14} /> Add Section</button></div>
                        <div className="space-y-3">
                            {newWattbikeSession.sections.map((section, idx) => (
                                <div key={section.id} className="bg-slate-50/30 p-6 rounded-[2.5rem] border border-slate-100 animate-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-12 gap-5 items-end">
                                        <div className="col-span-2 space-y-1.5"><label className="text-[8px] font-black uppercase text-slate-400 px-1">Type</label><select value={section.type} onChange={(e) => updateSection(section.id, 'type', e.target.value)} className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase outline-none"><option value="Power">Power</option><option value="Rest">Rest</option><option value="Max">Max Effort</option><option value="Interval">Interval</option></select></div>
                                        <div className={`${section.type === 'Interval' ? 'col-span-5' : 'col-span-3'} space-y-1.5`}><label className="text-[8px] font-black uppercase text-slate-400 px-1">Label</label><input type="text" value={section.name} onChange={(e) => updateSection(section.id, 'name', e.target.value)} placeholder="e.g. Warm up" className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2.5 text-[10px] font-bold outline-none" /></div>
                                        <div className="col-span-2 space-y-1.5"><label className="text-[8px] font-black uppercase text-slate-400 px-1">Block Duration</label><input type="text" value={section.duration} onChange={(e) => updateSection(section.id, 'duration', e.target.value)} placeholder="5:00" className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2.5 text-[10px] font-bold outline-none" /></div>
                                        <div className="col-span-2 space-y-1.5"><label className="text-[8px] font-black uppercase text-slate-400 px-1">{section.type === 'Interval' ? 'Sets/Rounds' : 'RPM'}</label><input type="text" value={section.type === 'Interval' ? (section.rounds || '') : (section.rpm || '')} onChange={(e) => updateSection(section.id, section.type === 'Interval' ? 'rounds' : 'rpm', e.target.value)} placeholder={section.type === 'Interval' ? "8" : "70-75"} className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2.5 text-[10px] font-bold outline-none" /></div>
                                        {section.type !== 'Interval' && (<div className="col-span-2 space-y-1.5"><label className="text-[8px] font-black uppercase text-slate-400 px-1">Global Res.</label><input type="text" value={section.resistance} onChange={(e) => updateSection(section.id, 'resistance', e.target.value)} placeholder="F2" className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2.5 text-[10px] font-bold outline-none" /></div>)}
                                        <div className="col-span-1 flex justify-center pb-2"><button onClick={() => removeSection(section.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all"><Trash2Icon size={16} /></button></div>
                                    </div>
                                    {section.type === 'Interval' && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                                            <div className="flex items-center justify-between"><h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Interval Sub-sections</h5><button onClick={() => addSubSection(section.id)} className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-900 transition-all"><PlusIcon size={10} /> Add Sub-segment</button></div>
                                            <div className="space-y-2">
                                                {Array.isArray(section.subSections) && section.subSections.map((ss) => (
                                                    <div key={ss.id} className="grid grid-cols-12 gap-3 items-end bg-white/50 p-3 rounded-2xl border border-slate-100/50">
                                                        <div className="col-span-3 space-y-1"><label className="text-[7px] font-black uppercase text-slate-300 px-1">Label</label><input type="text" value={ss.label} onChange={(e) => updateSubSection(section.id, ss.id, 'label', e.target.value)} placeholder="e.g. Work" className="w-full bg-white border border-slate-50 rounded-lg px-2.5 py-1.5 text-[10px] font-bold outline-none" /></div>
                                                        <div className="col-span-3 space-y-1"><label className="text-[7px] font-black uppercase text-slate-300 px-1">Sub-Duration</label><input type="text" value={ss.duration} onChange={(e) => updateSubSection(section.id, ss.id, 'duration', e.target.value)} placeholder="30s" className="w-full bg-white border border-slate-50 rounded-lg px-2.5 py-1.5 text-[10px] font-bold outline-none" /></div>
                                                        <div className="col-span-2 space-y-1"><label className="text-[7px] font-black uppercase text-slate-300 px-1">RPM Target</label><input type="text" value={ss.rpm} onChange={(e) => updateSubSection(section.id, ss.id, 'rpm', e.target.value)} placeholder="90-95" className="w-full bg-white border border-slate-50 rounded-lg px-2.5 py-1.5 text-[10px] font-bold outline-none" /></div>
                                                        <div className="col-span-2 space-y-1"><label className="text-[7px] font-black uppercase text-slate-300 px-1">Resistance</label><input type="text" value={ss.resistance} onChange={(e) => updateSubSection(section.id, ss.id, 'resistance', e.target.value)} placeholder="F8" className="w-full bg-white border border-slate-50 rounded-lg px-2.5 py-1.5 text-[10px] font-bold outline-none" /></div>
                                                        <div className="col-span-2 flex justify-center pb-1"><button onClick={() => removeSubSection(section.id, ss.id)} className="p-2 text-slate-200 hover:text-red-400 transition-all"><Trash2Icon size={12} /></button></div>
                                                    </div>
                                                ))}
                                                {(!section.subSections || section.subSections.length === 0) && (<div className="py-4 border border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-300"><p className="text-[8px] font-black uppercase tracking-widest">No Sub-segments Defined</p></div>)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {newWattbikeSession.sections.length === 0 && (<div onClick={addSection} className="py-12 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-300 cursor-pointer hover:bg-slate-50 transition-all"><div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center"><PlusIcon size={24} /></div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Click to add your first segment</p></div>)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const handlePrintSession = (session) => {
        const sectionColor = (s) => {
            const isRest = s.type === 'Rest' || s.name?.toLowerCase().includes('warm') || s.name?.toLowerCase().includes('recovery') || s.name?.toLowerCase().includes('cool');
            const isInterval = s.type === 'Interval' || s.type === 'Max';
            if (isRest) return { border: '#10b981', bg: '#f0fdf4', text: '#065f46' };
            if (isInterval) return { border: '#f43f5e', bg: '#fff1f2', text: '#9f1239' };
            return { border: '#f59e0b', bg: '#fffbeb', text: '#78350f' };
        };

        const sectionsHtml = (session.sections || []).map((s, idx) => {
            const col = sectionColor(s);
            const subsHtml = (s.subSections && s.subSections.length > 0)
                ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(0,0,0,0.08);margin-left:44px;">
                    ${s.subSections.map(ss => `
                      <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 0;color:${col.text};opacity:0.8;">
                        <span style="min-width:70px">${ss.label || 'WORK'}</span>
                        <span style="min-width:50px">${ss.duration}</span>
                        <span style="min-width:80px">${ss.rpm ? ss.rpm + ' RPM' : ''}</span>
                        <span>${ss.resistance || ''}</span>
                      </div>`).join('')}
                  </div>`
                : '';
            return `
              <div style="margin-bottom:10px;padding:14px 16px;border-radius:10px;border-left:5px solid ${col.border};background:${col.bg};page-break-inside:avoid;">
                <div style="display:flex;align-items:center;gap:14px;">
                  <div style="width:28px;height:28px;border-radius:6px;background:#1e293b;color:white;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;flex-shrink:0;">${idx + 1}</div>
                  <div style="flex:1;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                    <div>
                      <div style="font-size:17px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:${col.text}">${s.duration} &nbsp; ${s.name || (s.type === 'Interval' ? 'INTERVAL BLOCK' : 'SEGMENT')}${s.type === 'Interval' && s.rounds ? ` <span style="font-size:11px;opacity:0.5">(${s.rounds} rounds)</span>` : ''}</div>
                    </div>
                    <div style="display:flex;gap:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${col.text};opacity:0.75;">
                      ${s.rpm ? `<span>${s.rpm} RPM</span>` : ''}
                      ${s.resistance ? `<span>${s.resistance}</span>` : ''}
                      ${s.target && !s.rpm ? `<span>${s.target}</span>` : ''}
                    </div>
                  </div>
                </div>
                ${subsHtml}
              </div>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html><head><title>Wattbike: ${session.title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; margin: 32px 40px; color: #1e293b; background: white; }
  h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 6px; }
  .meta { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9; }
  @media print { @page { margin: 20mm; } }
</style>
</head><body>
<h1>${session.title}</h1>
<div class="meta">Total Duration: ${session.duration} &nbsp;·&nbsp; ${(session.sections || []).length} Sections</div>
${sectionsHtml}
</body></html>`;

        const w = window.open('', '_blank');
        if (w) {
            w.document.write(html);
            w.document.close();
            setTimeout(() => { w.print(); }, 300);
        }
    };

    const renderWattbikeSessionDetail = () => {
        const session = selectedWattbikeSession;
        if (!session) return null;
        return (
            <div className="max-w-6xl mx-auto space-y-3 pb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
                <div className="flex items-end justify-between px-8 py-2">
                    <div className="space-y-0.5">
                        <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">{session.title}</h3>
                        <div className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">TOTAL DURATION: {session.duration}</div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handlePrintSession(session)} className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-sm active:scale-95"><PrinterIcon size={14} /> Print Session</button>
                        <button onClick={() => setWattbikeView('grid')} className="px-5 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Back</button>
                    </div>
                </div>
                <div className="space-y-2">
                    {Array.isArray(session.sections) && session.sections.map((section, idx) => {
                        const isWarmup = section.name?.toLowerCase().includes('warm') || section.name?.toLowerCase().includes('recovery');
                        const isRest = section.type === 'Rest';
                        const isInterval = section.type === 'Interval' || section.type === 'Max';
                        let cardColor = 'bg-amber-50/80 border-amber-100';
                        let markerColor = 'bg-amber-500';
                        let textColor = 'text-amber-900';
                        if (isWarmup || isRest) { cardColor = 'bg-emerald-50/80 border-emerald-100'; markerColor = 'bg-emerald-500'; textColor = 'text-emerald-900'; }
                        else if (isInterval) { cardColor = 'bg-rose-50/80 border-rose-100'; markerColor = 'bg-rose-500'; textColor = 'text-rose-900'; }
                        return (
                            <div key={section.id} className={`${cardColor} border rounded-3xl p-5 shadow-sm print:shadow-none print:border-slate-200 break-inside-avoid print:py-3`}>
                                <div className="flex items-center gap-6">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white shrink-0 ${markerColor}`}>{idx + 1}</div>
                                    <div className="flex-1 flex items-center justify-between">
                                        <div className="flex items-center gap-8">
                                            <span className={`text-lg font-black tracking-tight min-w-[70px] ${textColor}`}>{section.duration}</span>
                                            <h5 className={`text-lg font-black tracking-tight uppercase ${textColor}`}>{section.name || (section.type === 'Interval' ? 'INTERVAL BLOCK' : 'SESSION SEGMENT')}{section.type === 'Interval' && section.rounds && (<span className="ml-2 opacity-50 text-sm">({section.rounds} ROUNDS)</span>)}</h5>
                                        </div>
                                        <div className={`flex items-center gap-10 font-black uppercase text-[12px] tracking-widest ${textColor} opacity-70`}>
                                            {section.rpm && (<div className="flex flex-col items-end"><span className="text-[7px] opacity-50">Target Intensity</span><span>{section.rpm} RPM</span></div>)}
                                            {section.resistance && (<div className="flex flex-col items-end"><span className="text-[7px] opacity-50">Fan Resistance</span><span className="italic">{section.resistance}</span></div>)}
                                        </div>
                                    </div>
                                </div>
                                {section.type === 'Interval' && Array.isArray(section.subSections) && section.subSections.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-rose-200/40 ml-14 space-y-2">
                                        {section.subSections.map((ss, ssIdx) => (
                                            <div key={ss.id} className="flex items-center justify-between text-[11px] font-black text-rose-800/80 uppercase tracking-tight">
                                                <div className="flex items-center gap-4"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /><span className="min-w-[80px] text-rose-600">{ss.label || (ssIdx % 2 === 0 ? 'WORK' : 'REST')}</span><span className="min-w-[60px]">{ss.duration}</span></div>
                                                <div className="flex items-center gap-8 opacity-60"><span>{ss.rpm} RPM</span><span className="italic min-w-[30px] text-right">{ss.resistance}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            {/* Header Section - Only show top level when no module is active */}
            {!activeConditioningModule && (
                <div className="bg-white p-10 rounded-[3rem] border border-indigo-100 shadow-sm relative overflow-hidden border-t-8 border-t-indigo-900 mb-12">
                    <div className="flex justify-between items-end relative z-10">
                        <div className="space-y-4">
                            <h2 className="text-4xl font-extrabold text-indigo-900 uppercase tracking-tighter leading-none">Conditioning Hub</h2>
                            <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">Performance conditioning monitoring & Wattbike protocols.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modules Grid */}
            {!activeConditioningModule && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div onClick={() => setActiveConditioningModule('wattbike')} className="bg-white rounded-[2.5rem] border border-indigo-50 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all overflow-hidden cursor-pointer group p-8 space-y-4 h-fit border-t-4 border-t-transparent hover:border-t-indigo-600">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all"><ActivityIcon size={24} /></div>
                        <h3 className="text-xl font-black text-indigo-900 uppercase tracking-tighter">Wattbike Hub</h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">High-fidelity Wattbike power profiling and protocol management.</p>
                    </div>
                </div>
            )}

            {/* Wattbike Hub Terminal */}
            {activeConditioningModule === 'wattbike' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-5">
                    {/* Unified Hub Header (matching screenshot) */}
                    <div className="flex flex-col md:flex-row items-center justify-between bg-white/60 backdrop-blur-md p-8 rounded-[3rem] border border-white/40 shadow-sm gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-slate-800 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl">
                                <ActivityIcon size={32} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-800 leading-none">Wattbike Session Planner</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 px-1">Plan, Manage & Print Conditioning Sessions</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsWattbikeMapCalculatorOpen(true)}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
                            >
                                <CalculatorIcon size={14} /> MAP Calculator
                            </button>
                            <button
                                onClick={() => {
                                    if (wattbikeView === 'grid') setActiveConditioningModule(null);
                                    else {
                                        setWattbikeView('grid');
                                        setNewWattbikeSession({ title: '', duration: '', type: 'Conditioning', sections: [] });
                                    }
                                }}
                                className="px-6 py-3 bg-slate-100/50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all border border-slate-200/50"
                            >
                                {wattbikeView === 'grid' ? 'Back to Hub' : 'Back to List'}
                            </button>
                        </div>
                    </div>

                    {wattbikeView === 'grid' && (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center px-4">
                                <div>
                                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Session Repository</h4>
                                </div>
                                <button
                                    onClick={() => setWattbikeView('create')}
                                    className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-lg"
                                >
                                    <PlusIcon size={14} /> Add Session
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {wattbikeSessions.map(session => (
                                    <div
                                        key={session.id}
                                        onClick={() => {
                                            setSelectedWattbikeSession(session);
                                            setWattbikeView('view');
                                        }}
                                        className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all overflow-hidden flex flex-col p-8 space-y-6 group cursor-pointer border-t-4 border-t-transparent hover:border-t-indigo-600"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${session.type === 'Power' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'} group-hover:scale-110 transition-transform`}>
                                                {(() => {
                                                    const iconVal = session.icon;
                                                    let IconComponent = ActivityIcon;

                                                    if (typeof iconVal === 'string') {
                                                        IconComponent = ICON_MAP[iconVal] || ActivityIcon;
                                                    } else if (typeof iconVal === 'function' || (iconVal && typeof iconVal === 'object' && iconVal.$$typeof)) {
                                                        // It's a component or a forwardRef
                                                        IconComponent = iconVal;
                                                    } else if (iconVal && typeof iconVal === 'object') {
                                                        console.warn("Invalid icon object found in session:", session.title, iconVal);
                                                        IconComponent = ActivityIcon;
                                                    }

                                                    try {
                                                        return <IconComponent size={26} />;
                                                    } catch (e) {
                                                        console.error("Error rendering icon for session:", session.title, e);
                                                        return <ActivityIcon size={26} />;
                                                    }
                                                })()}
                                            </div>
                                            <div className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black uppercase text-slate-500 tracking-wider">
                                                {session.type}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight">{session.title}</h4>
                                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <span className="flex items-center gap-1"><ClockIcon size={12} /> {session.duration}</span>
                                                <span>•</span>
                                                <span>{Array.isArray(session.sections) ? session.sections.length : (session.sectionsCount || 0)} Sections</span>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-slate-50 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedWattbikeSession(session);
                                                    setWattbikeView('view');
                                                }}
                                                className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg"
                                            >
                                                View Session
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setNewWattbikeSession(session);
                                                    setWattbikeView('create');
                                                }}
                                                className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all font-black uppercase text-[10px]"
                                                title="Edit Session"
                                            >
                                                <FileEditIcon size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Are you sure you want to delete "${session.title}"?`)) {
                                                        setWattbikeSessions(prev => {
                                                            const filtered = prev.filter(s => s.id !== session.id);
                                                            if (StorageService.saveWattbikeSessions) {
                                                                StorageService.saveWattbikeSessions(filtered);
                                                            }
                                                            return filtered;
                                                        });
                                                        showToast("Session Deleted");
                                                    }
                                                }}
                                                className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all font-black uppercase text-[10px]"
                                                title="Delete Session"
                                            >
                                                <Trash2Icon size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {wattbikeView === 'view' && selectedWattbikeSession && renderWattbikeSessionDetail()}
                    {wattbikeView === 'create' && renderWattbikeSessionCreator()}
                </div>
            )}

            {activeConditioningModule === 'running' && (
                <div className="bg-white p-12 rounded-[3.5rem] border border-indigo-50 shadow-xl space-y-8 animate-in slide-in-from-bottom-5">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-indigo-900 rounded-3xl flex items-center justify-center text-white shadow-2xl">
                                <ActivityIcon size={32} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter text-indigo-900">Running Mechanics</h3>
                                <p className="text-sm text-indigo-400 font-bold uppercase tracking-widest mt-1">Gait Analysis & Force-Velocity Profiling</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-center py-20">
                        <p className="text-slate-400 text-lg font-medium italic">Module coming soon...</p>
                    </div>
                </div>
            )}

            {activeConditioningModule === 'metabolic' && (
                <div className="bg-white p-12 rounded-[3.5rem] border border-indigo-50 shadow-xl space-y-8 animate-in slide-in-from-bottom-5">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-indigo-900 rounded-3xl flex items-center justify-center text-white shadow-2xl">
                                <BeakerIcon size={32} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter text-indigo-900">Metabolic Profiles</h3>
                                <p className="text-sm text-indigo-400 font-bold uppercase tracking-widest mt-1">Lactate Threshold & Physiological Monitoring</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-center py-20">
                        <p className="text-slate-400 text-lg font-medium italic">Module coming soon...</p>
                    </div>
                </div>
            )}
        </div>
    );
};


