/**
 * PrivacyPolicyPage — POPIA-compliant privacy policy for Sentinel SportsLab.
 *
 * Adapted from the Sentinel Football Hub privacy policy structure (same
 * Responsible Party, same Information Officer, same EU-hosted Supabase
 * infrastructure). Content substantively rewritten for SportsLab's actual
 * data flows: athlete monitoring (wellness, load, GPS, tests) — no match
 * footage, no player analysis service. POPIA section references are
 * statutory and reproduced verbatim from the Act.
 *
 * IMPORTANT — this document should be reviewed by a South African
 * privacy attorney before public sign-ups open and before any paid
 * subscription is collected. The content here represents a good-faith
 * adaptation but does not constitute legal advice.
 */

import React from 'react';
import LegalLayout from '../components/layout/LegalLayout';

const PrivacyPolicyPage: React.FC = () => {
    return (
        <LegalLayout
            title="Privacy Policy"
            lastUpdated="30 May 2026"
            summary={
                <span>
                    <strong>South African law applies.</strong> This policy is governed by the Protection of Personal Information Act 4 of 2013 (POPIA), the Electronic Communications and Transactions Act 25 of 2002 (ECT Act), and the Consumer Protection Act 68 of 2008 (CPA). Your rights as a data subject and our obligations as the Responsible Party are set out below.
                </span>
            }
        >
            <h2>Contents</h2>
            <ol>
                <li><a href="#s1">Who we are</a></li>
                <li><a href="#s2">Information we collect</a></li>
                <li><a href="#s3">Why we collect it (lawful basis)</a></li>
                <li><a href="#s4">Minor athletes (under 18)</a></li>
                <li><a href="#s5">How we use your information</a></li>
                <li><a href="#s6">Who we share it with</a></li>
                <li><a href="#s7">Cross-border transfers</a></li>
                <li><a href="#s8">How long we keep it</a></li>
                <li><a href="#s9">Your rights under POPIA</a></li>
                <li><a href="#s10">Cookies</a></li>
                <li><a href="#s11">Security</a></li>
                <li><a href="#s12">Contact &amp; complaints</a></li>
            </ol>

            <h2 id="s1">1. Who We Are</h2>
            <p>Sentinel SportsLab (Pty) Ltd ("<strong>Sentinel</strong>", "<strong>we</strong>", "<strong>us</strong>") operates the Sentinel SportsLab platform — an athlete monitoring and sport-science intelligence tool used by coaches, sport scientists, and performance staff. We are the Responsible Party for personal information processed in connection with the platform.</p>
            <p>We operate in two capacities depending on the data involved:</p>
            <table>
                <thead><tr><th>Data stream</th><th>Our role</th><th>What that means</th></tr></thead>
                <tbody>
                    <tr><td>Organisation subscriber data (admin accounts, coach accounts, billing details)</td><td>Responsible Party</td><td>We decide why and how this data is processed</td></tr>
                    <tr><td>Athlete and team data uploaded or entered by subscribing organisations</td><td>Operator (Processor)</td><td>We process this on the organisation's instruction; the organisation is the Responsible Party</td></tr>
                    <tr><td>Wellness/training data submitted by athletes via public forms (e.g. daily wellness check-ins)</td><td>Operator (Processor)</td><td>Processed on behalf of the athlete's organisation</td></tr>
                </tbody>
            </table>
            <p>Our designated Information Officer is registered with the South African Information Regulator as required by POPIA Section 55. Contact details are in Section 12.</p>

            <h2 id="s2">2. Information We Collect</h2>
            <h3>2.1 Organisation administrators and coaches (account holders)</h3>
            <ul>
                <li>First name, surname, email address</li>
                <li>Organisation name, organisation type (club, academy, performance lab, private practice)</li>
                <li>Role within the organisation (admin, coach, sport scientist, viewer)</li>
                <li>Subscription tier and billing contact information</li>
                <li>Usage logs and feature interaction data</li>
                <li>Optional profile details (phone, photo) provided voluntarily</li>
            </ul>

            <h3>2.2 Athlete data entered or uploaded by organisations</h3>
            <ul>
                <li>Athlete name, date of birth, position or discipline, squad number, team affiliation</li>
                <li>Anthropometric data (height, weight) and physical performance metrics</li>
                <li>Training load data (RPE, session duration, GPS-derived metrics such as total distance, high-speed running, accelerations)</li>
                <li>Wellness questionnaire responses (FIFA/IOC daily and weekly check-ins): subjective fatigue, soreness, sleep, stress, mood, readiness</li>
                <li>Injury and illness records, including body-map area annotations and follow-up classification</li>
                <li>Standardised test results (jump, sprint, strength, hamstring, conditioning)</li>
                <li>Coach observations, ratings, and session notes</li>
                <li>Optional profile images uploaded by the organisation</li>
            </ul>

            <h3>2.3 Data submitted by athletes via public share links</h3>
            <p>Where an organisation issues a public share link (e.g. a daily wellness form), athletes may submit their own responses directly. This data is associated with the athlete record in the organisation's workspace.</p>
            <ul>
                <li>Wellness questionnaire responses</li>
                <li>Self-reported injury or illness information</li>
                <li>Athlete-uploaded images (e.g. body-area annotations)</li>
            </ul>

            <h3>2.4 Organisation library customisations</h3>
            <p>The Platform ships with a default library of exercises, protocols, and reference materials (collectively the "Platform Library"). Organisations may edit any item in the Platform Library, add their own custom items, attach images or video links, and adjust descriptions. These customisations ("Organisation Library Customisations") are stored separately from the original Platform Library entries and are visible only inside the subscribing organisation's workspace.</p>
            <p>We retain a record of Organisation Library Customisations on our infrastructure to deliver the Platform to you. We do <strong>not</strong> use the content of those customisations to improve the Platform Library by default. A future opt-in mechanism may be added so that organisations who choose to do so can elect to share specific customisations back to the Platform Library, where they may inform improvements that all organisations benefit from. Until that opt-in is in place and you have explicitly enabled it, your customisations remain private to your organisation.</p>

            <h3>2.5 Automatically collected technical data</h3>
            <ul>
                <li>Browser type, device type, operating system</li>
                <li>IP address (used transiently for security and rate-limiting; not stored in identifiable form for analytics)</li>
                <li>Session tokens for authentication</li>
                <li>Page-level usage analytics (anonymised — no individual behavioural profiling)</li>
            </ul>

            <div className="callout">
                <strong>We do not collect</strong> payment card numbers, national identity numbers, passport numbers, or biometric identifiers. Payment card data, when subscriptions are added, is handled by our payment processor and never stored on our infrastructure.
            </div>

            <h2 id="s3">3. Why We Collect It (Lawful Basis)</h2>
            <p>POPIA requires us to have a lawful justification for every processing purpose. Our justifications are:</p>
            <table>
                <thead><tr><th>Purpose</th><th>Lawful basis (POPIA)</th></tr></thead>
                <tbody>
                    <tr><td>Providing the platform to organisation subscribers</td><td>Contractual necessity (s11(1)(b))</td></tr>
                    <tr><td>Processing organisation-uploaded athlete data</td><td>Operator instruction from the organisation (s21); the organisation is responsible for obtaining athlete or parent/guardian consent as required</td></tr>
                    <tr><td>Receiving athlete-submitted wellness data via public forms</td><td>Operator instruction; consent at the time of submission</td></tr>
                    <tr><td>Billing and subscription management</td><td>Contractual necessity; legal obligation (tax records)</td></tr>
                    <tr><td>Security, fraud prevention, abuse detection</td><td>Legitimate interest (s11(1)(f)); legal obligation</td></tr>
                    <tr><td>Platform improvement (anonymised usage analytics only)</td><td>Legitimate interest (s11(1)(f))</td></tr>
                    <tr><td>Account, security, and service notifications</td><td>Contractual necessity</td></tr>
                    <tr><td>Optional product update emails or marketing</td><td>Opt-in consent (s11(1)(a))</td></tr>
                </tbody>
            </table>

            <h2 id="s4">4. Minor Athletes (Under 18)</h2>
            <div className="callout">
                <strong>Special protection applies.</strong> POPIA Sections 34 and 35 impose strict requirements on the processing of personal information of children (persons under 18). This section applies to all athlete records where the athlete is a minor.
            </div>

            <h3>4.1 Organisation responsibility for minor athlete data</h3>
            <p>When an organisation enters minor athletes into the platform, the organisation (as the Responsible Party in respect of that athlete data) is legally required to obtain consent from a "<strong>competent person</strong>" — meaning a parent, legal guardian, or person who has parental responsibility for the minor — before entering that athlete's personal information. By accepting our Terms of Service, organisation subscribers confirm they have obtained this consent for every minor athlete they add to the platform.</p>

            <h3>4.2 Athlete self-submission for minors</h3>
            <p>Where an organisation issues a public wellness form intended to be completed by athletes themselves, and where any athlete completing the form is under 18, the organisation must ensure the appropriate competent person has consented to the athlete's use of the form and submission of the data captured.</p>

            <h3>4.3 What we do with minor athlete data</h3>
            <ul>
                <li>We process it only on the organisation's instruction</li>
                <li>We do not use minor athlete data for platform analytics, product research, or marketing</li>
                <li>We do not share minor athlete data with third parties except as strictly required to deliver the service (see Section 6) or as required by law</li>
                <li>We apply the same — or stricter — technical security standards to minor athlete data as we do to adult data</li>
            </ul>

            <h3>4.4 Retention of minor athlete data</h3>
            <p>Minor athlete records are deleted when the organisation removes them, when the organisation cancels its subscription and the post-cancellation grace period expires, or when otherwise required by law. Organisations retain primary responsibility for ensuring that minor athlete data they upload is current and that consent remains valid.</p>

            <h2 id="s5">5. How We Use Your Information</h2>
            <ul>
                <li><strong>Platform operation:</strong> authenticating users; displaying athlete, team, and wellness data; computing derived metrics (ACWR load monitoring, Hooper Index, wellness flags); managing subscriptions</li>
                <li><strong>Communication:</strong> account activation emails, password resets, subscription confirmations, security notices, and material platform changes</li>
                <li><strong>Security:</strong> detecting and preventing unauthorised access, abuse, and fraud</li>
                <li><strong>Legal compliance:</strong> fulfilling obligations under POPIA, the Tax Administration Act, SARS requirements, and lawful court orders</li>
                <li><strong>Platform improvement:</strong> anonymised, aggregated usage analytics to inform product decisions — we do not build individual behavioural profiles, and we do not use minor athlete data for any improvement analytics</li>
            </ul>
            <p>We do not sell personal information to third parties. We do not use personal information for automated decision-making that produces legal effects on data subjects.</p>

            <h2 id="s6">6. Who We Share Your Information With</h2>
            <table>
                <thead><tr><th>Recipient</th><th>What is shared</th><th>Why</th></tr></thead>
                <tbody>
                    <tr><td>Supabase Inc (database, authentication, file storage)</td><td>All platform data (encrypted at rest)</td><td>Core infrastructure</td></tr>
                    <tr><td>Vercel Inc (hosting, CDN)</td><td>Static assets, page requests, transient request metadata</td><td>Application delivery</td></tr>
                    <tr><td>Payment processor (provider TBD at first paid subscription)</td><td>Billing contact details, transaction amount, payment-method tokens — no raw card data</td><td>Subscription billing</td></tr>
                    <tr><td>South African Revenue Service</td><td>Billing and transaction records as required for tax compliance</td><td>Legal obligation under Tax Administration Act</td></tr>
                    <tr><td>Law enforcement, courts, regulators</td><td>As compelled by valid lawful order</td><td>Legal obligation — we will notify the affected data subject unless prohibited by law</td></tr>
                </tbody>
            </table>
            <p>We require all service providers who process personal information on our behalf to be bound by data processing agreements and to maintain security standards equivalent to or stronger than our own. The current sub-processor list is published in our <a href="/data-processing">Data Processing</a> page.</p>

            <h2 id="s7">7. Cross-Border Transfers</h2>
            <p>Our database and authentication infrastructure is hosted by Supabase on servers located in the European Union (eu-west-1, Ireland). POPIA Section 72 restricts the transfer of personal information to recipients outside South Africa unless adequate protections are in place.</p>
            <p>We rely on the following transfer mechanisms for EU-hosted infrastructure:</p>
            <ul>
                <li><strong>Informed consent (s72(1)(b)(ii)):</strong> By registering for and using the platform, you acknowledge that your data is hosted on servers in the European Union and provide informed consent for that transfer</li>
                <li><strong>Equivalent protection (s72(1)(a)):</strong> The European Union's GDPR imposes data protection obligations on Supabase that are equivalent to or stricter than POPIA's substantive requirements</li>
                <li><strong>Contractual safeguards:</strong> We maintain a Data Processing Agreement with Supabase that governs how your data is processed, retained, and protected</li>
            </ul>
            <div className="callout">
                <strong>Note:</strong> South Africa has not made a formal adequacy determination for the European Union under POPIA. We monitor developments at the Information Regulator and will update our transfer mechanisms as the regulatory framework evolves. Organisations with heightened data-localisation requirements should consult a qualified SA privacy attorney before subscribing.
            </div>

            <h2 id="s8">8. How Long We Keep Your Information</h2>
            <table>
                <thead><tr><th>Data category</th><th>Retention period</th><th>Legal basis</th></tr></thead>
                <tbody>
                    <tr><td>Active organisation subscriber accounts</td><td>Duration of subscription</td><td>Contractual necessity</td></tr>
                    <tr><td>Athlete data in active subscriber workspaces</td><td>Duration of organisation subscription</td><td>Operator instruction</td></tr>
                    <tr><td>Data after account cancellation</td><td>30 days, then permanently deleted</td><td>Reasonable recovery period</td></tr>
                    <tr><td>Billing and transaction records</td><td>5 years from transaction date</td><td>Tax Administration Act; Companies Act</td></tr>
                    <tr><td>Security and authentication logs</td><td>12 months</td><td>Legitimate interest — fraud and security</td></tr>
                    <tr><td>Marketing consent records (where applicable)</td><td>3 years from last consent or withdrawal</td><td>Demonstrating compliance with POPIA s69</td></tr>
                </tbody>
            </table>
            <p>When the retention period expires, personal information is securely deleted or anonymised such that it can no longer be attributed to an individual.</p>

            <h2 id="s9">9. Your Rights Under POPIA</h2>
            <p>POPIA grants the following rights to data subjects. These rights apply to personal information for which Sentinel is the Responsible Party. For athlete data uploaded by an organisation, requests should be directed to the organisation in the first instance — they are the Responsible Party for that data, and we process it on their instruction.</p>
            <ul>
                <li><strong>Right of access (s23):</strong> You may request confirmation of whether we hold personal information about you and a copy of that information. We respond within 30 days, free of charge for a first request.</li>
                <li><strong>Right to correction or deletion (s24):</strong> You may request that we correct inaccurate, incomplete, or out-of-date personal information, or delete personal information we are no longer entitled to retain.</li>
                <li><strong>Right to object (s11(3)):</strong> You may object to the processing of your personal information on grounds relating to your particular situation where we rely on legitimate interest as our lawful basis.</li>
                <li><strong>Right to object to direct marketing (s69):</strong> You may object at any time to the processing of your personal information for direct marketing purposes, free of charge.</li>
                <li><strong>Right to complain:</strong> You may lodge a complaint with the South African Information Regulator (see Section 12).</li>
            </ul>
            <div className="callout">
                To exercise any of these rights, send a written request to <strong>stokeswallerq@gmail.com</strong> (subject: "Data Rights Request — SportsLab") with sufficient information for us to identify you. We will respond within 30 days. We may request proof of identity before processing your request.
            </div>

            <h2 id="s10">10. Cookies</h2>
            <p>We use a minimal set of cookies and browser storage. See our <a href="/cookies">Cookie Policy</a> for full details. In summary:</p>
            <ul>
                <li><strong>Essential:</strong> Supabase authentication tokens stored in browser local storage — required for the platform to function. Cannot be disabled.</li>
                <li><strong>Functional:</strong> Theme preference (dark/light mode) stored in local storage — no personal information.</li>
            </ul>
            <p>We do not use advertising cookies or third-party tracking cookies.</p>

            <h2 id="s11">11. Security</h2>
            <p>We implement the following technical and organisational measures to protect personal information:</p>
            <ul>
                <li>All data is encrypted in transit (TLS 1.2 or higher) and at rest (AES-256)</li>
                <li>Authentication is handled by Supabase Auth with secure session-token management</li>
                <li>Row-level security policies enforce strict workspace isolation — each subscribing organisation can only access its own data</li>
                <li>Access to production infrastructure is restricted to authorised personnel only</li>
                <li>We conduct regular security reviews of our codebase, dependency tree, and infrastructure configuration</li>
                <li>File uploads (e.g. athlete photos) are stored in access-controlled object storage with time-limited signed URLs</li>
                <li>Public form links (e.g. daily wellness submissions) carry per-organisation tokens that bind submissions to the issuing workspace</li>
            </ul>

            <h3>Data breach notification</h3>
            <p>In the event of a data breach that is likely to affect your rights, we will notify the South African Information Regulator via the eServices Portal (Form SCN1) within 72 hours of becoming aware of the breach, as required by POPIA and current Information Regulator guidance. We will notify affected data subjects as soon as reasonably practicable after notifying the Regulator.</p>

            <h2 id="s12">12. Contact &amp; Complaints</h2>
            <h3>Information Officer</h3>
            <p>
                Quintin Stokes-Waller<br />
                Information Officer, Sentinel SportsLab (Pty) Ltd<br />
                Email: <strong>stokeswallerq@gmail.com</strong> (subject: "Privacy Request — SportsLab")
            </p>

            <h3>General enquiries</h3>
            <p>
                Email: <strong>hello@sentinelsportslab.com</strong><br />
                Registered in South Africa
            </p>

            <h3>Complaints — Information Regulator of South Africa</h3>
            <p>If you are not satisfied with our response, you have the right to lodge a complaint with the Information Regulator:</p>
            <ul>
                <li>Website: <strong>www.inforegulator.org.za</strong></li>
                <li>Email: <strong>inforeg@justice.gov.za</strong></li>
                <li>Address: JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001</li>
            </ul>

            <h3>Changes to this policy</h3>
            <p>We may update this Privacy Policy from time to time. We will notify organisation subscribers by email and post a notice on the platform before any material change takes effect. Continued use of the platform after the effective date constitutes acceptance of the updated policy. The "last updated" date at the top of this document will always reflect the most recent revision.</p>

            <div className="callout" style={{ marginTop: '2rem' }}>
                <strong>Legal review notice.</strong> This policy reflects our good-faith understanding of POPIA at the date of last revision. It is not legal advice, and we recommend that organisations with specific compliance obligations seek their own qualified counsel. We welcome feedback if you believe any section can be clarified or improved.
            </div>
        </LegalLayout>
    );
};

export default PrivacyPolicyPage;
