'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import '../app/projecten/planning.css';


// ===== HELPERS (identiek aan globale planning) =====
function parseDate(str) { return new Date(str + 'T00:00:00'); }
function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function diffDays(a, b) { return Math.round((b - a) / 86400000); }
function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}
function isWeekend(d) { const day = d.getDay(); return day === 0 || day === 6; }
function getMonday(d) { const r = new Date(d); const day = r.getDay(); const diff = r.getDate() - day + (day === 0 ? -6 : 1); r.setDate(diff); return r; }
const MONTHS_FULL = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
const HOLIDAYS = {
    '2026-01-01': 'Nieuwjaarsdag', '2026-04-03': 'Goede Vrijdag', '2026-04-05': 'Eerste Paasdag',
    '2026-04-06': 'Tweede Paasdag', '2026-04-27': 'Koningsdag', '2026-05-05': 'Bevrijdingsdag',
    '2026-05-14': 'Hemelvaartsdag', '2026-05-24': 'Eerste Pinksterdag', '2026-05-25': 'Tweede Pinksterdag',
    '2026-12-25': 'Eerste Kerstdag', '2026-12-26': 'Tweede Kerstdag',
};
function isHoliday(d) { return HOLIDAYS[formatDate(d)] || null; }

const PROJECT_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#6366f1','#14b8a6','#f97316'];

/**
 * ProjectGantt — exacte kopie van de globale planning Gantt, gefocust op één project.
 *
 * Props:
 *   project       — het huidige project object
 *   onSave(proj)  — callback wanneer het project gewijzigd is (sla op in parent)
 */
