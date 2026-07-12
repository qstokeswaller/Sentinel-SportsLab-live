// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CollapsibleSection, inputCls, inputErrorCls, labelCls } from './shared';
import { KeyIcon, LogOutIcon, MailIcon, SaveIcon, UserIcon } from 'lucide-react';

export const SettingsAccount: React.FC<any> = ({
    clearFieldError,
    confirmNewPassword,
    emailConfirmSent,
    emailSaving,
    fieldErrors,
    fullName,
    handleChangeEmail,
    handleChangePassword,
    handleSaveProfile,
    name,
    nameRef,
    newEmail,
    newPassword,
    openSections,
    orgRef,
    organization,
    phone,
    profileDirty,
    profileError,
    profileSaving,
    pwSaving,
    setConfirmNewPassword,
    setEmailConfirmSent,
    setFullName,
    setNewEmail,
    setNewPassword,
    setOpenSections,
    setOrganization,
    setPhone,
    setProfileError,
    signOut,
    user,
}) => {
    return (<>
          <>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Account</h2>
              <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">Your profile, organisation and session management.</p>
            </div>

            {/* Profile Section */}
            <CollapsibleSection id="profile" icon={UserIcon} title="Profile"
              subtitle="Name, organisation, contact details"
              openSections={openSections} setOpenSections={setOpenSections}>
              <div className="space-y-4">
                <div ref={nameRef}>
                  <label className={labelCls}>Full name <span className="text-red-500">*</span></label>
                  <input type="text" value={fullName}
                    onChange={e => { setFullName(e.target.value); clearFieldError('fullName'); setProfileError(null); }}
                    className={fieldErrors.fullName ? inputErrorCls : inputCls} placeholder="Alex Smith" />
                  {fieldErrors.fullName && <p className="text-red-500 text-xs mt-1">{fieldErrors.fullName}</p>}
                </div>
                <div ref={orgRef}>
                  <label className={labelCls}>Organisation <span className="text-red-500">*</span></label>
                  <input type="text" value={organization}
                    onChange={e => { setOrganization(e.target.value); clearFieldError('organization'); setProfileError(null); }}
                    className={fieldErrors.organization ? inputErrorCls : inputCls} placeholder="City FC / Elite Academy" />
                  {fieldErrors.organization && <p className="text-red-500 text-xs mt-1">{fieldErrors.organization}</p>}
                </div>
                <div>
                  <label className={labelCls}>Phone number <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input type="tel" value={phone}
                    onChange={e => { setPhone(e.target.value); setProfileError(null); }}
                    className={inputCls} placeholder="+44 7700 000000" />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={user?.email || ''} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
                  <p className="text-[11px] text-slate-400 mt-1">To change your sign-in email, use the <strong>Change email</strong> section below.</p>
                </div>
                {profileError && <div className="bg-red-50 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2.5"><p className="text-red-600 text-xs font-medium">{profileError}</p></div>}
                <button onClick={handleSaveProfile} disabled={profileSaving || !profileDirty}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors ${
                    profileDirty ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#475569] border border-slate-200 dark:border-[#243A58] cursor-not-allowed'
                  }`}>
                  <SaveIcon size={14} />
                  {profileSaving ? 'Saving...' : profileDirty ? 'Save Profile' : 'No changes'}
                </button>
              </div>
            </CollapsibleSection>

            {/* Change password */}
            <CollapsibleSection id="change-password" icon={KeyIcon} title="Change password"
              subtitle="Set a new password — you stay signed in"
              openSections={openSections} setOpenSections={setOpenSections}>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>New password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className={inputCls} placeholder="Min 8 characters" autoComplete="new-password" />
                </div>
                <div>
                  <label className={labelCls}>Confirm new password</label>
                  <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}
                    className={inputCls} placeholder="Repeat new password" autoComplete="new-password" />
                </div>
                <button onClick={handleChangePassword}
                  disabled={pwSaving || !newPassword || !confirmNewPassword}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors ${
                    pwSaving || !newPassword || !confirmNewPassword
                      ? 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#475569] border border-slate-200 dark:border-[#243A58] cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}>
                  <KeyIcon size={14} />
                  {pwSaving ? 'Updating…' : 'Update password'}
                </button>
                <p className="text-[11px] text-slate-400 dark:text-[#CBD5E1] leading-relaxed">
                  A confirmation email will be sent from <strong>noreply@sentinelsportslab.com</strong> letting you know your password changed.
                  If you didn't make this change, contact <a href="mailto:support@sentinelsportslab.com" className="text-indigo-600 hover:underline">support@sentinelsportslab.com</a> immediately.
                </p>
              </div>
            </CollapsibleSection>

            {/* Change email */}
            <CollapsibleSection id="change-email" icon={MailIcon} title="Change email"
              subtitle="Update your sign-in email — confirmation required"
              openSections={openSections} setOpenSections={setOpenSections}>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Current email</label>
                  <input type="email" value={user?.email || ''} disabled
                    className={`${inputCls} opacity-50 cursor-not-allowed`} />
                </div>
                <div>
                  <label className={labelCls}>New email</label>
                  <input type="email" value={newEmail} onChange={e => { setNewEmail(e.target.value); setEmailConfirmSent(false); }}
                    className={inputCls} placeholder="new-email@example.com" autoComplete="email" />
                </div>
                {emailConfirmSent ? (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg px-3 py-3">
                    <p className="text-[12px] text-emerald-700 dark:text-emerald-300 font-medium">
                      Confirmation link sent to <strong>{newEmail}</strong>. Click the link in that inbox to complete the change. Until you do, your current email stays active.
                    </p>
                  </div>
                ) : (
                  <button onClick={handleChangeEmail}
                    disabled={emailSaving || !newEmail.trim()}
                    className={`w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors ${
                      emailSaving || !newEmail.trim()
                        ? 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#475569] border border-slate-200 dark:border-[#243A58] cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}>
                    <MailIcon size={14} />
                    {emailSaving ? 'Sending…' : 'Send confirmation link'}
                  </button>
                )}
                <p className="text-[11px] text-slate-400 dark:text-[#CBD5E1] leading-relaxed">
                  We'll send a confirmation link to the new email address. Your sign-in email only changes once you click that link.
                  Both your old and new inboxes will receive a security notification when the change completes.
                </p>
              </div>
            </CollapsibleSection>

            {/* Security — always visible, not collapsible */}
            <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-600 rounded-xl flex items-center justify-center text-indigo-600 dark:text-white text-sm font-bold">
                  {(user?.user_metadata?.full_name || user?.email || '??').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-[#E2E8F0]">{user?.user_metadata?.full_name || 'User'}</p>
                  <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">{user?.email}</p>
                </div>
              </div>
              <button onClick={signOut}
                className="w-full flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-600 hover:bg-rose-100 dark:hover:bg-rose-500 text-rose-600 dark:text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors border border-rose-200 dark:border-rose-500/50">
                <LogOutIcon size={14} /> Sign out
              </button>
            </div>
          </>
    </>);
};

export default SettingsAccount;
