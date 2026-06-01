// @ts-nocheck
/**
 * DataProcessingPage — sub-processor transparency, cross-border-transfer
 * disclosure, security measures, and breach-notification commitments.
 *
 * Required for POPIA s72 transparency on cross-border transfers and GDPR
 * Article 28 sub-processor disclosure (relevant for any EU-resident data
 * subjects that may interact with the platform).
 *
 * IMPORTANT — this document should be reviewed by a South African
 * commercial / privacy attorney before paid subscriptions are taken.
 */

import React from 'react';
import LegalLayout from '../components/layout/LegalLayout';

const DataProcessingPage: React.FC = () => {
    return (
        <LegalLayout
            title="Data Processing"
            lastUpdated="30 May 2026"
            summary={
                <span>
                    This page sets out the third-party services that process personal information on our behalf, what data they receive, where it is stored, and the security measures applied to it. Required for transparency under POPIA s72 (cross-border transfers) and GDPR Article 28 (sub-processor disclosure).
                </span>
            }
        >
            <h2>1. Roles Under POPIA</h2>
            <p>For data we collect about account holders (coaches, sport scientists, organisation administrators) and billing contacts, we act as <strong>Responsible Party</strong> under POPIA. For athlete data uploaded by subscribing organisations, we act as <strong>Operator</strong> (Processor) — the organisation is the Responsible Party for that data. The roles are described in full in our <a href="/privacy">Privacy Policy</a>.</p>

            <h2>2. Current Sub-Processors</h2>
            <p>We engage the following third-party service providers to operate the Platform. Each is bound by a Data Processing Agreement (DPA) or equivalent contractual arrangement that requires them to maintain security standards equivalent to or stronger than our own.</p>
            <table>
                <thead>
                    <tr>
                        <th>Service</th>
                        <th>Purpose</th>
                        <th>Data received</th>
                        <th>Hosting region</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Supabase Inc</strong></td>
                        <td>Primary database, authentication, file storage, real-time subscriptions</td>
                        <td>All Platform data: account information, athlete records, wellness submissions, training and load data, test results, injury records, uploaded images</td>
                        <td>European Union (eu-west-1, Ireland)</td>
                    </tr>
                    <tr>
                        <td><strong>Vercel Inc</strong></td>
                        <td>Static hosting, content delivery network, edge functions</td>
                        <td>HTTP request metadata (URL, method, IP address — transient, not stored in identifiable form for analytics)</td>
                        <td>Global edge network</td>
                    </tr>
                    <tr>
                        <td><strong>Payment processor</strong> <em>(provider to be selected at first paid subscription)</em></td>
                        <td>Subscription billing and recurring charges</td>
                        <td>Billing name, email, billing address, payment-method tokens — <strong>no raw card data is stored on our infrastructure</strong></td>
                        <td>To be disclosed at provider selection</td>
                    </tr>
                </tbody>
            </table>
            <p>If we engage a new sub-processor, this page will be updated and active organisation subscribers will be notified by email at least 14 days before that sub-processor begins processing your data.</p>

            <h2>3. Cross-Border Transfers</h2>
            <p>Our primary infrastructure (Supabase) is hosted in the European Union. POPIA Section 72 restricts the transfer of personal information to a recipient outside South Africa unless one of the conditions in s72(1) is met.</p>
            <p>We rely on the following grounds:</p>
            <ul>
                <li><strong>s72(1)(b)(ii) — informed consent:</strong> By registering for and using the Platform, you provide informed consent to the transfer of your personal information to Supabase's EU infrastructure. This consent can be withdrawn at any time by cancelling your subscription.</li>
                <li><strong>s72(1)(a) — equivalent protection:</strong> Supabase is subject to the European Union's General Data Protection Regulation (GDPR), which provides data-protection guarantees that are equivalent to or stricter than POPIA's substantive requirements.</li>
                <li><strong>Contractual safeguards:</strong> Our DPA with Supabase imposes binding obligations on processing, retention, and security.</li>
            </ul>
            <div className="callout">
                <strong>South Africa has not (at the date of this revision) issued a formal adequacy determination for the European Union under POPIA.</strong> We track Information Regulator guidance and will adjust our transfer mechanisms if the regulatory position changes. Organisations subject to heightened data-localisation obligations should consult their own privacy counsel before subscribing.
            </div>

            <h2>4. Security Measures</h2>
            <p>We implement the following technical and organisational measures to protect personal information processed on or via the Platform:</p>
            <h3>4.1 Encryption</h3>
            <ul>
                <li><strong>In transit:</strong> TLS 1.2 or higher for all connections between client and server, between client and Supabase, and between our edge functions and the database</li>
                <li><strong>At rest:</strong> AES-256 encryption applied to the database and file storage at the infrastructure layer</li>
            </ul>

            <h3>4.2 Access control</h3>
            <ul>
                <li>Row-level security (RLS) policies enforce strict workspace isolation — each subscribing organisation can only access its own data; cross-organisation read is impossible at the database layer, not merely at the application layer</li>
                <li>Authentication is handled by Supabase Auth with secure session-token management; tokens are stored in browser local storage and expire on inactivity</li>
                <li>Production-system access is restricted to authorised Sentinel personnel only and audit-logged</li>
            </ul>

            <h3>4.3 Application-layer protections</h3>
            <ul>
                <li>File uploads (e.g. athlete photos) are stored in access-controlled object storage; URLs are time-limited and signed</li>
                <li>Public form submissions (e.g. daily wellness check-ins) use per-organisation tokens that bind submissions to the correct workspace</li>
                <li>Input validation on all user-supplied data; parameterised queries throughout to prevent SQL injection</li>
                <li>Dependency vulnerability monitoring on the application codebase</li>
            </ul>

            <h3>4.4 Organisational measures</h3>
            <ul>
                <li>Code review on changes that touch authentication, authorisation, or data-access paths</li>
                <li>Restricted production access — credentials managed centrally and rotated periodically</li>
                <li>Incident response runbook covering containment, investigation, and notification</li>
            </ul>

            <h2>5. Data Retention</h2>
            <p>Retention periods are set out in detail in our <a href="/privacy">Privacy Policy</a>, Section 8. In summary:</p>
            <ul>
                <li>Active subscriber data is retained for the duration of the subscription</li>
                <li>Following cancellation, data is retained for 30 days (recovery window) and then securely deleted</li>
                <li>Billing and transaction records are retained for 5 years to satisfy obligations under the Tax Administration Act</li>
                <li>Security and authentication logs are retained for 12 months</li>
            </ul>

            <h2>6. Data Breach Notification</h2>
            <p>In the event of a security incident that gives rise to a reasonable belief that personal information has been accessed or acquired by an unauthorised person, we will:</p>
            <ul>
                <li>Notify the South African Information Regulator via the eServices Portal (Form SCN1) within 72 hours of becoming aware of the incident, as required by POPIA s22 and current Information Regulator guidance</li>
                <li>Notify affected organisations and any individual data subjects we are required to notify, as soon as reasonably practicable after notifying the Regulator and subject to any direction the Regulator may give</li>
                <li>Provide details of the scope of the incident, the data affected, the likely consequences, and the steps taken to remediate</li>
            </ul>

            <h2>7. Your Rights and Requests</h2>
            <p>If you are an account holder, you may exercise your POPIA rights (access, correction, deletion, objection, complaint) by following the procedure set out in our Privacy Policy, Section 9.</p>
            <p>If you are an athlete whose data is held by a subscribing organisation, please direct your request to that organisation in the first instance — they are the Responsible Party for your data and we process it on their instruction.</p>

            <h2>8. Contact</h2>
            <p>
                Information Officer: Quintin Stokes-Waller<br />
                Sentinel SportsLab (Pty) Ltd<br />
                Email: <strong>stokeswallerq@gmail.com</strong> (subject: "DPO Enquiry — SportsLab")<br />
                Registered in South Africa
            </p>

            <div className="callout" style={{ marginTop: '2rem' }}>
                <strong>Legal review notice.</strong> This page reflects our good-faith understanding of POPIA, GDPR, and standard sub-processor transparency obligations at the date of last revision. It is not legal advice. Organisations with specific compliance obligations should consult their own qualified counsel.
            </div>
        </LegalLayout>
    );
};

export default DataProcessingPage;
