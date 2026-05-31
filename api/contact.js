/**
 * Vercel Serverless Function — Contact form submission
 *
 * POST /api/contact
 * Body: { subject, name, email, organisation?, message }
 *
 * Sends two emails via Resend:
 *   1. Notification to support@sentinelsportslab.com so we see the request.
 *      reply_to is set to the submitter's email so hitting "Reply" in Zoho
 *      replies directly to them — no copy-paste needed.
 *   2. (Optional) Auto-acknowledgement to the submitter so they know we got it.
 *
 * Requires env var RESEND_API_KEY (server-side, no VITE_ prefix).
 */

import { Resend } from 'resend';
import { renderEmail, escapeHtml } from './_email-template.js';

const SUBJECT_LABELS = {
  sales:   'Sales / Pilot enquiry',
  support: 'Support request',
  bug:     'Report a bug',
  feature: 'Feature request',
};

const FROM_ADDRESS = 'Sentinel SportsLab <noreply@sentinelsportslab.com>';
const SUPPORT_INBOX = 'support@sentinelsportslab.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[contact] RESEND_API_KEY not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const { subject, name, email, organisation, message } = req.body || {};

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message is too long (max 5000 characters).' });
  }

  const subjectLabel = SUBJECT_LABELS[subject] || 'Contact form';
  const resend = new Resend(apiKey);

  const safeName = escapeHtml(name.trim());
  const safeEmail = escapeHtml(email.trim());
  const safeOrg = organisation?.trim() ? escapeHtml(organisation.trim()) : '—';
  const safeMessage = escapeHtml(message.trim()).replace(/\n/g, '<br>');

  const notificationHtml = renderEmail({
    preheader: `${name.trim()} — ${subjectLabel}`,
    heading: subjectLabel,
    introHtml: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 18px; width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 4px 12px 4px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; width: 110px;">From</td>
            <td style="padding: 4px 0; font-size: 14px; color: #0f172a;"><strong>${safeName}</strong> &lt;${safeEmail}&gt;</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700;">Organisation</td>
            <td style="padding: 4px 0; font-size: 14px; color: #0f172a;">${safeOrg}</td></tr>
      </table>
      <div style="background: #f8fafc; border-left: 3px solid #4f46e5; padding: 16px 20px; border-radius: 8px;">
        <p style="margin: 0; color: #0f172a; font-size: 14px; line-height: 1.6;">${safeMessage}</p>
      </div>
    `,
    postCtaHtml: `<p style="margin: 0;">Reply to this email and your response will go directly to ${safeEmail}.</p>`,
  });

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: SUPPORT_INBOX,
      replyTo: email.trim(),
      subject: `[${subjectLabel}] ${name.trim()}`,
      html: notificationHtml,
    });

    if (error) {
      console.error('[contact] Resend error:', error);
      return res.status(502).json({ error: 'Could not send your message. Please try again or email support@sentinelsportslab.com directly.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[contact] Unexpected error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again or email support@sentinelsportslab.com directly.' });
  }
}
