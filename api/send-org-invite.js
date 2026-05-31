/**
 * Vercel Serverless Function — Send an organisation invitation email.
 *
 * POST /api/send-org-invite
 * Body: {
 *   to:          string,   // recipient email (must be valid)
 *   role:        'admin' | 'member',
 *   acceptUrl:   string,   // full /accept-invite/:token URL
 *   orgName:     string,
 *   inviterName: string,
 * }
 *
 * Called by the Settings page after the invitation row has been created via
 * the create_org_invitation RPC. The actual database row + token already
 * exist when this endpoint runs — its only job is to deliver the email.
 *
 * Failures here do NOT undo the invitation (the link is still valid and the
 * admin can copy it from the UI as a fallback).
 */

import { Resend } from 'resend';
import { renderEmail, escapeHtml } from './_email-template.js';

const FROM_ADDRESS = 'Sentinel SportsLab <noreply@sentinelsportslab.com>';

function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function isHttpUrl(s) {
  try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[send-org-invite] RESEND_API_KEY not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const { to, role, acceptUrl, orgName, inviterName } = req.body || {};

  if (!isValidEmail(to))    return res.status(400).json({ error: 'Invalid recipient email' });
  if (role !== 'admin' && role !== 'member') return res.status(400).json({ error: 'Invalid role' });
  if (!isHttpUrl(acceptUrl)) return res.status(400).json({ error: 'Invalid acceptUrl' });
  if (!orgName?.trim())     return res.status(400).json({ error: 'orgName required' });
  if (!inviterName?.trim()) return res.status(400).json({ error: 'inviterName required' });

  const safeOrg = escapeHtml(orgName.trim());
  const safeInviter = escapeHtml(inviterName.trim());
  const roleLabel = role === 'admin' ? 'an admin' : 'a member';
  const safeRoleLabel = escapeHtml(roleLabel);

  const html = renderEmail({
    preheader: `${inviterName.trim()} invited you to join ${orgName.trim()} on Sentinel SportsLab.`,
    heading: `You've been invited to ${safeOrg}`,
    introHtml: `
      <p style="margin: 0 0 14px;"><strong>${safeInviter}</strong> has invited you to join <strong>${safeOrg}</strong> on Sentinel SportsLab as ${safeRoleLabel}.</p>
      <p style="margin: 0;">Click the button below to accept the invitation. You'll be asked to create a password — your email is already linked to the invitation, so you don't need to enter it again.</p>
    `,
    cta: { url: acceptUrl, label: 'Accept invitation' },
    postCtaHtml: `
      <p style="margin: 0 0 6px;">Or copy and paste this link into your browser:</p>
      <p style="margin: 0; word-break: break-all;"><a href="${escapeHtml(acceptUrl)}" style="color: #4f46e5;">${escapeHtml(acceptUrl)}</a></p>
      <p style="margin: 14px 0 0;">This invitation expires in 7 days.</p>
    `,
    footerNote: `Invitation sent to ${escapeHtml(to.trim())}.`,
  });

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: to.trim(),
      replyTo: 'support@sentinelsportslab.com',
      subject: `${inviterName.trim()} invited you to ${orgName.trim()}`,
      html,
    });

    if (error) {
      console.error('[send-org-invite] Resend error:', error);
      return res.status(502).json({ error: 'Could not send the invitation email. The link is still valid — copy it from the Settings page and send manually.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[send-org-invite] Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected error sending invitation email.' });
  }
}
