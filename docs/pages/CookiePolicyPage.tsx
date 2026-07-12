/**
 * CookiePolicyPage — describes the (minimal) cookies and browser-storage
 * mechanisms used by Sentinel SportsLab. Kept deliberately short because
 * the platform does not run analytics, advertising, or third-party tracking.
 */

import React from 'react';
import LegalLayout from '../components/layout/LegalLayout';

const CookiePolicyPage: React.FC = () => {
    return (
        <LegalLayout
            title="Cookie Policy"
            lastUpdated="30 May 2026"
            summary={
                <span>
                    We use a minimal set of cookies and browser storage — essential session storage for authentication, plus a single preference cookie for theme. <strong>We do not use analytics cookies, advertising cookies, or third-party tracking.</strong>
                </span>
            }
        >
            <h2>1. What This Policy Covers</h2>
            <p>This page describes how Sentinel SportsLab uses cookies and similar browser-storage mechanisms (such as <em>localStorage</em> and <em>sessionStorage</em>) when you visit our website or use the Platform. It supplements our <a href="/privacy">Privacy Policy</a>, which describes the broader handling of personal information.</p>

            <h2>2. What We Use, and Why</h2>
            <h3>2.1 Essential storage (required)</h3>
            <p>These are necessary for the Platform to function. Disabling them will prevent you from signing in.</p>
            <ul>
                <li><strong>Supabase authentication session</strong> — stored in browser <em>localStorage</em>. Holds the session token issued when you sign in, so you remain authenticated across page loads. Cleared when you sign out or when the session expires.</li>
            </ul>

            <h3>2.2 Functional storage</h3>
            <ul>
                <li><strong>Theme preference</strong> — stored in browser <em>localStorage</em>. Remembers whether you have selected dark or light mode. Contains no personal information and is not transmitted to our servers.</li>
                <li><strong>UI state (e.g. last-selected team, sidebar collapsed/expanded)</strong> — stored locally where applicable, to preserve your working context between visits. Contains no personal information.</li>
            </ul>

            <h3>2.3 Analytics, advertising, third-party tracking</h3>
            <p>None. We do not currently run any analytics platform (no Google Analytics, no Plausible, no Mixpanel, no Hotjar, no Segment), no advertising network cookies, and no third-party social-media trackers.</p>
            <p>If we introduce anonymised product analytics in future (for example, to understand which features are most used), this policy will be updated, and existing users will be notified. Any future analytics will be limited to anonymised, aggregated usage data and will not build individual behavioural profiles.</p>

            <h2>3. How to Manage Cookies and Storage</h2>
            <p>You can clear cookies and browser storage at any time through your browser settings:</p>
            <ul>
                <li><strong>Chrome / Edge / Brave:</strong> Settings → Privacy and security → Clear browsing data → Cookies and other site data</li>
                <li><strong>Firefox:</strong> Settings → Privacy &amp; Security → Cookies and Site Data → Clear Data</li>
                <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
            </ul>
            <p>Clearing the Supabase session storage will sign you out of the Platform — you will need to sign in again.</p>

            <h2>4. Public Form Submissions</h2>
            <p>Public wellness or injury submission links (the ones organisations share with their athletes) do not require an account and do not set authentication cookies. They use a short-lived URL token to bind the submission to the issuing organisation's workspace, and they may use sessionStorage temporarily to preserve form progress if the page is reloaded. Form data is submitted to our database when the athlete completes the form.</p>

            <h2>5. Changes to This Policy</h2>
            <p>If we introduce additional cookies — particularly if we add product analytics or any third-party service — this page will be updated, and active organisation subscribers will be notified by email before the change takes effect.</p>

            <h2>6. Contact</h2>
            <p>Questions about cookies or this policy: <strong>hello@sentinelsportslab.com</strong> (subject: "Cookie Policy Enquiry").</p>
        </LegalLayout>
    );
};

export default CookiePolicyPage;
