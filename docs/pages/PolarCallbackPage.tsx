// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActivityIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-react';
import { SupabaseStorageService as StorageService } from '../services/storageService';

/**
 * PolarCallbackPage
 *
 * Handles the OAuth redirect from Polar after the user approves access.
 * URL: /polar/callback?code=xxx
 *
 * Flow:
 * 1. Extract code from URL params
 * 2. POST to /api/polar-token (server-side) to exchange for access token
 * 3. Save { connected, accessToken, polarUserId, connectedAt } to Supabase
 * 4. Redirect to Settings
 */

const REDIRECT_URI = `${window.location.origin}/polar/callback`;

export default function PolarCallbackPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Connecting to Polar...');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');

        if (error || !code) {
            setStatus('error');
            setMessage(error === 'access_denied' ? 'Access denied — you cancelled the Polar connection.' : 'No authorisation code received from Polar.');
            return;
        }

        (async () => {
            try {
                const res = await fetch('/api/polar-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error(err.error || 'Token exchange failed');
                }

                const { access_token, polar_user_id } = await res.json();

                await StorageService.savePolarIntegration({
                    connected: true,
                    accessToken: access_token,
                    polarUserId: polar_user_id,
                    connectedAt: new Date().toISOString(),
                });

                setStatus('success');
                setMessage('Polar connected successfully!');

                setTimeout(() => navigate('/settings'), 1800);

            } catch (err: any) {
                console.error('Polar callback error:', err);
                setStatus('error');
                setMessage(err.message || 'Failed to connect Polar account.');
            }
        })();
    }, [navigate]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 w-full max-w-sm text-center">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-5">
                    <ActivityIcon className="text-white w-6 h-6" />
                </div>

                {status === 'loading' && (
                    <>
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-sm font-medium text-slate-700">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircleIcon className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-slate-900">{message}</p>
                        <p className="text-xs text-slate-400 mt-1">Redirecting to Settings...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <AlertCircleIcon className="w-8 h-8 text-rose-500 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-slate-900">Connection failed</p>
                        <p className="text-xs text-slate-500 mt-1 mb-5">{message}</p>
                        <button
                            onClick={() => navigate('/settings')}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            Back to Settings
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
