import { useState, useEffect, useCallback, useRef } from 'react';

export function useGanttSync(initialProject, onSave) {
    const [proj, setProj] = useState(initialProject);
    const [savedFeedback, setSavedFeedback] = useState(false);

    // Sync from parent to local state when parent changes (e.g., initial load or route transition)
    useEffect(() => {
        setProj(initialProject);
    }, [initialProject]);

    // Live sync: als de globale planning een schilders-sync stuurt, update dan dit project realtime
    useEffect(() => {
        const handleSync = (e) => {
            if (!e.detail?.projecten) return;
            const found = e.detail.projecten.find(p => String(p.id) === String(initialProject.id));
            if (found) setProj(found);
        };
        window.addEventListener('schilders-sync', handleSync);
        return () => window.removeEventListener('schilders-sync', handleSync);
    }, [initialProject.id]);

    // Opslaan naar parent + localStorage synchronisatie
    const forceSaveRef = useRef(null);
    const forceSave = useCallback((updated) => {
        const p = updated || proj;
        try {
            const stored = localStorage.getItem('schildersapp_projecten');
            const all = stored ? JSON.parse(stored) : [];
            const merged = all.map(x => String(x.id) === String(p.id) ? p : x);
            localStorage.setItem('schildersapp_projecten', JSON.stringify(merged));
            
            // Defer event dispatch outside the React render cycle
            setTimeout(() => {
                try { window.dispatchEvent(new CustomEvent('schilders-sync', { detail: { projecten: merged } })); } catch {}
                if (onSave) onSave(p);
            }, 0);
        } catch {
            setTimeout(() => { if (onSave) onSave(p); }, 0);
        }
        
        setSavedFeedback(true);
        setTimeout(() => setSavedFeedback(false), 2500);
    }, [proj, onSave]);

    forceSaveRef.current = forceSave;

    // Auto-save: debounced opslaan bij *elke* wijziging van proj state
    const autoSaveTimer = useRef(null);
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
            if (forceSaveRef.current) forceSaveRef.current();
        }, 800);
        return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    }, [proj]);

    // Helpers om project veilig te updaten
    const updateProj = useCallback((updater) => {
        setProj(prev => typeof updater === 'function' ? updater(prev) : updater);
    }, []);

    return {
        proj,
        setProj,
        updateProj,
        forceSave,
        savedFeedback
    };
}
