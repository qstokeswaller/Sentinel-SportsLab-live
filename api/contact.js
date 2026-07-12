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
import { renderEmail, escapeHtml, ICONS } from './_email-template.js';

const SUBJECT_LABELS = {
  sales:   'Sales / Pilot enquiry',
  support: 'Support request',
  bug:     'Report a bug',
  feature: 'Feature request',
};

const FROM_ADDRESS = 'Sentinel SportsLab <noreply@sentinelsportslab.com>';
const SUPPORT_INBOX = 'support@sentinelsportslab.com';

// Lightweight burst limiter: max N submissions per IP per window, per warm
// serverless instance. Not bulletproof (instances don't share memory) but it
// stops naive spam loops from burning the Resend quota / flooding the inbox.
const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 5 };
const hits = new Map(); // ip -> [timestamps]

function isRateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < RATE_LIMIT.windowMs);
  if (arr.length >= RATE_LIMIT.max) { hits.set(ip, arr); return true; }
  arr.push(now);
  hits.set(ip, arr);
  // Opportunistic cleanup so the map can't grow unbounded
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every(t => now - t >= RATE_LIMIT.windowMs)) hits.delete(k);
    }
  }
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many messages — please wait a few minutes and try again.' });
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

  // For the support-side notification we don't show a CTA — it's a notification,
  // not actionable. The message body lives in the rich insert.
  const detailsHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(135deg,#eef2ff 0%,#f5f3ff 100%);border:1px solid #e0e7ff;border-radius:14px;margin-bottom:14px;">
      <tr><td style="padding:16px 22px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
          <tr><td style="padding:4px 12px 4px 0;color:#7c3aed;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;width:110px;">From</td>
              <td style="padding:4px 0;font-size:14px;color:#0f172a;"><strong>${safeName}</strong> &lt;${safeEmail}&gt;</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#7c3aed;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Organisation</td>
              <td style="padding:4px 0;font-size:14px;color:#0f172a;">${safeOrg}</td></tr>
        </table>
      </td></tr>
    </table>
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:3px solid #4f46e5;padding:16px 20px;border-radius:10px;">
      <p style="margin:0;color:#0f172a;font-size:14px;line-height:1.65;">${safeMessage}</p>
    </div>
  `;

  const notificationHtml = renderEmail({
    preheader: `${name.trim()} — ${subjectLabel}`,
    hero: ICONS.message,
    eyebrow: 'New contact form submission',
    heading: subjectLabel,
    subheadingHtml: '',
    richInsertHtml: detailsHtml,
    securityCallout: {
      tone: 'info',
      html: `Hit <strong>Reply</strong> and your response will go directly to <strong>${safeEmail}</strong>.`,
    },
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
