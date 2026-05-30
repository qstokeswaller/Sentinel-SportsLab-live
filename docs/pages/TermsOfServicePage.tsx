// @ts-nocheck
/**
 * TermsOfServicePage — platform terms governing access to and use of
 * Sentinel SportsLab. Covers: acceptance, accounts, acceptable use, the
 * 21-day pilot, billing, refunds, service availability, IP, data ownership,
 * liability, suspension/termination, and SA governing law.
 *
 * IMPORTANT — this document should be reviewed by a South African
 * commercial attorney before any paid subscription is collected. The
 * content reflects standard SaaS practice and POPIA/ECT Act/CPA awareness
 * but does not constitute legal advice.
 */

import React from 'react';
import LegalLayout from '../components/layout/LegalLayout';

const TermsOfServicePage: React.FC = () => {
    return (
        <LegalLayout
            title="Terms of Service"
            lastUpdated="30 May 2026"
            summary={
                <span>
                    <strong>Governing law:</strong> Republic of South Africa. <strong>Operator:</strong> Sentinel SportsTech (Pty) Ltd. By creating an account or otherwise using the Sentinel SportsLab platform, you agree to be bound by these terms.
                </span>
            }
        >
            <h2>Contents</h2>
            <ol>
                <li><a href="#t1">Definitions</a></li>
                <li><a href="#t2">Acceptance and eligibility</a></li>
                <li><a href="#t3">Your account</a></li>
                <li><a href="#t4">Acceptable use</a></li>
                <li><a href="#t5">The 21-day pilot</a></li>
                <li><a href="#t6">Subscription, billing &amp; pricing</a></li>
                <li><a href="#t7">Refunds, cancellation &amp; downgrade</a></li>
                <li><a href="#t8">Service availability</a></li>
                <li><a href="#t9">Intellectual property</a></li>
                <li><a href="#t10">Your data &amp; export</a></li>
                <li><a href="#t11">Privacy &amp; data protection</a></li>
                <li><a href="#t12">Limitation of liability</a></li>
                <li><a href="#t13">Suspension &amp; termination</a></li>
                <li><a href="#t14">Changes to these terms</a></li>
                <li><a href="#t15">Governing law &amp; disputes</a></li>
                <li><a href="#t16">Contact</a></li>
            </ol>

            <h2 id="t1">1. Definitions</h2>
            <ul>
                <li><strong>"Platform"</strong> means the Sentinel SportsLab web application and any associated services, public forms, and APIs.</li>
                <li><strong>"Operator"</strong>, <strong>"we"</strong>, <strong>"us"</strong> means Sentinel SportsTech (Pty) Ltd, a private company registered in South Africa.</li>
                <li><strong>"Organisation"</strong> means the subscribing entity — a club, academy, performance lab, private practice, or other body — under whose subscription one or more user accounts operate.</li>
                <li><strong>"User"</strong> or <strong>"you"</strong> means an individual with a registered account on the Platform.</li>
                <li><strong>"Athlete data"</strong> means personal information about athletes uploaded, entered, or submitted to the Platform via an organisation's workspace.</li>
                <li><strong>"Pilot"</strong> means the 21-day guided pilot described in Section 5.</li>
            </ul>

            <h2 id="t2">2. Acceptance and Eligibility</h2>
            <p>By creating an account, accessing the Platform, or using any service we provide, you confirm that you have read, understood, and agree to these Terms of Service together with our <a href="/privacy">Privacy Policy</a>, <a href="/cookies">Cookie Policy</a>, and <a href="/data-processing">Data Processing</a> page.</p>
            <p>You must be at least 18 years of age to create an account. If you register on behalf of an organisation, you confirm that you are authorised to bind that organisation to these terms.</p>

            <h2 id="t3">3. Your Account</h2>
            <p>You are responsible for:</p>
            <ul>
                <li>Maintaining the confidentiality of your login credentials</li>
                <li>All activity that occurs under your account</li>
                <li>Notifying us promptly of any unauthorised access or suspected compromise</li>
                <li>Ensuring that the information you provide to us is accurate and kept up to date</li>
            </ul>
            <p>Each subscription is licensed to a specified number of user seats (see Section 6). Sharing a single account between multiple individuals is not permitted — additional users must each hold their own account within the organisation's seat allocation.</p>

            <h2 id="t4">4. Acceptable Use</h2>
            <p>You must not, and must not permit any other person to, use the Platform to:</p>
            <ul>
                <li>Violate any applicable law or regulation</li>
                <li>Infringe the intellectual property, privacy, or other rights of any third party</li>
                <li>Upload, submit, or transmit data that you do not have the right to share, including athlete data for which the necessary consent has not been obtained</li>
                <li>Transmit malware, viruses, or any other harmful code</li>
                <li>Attempt to gain unauthorised access to any part of the Platform, other accounts, or our infrastructure</li>
                <li>Probe, scan, or test the vulnerability of any system or network without prior written authorisation</li>
                <li>Use the Platform for any commercial resale, white-labelling, or service-bureau arrangement without our prior written consent</li>
                <li>Reverse-engineer, decompile, or otherwise attempt to derive the source code of the Platform</li>
                <li>Use automated systems (bots, scrapers) to extract data from the Platform other than via documented export features</li>
            </ul>

            <h2 id="t5">5. The 21-Day Pilot</h2>
            <p>We offer a 21-day guided pilot on all subscription tiers. The pilot is structured around three phases:</p>
            <ul>
                <li><strong>Week 1 — Setup &amp; onboarding:</strong> account provisioning, data import, workflow alignment, guided walkthroughs</li>
                <li><strong>Week 2 — Active usage:</strong> day-to-day operation, applying features in real scenarios</li>
                <li><strong>Week 3 — Evaluation &amp; refinement:</strong> structured feedback, addressing sticking points, long-term integration planning</li>
            </ul>
            <p>No payment method is required to begin the pilot. At the end of the pilot, your account will be invited to convert to a paid subscription. If you do not convert, your account will become read-only and your data will be retained for the periods stated in our Privacy Policy.</p>

            <h2 id="t6">6. Subscription, Billing &amp; Pricing</h2>
            <p>Current published subscription tiers (exclusive of VAT, in South African Rand):</p>
            <table>
                <thead><tr><th>Tier</th><th>Price</th><th>User seats</th><th>Notes</th></tr></thead>
                <tbody>
                    <tr><td>Basic</td><td>R1,450 / month</td><td>1</td><td>Single-practitioner access to the core platform</td></tr>
                    <tr><td>Performance</td><td>R7,500 / month</td><td>Up to 3</td><td>Wellness, conditioning, and core platform</td></tr>
                    <tr><td>Elite</td><td>R12,550 / month</td><td>Up to 4</td><td>Full platform — organisational tier</td></tr>
                    <tr><td>Custom</td><td>By quotation</td><td>Custom</td><td>Bespoke seat count and feature selection</td></tr>
                </tbody>
            </table>
            <p>Subscriptions are billed monthly in advance. Pricing is shown in ZAR and is exclusive of VAT, which will be added at the prevailing rate where applicable. We reserve the right to change pricing on at least 30 days' notice; price changes apply at the start of the next billing cycle. Your continued use after a price change constitutes acceptance.</p>
            <p>Payment is processed by a third-party payment processor. We do not store raw card data. By providing payment details, you authorise recurring charges for your subscription until cancelled.</p>

            <h2 id="t7">7. Refunds, Cancellation &amp; Downgrade</h2>
            <p>You may cancel your subscription at any time from within the Platform or by emailing us. Cancellation takes effect at the end of the current billing cycle — you retain access for the remainder of the period you have already paid for. We do not issue pro-rata refunds for partial months.</p>
            <p>You may downgrade your subscription at any time. Downgrade takes effect at the start of the next billing cycle. You are responsible for ensuring that your data and active user accounts fit within the seat allocation of the new tier before the downgrade takes effect.</p>
            <p>Where the Consumer Protection Act 68 of 2008 ("CPA") applies and grants additional cooling-off or cancellation rights, those statutory rights are unaffected by this section.</p>

            <h2 id="t8">8. Service Availability</h2>
            <p>We target 99.5% monthly availability for the Platform, measured excluding scheduled maintenance and circumstances beyond our reasonable control (including third-party infrastructure outages, internet failures, and force majeure events). Scheduled maintenance will be announced in advance where possible.</p>
            <p>We do not warrant that the Platform will be uninterrupted, error-free, or that any specific result will be obtained from its use. The Platform is provided on an "as is" and "as available" basis to the maximum extent permitted by South African law.</p>

            <h2 id="t9">9. Intellectual Property</h2>
            <p>The Platform — including its software, design, brand marks, documentation, and original content — is owned by Sentinel SportsTech (Pty) Ltd and is protected by South African and international intellectual property laws. Nothing in these terms transfers any IP rights to you, save for the limited, revocable, non-exclusive licence to access and use the Platform for the duration of your subscription.</p>
            <p>You may not use our brand marks (including "Sentinel SportsLab" and the Sentinel logo) without our prior written consent, save as necessary to factually describe your use of the service.</p>

            <h2 id="t10">10. Your Data &amp; Export</h2>
            <p>Your organisation owns the data you upload, enter, or submit to the Platform ("Your Data"). You grant us a limited licence to host, process, and display Your Data solely to provide the Platform to you and to perform our obligations under these terms.</p>
            <p>You may export Your Data at any time during your active subscription via the export features available within the Platform. Following cancellation, your data is retained for 30 days during which an export request remains available. After that period, your data is securely deleted in accordance with our Privacy Policy.</p>
            <p>You are responsible for ensuring that you have a lawful basis to upload Your Data, including all required consents from athletes or, where the athlete is under 18, from a parent or legal guardian.</p>

            <h2 id="t11">11. Privacy &amp; Data Protection</h2>
            <p>Our handling of personal information is governed by our <a href="/privacy">Privacy Policy</a>. Where we process Athlete Data on behalf of your organisation, we act as an Operator (Processor) under POPIA, and the organisation is the Responsible Party. Our sub-processors are listed in the <a href="/data-processing">Data Processing</a> page.</p>

            <h2 id="t12">12. Limitation of Liability</h2>
            <p>To the maximum extent permitted by South African law:</p>
            <ul>
                <li>We are not liable for indirect, incidental, special, consequential, or punitive damages, including loss of profits, loss of data, loss of business, or loss of goodwill</li>
                <li>Our aggregate liability arising out of or in connection with your use of the Platform, whether in contract, delict, or otherwise, is limited to the total subscription fees paid by you to us in the twelve (12) months immediately preceding the event giving rise to the claim</li>
                <li>Nothing in this section limits or excludes liability that cannot be limited or excluded under the Consumer Protection Act 68 of 2008 or other applicable South African law</li>
            </ul>

            <h2 id="t13">13. Suspension &amp; Termination</h2>
            <p>We may suspend or terminate your access to the Platform, with or without prior notice, where:</p>
            <ul>
                <li>You breach these terms in a manner that is material or repeated</li>
                <li>Your account is used in a manner that endangers the Platform, other users, or third parties</li>
                <li>A payment is overdue and remains unpaid for more than 14 days after notice</li>
                <li>We are required to do so by law or by lawful order</li>
            </ul>
            <p>You may terminate your subscription at any time as set out in Section 7. On termination, the licences granted to you cease and the data retention periods in our Privacy Policy apply.</p>

            <h2 id="t14">14. Changes to These Terms</h2>
            <p>We may update these terms from time to time. Material changes will be notified by email to the account-holder address and by an in-platform banner at least 30 days before they take effect. Continued use of the Platform after the effective date constitutes acceptance of the updated terms. The "last updated" date at the top of this page reflects the most recent revision.</p>

            <h2 id="t15">15. Governing Law &amp; Disputes</h2>
            <p>These terms are governed by and construed in accordance with the laws of the Republic of South Africa. The parties consent to the non-exclusive jurisdiction of the High Court of South Africa, Gauteng Division. Before initiating formal proceedings, the parties will use reasonable efforts to resolve any dispute through good-faith discussion.</p>

            <h2 id="t16">16. Contact</h2>
            <p>
                Sentinel SportsTech (Pty) Ltd<br />
                Email: <strong>hello@sentinelsportslab.com</strong> (general)<br />
                Email: <strong>stokeswallerq@gmail.com</strong> (legal queries, subject: "Legal Enquiry — SportsLab")<br />
                Registered in South Africa
            </p>

            <div className="callout" style={{ marginTop: '2rem' }}>
                <strong>Legal review notice.</strong> These terms reflect standard SaaS practice and our good-faith understanding of South African commercial and consumer law at the date of last revision. They are not legal advice, and we recommend that organisations seek their own qualified counsel where they have specific compliance obligations.
            </div>
        </LegalLayout>
    );
};

export default TermsOfServicePage;