export default function ProjectGantt({ project, onSave }) {
    const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

    // --- Lokale kopie van het project zodat we live kunnen werken ---
    const [proj, setProj] = useState(project);
    useEffect(() => { setProj(project); }, [project]);

    // Opslaan naar parent + localStorage
    const [savedFeedback, setSavedFeedback] = useState(false);
    const forceSave = useCallback((updated) => {
        const p = updated || proj;
        try {
            const stored = localStorage.getItem('schildersapp_projecten');
            const all = stored ? JSON.parse(stored) : [];
            const merged = all.map(x => String(x.id) === String(p.id) ? p : x);
            localStorage.setItem('schildersapp_projecten', JSON.stringify(merged));
            try { window.dispatchEvent(new CustomEvent('schilders-sync', { detail: { projecten: merged } })); } catch {}
        } catch {}
        onSave(p);
        setSavedFeedback(true);
        setTimeout(() => setSavedFeedback(false), 2500);
    }, [proj, onSave]);

    // Helpers om project te updaten
    const updateProj = useCallback((updater) => {
        setProj(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            return next;
        });
    }, []);

    // --- View state ---
    const [viewMode, setViewMode] = useState('month');
    const [zoomLevel, setZoomLevel] = useState(32);
    const [currentDate, setCurrentDate] = useState(() => {
        // Start bij de projectstartdatum
        try { return parseDate(project.startDate); } catch { return new Date(); }
    });
    const [expandedTasks, setExpandedTasks] = useState(true); // toon taken altijd open
    const [colorPickerPos, setColorPickerPos] = useState(null);
    const [selectedTaskId, setSelectedTaskId] = useState(null);

    // Taak toevoegen
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTask, setNewTask] = useState({ name: '', startDate: '', endDate: '' });

    // Refs
    const ganttWrapperRef = useRef(null);
    const timelineDatesRef = useRef([]);
    const justDraggedRef = useRef(false);
    const dragRef = useRef(null);
    const projRef = useRef(proj);
    projRef.current = proj;

    // --- Timeline dates ---
    const timelineDates = useMemo(() => {
        const dates = [];
        let start, count;
        if (viewMode === 'week') {
            start = getMonday(currentDate);
            count = 14;
        } else {
            start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfTwoMonths = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
            count = diffDays(start, endOfTwoMonths) + 1;
        }
        for (let i = 0; i < count; i++) dates.push(addDays(start, i));
        return dates;
    }, [currentDate, viewMode]);
    timelineDatesRef.current = timelineDates;

    // --- Navigate ---
    const navigate = (dir) => {
        const d = new Date(currentDate);
        if (viewMode === 'week') d.setDate(d.getDate() + dir * 14);
        else d.setMonth(d.getMonth() + dir);
        setCurrentDate(d);
    };

    // --- Bar position (percentage) ---
    const getBarStyle = useCallback((startStr, endStr, color) => {
        const start = parseDate(startStr);
        const end = parseDate(endStr);
        const tDates = timelineDatesRef.current;
        const tStart = tDates[0];
        const tEnd = tDates[tDates.length - 1];
        const barStart = start < tStart ? tStart : start;
        const barEnd = end > tEnd ? tEnd : end;
        if (barStart > tEnd || barEnd < tStart) return null;
        const totalDays = tDates.length;
        const offsetDays = diffDays(tStart, barStart);
        const durationDays = diffDays(barStart, barEnd) + 1;
        return {
            left: `${(offsetDays / totalDays) * 100}%`,
            width: `${Math.max((durationDays / totalDays) * 100, 1)}%`,
            background: color,
        };
    }, []);

    // --- Move bar ---
    const moveBar = useCallback((taskId, daysDelta) => {
        setProj(prev => {
            if (taskId) {
                return { ...prev, tasks: prev.tasks.map(t => {
                    if (t.id !== taskId) return t;
                    return { ...t, startDate: formatDate(addDays(parseDate(t.startDate), daysDelta)), endDate: formatDate(addDays(parseDate(t.endDate), daysDelta)) };
                })};
            } else {
                return {
                    ...prev,
                    startDate: formatDate(addDays(parseDate(prev.startDate), daysDelta)),
                    endDate: formatDate(addDays(parseDate(prev.endDate), daysDelta)),
                    tasks: prev.tasks.map(t => ({
                        ...t,
                        startDate: formatDate(addDays(parseDate(t.startDate), daysDelta)),
                        endDate: formatDate(addDays(parseDate(t.endDate), daysDelta)),
                    }))
                };
            }
        });
    }, []);

    // --- Resize bar ---
    const resizeBar = useCallback((taskId, edge, daysDelta) => {
        const update = (item) => {
            if (edge === 'left') {
                const ns = addDays(parseDate(item.startDate), daysDelta);
                if (ns >= parseDate(item.endDate)) return item;
                return { ...item, startDate: formatDate(ns) };
            } else {
                const ne = addDays(parseDate(item.endDate), daysDelta);
                if (ne <= parseDate(item.startDate)) return item;
                return { ...item, endDate: formatDate(ne) };
            }
        };
        setProj(prev => {
            if (taskId) {
                return { ...prev, tasks: prev.tasks.map(t => t.id === taskId ? update(t) : t) };
            } else {
                return update(prev);
            }
        });
    }, []);

    // --- Native DOM drag handler (identiek aan globale planning) ---
    useEffect(() => {
        const wrapper = ganttWrapperRef.current;
        if (!wrapper) return;
        const handleMouseDown = (e) => {
            if (e.button !== 0) return;
            const bar = e.target.closest('.gantt-bar');
            if (!bar) return;
            const isResizeHandle = e.target.classList.contains('resize-handle');
            const isLeftResize = e.target.classList.contains('resize-handle-left');
            const rawTaskId = bar.dataset.taskId;
            const taskId = (rawTaskId && rawTaskId !== 'null' && rawTaskId !== '') ? rawTaskId : null;
            e.stopPropagation(); e.preventDefault();
            const timelineEl = bar.parentElement;
            if (!timelineEl) return;
            const cellWidth = timelineEl.offsetWidth / timelineDatesRef.current.length;
            justDraggedRef.current = true;
            const savedOverflow = wrapper.style.overflowX;
            wrapper.style.overflowX = 'hidden';
            const blockWheel = (ev) => { ev.preventDefault(); };
            wrapper.addEventListener('wheel', blockWheel, { passive: false });
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;touch-action:none;cursor:' + (isResizeHandle ? 'col-resize' : 'grabbing') + ';';
            document.body.appendChild(overlay);
            document.body.style.userSelect = 'none';
            const state = { startX: e.clientX, cellWidth, moved: 0, lastClientX: e.clientX, scrollAccum: 0, animFrame: null };
            dragRef.current = state;
            if (!isResizeHandle) {
                const EDGE_ZONE = 60, SCROLL_SPEED = 8;
                const autoScroll = () => {
                    if (!dragRef.current) return;
                    wrapper.style.overflowX = 'auto';
                    const rect = wrapper.getBoundingClientRect();
                    const x = state.lastClientX;
                    let scrollDelta = 0;
                    if (x > rect.right - EDGE_ZONE) scrollDelta = SCROLL_SPEED;
                    else if (x < rect.left + EDGE_ZONE) scrollDelta = -SCROLL_SPEED;
                    if (scrollDelta !== 0) {
                        wrapper.scrollLeft += scrollDelta;
                        state.scrollAccum += scrollDelta;
                        const scrollDays = Math.round(state.scrollAccum / state.cellWidth);
                        if (scrollDays !== 0) {
                            state.scrollAccum -= scrollDays * state.cellWidth;
                            state.startX -= scrollDays * state.cellWidth;
                            state.moved += scrollDays;
                            moveBar(taskId, scrollDays);
                        }
                    }
                    wrapper.style.overflowX = 'hidden';
                    state.animFrame = requestAnimationFrame(autoScroll);
                };
                state.animFrame = requestAnimationFrame(autoScroll);
            }
            const onMove = (ev) => {
                state.lastClientX = ev.clientX;
                const dx = ev.clientX - state.startX;
                const daysDelta = Math.round(dx / state.cellWidth);
                if (daysDelta !== state.moved) {
                    const delta = daysDelta - state.moved;
                    state.moved = daysDelta;
                    if (isResizeHandle) resizeBar(taskId, isLeftResize ? 'left' : 'right', delta);
                    else moveBar(taskId, delta);
                }
            };
            const onUp = () => {
                dragRef.current = null;
                if (state.animFrame) cancelAnimationFrame(state.animFrame);
                overlay.removeEventListener('mousemove', onMove);
                overlay.removeEventListener('mouseup', onUp);
                document.removeEventListener('mousemove', onMove, true);
                document.removeEventListener('mouseup', onUp, true);
                wrapper.removeEventListener('wheel', blockWheel);
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                wrapper.style.overflowX = savedOverflow || 'auto';
                document.body.style.userSelect = '';
                setTimeout(() => { justDraggedRef.current = false; }, 200);
            };
            overlay.addEventListener('mousemove', onMove);
            overlay.addEventListener('mouseup', onUp);
            document.addEventListener('mousemove', onMove, true);
            document.addEventListener('mouseup', onUp, true);
        };
        wrapper.addEventListener('mousedown', handleMouseDown, true);
        return () => wrapper.removeEventListener('mousedown', handleMouseDown, true);
    });

    // --- Keyboards: pijltjes verplaatsen geselecteerde balk ---
    const selectedTaskIdRef = useRef(selectedTaskId);
    selectedTaskIdRef.current = selectedTaskId;
    useEffect(() => {
        const onKey = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.isContentEditable) return;
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            const days = (e.shiftKey ? 7 : 1) * (e.key === 'ArrowRight' ? 1 : -1);
            e.preventDefault();
            moveBar(selectedTaskIdRef.current, days);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [moveBar]);

    // --- Taken ---
    const addTask = () => {
        if (!newTask.name || !newTask.startDate || !newTask.endDate) return;
        const task = { id: 't' + Date.now(), name: newTask.name, startDate: newTask.startDate, endDate: newTask.endDate, completed: false, assignedTo: [] };
        updateProj(prev => ({ ...prev, tasks: [...prev.tasks, task] }));
        setNewTask({ name: '', startDate: '', endDate: '' });
        setShowAddTask(false);
    };
    const deleteTask = (tid) => updateProj(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== tid) }));
    const toggleTask = (tid) => updateProj(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === tid ? { ...t, completed: !t.completed } : t) }));

    // --- Maand header spans ---
    const { monthSpans, yearSpans } = useMemo(() => {
        const mSpans = [], ySpans = [];
        let curM = -1, curY = -1, mCnt = 0, yCurY = -1, yCnt = 0;
        timelineDates.forEach((d, i) => {
            if (d.getMonth() !== curM || d.getFullYear() !== curY) {
                if (mCnt > 0) mSpans.push({ month: curM, year: curY, days: mCnt });
                curM = d.getMonth(); curY = d.getFullYear(); mCnt = 1;
            } else { mCnt++; }
            if (i === timelineDates.length - 1) mSpans.push({ month: curM, year: curY, days: mCnt });
            if (d.getFullYear() !== yCurY) {
                if (yCnt > 0) ySpans.push({ year: yCurY, days: yCnt });
                yCurY = d.getFullYear(); yCnt = 1;
            } else { yCnt++; }
            if (i === timelineDates.length - 1) ySpans.push({ year: yCurY, days: yCnt });
        });
        return { monthSpans: mSpans, yearSpans: ySpans };
    }, [timelineDates]);

    const weekSpans = useMemo(() => {
        const spans = [];
        let curW = -1, wCnt = 0, wStart = null;
        timelineDates.forEach((d, i) => {
            const wn = getWeekNumber(d);
            if (wn !== curW) {
                if (wCnt > 0) spans.push({ week: curW, days: wCnt, startDate: wStart });
                curW = wn; wCnt = 1; wStart = new Date(d);
            } else { wCnt++; }
            if (i === timelineDates.length - 1) spans.push({ week: curW, days: wCnt, startDate: wStart });
        });
        return spans;
    }, [timelineDates]);

    const cellW = zoomLevel;
    const todayStr = formatDate(today);

    // Controleer of project buiten het venster valt
    const tStart = timelineDates[0];
    const tEnd = timelineDates[timelineDates.length - 1];
    const projInView = proj.startDate && proj.endDate &&
        !(parseDate(proj.endDate) < tStart || parseDate(proj.startDate) > tEnd);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Toolbar */}
            <div className="planning-toolbar" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => navigate(-1)} style={{ border: '1px solid var(--border-color,#e2e8f0)', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>
                        <i className="fa-solid fa-chevron-left" />
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: '155px', textAlign: 'center' }}>
                        {viewMode === 'week'
                            ? `Week ${getWeekNumber(timelineDates[0])} — ${MONTHS_FULL[timelineDates[0].getMonth()]} ${timelineDates[0].getFullYear()}`
                            : `${MONTHS_FULL[currentDate.getMonth()]} — ${MONTHS_FULL[(currentDate.getMonth() + 1) % 12]} ${currentDate.getFullYear()}`}
                    </span>
                    <button onClick={() => navigate(1)} style={{ border: '1px solid var(--border-color,#e2e8f0)', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>
                        <i className="fa-solid fa-chevron-right" />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} style={{ border: '1px solid var(--border-color,#e2e8f0)', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Vandaag</button>
                    {!projInView && (
                        <button onClick={() => setCurrentDate(parseDate(proj.startDate))} style={{ border: '1px solid #dbeafe', background: '#eff6ff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6' }}>
                            <i className="fa-solid fa-crosshairs" style={{ marginRight: 4 }} />Project tonen
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Week/Maand */}
                    <div className="view-btns">
                        <button className={`view-btn ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>Week</button>
                        <button className={`view-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>Maand</button>
                    </div>
                    {/* Zoom */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: '8px', padding: '2px 4px' }}>
                        <button onClick={() => setZoomLevel(z => Math.max(16, z - 4))} title="Uitzoomen" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 6px', fontSize: '0.85rem', color: '#64748b', borderRadius: '4px' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                            <i className="fa-solid fa-magnifying-glass-minus" />
                        </button>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, minWidth: '30px', textAlign: 'center' }}>{Math.round(zoomLevel / 32 * 100)}%</span>
                        <button onClick={() => setZoomLevel(z => Math.min(64, z + 4))} title="Inzoomen" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 6px', fontSize: '0.85rem', color: '#64748b', borderRadius: '4px' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                            <i className="fa-solid fa-magnifying-glass-plus" />
                        </button>
                    </div>
                    {/* Taak toevoegen */}
                    <button onClick={() => { setNewTask({ name: '', startDate: proj.startDate, endDate: proj.endDate }); setShowAddTask(v => !v); }}
                        style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: showAddTask ? '#f1f5f9' : '#F5850A', color: showAddTask ? '#64748b' : '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className={`fa-solid ${showAddTask ? 'fa-xmark' : 'fa-plus'}`} />{showAddTask ? 'Sluiten' : 'Taak toevoegen'}
                    </button>
                    {/* Opslaan */}
                    <button onClick={() => forceSave()}
                        style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: savedFeedback ? '#10b981' : '#1e293b', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.3s' }}>
                        <i className={`fa-solid ${savedFeedback ? 'fa-circle-check' : 'fa-floppy-disk'}`} />
                        {savedFeedback ? 'Opgeslagen!' : 'Opslaan'}
                    </button>
                </div>
            </div>

            {/* Taak toevoegen formulier */}
            {showAddTask && (
                <div style={{ background: '#fffbf5', border: '1px solid #fed7aa', borderRadius: '12px', padding: '14px 18px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b', marginBottom: '10px' }}>
                        <i className="fa-solid fa-plus" style={{ color: '#F5850A', marginRight: 6 }} />Nieuwe taak toevoegen
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                        <input value={newTask.name} onChange={e => setNewTask(p => ({ ...p, name: e.target.value }))} placeholder="Taaknaam..." style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', outline: 'none' }} onKeyDown={e => e.key === 'Enter' && addTask()} />
                        <input type="date" value={newTask.startDate} onChange={e => setNewTask(p => ({ ...p, startDate: e.target.value }))} style={{ padding: '7px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem', outline: 'none' }} />
                        <input type="date" value={newTask.endDate} onChange={e => setNewTask(p => ({ ...p, endDate: e.target.value }))} style={{ padding: '7px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem', outline: 'none' }} />
                        <button onClick={addTask} style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                            Toevoegen
                        </button>
                    </div>
                </div>
            )}

            {/* Kleurpicker overlay */}
            {colorPickerPos && (
                <>
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9998 }} onClick={() => setColorPickerPos(null)} />
                    <div style={{ position: 'fixed', top: colorPickerPos.y, left: colorPickerPos.x, zIndex: 9999, background: '#fff', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.18)', padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '5px' }}>
                        {PROJECT_COLORS.map(c => (
                            <div key={c} onClick={() => { updateProj(prev => ({ ...prev, color: c })); setColorPickerPos(null); }}
                                style={{ width: '22px', height: '22px', borderRadius: '4px', background: c, cursor: 'pointer', border: proj.color === c ? '2px solid #1e293b' : '2px solid transparent', transition: 'transform 0.1s' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                        ))}
                    </div>
                </>
            )}

            {/* Gantt wrapper — identiek aan globale planning */}
            <div className="gantt-wrapper" ref={ganttWrapperRef} style={{ '--cell-w': `${cellW}px` }}>
                {/* 3-laags header: Jaar / Maand / Week / Dag */}
                {/* Jaar */}
                <div className="gantt-header-row year-row">
                    <div className="gantt-header-label">&nbsp;</div>
                    {yearSpans.map((s, i) => (
                        <div key={i} className="gantt-header-span year-span" style={{ flex: s.days, minWidth: s.days * cellW }}>{s.year}</div>
                    ))}
                </div>
                {/* Maand */}
                <div className="gantt-header-row month-row">
                    <div className="gantt-header-label">&nbsp;</div>
                    {monthSpans.map((s, i) => (
                        <div key={i} className="gantt-header-span month-span" style={{ flex: s.days, minWidth: s.days * cellW, cursor: 'pointer' }}
                            onClick={() => { setViewMode('month'); setCurrentDate(new Date(s.year, s.month, 1)); }}
                            title={`Ga naar ${MONTHS_FULL[s.month]} ${s.year}`}>{MONTHS_FULL[s.month]}</div>
                    ))}
                </div>
                {/* Week */}
                <div className="gantt-header-row week-row">
                    <div className="gantt-header-label" style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Week</div>
                    {weekSpans.map((s, i) => (
                        <div key={i} className="gantt-header-span" onClick={() => { setViewMode('week'); setCurrentDate(new Date(s.startDate)); }}
                            style={{ flex: s.days, minWidth: s.days * cellW, fontSize: '0.58rem', fontWeight: 600, color: '#64748b', background: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent', borderRight: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', whiteSpace: 'nowrap', cursor: 'pointer' }}
                            title={`Ga naar week ${s.week}`}>
                            {s.days >= 3 ? `W${s.week}` : `${s.week}`}
                        </div>
                    ))}
                </div>
                {/* Dag */}
                <div className="gantt-header-row day-row">
                    <div className="gantt-header-label" style={{ fontWeight: 700, fontSize: '0.7rem' }}>Project / Taak</div>
                    {timelineDates.map((d, i) => (
                        <div key={i} className={`gantt-header-cell ${isWeekend(d) ? 'weekend' : ''} ${todayStr === formatDate(d) ? 'today' : ''}`}
                            style={{ cursor: 'pointer' }} onClick={() => { setViewMode('week'); setCurrentDate(new Date(d)); }}
                            title={`${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700 }}>{d.getDate()}</div>
                        </div>
                    ))}
                </div>

                {/* Project rij */}
                <div className="gantt-row" style={{ cursor: 'pointer', background: 'rgba(250,160,82,0.04)' }}
                    onClick={() => setExpandedTasks(v => !v)}>
                    <div className="gantt-row-label">
                        <i className={expandedTasks ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'}
                            style={{ fontSize: '0.55rem', color: '#94a3b8', width: '14px', textAlign: 'center', flexShrink: 0 }} />
                        <div style={{ flexShrink: 0 }}>
                            <div className="project-dot"
                                onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setColorPickerPos(prev => prev ? null : { x: r.left, y: r.bottom + 4 }); }}
                                style={{ background: proj.color, cursor: 'pointer', width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.1)' }}
                                title="Kies kleur" />
                        </div>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                            <div
                                onDoubleClick={e => { e.stopPropagation(); const el = e.currentTarget; el.contentEditable = 'true'; el.focus(); const r = document.createRange(); r.selectNodeContents(el); window.getSelection().removeAllRanges(); window.getSelection().addRange(r); }}
                                onBlur={e => { e.target.contentEditable = 'false'; const n = e.target.textContent.trim(); if (n && n !== proj.name) updateProj(prev => ({ ...prev, name: n })); }}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
                                style={{ fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', outline: 'none', cursor: 'pointer' }}
                            >{proj.name}</div>
                            {(proj.client || proj.address) && (
                                <div style={{ fontSize: '0.6rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {proj.client}{proj.client && proj.address ? ' — ' : ''}{proj.address}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            <input type="date" value={proj.startDate} onClick={e => e.stopPropagation()}
                                onChange={e => { if (e.target.value) updateProj(prev => ({ ...prev, startDate: e.target.value })); }}
                                style={{ width: '90px', fontSize: '0.6rem', padding: '1px 3px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#fff', color: '#334155', cursor: 'pointer', outline: 'none' }} />
                            <span style={{ fontSize: '0.55rem', color: '#cbd5e1' }}>→</span>
                            <input type="date" value={proj.endDate} onClick={e => e.stopPropagation()}
                                onChange={e => { if (e.target.value) updateProj(prev => ({ ...prev, endDate: e.target.value })); }}
                                style={{ width: '90px', fontSize: '0.6rem', padding: '1px 3px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#fff', color: '#334155', cursor: 'pointer', outline: 'none' }} />
                            <span style={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 600, minWidth: '26px' }}>
                                {proj.startDate && proj.endDate ? `${diffDays(parseDate(proj.startDate), parseDate(proj.endDate)) + 1}d` : ''}
                            </span>
                        </div>
                    </div>
                    <div className="gantt-row-timeline">
                        {timelineDates.map((d, i) => (
                            <div key={i} className={`gantt-cell ${isWeekend(d) ? 'weekend' : ''} ${todayStr === formatDate(d) ? 'today' : ''} ${isHoliday(d) ? 'holiday' : ''}`} />
                        ))}
                        {proj.startDate && proj.endDate && (() => {
                            const style = getBarStyle(proj.startDate, proj.endDate, proj.color);
                            if (!style) return null;
                            return (
                                <div className="gantt-bar" data-project-id={proj.id} data-task-id={null} style={{ ...style, cursor: 'grab' }}>
                                    <div className="resize-handle resize-handle-left" />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>{proj.name}</span>
                                    <div className="resize-handle resize-handle-right" />
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Taak rijen */}
                {expandedTasks && proj.tasks.map(t => (
                    <div key={t.id} className="gantt-row"
                        onClick={() => { if (!justDraggedRef.current) setSelectedTaskId(prev => prev === t.id ? null : t.id); }}
                        style={{ background: selectedTaskId === t.id ? 'rgba(250,160,82,0.08)' : 'rgba(0,0,0,0.015)', cursor: 'pointer', borderLeft: selectedTaskId === t.id ? '3px solid var(--accent,#F5850A)' : '3px solid transparent' }}>
                        <div className="gantt-row-label" style={{ paddingLeft: '36px', flexDirection: 'column', alignItems: 'stretch', gap: '2px', padding: '4px 10px 4px 36px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input type="checkbox" checked={t.completed} onChange={e => { e.stopPropagation(); toggleTask(t.id); }}
                                    style={{ width: '14px', height: '14px', accentColor: 'var(--accent,#F5850A)', cursor: 'pointer', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                    <div
                                        onDoubleClick={e => { e.stopPropagation(); const el = e.currentTarget; el.contentEditable = 'true'; el.focus(); const r = document.createRange(); r.selectNodeContents(el); window.getSelection().removeAllRanges(); window.getSelection().addRange(r); }}
                                        onBlur={e => { e.target.contentEditable = 'false'; const n = e.target.textContent.trim(); if (n && n !== t.name) updateProj(prev => ({ ...prev, tasks: prev.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, name: n }) })); }}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
                                        style={{ fontWeight: 500, fontSize: '0.78rem', textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? '#94a3b8' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', outline: 'none', cursor: 'pointer', borderBottom: '1px dashed transparent' }}
                                    >{t.name}</div>
                                </div>
                                <button onClick={e => { e.stopPropagation(); deleteTask(t.id); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px', borderRadius: '3px', color: '#ef4444', flexShrink: 0, fontSize: '0.72rem' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '20px' }}>
                                <input type="date" value={t.startDate} onClick={e => e.stopPropagation()}
                                    onChange={e => { if (e.target.value) updateProj(prev => ({ ...prev, tasks: prev.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, startDate: e.target.value }) })); }}
                                    style={{ width: '95px', fontSize: '0.6rem', padding: '1px 3px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#fff', color: '#334155', cursor: 'pointer', outline: 'none' }} />
                                <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#fff', background: '#F5850A', borderRadius: '8px', padding: '0 5px', lineHeight: '15px', flexShrink: 0 }}>
                                    {t.startDate && t.endDate ? `${diffDays(parseDate(t.startDate), parseDate(t.endDate)) + 1}d` : ''}
                                </span>
                                <input type="date" value={t.endDate} onClick={e => e.stopPropagation()}
                                    onChange={e => { if (e.target.value) updateProj(prev => ({ ...prev, tasks: prev.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, endDate: e.target.value }) })); }}
                                    style={{ width: '95px', fontSize: '0.6rem', padding: '1px 3px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#fff', color: '#334155', cursor: 'pointer', outline: 'none' }} />
                            </div>
                        </div>
                        <div className="gantt-row-timeline">
                            {timelineDates.map((d, i) => (
                                <div key={i} className={`gantt-cell ${isWeekend(d) ? 'weekend' : ''} ${todayStr === formatDate(d) ? 'today' : ''} ${isHoliday(d) ? 'holiday' : ''}`} />
                            ))}
                            {t.startDate && t.endDate && (() => {
                                const style = getBarStyle(t.startDate, t.endDate, proj.color + 'bb');
                                if (!style) return null;
                                return (
                                    <div className="gantt-bar" data-project-id={proj.id} data-task-id={t.id}
                                        style={{ ...style, cursor: 'grab', opacity: t.completed ? 0.4 : 1 }}>
                                        <div className="resize-handle resize-handle-left" />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>{t.name}</span>
                                        <div className="resize-handle resize-handle-right" />
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                ))}

                {/* Lege staat */}
                {proj.tasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 20px', background: '#fff' }}>
                        <i className="fa-solid fa-chart-gantt" style={{ fontSize: '2rem', color: '#cbd5e1', display: 'block', marginBottom: '8px' }} />
                        <p style={{ color: '#94a3b8', margin: '0 0 12px', fontSize: '0.88rem' }}>Nog geen taken gepland</p>
                        <button onClick={() => { setNewTask({ name: '', startDate: proj.startDate, endDate: proj.endDate }); setShowAddTask(true); }}
                            style={{ padding: '8px 18px', borderRadius: '9px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                            <i className="fa-solid fa-plus" style={{ marginRight: 5 }} />Eerste taak toevoegen
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
