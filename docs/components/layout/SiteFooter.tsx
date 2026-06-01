// @ts-nocheck
/**
 * SiteFooter — shared public-facing footer for landing, legal, and contact pages.
 *
 * Gradient matches the Final CTA section above it on the landing page
 * (`bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700`) so the
 * two sections flow into one continuous indigo-violet block. Text is
 * white-based with opacity hierarchy for legibility on the darker surface.
 *
 * 5-col layout: brand 2fr · Product · Platform · Support · Legal.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ActivityIcon, TwitterIcon, InstagramIcon, LinkedinIcon, MessageCircleIcon, HeartIcon } from 'lucide-react';

const SiteFooter: React.FC = () => {
    const colHead = 'text-[10.5px] font-bold uppercase tracking-[0.08em] text-white mb-4';
    const linkCls = 'text-[13px] text-white/75 hover:text-white transition-colors flex items-center gap-1.5';

    return (
        <footer
            className="relative overflow-hidden text-white"
            style={{ background: 'linear-gradient(150deg, #4338ca 0%, #6366f1 55%, #818cf8 100%)' }}
        >
            {/* Dot pattern overlay — matches the auth panel + Final CTA texture */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
            />
            {/* Soft depth orbs — kept light since the surface is already bright */}
            <div className="absolute pointer-events-none" style={{ width: 520, height: 520, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', top: -200, right: -140, filter: 'blur(80px)' }} />
            <div className="absolute pointer-events-none" style={{ width: 420, height: 420, borderRadius: '50%', background: 'rgba(67,56,202,0.45)', bottom: -180, left: -120, filter: 'blur(90px)' }} />

            {/* Top */}
            <div className="relative border-b border-white/12 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-8">
                    {/* Grid math:
                          mobile (default) → all 5 children stack
                          md (tablet)      → 2 cols; brand spans both = full row,
                                             then the 4 link cols flow as 2×2
                          lg+ (desktop)    → 6 cols; brand spans 2, then the 4
                                             link cols sit inline (2+1+1+1+1=6).
                        Previously was lg:grid-cols-5 with brand col-span-2,
                        which left Legal alone on row 2. */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-12">
                        {/* Brand */}
                        <div className="md:col-span-2 lg:col-span-2">
                            <Link to="/" className="flex items-center gap-3 mb-4">
                                <img src="/images/sentinel-sportslab-logo.png" alt="Sentinel SportsLab" className="h-14 w-auto select-none" />
                                <div className="text-sm font-bold text-white">Sentinel SportsLab</div>
                            </Link>
                            <p className="text-[13px] leading-relaxed text-white/75 max-w-xs mb-6">
                                Sport-science intelligence for athlete monitoring, load management, and performance optimisation — research-grade, accessible from day one.
                            </p>
                            <div className="flex gap-2.5">
                                {[
                                    { Icon: TwitterIcon, label: 'Twitter', href: '#' },
                                    { Icon: InstagramIcon, label: 'Instagram', href: '#' },
                                    { Icon: LinkedinIcon, label: 'LinkedIn', href: '#' },
                                    { Icon: MessageCircleIcon, label: 'WhatsApp', href: 'https://wa.me/27000000000' },
                                ].map(({ Icon, label, href }) => (
                                    <a key={label} href={href} aria-label={label} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                                       className="w-9 h-9 rounded-lg border border-white/20 bg-white/10 hover:border-white/45 hover:bg-white/20 flex items-center justify-center transition-all group">
                                        <Icon size={14} className="text-white/75 group-hover:text-white" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Product
                            Hash links use plain <a> so they work from any page —
                            React Router's <Link to="/#hash"> does not natively
                            scroll to the anchor; <a href="/#hash"> does (browser
                            handles it). Account routes stay as <Link> so they
                            navigate without a full page reload. */}
                        <div>
                            <h4 className={colHead}>Product</h4>
                            <ul className="space-y-2.5">
                                <li><a href="/#features" className={linkCls}>Features</a></li>
                                <li><a href="/#why" className={linkCls}>Why Us</a></li>
                                <li><a href="/#pilot" className={linkCls}>21-Day Pilot</a></li>
                                <li><a href="/#pricing" className={linkCls}>Pricing</a></li>
                                <li><Link to="/login?mode=signup" className={linkCls}>Get Started</Link></li>
                                <li><Link to="/login" className={linkCls}>Sign In</Link></li>
                            </ul>
                        </div>

                        {/* Platform */}
                        <div>
                            <h4 className={colHead}>Platform</h4>
                            <ul className="space-y-2.5">
                                <li><span className={linkCls}>Wellness Hub</span></li>
                                <li><span className={linkCls}>Analytics Hub</span></li>
                                <li><span className={linkCls}>Testing Hub</span></li>
                                <li><span className={linkCls}>Conditioning Hub</span></li>
                                <li><span className={linkCls}>Reporting Hub</span></li>
                                <li><span className={linkCls}>Periodization Planner</span></li>
                            </ul>
                        </div>

                        {/* Support */}
                        <div>
                            <h4 className={colHead}>Support</h4>
                            <ul className="space-y-2.5">
                                <li><Link to="/contact" className={linkCls}>Contact Us</Link></li>
                                <li><a href="mailto:support@sentinelsportslab.com?subject=Sentinel%20SportsLab%20Support" className={linkCls}>Email Support</a></li>
                                <li><a href="mailto:support@sentinelsportslab.com?subject=Bug%20Report" className={linkCls}>Report a Bug</a></li>
                                <li><a href="mailto:support@sentinelsportslab.com?subject=Feature%20Request" className={linkCls}>Feature Request</a></li>
                                <li>
                                    <span className="text-[13px] text-white/55 flex items-center gap-1.5">
                                        Help Centre
                                        <span className="text-[8px] font-bold uppercase tracking-wider bg-white/15 text-white/80 px-1.5 py-0.5 rounded">Soon</span>
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/* Legal */}
                        <div>
                            <h4 className={colHead}>Legal</h4>
                            <ul className="space-y-2.5">
                                <li><Link to="/privacy" className={linkCls}>Privacy Policy</Link></li>
                                <li><Link to="/terms" className={linkCls}>Terms of Service</Link></li>
                                <li><Link to="/cookies" className={linkCls}>Cookie Policy</Link></li>
                                <li><Link to="/data-processing" className={linkCls}>Data Processing</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="relative py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-[11.5px] text-white/60">
                        <p>&copy; {new Date().getFullYear()} Sentinel SportsLab (Pty) Ltd. All rights reserved.</p>
                        <p className="flex items-center gap-1.5">
                            Built for serious performance staff
                            <HeartIcon size={11} className="text-rose-300 fill-rose-300" />
                        </p>
                        <p>Registered in South Africa</p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default SiteFooter;
