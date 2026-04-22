import { useState, useEffect } from 'react';

// Returns true when viewport is below the `lg` Tailwind breakpoint (1024px).
// This is the threshold where the sidebar switches to a drawer overlay.
export function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 1024 : false
    );

    useEffect(() => {
        const mql = window.matchMedia('(max-width: 1023px)');
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mql.addEventListener('change', handler);
        setIsMobile(mql.matches);
        return () => mql.removeEventListener('change', handler);
    }, []);

    return isMobile;
}
