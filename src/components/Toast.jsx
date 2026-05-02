'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timers = useRef({});

    const dismiss = useCallback((id) => {
        clearTimeout(timers.current[id]);
        delete timers.current[id];
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = useCallback((message, type = 'info', duration = 4000) => {
        const id = ++idCounter;
        setToasts(prev => [...prev.slice(-4), { id, message, type }]);
        timers.current[id] = setTimeout(() => dismiss(id), duration);
        return id;
    }, [dismiss]);

    // Shorthand helpers
    toast.success = (msg, dur) => toast(msg, 'success', dur);
    toast.error   = (msg, dur) => toast(msg, 'error',   dur ?? 6000);
    toast.warning = (msg, dur) => toast(msg, 'warning', dur);
    toast.info    = (msg, dur) => toast(msg, 'info',    dur);

    const icons = { success: 'fa-check-circle', error: 'fa-circle-exclamation', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    const colors = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div style={{
                position: 'fixed', bottom: '24px', right: '24px',
                display: 'flex', flexDirection: 'column', gap: '10px',
                zIndex: 99999, pointerEvents: 'none',
            }}>
                {toasts.map(t => (
                    <div key={t.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                        background: '#1e293b', border: `1px solid ${colors[t.type]}40`,
                        borderLeft: `4px solid ${colors[t.type]}`,
                        borderRadius: '8px', padding: '12px 14px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                        maxWidth: '360px', minWidth: '240px',
                        pointerEvents: 'all',
                        animation: 'toastIn 0.2s ease',
                    }}>
                        <i className={`fa-solid ${icons[t.type]}`} style={{ color: colors[t.type], marginTop: '2px', flexShrink: 0 }} />
                        <span style={{ color: '#e2e8f0', fontSize: '0.875rem', lineHeight: '1.4', flex: 1 }}>{t.message}</span>
                        <button onClick={() => dismiss(t.id)} style={{
                            background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
                            cursor: 'pointer', padding: '0 0 0 4px', fontSize: '0.8rem', flexShrink: 0,
                        }}>
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                ))}
            </div>
            <style>{`@keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
