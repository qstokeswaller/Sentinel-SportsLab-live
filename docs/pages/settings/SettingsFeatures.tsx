// @ts-nocheck — moved verbatim from SettingsPage.tsx (monolith restructure,
// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TEST_CATEGORIES, getTestsByCategory } from '../../utils/testRegistry';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { GpsCategoryManager } from '../../components/performance/GpsConfigModal';
import { AthleteAvatar } from '../../components/roster/AthleteAvatar';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { hasFeatureAccess, type Tier } from '../../utils/tierFeatures';
import { CollapsibleSection, labelCls, GPS_META_NAMES } from './shared';
import { ActivityIcon, AlertTriangleIcon, CheckIcon, FlaskConicalIcon, GaugeIcon, LayoutGridIcon, LinkIcon, SaveIcon, TagIcon, ToggleLeftIcon, ToggleRightIcon, UserIcon, UsersIcon } from 'lucide-react';

const TestingHubSettings: React.FC<{
  testVisibility: Record<string, boolean>;
  setTestVisibility: (v: Record<string, boolean>) => void;
}> = ({ testVisibility, setTestVisibility }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const isTestVisible = (testId: string) => testVisibility[testId] !== false;

  const toggleTest = (testId: string) => {
    setTestVisibility({ ...testVisibility, [testId]: !isTestVisible(testId) });
  };

  const toggleCategory = (categoryId: string) => {
    const tests = getTestsByCategory(categoryId as any);
    const allVisible = tests.every(t => isTestVisible(t.id));
    const next = { ...testVisibility };
    tests.forEach(t => { next[t.id] = !allVisible; });
    setTestVisibility(next);
  };

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId); else next.add(categoryId);
      return next;
    });
  };

  const totalTests = TEST_CATEGORIES.reduce((sum, c) => sum + getTestsByCategory(c.id as any).length, 0);
  const hiddenCount = Object.values(testVisibility).filter(v => v === false).length;

  return (
    <div className="space-y-2">
      {hiddenCount > 0 && (
        <p className="text-xs text-orange-500 font-medium mb-3">{hiddenCount} of {totalTests} tests hidden.</p>
      )}
      {TEST_CATEGORIES.map(cat => {
        const tests = getTestsByCategory(cat.id as any);
        const visibleCount = tests.filter(t => isTestVisible(t.id)).length;
        const allVisible = visibleCount === tests.length;
        const noneVisible = visibleCount === 0;
        const isExpanded = expandedCategories.has(cat.id);

        return (
          <div key={cat.id} className={`rounded-xl border transition-all ${noneVisible ? 'border-slate-200 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#132338]/40 opacity-60' : 'border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#132338]'}`}>
            <div className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => toggleCategory(cat.id)}
                className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${!noneVisible ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-[#243A58]'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white dark:bg-[#132338] shadow-sm transition-all ${!noneVisible ? 'left-4' : 'left-0.5'}`} />
              </button>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(cat.id)}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${noneVisible ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-[#E2E8F0]'}`}>{cat.name}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                    allVisible ? 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-600' : noneVisible ? 'bg-slate-100 text-slate-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                  }`}>{visibleCount}/{tests.length}</span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-0.5">{cat.description}</p>
              </div>
              <button onClick={() => toggleExpand(cat.id)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#1A2D48] rounded-lg transition-colors text-slate-400 dark:text-[#CBD5E1] shrink-0">
                {isExpanded ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
              </button>
            </div>
            {isExpanded && (
              <div className="border-t border-slate-100 dark:border-[#1A2D48] px-4 py-2 space-y-0.5">
                {tests.map(test => {
                  const visible = isTestVisible(test.id);
                  return (
                    <div key={test.id} className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-all ${visible ? '' : 'opacity-50'}`}>
                      <span className={`text-xs font-medium ${visible ? 'text-slate-700 dark:text-[#CBD5E1]' : 'text-slate-400'}`}>{test.name}</span>
                      <button onClick={() => toggleTest(test.id)}
                        className={`w-9 h-5 rounded-full transition-all relative ${visible ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-[#243A58]'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white dark:bg-[#132338] shadow-sm transition-all ${visible ? 'left-4' : 'left-0.5'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const SettingsFeatures: React.FC<any> = ({
    acwrDirty,
    allGpsProfiles,
    currentOrg,
    draftAcwrSettings,
    getSettings,
    gpsDataSources,
    handleConnectPolar,
    handleDisconnectPolar,
    handleSaveAcwr,
    handleSetGpsDataSource,
    handleUpdateAcwrColumn,
    isPolarConnected,
    name,
    openSections,
    polarIntegration,
    polarType,
    renderAcwrOptions,
    setAcwrDirty,
    setDraftAcwrSettings,
    setGpsConfigTarget,
    setGpsPreviewProfile,
    setOpenSections,
    setTestVisibility,
    teams,
    testVisibility,
    updateSettings,
}) => {
    return (<>
          <>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Feature Settings</h2>
              <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">Configure platform features for your teams and athletes.</p>
            </div>

            {/* ACWR Section — gated behind Elite tier */}
            {!hasFeatureAccess((currentOrg?.tier as Tier) || null, 'acwr') ? (
              <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-5 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                  <GaugeIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">ACWR Monitoring</h3>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">Elite</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#CBD5E1]">Upgrade to Elite to enable individualised ACWR load monitoring with EWMA + safe-band thresholds.</p>
                </div>
              </div>
            ) : (
            <CollapsibleSection id="acwr" icon={GaugeIcon} title="ACWR Monitoring"
              subtitle="Enable/disable ACWR and choose load method per team"
              openSections={openSections} setOpenSections={setOpenSections}>

              <div className="bg-slate-800 text-white p-4 rounded-xl mb-5">
                <h4 className="text-xs font-semibold text-emerald-400 mb-1.5">EWMA Model Reference</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                  ACWR uses Exponentially Weighted Moving Averages (Williams et al. 2017). Acute = 7d, Chronic = 28d default.
                  sRPE = RPE x Duration (Foster et al. 1998). Rest days freeze EWMA (Menaspa 2017). Sprint threshold 25 km/h for elite football (Bowen et al. 2017).
                </p>
                <div className="flex flex-wrap gap-3 text-[10px]">
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-400" /> &lt;0.8 Underexposed</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400" /> 0.8-1.3 Optimal</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400" /> 1.31-1.5 Caution</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-400" /> &gt;1.5 Danger (2-4x injury risk)</span>
                </div>
              </div>

              {teams.filter(t => t.id !== 't_private').length > 0 && (
                <div className="mb-5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <UsersIcon size={12} /> Teams / Squads
                  </h4>
                  <div className="space-y-3">
                    {teams.filter(t => t.id !== 't_private').map(team => {
                      const key = team.id;
                      const s = getSettings(key);
                      return (
                        <div key={key} className={`rounded-xl border p-4 transition-all ${s.enabled ? 'border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/30 dark:bg-indigo-900/15' : 'border-slate-200 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#132338]/40'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-600 rounded-lg flex items-center justify-center text-indigo-600 dark:text-white text-[10px] font-bold">
                                {team.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{team.name}</span>
                                <span className="text-[10px] text-slate-400 dark:text-[#94A3B8] ml-2">{(team.players || []).length} athletes</span>
                              </div>
                            </div>
                            <button type="button" onClick={() => updateSettings(key, { enabled: !s.enabled })}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${s.enabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-[#1A2D48] dark:text-[#94A3B8]'}`}>
                              {s.enabled ? <><ToggleRightIcon size={14} /> On</> : <><ToggleLeftIcon size={14} /> Off</>}
                            </button>
                          </div>
                          {s.enabled && renderAcwrOptions(key)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(() => {
                const privateTeam = teams.find(t => t.id === 't_private');
                const privateClients = privateTeam?.players || [];
                if (privateClients.length === 0) return null;
                return (
                  <div className="mb-5">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <UserIcon size={12} /> Private Clients
                    </h4>
                    <div className="space-y-3">
                      {privateClients.map(athlete => {
                        const key = `ind_${athlete.id}`;
                        const s = getSettings(key);
                        return (
                          <div key={key} className={`rounded-xl border p-4 transition-all ${s.enabled ? 'border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/30 dark:bg-indigo-900/15' : 'border-slate-200 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#132338]/40'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <AthleteAvatar
                                  player={athlete}
                                  size="xs"
                                  shape="rounded-lg"
                                  className="w-7 h-7"
                                  fallbackClass="bg-slate-200 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]"
                                  fallbackTextSize="text-[10px]"
                                />
                                <span className="text-sm font-medium text-slate-900 dark:text-[#E2E8F0]">{athlete.name}</span>
                              </div>
                              <button type="button" onClick={() => updateSettings(key, { enabled: !s.enabled })}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${s.enabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-[#1A2D48] dark:text-[#94A3B8]'}`}>
                                {s.enabled ? <><ToggleRightIcon size={14} /> On</> : <><ToggleLeftIcon size={14} /> Off</>}
                              </button>
                            </div>
                            {s.enabled && renderAcwrOptions(key)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {teams.length === 0 && (
                <p className="text-xs text-slate-400 italic">No teams or athletes found. Add them in the Roster first.</p>
              )}

              <button type="button" onClick={handleSaveAcwr} disabled={!acwrDirty}
                className={`w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors mt-4 ${
                  acwrDirty ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#475569] border border-slate-200 dark:border-[#243A58] cursor-not-allowed'
                }`}>
                <SaveIcon size={14} />
                {acwrDirty ? 'Save ACWR Settings' : 'No changes'}
              </button>
            </CollapsibleSection>
            )}

            {/* Readiness Heatmap Section */}
            <CollapsibleSection id="heatmap_settings" icon={LayoutGridIcon} title="Readiness Heatmap"
              subtitle="Set the default team shown on the dashboard heatmap"
              openSections={openSections} setOpenSections={setOpenSections}>
              <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-[#CBD5E1]">Choose which team is displayed by default when you open the dashboard, or prompt to select each time.</p>
                <div>
                  <label className={labelCls}>Default team</label>
                  <CustomSelect
                    value={draftAcwrSettings._heatmapDefault || 'All Teams'}
                    onChange={e => { setDraftAcwrSettings(prev => ({ ...prev, _heatmapDefault: e.target.value })); setAcwrDirty(true); }}
                    variant="form"
                  >
                    <option value="All Teams">All Teams</option>
                    <option value="prompt">Prompt on open</option>
                    {teams.filter(t => t.id !== 't_private').map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </CustomSelect>
                </div>
                <button type="button" onClick={handleSaveAcwr} disabled={!acwrDirty}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors ${
                    acwrDirty ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#475569] border border-slate-200 dark:border-[#243A58] cursor-not-allowed'
                  }`}>
                  <SaveIcon size={14} />
                  {acwrDirty ? 'Save Settings' : 'No changes'}
                </button>
              </div>
            </CollapsibleSection>

            {/* Testing Hub Section */}
            <CollapsibleSection id="testing" icon={FlaskConicalIcon} title="Testing Hub"
              subtitle="Show or hide test categories and individual tests"
              openSections={openSections} setOpenSections={setOpenSections}>
              <TestingHubSettings testVisibility={testVisibility} setTestVisibility={setTestVisibility} />
            </CollapsibleSection>

            {/* GPS Configuration (Import Profiles + ACWR Column + Session Categories) — Elite only */}
            {!hasFeatureAccess((currentOrg?.tier as Tier) || null, 'gps') ? (
              <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-5 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                  <LinkIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">GPS Configuration</h3>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">Elite</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#CBD5E1]">Upgrade to Elite to connect Polar AccessLink and configure GPS import profiles per team.</p>
                </div>
              </div>
            ) : (
            <CollapsibleSection
              id="gps_config" icon={LinkIcon}
              title="GPS Configuration"
              subtitle="Import profiles, ACWR column binding, and session categories"
              openSections={openSections} setOpenSections={setOpenSections}
            >
              <div className="space-y-4">

                {/* ── Polar Connection Status ── */}
                <div className={`rounded-xl border px-4 py-3.5 flex items-center gap-4 ${isPolarConnected ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/15' : 'border-slate-200 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#132338]/40'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isPolarConnected ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-[#1A2D48]'}`}>
                    <ActivityIcon size={16} className={isPolarConnected ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-400 dark:text-[#94A3B8]'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Polar AccessLink</p>
                    {isPolarConnected ? (
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                        <CheckIcon size={10} />
                        {polarType === 'team_pro' ? 'Team Pro' : 'Individual Device'} · Connected {polarIntegration.connectedAt ? new Date(polarIntegration.connectedAt).toLocaleDateString() : ''}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-0.5">Not connected — choose <strong>Team Pro</strong> for GPS vests or <strong>Individual</strong> for personal devices</p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {isPolarConnected ? (
                      <button
                        onClick={handleDisconnectPolar}
                        className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#1A2D48] hover:bg-rose-50 dark:hover:bg-[#243A58] text-slate-600 dark:text-[#CBD5E1] hover:text-rose-600 border border-slate-200 dark:border-[#243A58] hover:border-rose-200 dark:hover:border-rose-800/50 transition-all"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleConnectPolar('team_pro')}
                          className="px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all whitespace-nowrap"
                        >
                          Team Pro
                        </button>
                        <button
                          onClick={() => handleConnectPolar('individual')}
                          className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#1A2D48] hover:bg-slate-200 dark:hover:bg-[#243A58] text-slate-700 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#243A58] transition-all whitespace-nowrap"
                        >
                          Individual
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Import Profiles ── */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <LinkIcon size={11} /> Import Profiles
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-[#CBD5E1] leading-relaxed mb-3">
                    Click <strong>Configure</strong> next to a team to upload a sample CSV and map its columns.
                    Once saved, every future import auto-applies the mapping. Set the <strong>ACWR column</strong> to tell the platform which GPS field drives training load.
                  </p>

                  {teams.filter(t => t.id !== 't_private').length === 0 && (
                    <p className="text-xs text-slate-400 italic">No teams found — add teams in the Roster first.</p>
                  )}

                  <div className="space-y-3">
                    {teams.filter(t => t.id !== 't_private').map(team => {
                      const profile = allGpsProfiles.find(p => p.teamId === team.id);
                      const gpsColumns = profile && Array.isArray(profile.columnMapping)
                        ? profile.columnMapping.filter(m => !GPS_META_NAMES.has(m.csvColumn))
                        : [];
                      return (
                        <div key={team.id} className={`rounded-xl border transition-all ${profile ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/20 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#132338]/40'}`}>
                          {/* Header row */}
                          <div
                            onClick={() => profile && setGpsPreviewProfile(profile)}
                            className={`flex items-center gap-4 px-4 py-3.5 ${profile ? 'hover:bg-emerald-50/40 dark:hover:bg-emerald-900/15 cursor-pointer' : ''} rounded-t-xl transition-all`}
                          >
                            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-600 rounded-lg flex items-center justify-center text-indigo-600 dark:text-white text-[10px] font-bold shrink-0">
                              {team.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{team.name}</p>
                              {profile ? (
                                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                                  <CheckIcon size={10} />
                                  {profile.provider ? `${profile.provider} — ` : ''}
                                  {Array.isArray(profile.columnMapping) ? profile.columnMapping.filter(m => m.platformField).length : 0} columns mapped
                                  · saved {profile.savedAt ? new Date(profile.savedAt).toLocaleDateString() : '—'}
                                </p>
                              ) : (
                                <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-0.5">No profile configured — GPS data won't feed ACWR until set up</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                              {profile && (
                                <button
                                  onClick={() => setGpsPreviewProfile(profile)}
                                  className="px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/25 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 dark:bg-emerald-900/35 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 transition-all"
                                >
                                  Rename Cols
                                </button>
                              )}
                              <button
                                onClick={() => setGpsConfigTarget({ teamId: team.id, teamName: team.name })}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                  profile
                                    ? 'bg-slate-100 dark:bg-[#1A2D48] hover:bg-slate-200 dark:hover:bg-[#243A58] text-slate-700 dark:text-[#CBD5E1]'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                              >
                                {profile ? 'Reconfigure' : 'Configure'}
                              </button>
                            </div>
                          </div>

                          {/* Data Source selector */}
                          <div className="px-4 pt-3 pb-3 border-t border-slate-200/60 dark:border-[#243A58]/60">
                            <label className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide flex items-center gap-1.5 mb-2">
                              <ActivityIcon size={10} className="text-indigo-400" /> Data Source
                            </label>
                            <div className="flex gap-2">
                              {[
                                { value: 'csv', label: 'CSV Import', desc: 'Upload GPS files manually' },
                                { value: 'polar', label: 'Polar Sync', desc: 'Pull from Polar AccessLink', disabled: !isPolarConnected },
                              ].map(opt => {
                                const selected = (gpsDataSources[team.id] || 'csv') === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    disabled={opt.disabled}
                                    onClick={() => handleSetGpsDataSource(team.id, opt.value as 'csv' | 'polar')}
                                    title={opt.disabled ? 'Connect Polar above to enable this option' : ''}
                                    className={`flex-1 flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all ${
                                      opt.disabled
                                        ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30]'
                                        : selected
                                          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                          : 'border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#1A2D48] hover:border-slate-300 dark:hover:border-[#2D4A6A] hover:bg-slate-50 dark:hover:bg-[#243A58] text-slate-700 dark:text-[#CBD5E1]'
                                    }`}
                                  >
                                    <span className="text-xs font-semibold">{opt.label}</span>
                                    <span className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>
                                  </button>
                                );
                              })}
                            </div>
                            {(gpsDataSources[team.id] || 'csv') === 'polar' && isPolarConnected && (
                              <p className="text-[10px] text-indigo-600 dark:text-indigo-300 mt-1.5 flex items-center gap-1">
                                <CheckIcon size={9} /> GPS Data Hub will show a Sync Polar button for this team. CSV import remains available as a fallback.
                              </p>
                            )}
                          </div>

                          {/* ACWR column binding — always visible when profile exists */}
                          <div className={`px-4 pb-4 border-t border-slate-200/60 dark:border-[#243A58]/60 pt-3 ${!profile ? 'opacity-50 pointer-events-none' : ''}`}>
                            <label className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide flex items-center gap-1.5 mb-2">
                              <GaugeIcon size={10} className="text-indigo-400" /> ACWR Load Column
                            </label>
                            {!profile ? (
                              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-[#1A2D48] border border-slate-200 dark:border-[#243A58] rounded-lg">
                                <span className="text-xs text-slate-400 dark:text-[#94A3B8] italic">Configure profile first to bind an ACWR column</span>
                              </div>
                            ) : gpsColumns.length === 0 ? (
                              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                                <AlertTriangleIcon size={12} className="text-amber-400 shrink-0" />
                                <span className="text-xs text-amber-600">Profile has no column mappings — click Reconfigure above</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <CustomSelect
                                  value={profile.acwrColumn || ''}
                                  onChange={e => handleUpdateAcwrColumn(team.id, e.target.value)}
                                  variant="form"
                                  placeholder="— Select load column —"
                                >
                                  <option value="">— Select load column —</option>
                                  {gpsColumns.map(m => (
                                    <option key={m.csvColumn} value={m.csvColumn}>
                                      {m.displayName || m.csvColumn}
                                    </option>
                                  ))}
                                </CustomSelect>
                                {profile.acwrColumn && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0 flex items-center gap-1 whitespace-nowrap">
                                    <CheckIcon size={10} /> Bound
                                  </span>
                                )}
                              </div>
                            )}
                            <p className="text-[10px] text-slate-400 mt-1.5">
                              The selected GPS column's value is used as the daily training load for ACWR calculations on import.
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Session Categories divider ── */}
                <div className="border-t border-slate-200 dark:border-[#243A58] pt-4">
                  <h4 className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide mb-3 flex items-center gap-2">
                    <TagIcon size={11} /> Session Categories
                  </h4>
                  <GpsCategoryManager />
                </div>
              </div>
            </CollapsibleSection>
            )}

          </>
    </>);
};

export default SettingsFeatures;
