// @ts-nocheck
import React from 'react';
import { useAppState } from '../context/AppStateContext';
import { Button } from '@/components/ui/button';
import {
    ActivityIcon, ZapIcon, PlusIcon, Trash2Icon, SaveIcon, PrinterIcon,
    ClockIcon, FileEditIcon, Calculator as CalculatorIcon, FootprintsIcon, ArrowLeftIcon,
} from 'lucide-react';
import { SupabaseStorageService as StorageService } from '../services/storageService';
import { RunningMechanicsLibrary } from '../components/conditioning/RunningMechanicsLibrary';

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

    const GaugeIcon = () => null;

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
            <div className="max-w-4xl mx-auto pb-10 animate-in fade-in duration-300">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">{newWattbikeSession.id ? 'Edit Session' : 'Create New Session'}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Configure performance protocol parameters</p>
                        </div>
                        <div className="flex gap-2.5">
                            <Button variant="secondary" size="sm" onClick={() => { setWattbikeView('grid'); setNewWattbikeSession({ title: '', duration: '', type: 'Conditioning', sections: [] }); }}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveSession}><SaveIcon size={13} className="mr-1.5" /> {newWattbikeSession.id ? 'Update' : 'Save'}</Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">Session Name</label>
                            <input type="text" value={newWattbikeSession.title} onChange={(e) => setNewWattbikeSession(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Multi-System Top Up" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">Total Duration</label>
                            <input type="text" value={newWattbikeSession.duration} onChange={(e) => setNewWattbikeSession(prev => ({ ...prev, duration: e.target.value }))} placeholder="e.g. 40 min" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Session Sections</h4>
                            <button onClick={addSection} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-all"><PlusIcon size={13} /> Add Section</button>
                        </div>
                        <div className="space-y-2.5">
                            {newWattbikeSession.sections.map((section, idx) => (
                                <div key={section.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-12 gap-3 items-end">
                                        <div className="col-span-2 space-y-1.5">
                                            <label className="text-[10px] font-medium text-slate-400">Type</label>
                                            <select value={section.type} onChange={(e) => updateSection(section.id, 'type', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none">
                                                <option value="Power">Power</option>
                                                <option value="Rest">Rest</option>
                                                <option value="Max">Max Effort</option>
                                                <option value="Interval">Interval</option>
                                            </select>
                                        </div>
                                        <div className={`${section.type === 'Interval' ? 'col-span-5' : 'col-span-3'} space-y-1.5`}>
                                            <label className="text-[10px] font-medium text-slate-400">Label</label>
                                            <input type="text" value={section.name} onChange={(e) => updateSection(section.id, 'name', e.target.value)} placeholder="e.g. Warm up" className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none" />
                                        </div>
                                        <div className="col-span-2 space-y-1.5">
                                            <label className="text-[10px] font-medium text-slate-400">Duration</label>
                                            <input type="text" value={section.duration} onChange={(e) => updateSection(section.id, 'duration', e.target.value)} placeholder="5:00" className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none" />
                                        </div>
                                        <div className="col-span-2 space-y-1.5">
                                            <label className="text-[10px] font-medium text-slate-400">{section.type === 'Interval' ? 'Sets/Rounds' : 'RPM'}</label>
                                            <input type="text" value={section.type === 'Interval' ? (section.rounds || '') : (section.rpm || '')} onChange={(e) => updateSection(section.id, section.type === 'Interval' ? 'rounds' : 'rpm', e.target.value)} placeholder={section.type === 'Interval' ? "8" : "70-75"} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none" />
                                        </div>
                                        {section.type !== 'Interval' && (
                                            <div className="col-span-2 space-y-1.5">
                                                <label className="text-[10px] font-medium text-slate-400">Resistance</label>
                                                <input type="text" value={section.resistance} onChange={(e) => updateSection(section.id, 'resistance', e.target.value)} placeholder="F2" className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none" />
                                            </div>
                                        )}
                                        <div className="col-span-1 flex justify-center pb-1">
                                            <button onClick={() => removeSection(section.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-all"><Trash2Icon size={14} /></button>
                                        </div>
                                    </div>
                                    {section.type === 'Interval' && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h5 className="text-[10px] font-medium text-slate-400">Interval Sub-sections</h5>
                                                <button onClick={() => addSubSection(section.id)} className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 hover:text-indigo-800 transition-all"><PlusIcon size={10} /> Add Sub-segment</button>
                                            </div>
                                            <div className="space-y-1.5">
                                                {Array.isArray(section.subSections) && section.subSections.map((ss) => (
                                                    <div key={ss.id} className="grid grid-cols-12 gap-2 items-end bg-white p-2.5 rounded-lg border border-slate-100">
                                                        <div className="col-span-3 space-y-1"><label className="text-[9px] font-medium text-slate-400">Label</label><input type="text" value={ss.label} onChange={(e) => updateSubSection(section.id, ss.id, 'label', e.target.value)} placeholder="Work" className="w-full bg-slate-50 border border-slate-100 rounded-md px-2 py-1.5 text-xs outline-none" /></div>
                                                        <div className="col-span-3 space-y-1"><label className="text-[9px] font-medium text-slate-400">Duration</label><input type="text" value={ss.duration} onChange={(e) => updateSubSection(section.id, ss.id, 'duration', e.target.value)} placeholder="30s" className="w-full bg-slate-50 border border-slate-100 rounded-md px-2 py-1.5 text-xs outline-none" /></div>
                                                        <div className="col-span-2 space-y-1"><label className="text-[9px] font-medium text-slate-400">RPM</label><input type="text" value={ss.rpm} onChange={(e) => updateSubSection(section.id, ss.id, 'rpm', e.target.value)} placeholder="90-95" className="w-full bg-slate-50 border border-slate-100 rounded-md px-2 py-1.5 text-xs outline-none" /></div>
                                                        <div className="col-span-2 space-y-1"><label className="text-[9px] font-medium text-slate-400">Resistance</label><input type="text" value={ss.resistance} onChange={(e) => updateSubSection(section.id, ss.id, 'resistance', e.target.value)} placeholder="F8" className="w-full bg-slate-50 border border-slate-100 rounded-md px-2 py-1.5 text-xs outline-none" /></div>
                                                        <div className="col-span-2 flex justify-center pb-0.5"><button onClick={() => removeSubSection(section.id, ss.id)} className="p-1.5 text-slate-200 hover:text-red-400 transition-all"><Trash2Icon size={12} /></button></div>
                                                    </div>
                                                ))}
                                                {(!section.subSections || section.subSections.length === 0) && (
                                                    <div className="py-3 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400">No sub-segments defined</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {newWattbikeSession.sections.length === 0 && (
                                <div onClick={addSection} className="py-10 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 cursor-pointer hover:bg-slate-50 transition-all">
                                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center"><PlusIcon size={20} /></div>
                                    <p className="text-xs font-medium">Click to add your first segment</p>
                                </div>
                            )}
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
            <div className="max-w-4xl mx-auto space-y-3 pb-10 animate-in fade-in duration-300">
                <div className="flex items-center justify-between bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">{session.title}</h3>
                        <div className="text-xs text-slate-400 mt-0.5">Total duration: {session.duration}</div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handlePrintSession(session)}><PrinterIcon size={13} className="mr-1.5" /> Print</Button>
                        <Button variant="secondary" size="sm" onClick={() => setWattbikeView('grid')}>Back</Button>
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
                            <div key={section.id} className={`${cardColor} border rounded-xl p-4 shadow-sm print:shadow-none print:border-slate-200 break-inside-avoid`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold text-white shrink-0 ${markerColor}`}>{idx + 1}</div>
                                    <div className="flex-1 flex items-center justify-between">
                                        <div className="flex items-center gap-5">
                                            <span className={`text-base font-semibold min-w-[60px] ${textColor}`}>{section.duration}</span>
                                            <h5 className={`text-base font-semibold ${textColor}`}>{section.name || (section.type === 'Interval' ? 'Interval Block' : 'Session Segment')}{section.type === 'Interval' && section.rounds && (<span className="ml-2 opacity-50 text-sm font-normal">({section.rounds} rounds)</span>)}</h5>
                                        </div>
                                        <div className={`flex items-center gap-6 text-xs font-medium ${textColor} opacity-70`}>
                                            {section.rpm && (<div className="flex flex-col items-end"><span className="text-[9px] opacity-50">Target Intensity</span><span>{section.rpm} RPM</span></div>)}
                                            {section.resistance && (<div className="flex flex-col items-end"><span className="text-[9px] opacity-50">Fan Resistance</span><span>{section.resistance}</span></div>)}
                                        </div>
                                    </div>
                                </div>
                                {section.type === 'Interval' && Array.isArray(section.subSections) && section.subSections.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-rose-200/40 ml-11 space-y-1.5">
                                        {section.subSections.map((ss, ssIdx) => (
                                            <div key={ss.id} className="flex items-center justify-between text-xs text-rose-800/80">
                                                <div className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /><span className="min-w-[70px] font-medium text-rose-600">{ss.label || (ssIdx % 2 === 0 ? 'Work' : 'Rest')}</span><span className="min-w-[50px]">{ss.duration}</span></div>
                                                <div className="flex items-center gap-5 opacity-60"><span>{ss.rpm} RPM</span><span className="min-w-[30px] text-right">{ss.resistance}</span></div>
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
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header — only show when no module active */}
            {!activeConditioningModule && (
                <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-900">Conditioning Hub</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Performance conditioning monitoring & Wattbike protocols.</p>
                </div>
            )}

            {/* Modules Grid */}
            {!activeConditioningModule && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div
                        onClick={() => setActiveConditioningModule('wattbike')}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all overflow-hidden cursor-pointer group p-5 space-y-3"
                    >
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <ActivityIcon size={20} />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">Wattbike Hub</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">High-fidelity Wattbike power profiling and protocol management.</p>
                    </div>
                    <div
                        onClick={() => setActiveConditioningModule('running')}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all overflow-hidden cursor-pointer group p-5 space-y-3"
                    >
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <FootprintsIcon size={20} />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">Running Mechanics</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">Gait analysis reports, sprint mechanics & movement documents.</p>
                    </div>
                </div>
            )}

            {/* Wattbike Hub */}
            {activeConditioningModule === 'wattbike' && (
                <div className="space-y-5 animate-in slide-in-from-bottom-3">
                    {/* Hub Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white shrink-0">
                                <ActivityIcon size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Wattbike Session Planner</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Plan, manage & print conditioning sessions</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Button size="sm" onClick={() => setIsWattbikeMapCalculatorOpen(true)}>
                                <CalculatorIcon size={13} className="mr-1.5" /> MAP Calculator
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => {
                                if (wattbikeView === 'grid') setActiveConditioningModule(null);
                                else { setWattbikeView('grid'); setNewWattbikeSession({ title: '', duration: '', type: 'Conditioning', sections: [] }); }
                            }}>
                                {wattbikeView === 'grid' ? 'Back to Hub' : 'Back to List'}
                            </Button>
                        </div>
                    </div>

                    {wattbikeView === 'grid' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-medium text-slate-500">Session Repository</h4>
                                <Button size="sm" onClick={() => setWattbikeView('create')}>
                                    <PlusIcon size={13} className="mr-1.5" /> Add Session
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {wattbikeSessions.map(session => (
                                    <div
                                        key={session.id}
                                        onClick={() => { setSelectedWattbikeSession(session); setWattbikeView('view'); }}
                                        className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all overflow-hidden flex flex-col p-5 space-y-4 group cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${session.type === 'Power' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'} group-hover:scale-105 transition-transform`}>
                                                {(() => {
                                                    const iconVal = session.icon;
                                                    let IconComponent = ActivityIcon;
                                                    if (typeof iconVal === 'string') {
                                                        IconComponent = ICON_MAP[iconVal] || ActivityIcon;
                                                    } else if (typeof iconVal === 'function' || (iconVal && typeof iconVal === 'object' && iconVal.$$typeof)) {
                                                        IconComponent = iconVal;
                                                    } else if (iconVal && typeof iconVal === 'object') {
                                                        console.warn("Invalid icon object found in session:", session.title, iconVal);
                                                        IconComponent = ActivityIcon;
                                                    }
                                                    try { return <IconComponent size={20} />; }
                                                    catch (e) { console.error("Error rendering icon:", session.title, e); return <ActivityIcon size={20} />; }
                                                })()}
                                            </div>
                                            <span className="px-2 py-0.5 bg-slate-100 rounded-md text-xs font-medium text-slate-500">{session.type}</span>
                                        </div>

                                        <div className="space-y-1">
                                            <h4 className="text-base font-semibold text-slate-900 leading-tight">{session.title}</h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <span className="flex items-center gap-1"><ClockIcon size={11} /> {session.duration}</span>
                                                <span>·</span>
                                                <span>{Array.isArray(session.sections) ? session.sections.length : (session.sectionsCount || 0)} sections</span>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 flex gap-2">
                                            <Button
                                                size="sm"
                                                className="flex-1 text-xs"
                                                onClick={(e) => { e.stopPropagation(); setSelectedWattbikeSession(session); setWattbikeView('view'); }}
                                            >
                                                View Session
                                            </Button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setNewWattbikeSession(session); setWattbikeView('create'); }}
                                                className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                                title="Edit Session"
                                            >
                                                <FileEditIcon size={15} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Are you sure you want to delete "${session.title}"?`)) {
                                                        setWattbikeSessions(prev => {
                                                            const filtered = prev.filter(s => s.id !== session.id);
                                                            if (StorageService.saveWattbikeSessions) StorageService.saveWattbikeSessions(filtered);
                                                            return filtered;
                                                        });
                                                        showToast("Session Deleted");
                                                    }
                                                }}
                                                className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-all"
                                                title="Delete Session"
                                            >
                                                <Trash2Icon size={15} />
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
                <div className="space-y-5 animate-in slide-in-from-bottom-3">
                    <div className="flex items-center justify-between bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setActiveConditioningModule(null)}
                                className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all"
                            >
                                <ArrowLeftIcon size={16} />
                            </button>
                            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white shrink-0">
                                <FootprintsIcon size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Running Mechanics</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Gait analysis reports, sprint mechanics & movement documents</p>
                            </div>
                        </div>
                    </div>
                    <RunningMechanicsLibrary />
                </div>
            )}

            {activeConditioningModule === 'metabolic' && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 animate-in slide-in-from-bottom-3">
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm"><ActivityIcon size={20} /></div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Metabolic Profiles</h3>
                            <p className="text-sm text-slate-400">Lactate Threshold & Physiological Monitoring</p>
                        </div>
                    </div>
                    <div className="text-center py-16"><p className="text-slate-400 text-sm italic">Module coming soon...</p></div>
                </div>
            )}
        </div>
    );
};
