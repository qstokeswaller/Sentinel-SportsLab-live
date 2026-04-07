// @ts-nocheck
/**
 * PageTour — Per-page + workflow product tours using driver.js
 *
 * Mounted in App.tsx. Handles two types of tours:
 *
 * 1. PAGE TOURS — auto-start when landing on a page (home view)
 *    Triggered by route changes.
 *
 * 2. WORKFLOW TOURS — auto-start when the user enters a sub-view
 *    (e.g. opening Program Builder, entering a test form)
 *    Detected via MutationObserver watching for trigger elements.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { getTourForRoute, WORKFLOW_TOURS } from '../../utils/tourSteps';
import { SupabaseStorageService as StorageService } from '../../services/storageService';

interface PageTourProps {
    tourState: Record<string, string>;
    setTourState: (state: Record<string, string>) => void;
}

const PageTour: React.FC<PageTourProps> = ({ tourState, setTourState }) => {
    const location = useLocation();
    const driverRef = useRef<any>(null);
    const activeIdRef = useRef<string | null>(null);
    const tourStateRef = useRef(tourState);
    tourStateRef.current = tourState;
    const observerRef = useRef<MutationObserver | null>(null);

    const saveTourState = useCallback((newState: Record<string, string>) => {
        setTourState(newState);
        StorageService.saveTourState(newState);
    }, [setTourState]);

    // Generic tour launcher — works for both page tours and workflow tours
    const launchTour = useCallback((id: string, steps: any[]) => {
        // Clean up any existing tour
        if (driverRef.current) {
            try { driverRef.current.destroy(); } catch {}
        }

        activeIdRef.current = id;

        const filteredSteps = steps
            .filter(s => document.querySelector(s.element))
            .map(s => ({
                element: s.element,
                popover: {
                    title: s.title,
                    description: s.description,
                    side: s.side || 'bottom',
                },
            }));

        if (filteredSteps.length === 0) return;

        const d = driver({
            showProgress: true,
            showButtons: ['next', 'previous', 'close'],
            nextBtnText: 'Next →',
            prevBtnText: '← Back',
            doneBtnText: 'Got it!',
            animate: true,
            overlayOpacity: 0.4,
            stagePadding: 8,
            stageRadius: 12,
            popoverClass: 'sentinel-tour-popover',
            steps: filteredSteps,
            onDestroyStarted: () => {
                if (!d.hasNextStep()) {
                    saveTourState({ ...tourStateRef.current, [id]: 'completed' });
                } else {
                    saveTourState({ ...tourStateRef.current, [id]: 'skipped' });
                }
                d.destroy();
            },
            onDestroyed: () => {
                activeIdRef.current = null;
                driverRef.current = null;
            },
        });

        d.drive();
        driverRef.current = d;
    }, [saveTourState]);

    // Start a page tour
    const startPageTour = useCallback((pageId: string) => {
        const tourDef = getTourForRoute(location.pathname);
        if (!tourDef || tourDef.pageId !== pageId) return;
        launchTour(pageId, tourDef.steps);
    }, [location.pathname, launchTour]);

    // Watch for route changes — auto-start pending page tours
    useEffect(() => {
        if (driverRef.current && activeIdRef.current) {
            try { driverRef.current.destroy(); } catch {}
            driverRef.current = null;
            activeIdRef.current = null;
        }

        const tourDef = getTourForRoute(location.pathname);
        if (!tourDef) return;

        const status = tourStateRef.current[tourDef.pageId];
        if (status !== 'pending') return;

        const timer = setTimeout(() => {
            startPageTour(tourDef.pageId);
        }, 800);

        return () => clearTimeout(timer);
    }, [location.pathname, startPageTour]);

    // MutationObserver — detect workflow tour trigger elements appearing
    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        const checkForWorkflowTriggers = () => {
            // Don't trigger if a tour is already running
            if (driverRef.current) return;

            for (const wf of WORKFLOW_TOURS) {
                const status = tourStateRef.current[wf.id];
                if (status !== 'pending') continue;

                const triggerEl = document.querySelector(wf.triggerElement);
                if (triggerEl) {
                    // Delay slightly to let the sub-view fully render
                    setTimeout(() => {
                        // Double-check it's still pending and no tour is running
                        if (tourStateRef.current[wf.id] === 'pending' && !driverRef.current) {
                            launchTour(wf.id, wf.steps);
                        }
                    }, 600);
                    break; // Only start one workflow tour at a time
                }
            }
        };

        const observer = new MutationObserver(() => {
            checkForWorkflowTriggers();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        observerRef.current = observer;

        // Also check immediately in case the trigger element is already present
        checkForWorkflowTriggers();

        return () => {
            observer.disconnect();
        };
    }, [launchTour]);

    // Listen for manual tour triggers (from Settings Walkthrough tab)
    useEffect(() => {
        const handler = (e: CustomEvent) => {
            const { tourId, pageId, steps } = e.detail || {};
            if (tourId && steps) {
                launchTour(tourId, steps);
            } else if (pageId) {
                startPageTour(pageId);
            }
        };
        window.addEventListener('start-page-tour' as any, handler);
        return () => window.removeEventListener('start-page-tour' as any, handler);
    }, [startPageTour, launchTour]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (driverRef.current) {
                try { driverRef.current.destroy(); } catch {}
            }
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, []);

    return null;
};

export default PageTour;
