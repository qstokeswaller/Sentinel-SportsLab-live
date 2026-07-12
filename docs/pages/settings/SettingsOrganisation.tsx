// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { AlertCircleIcon, CheckCircleIcon, MailIcon } from 'lucide-react';

export const SettingsOrganisation: React.FC<any> = ({
    atCap,
    auditLoading,
    auditLog,
    currentOrg,
    currentUserRole,
    handleChangeRole,
    handleRemoveMember,
    handleRevokeInvite,
    handleSaveOrgName,
    handleSendInvite,
    handleTransferAdmin,
    inviteEmail,
    inviteEmailCheck,
    inviteEmailChecking,
    inviteRole,
    inviteSending,
    isOrgAdmin,
    lastInviteLink,
    memberActionBusy,
    name,
    orgInvitations,
    orgListLoading,
    orgMembers,
    orgNameDraft,
    orgNameSaving,
    seatCap,
    seatUsage,
    setInviteEmail,
    setInviteRole,
    setOrgNameDraft,
    showToast,
    tierLabel,
    user,
}) => {
    return (<>
          <>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Organisation</h2>
                <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">Plan, seat usage, team members. Admin-only sections are marked.</p>
              </div>
              {currentUserRole && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  isOrgAdmin
                    ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40'
                    : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#243A58]'
                }`}>
                  Your role: {currentUserRole}
                </span>
              )}
            </div>

            {!currentOrg ? (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-5 py-4 text-sm text-amber-800 dark:text-amber-300">
                Organisation details are still loading. If this persists, sign out and back in.
              </div>
            ) : (
              <>
                {/* Plan + seat usage tile */}
                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#CBD5E1] mb-1">Subscription tier</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">
                        {tierLabel[currentOrg.tier] || currentOrg.tier}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1] mt-1 capitalize">
                        Status: {currentOrg.subscription_status || 'active'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#CBD5E1] mb-1">Seat usage</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">
                        {seatUsage} <span className="text-slate-400 dark:text-[#CBD5E1] text-base font-medium">/ {seatCap}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1] mt-1">
                        {orgInvitations.length > 0
                          ? `${orgMembers.length} active, ${orgInvitations.length} pending invitation${orgInvitations.length === 1 ? '' : 's'}`
                          : `${orgMembers.length} active`}
                      </p>
                    </div>
                  </div>
                  {seatUsage >= seatCap && (
                    <div className="mt-4 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
                      You're at your seat cap. Upgrade your tier to add more team members.
                    </div>
                  )}
                </div>

                {/* Org name editor (admin only) */}
                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#CBD5E1] mb-2">Organisation name</p>
                  {isOrgAdmin ? (
                    <div className="flex items-stretch gap-2">
                      <input
                        type="text"
                        value={orgNameDraft}
                        onChange={(e) => setOrgNameDraft(e.target.value)}
                        className="flex-1 min-w-0 px-3.5 py-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg text-sm text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        maxLength={120}
                      />
                      <button
                        onClick={handleSaveOrgName}
                        disabled={orgNameSaving || !orgNameDraft.trim() || orgNameDraft.trim() === currentOrg.name}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {orgNameSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-base font-semibold text-slate-700 dark:text-[#E2E8F0]">{currentOrg.name}</p>
                  )}
                </div>

                {/* Invite form (admin only) */}
                {isOrgAdmin && (
                  <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-[#E2E8F0] mb-3">Invite a member</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="alex@club.com"
                        disabled={inviteSending || atCap}
                        className="flex-1 min-w-0 px-3.5 py-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg text-sm text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                      />
                      <div className="sm:w-40">
                        <CustomSelect
                          value={inviteRole}
                          onChange={(e: any) => setInviteRole(e.target.value as 'admin' | 'member')}
                          disabled={inviteSending || atCap}
                          variant="form"
                          size="sm"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </CustomSelect>
                      </div>
                      <button
                        onClick={handleSendInvite}
                        disabled={inviteSending || atCap || !inviteEmail.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {inviteSending ? 'Creating…' : 'Create invite'}
                      </button>
                    </div>

                    {/* Pre-flight email status — shows existing-account + other-org conflicts before the admin commits */}
                    {inviteEmailCheck && !inviteSending && (
                      inviteEmailCheck.has_other_org && inviteEmailCheck.other_org_has_data ? (
                        <div className="mt-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
                          <AlertCircleIcon size={14} className="text-rose-600 dark:text-rose-300 shrink-0 mt-0.5" />
                          <div className="text-[11.5px] text-rose-700 dark:text-rose-300 leading-relaxed">
                            <strong>This person is already a member of "{inviteEmailCheck.other_org_name}"</strong> which has athletes/training data.
                            They <strong>can't accept</strong> this invite until they leave that organisation first (multi-org membership isn't supported yet).
                            Either send the invite to a different email, or ask them to leave their current org before accepting.
                          </div>
                        </div>
                      ) : inviteEmailCheck.has_other_org ? (
                        <div className="mt-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
                          <AlertCircleIcon size={14} className="text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
                          <div className="text-[11.5px] text-amber-700 dark:text-amber-300 leading-relaxed">
                            This person already has an account in "{inviteEmailCheck.other_org_name}" but that org has no data, so accepting will silently migrate them to {currentOrg?.name || 'this org'}.
                          </div>
                        </div>
                      ) : inviteEmailCheck.user_exists ? (
                        <div className="mt-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
                          <CheckCircleIcon size={14} className="text-emerald-600 dark:text-emerald-300 shrink-0 mt-0.5" />
                          <div className="text-[11.5px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                            This person already has an account and isn't in any other organisation — invite should accept cleanly.
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 flex items-start gap-2">
                          <MailIcon size={14} className="text-slate-500 dark:text-[#CBD5E1] shrink-0 mt-0.5" />
                          <div className="text-[11.5px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                            No existing account for this email. They'll be prompted to sign up + set a password when they accept.
                            <span className="block mt-0.5 text-[10.5px] text-slate-500 dark:text-[#94A3B8]">
                              If they already use a different email for an existing account, send the invite to <em>that</em> email instead.
                            </span>
                          </div>
                        </div>
                      )
                    )}
                    {inviteEmailChecking && (
                      <p className="mt-2 text-[11px] text-slate-400 dark:text-[#94A3B8]">Checking email…</p>
                    )}

                    {atCap && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2">
                        Seat cap reached. Upgrade your tier or revoke a pending invitation to add another member.
                      </p>
                    )}
                    {lastInviteLink && (
                      <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/40 rounded-lg">
                        <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-2">
                          Invitation link — copy and send to your invitee
                        </p>
                        <div className="flex items-stretch gap-2">
                          <input
                            type="text"
                            readOnly
                            value={lastInviteLink}
                            onFocus={(e) => e.currentTarget.select()}
                            className="flex-1 min-w-0 px-3 py-1.5 bg-white dark:bg-[#0F1C30] border border-indigo-200 dark:border-indigo-500/40 rounded-md text-[12px] text-slate-800 dark:text-[#E2E8F0] font-mono"
                          />
                          <button
                            onClick={async () => {
                              try { await navigator.clipboard.writeText(lastInviteLink); showToast?.('Link copied'); }
                              catch { showToast?.('Copy failed — select and copy manually', 'error'); }
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold rounded-md transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="text-[10.5px] text-slate-500 dark:text-[#CBD5E1] mt-2">
                          The link expires in 7 days. Once they click it and sign in with the invited email, they'll join your organisation.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Members list */}
                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-[#243A58]">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-[#E2E8F0]">Team members</h3>
                  </div>
                  {orgListLoading ? (
                    <div className="px-5 py-8 text-center text-xs text-slate-400 dark:text-[#CBD5E1]">Loading…</div>
                  ) : orgMembers.length === 0 ? (
                    <div className="px-5 py-8 text-center text-xs text-slate-400 dark:text-[#CBD5E1]">No members found.</div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-[#243A58]">
                      {orgMembers.map((m) => {
                        const isSelf = m.user_id === user?.id;
                        const isBusy = memberActionBusy === m.member_id;
                        return (
                          <li key={m.member_id} className="px-5 py-3 flex items-center gap-3 flex-wrap">
                            <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                {(m.full_name || m.email || '?')[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0] truncate flex items-center gap-2">
                                {m.full_name || m.email}
                                {isSelf && <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#CBD5E1]">You</span>}
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-[#CBD5E1] truncate">{m.email}</p>
                            </div>
                            <span className={`shrink-0 text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              m.role === 'admin'
                                ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                                : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]'
                            }`}>
                              {m.role}
                            </span>
                            {isOrgAdmin && !isSelf && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {m.role === 'member' && (
                                  <button
                                    onClick={() => handleChangeRole(m.member_id, 'admin', m.full_name || m.email)}
                                    disabled={isBusy}
                                    title="Make admin (alongside you)"
                                    className="text-[10.5px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 px-2.5 py-1 rounded-md disabled:opacity-50 transition-colors"
                                  >
                                    Make admin
                                  </button>
                                )}
                                {m.role === 'admin' && (
                                  <button
                                    onClick={() => handleChangeRole(m.member_id, 'member', m.full_name || m.email)}
                                    disabled={isBusy}
                                    title="Demote to member"
                                    className="text-[10.5px] font-semibold text-slate-600 dark:text-[#CBD5E1] bg-slate-100 dark:bg-[#1A2D48] hover:bg-slate-200 dark:hover:bg-[#243A58] px-2.5 py-1 rounded-md disabled:opacity-50 transition-colors"
                                  >
                                    Demote
                                  </button>
                                )}
                                {m.role === 'member' && (
                                  <button
                                    onClick={() => handleTransferAdmin(m.member_id, m.full_name || m.email)}
                                    disabled={isBusy}
                                    title="Transfer your admin role to this member (you become member)"
                                    className="text-[10.5px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 px-2.5 py-1 rounded-md disabled:opacity-50 transition-colors"
                                  >
                                    Transfer admin
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveMember(m.member_id, m.full_name || m.email)}
                                  disabled={isBusy}
                                  title="Remove from organisation"
                                  className="text-[10.5px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 px-2.5 py-1 rounded-md disabled:opacity-50 transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Pending invitations (only shown if any exist) */}
                {orgInvitations.length > 0 && (
                  <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-[#243A58]">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-[#E2E8F0]">Pending invitations</h3>
                    </div>
                    <ul className="divide-y divide-slate-100 dark:divide-[#243A58]">
                      {orgInvitations.map((inv) => {
                        const isBusy = memberActionBusy === inv.id;
                        return (
                          <li key={inv.id} className="px-5 py-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-700 dark:text-[#E2E8F0] truncate">{inv.email}</p>
                              <p className="text-[11px] text-slate-400 dark:text-[#CBD5E1]">
                                Expires {new Date(inv.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                              {inv.role}
                            </span>
                            {isOrgAdmin && (
                              <button
                                onClick={() => handleRevokeInvite(inv.id)}
                                disabled={isBusy}
                                className="shrink-0 text-[10.5px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 px-2.5 py-1 rounded-md disabled:opacity-50 transition-colors"
                              >
                                Revoke
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Activity log */}
                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-[#243A58]">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-[#E2E8F0]">Activity</h3>
                    <p className="text-[11px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">Audit log of organisation actions — invitations, role changes, removals.</p>
                  </div>
                  {auditLoading ? (
                    <div className="px-5 py-6 text-center text-xs text-slate-400 dark:text-[#CBD5E1]">Loading…</div>
                  ) : auditLog.length === 0 ? (
                    <div className="px-5 py-6 text-center text-xs text-slate-400 dark:text-[#CBD5E1]">No activity yet.</div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-[#243A58] max-h-80 overflow-y-auto">
                      {auditLog.map((row) => {
                        const summary = (() => {
                          const target = row.target_email || 'member';
                          const fromR = row.metadata?.from;
                          const toR = row.metadata?.to;
                          switch (row.action) {
                            case 'org_renamed':       return `Organisation renamed${row.metadata?.from && row.metadata?.to ? ` (${row.metadata.from} → ${row.metadata.to})` : ''}`;
                            case 'invite_created':    return `Invited ${target} as ${row.metadata?.role || 'member'}`;
                            case 'invite_revoked':    return `Revoked invitation to ${target}`;
                            case 'invite_accepted':   return `${target} accepted invitation`;
                            case 'member_removed':    return `Removed ${target}`;
                            case 'role_changed':      return `Changed ${target}'s role${fromR && toR ? ` (${fromR} → ${toR})` : ''}`;
                            case 'admin_transferred': return `Transferred admin to ${target}`;
                            default:                  return row.action;
                          }
                        })();
                        return (
                          <li key={row.id} className="px-5 py-3 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-800 dark:text-[#E2E8F0]">{summary}</p>
                              <p className="text-[10.5px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">
                                by {row.actor_email || 'unknown'} · {new Date(row.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Footnote — what's coming next */}
                <p className="text-[11px] text-slate-400 dark:text-[#CBD5E1] mt-2">
                  Email-sending automation arrives once your support inbox is configured — for now, copy the invitation link and send it manually. Subscription / billing portal opens once Paystack is connected.
                </p>
              </>
            )}
          </>
    </>);
};

export default SettingsOrganisation;
