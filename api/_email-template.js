/**
 * Shared HTML wrapper for transactional emails sent via Resend.
 *
 * Renders a header with the Sentinel SportsLab wordmark, a content body,
 * an optional CTA button, and a branded footer. Designed for solid rendering
 * across Gmail web/iOS, Apple Mail, Outlook, and dark-mode-aware clients.
 *
 * Filename starts with `_` so Vercel doesn't expose it as a serverless route.
 *
 * Usage:
 *   import { renderEmail, escapeHtml } from './_email-template.js';
 *   const html = renderEmail({
 *     preheader: '...',
 *     heading: '...',
 *     introHtml: '<p>...</p>',
 *     cta: { url, label },
 *     postCtaHtml: '<p>...</p>',
 *   });
 */

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const COLORS = {
  primary:  '#4f46e5',  // indigo-600
  primaryDark: '#4338ca', // indigo-700 (hover/border)
  text:     '#0f172a',  // slate-900
  textMute: '#475569',  // slate-600
  textFaint:'#94a3b8',  // slate-400
  border:   '#e2e8f0',  // slate-200
  bg:       '#f8fafc',  // slate-50
  card:     '#ffffff',
};

/**
 * @param {object} opts
 * @param {string} opts.preheader - hidden snippet shown in inbox previews
 * @param {string} opts.heading
 * @param {string} opts.introHtml - HTML body above the CTA
 * @param {{url: string, label: string} | null} [opts.cta]
 * @param {string} [opts.postCtaHtml] - HTML below the CTA (e.g. fallback link, expiry note)
 * @param {string} [opts.footerNote] - extra paragraph in the footer
 */
export function renderEmail({
  preheader = '',
  heading,
  introHtml,
  cta = null,
  postCtaHtml = '',
  footerNote = '',
}) {
  const safePreheader = escapeHtml(preheader);

  const ctaBlock = cta ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px auto;">
      <tr>
        <td style="border-radius: 8px; background-color: ${COLORS.primary};">
          <a href="${escapeHtml(cta.url)}"
             style="display: inline-block; padding: 13px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px; letter-spacing: 0.01em;">
            ${escapeHtml(cta.label)}
          </a>
        </td>
      </tr>
    </table>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(heading)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: ${COLORS.bg}; }
    a { color: ${COLORS.primary}; }
    /* Force light mode for known dark-mode-overriding clients */
    @media (prefers-color-scheme: dark) {
      body, .email-body, .email-card { background-color: ${COLORS.bg} !important; color: ${COLORS.text} !important; }
    }
  </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; background-color: ${COLORS.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: ${COLORS.text};">
  <!-- Preheader (hidden inbox preview) -->
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; mso-hide: all; height: 0; width: 0; color: transparent;">${safePreheader}</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${COLORS.bg};">
    <tr>
      <td align="center" style="padding: 32px 16px;">

        <!-- Header / Wordmark -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 560px;">
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <a href="https://sentinelsportslab.com" style="text-decoration: none; display: inline-block;">
                <span style="display: inline-block; vertical-align: middle; width: 32px; height: 32px; background-color: ${COLORS.primary}; border-radius: 7px; line-height: 32px; text-align: center; color: #ffffff; font-weight: 800; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">S</span>
                <span style="display: inline-block; vertical-align: middle; margin-left: 10px; font-size: 17px; font-weight: 700; color: ${COLORS.text}; letter-spacing: -0.01em;">Sentinel <span style="color: ${COLORS.primary};">SportsLab</span></span>
              </a>
            </td>
          </tr>
        </table>

        <!-- Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="email-card" style="max-width: 560px; background-color: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 14px; overflow: hidden;">
          <tr>
            <td style="padding: 36px 32px 28px;">
              <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; line-height: 1.3; color: ${COLORS.text}; letter-spacing: -0.01em;">${escapeHtml(heading)}</h1>
              <div style="font-size: 15px; line-height: 1.6; color: ${COLORS.textMute};">
                ${introHtml || ''}
              </div>
              ${ctaBlock}
              ${postCtaHtml ? `<div style="font-size: 13px; line-height: 1.55; color: ${COLORS.textFaint};">${postCtaHtml}</div>` : ''}
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 560px; margin-top: 24px;">
          <tr>
            <td align="center" style="padding: 0 16px; font-size: 12px; line-height: 1.55; color: ${COLORS.textFaint};">
              ${footerNote ? `<p style="margin: 0 0 12px;">${footerNote}</p>` : ''}
              <p style="margin: 0 0 6px;">
                <strong style="color: ${COLORS.textMute};">Sentinel SportsLab</strong>
                &nbsp;·&nbsp;
                Athlete monitoring &amp; performance intelligence
              </p>
              <p style="margin: 0 0 6px;">
                <a href="https://sentinelsportslab.com" style="color: ${COLORS.textMute}; text-decoration: none;">sentinelsportslab.com</a>
                &nbsp;·&nbsp;
                <a href="mailto:support@sentinelsportslab.com" style="color: ${COLORS.textMute}; text-decoration: none;">support@sentinelsportslab.com</a>
              </p>
              <p style="margin: 14px 0 0; color: ${COLORS.textFaint};">
                Didn't request this? You can safely ignore it.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
