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
const DAYS_NL = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

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
export default function ProjectGantt({ project, onSave, allUsers = [] }) {
    const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

    // --- Lokale kopie van het project zodat we live kunnen werken ---
    const [proj, setProj] = useState(project);
    useEffect(() => { setProj(project); }, [project]);

    // Live sync: als de globale planning een schilders-sync stuurt, update dan dit project
    useEffect(() => {
        const handleSync = (e) => {
            if (!e.detail?.projecten) return;
            const found = e.detail.projecten.find(p => String(p.id) === String(project.id));
            if (found) setProj(found);
        };
        window.addEventListener('schilders-sync', handleSync);
        return () => window.removeEventListener('schilders-sync', handleSync);
    }, [project.id]);

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

    // Inline naam-bewerking op balken (dubbelklik)
    const [editingBarId, setEditingBarId] = useState(null); // 'project' of task.id
    const [editingBarName, setEditingBarName] = useState('');

    // Team popup
    const [teamPopup, setTeamPopup] = useState(null); // { taskId, x, y }
    const [workerTooltip, setWorkerTooltip] = useState(null); // { name, x, y }

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
    const dblClickRef = useRef({ t: 0, id: null }); // timing voor dubbelklik detectie

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

    // --- Weekday segments helper ---
    const getWorkdaySegments = useCallback((start, end, tStart, tEnd, totalDays) => {
        const segments = [];
        const clampedStart = start < tStart ? new Date(tStart) : new Date(start);
        const clampedEnd = end > tEnd ? new Date(tEnd) : new Date(end);
        if (clampedStart > clampedEnd) return segments;
        let cur = new Date(clampedStart);
        // vooruit naar eerste weekdag
        while (cur <= clampedEnd && isWeekend(cur)) cur = addDays(cur, 1);
        while (cur <= clampedEnd) {
            const segStart = new Date(cur);
            while (cur <= clampedEnd && !isWeekend(cur)) cur = addDays(cur, 1);
            const segEnd = addDays(cur, -1);
            const offsetDays = diffDays(tStart, segStart);
            const durationDays = diffDays(segStart, segEnd) + 1;
            segments.push({
                left: (offsetDays / totalDays) * 100,
                width: (durationDays / totalDays) * 100,
            });
            // sla weekend over
            while (cur <= clampedEnd && isWeekend(cur)) cur = addDays(cur, 1);
        }
        return segments;
    }, []);

    // --- Bar segments (pixel-exact based on zoomLevel) ---
    const getBarSegments = useCallback((startStr, endStr, color) => {
        try {
            const start = parseDate(startStr);
            const end = parseDate(endStr);
            const tDates = timelineDatesRef.current;
            const tStart = tDates[0];
            const tEnd = tDates[tDates.length - 1];
            if (start > tEnd || end < tStart) return [];
            const totalDays = tDates.length;

            if (viewMode === 'week') {
                // Week-weergave: één doorlopende balk (weekenden zijn zichtbare kolommen)
                const barStart = start < tStart ? tStart : start;
                const barEnd = end > tEnd ? tEnd : end;
                const offsetDays = diffDays(tStart, barStart);
                const durationDays = diffDays(barStart, barEnd) + 1;
                return [{
                    left: `${offsetDays * zoomLevel}px`,
                    width: `${Math.max(durationDays * zoomLevel, zoomLevel * 0.9)}px`,
                    background: color,
                }];
            }

            // Maand-weergave: gesegmenteerd per weekdagblok (weekenden overgeslagen)
            return getWorkdaySegments(start, end, tStart, tEnd, totalDays).map(seg => ({
                left: `${seg.left * zoomLevel / 100 * totalDays}px`,
                width: `${Math.max(seg.width * zoomLevel / 100 * totalDays, zoomLevel * 0.9)}px`,
                background: color,
            }));
        } catch { return []; }
    }, [zoomLevel, viewMode, getWorkdaySegments]);

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
            const editId = taskId || 'project';

            // ── Dubbelklik detectie (binnen 350ms op zelfde balk) ──
            if (!isResizeHandle) {
                const now = Date.now();
                if (dblClickRef.current.id === editId && now - dblClickRef.current.t < 350) {
                    // Dubbelklik gevonden → open inline editor
                    dblClickRef.current = { t: 0, id: null };
                    e.stopPropagation(); e.preventDefault();
                    const name = taskId
                        ? projRef.current.tasks.find(t => t.id === taskId)?.name
                        : projRef.current.name;
                    setEditingBarId(editId);
                    setEditingBarName(name || '');
                    return;
                }
                dblClickRef.current = { t: now, id: editId };
            }

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
        <>
            {/* Toolbar */}
            <div className="planning-toolbar" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => navigate(-1)} style={{ border: '1px solid var(--border-color,#e2e8f0)', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>
                        <i className="fa-solid fa-chevron-left" />
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: '155px', textAlign: 'center' }}>
                        {`${MONTHS_FULL[currentDate.getMonth()]} — ${MONTHS_FULL[(currentDate.getMonth() + 1) % 12]} ${currentDate.getFullYear()}`}
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
                    <div className="gantt-team-col header">&nbsp;</div>
                    {yearSpans.map((s, i) => (
                        <div key={i} className="gantt-header-span year-span" style={{ flex: s.days, minWidth: s.days * cellW }}>{s.year}</div>
                    ))}
                </div>
                {/* Maand */}
                <div className="gantt-header-row month-row">
                    <div className="gantt-header-label">&nbsp;</div>
                    <div className="gantt-team-col header">&nbsp;</div>
                    {monthSpans.map((s, i) => (
                        <div key={i} className="gantt-header-span month-span" style={{ flex: s.days, minWidth: s.days * cellW, cursor: 'pointer' }}
                            onClick={() => { setViewMode('month'); setCurrentDate(new Date(s.year, s.month, 1)); }}
                            title={`Ga naar ${MONTHS_FULL[s.month]} ${s.year}`}>{MONTHS_FULL[s.month]}</div>
                    ))}
                </div>
                {/* Week */}
                <div className="gantt-header-row week-row">
                    <div className="gantt-header-label" style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Week</div>
                    <div className="gantt-team-col header">&nbsp;</div>
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
                    <div className="gantt-team-col header">Team</div>
                    {timelineDates.map((d, i) => (
                        <div key={i} className={`gantt-header-cell ${isWeekend(d) ? 'weekend' : ''} ${todayStr === formatDate(d) ? 'today' : ''}`}
                            style={{ cursor: 'pointer' }} onClick={() => { setViewMode('week'); setCurrentDate(new Date(d)); }}
                            title={`${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`}>
                            <div style={{ fontSize: '0.52rem', color: 'inherit', lineHeight: 1, marginBottom: '1px', opacity: 0.75 }}>{DAYS_NL[d.getDay()]}</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</div>
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
                    {/* Project-niveau team kolom (leeg — team zit op taak niveau) */}
                    <div className="gantt-team-col" style={{ justifyContent: 'flex-start', paddingLeft: '4px' }} />
                    <div className="gantt-row-timeline">
                        {timelineDates.map((d, i) => (
                            <div key={i} className={`gantt-cell ${isWeekend(d) ? 'weekend' : ''} ${todayStr === formatDate(d) ? 'today' : ''}`} />
                        ))}
                        {proj.startDate && proj.endDate && (() => {
                            const segs = getBarSegments(proj.startDate, proj.endDate, proj.color);
                            if (!segs.length) return null;
                            return segs.map((segStyle, si) => (
                                <div key={si} className="gantt-bar" data-project-id={proj.id} data-task-id={null}
                                    style={{ ...segStyle, cursor: 'grab', borderRadius: si === 0 && segs.length === 1 ? '5px' : si === 0 ? '5px 0 0 5px' : si === segs.length - 1 ? '0 5px 5px 0' : '0' }}>
                                    {si === 0 && <div className="resize-handle resize-handle-left" />}
                                    {si === 0 && (editingBarId === 'project' ? (
                                        <input
                                            autoFocus
                                            value={editingBarName}
                                            onChange={e => setEditingBarName(e.target.value)}
                                            onBlur={() => {
                                                if (editingBarName.trim()) updateProj(prev => ({ ...prev, name: editingBarName.trim() }));
                                                setEditingBarId(null);
                                            }}
                                            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingBarId(null); }}
                                            onMouseDown={e => e.stopPropagation()}
                                            style={{ flex: 1, background: 'rgba(255,255,255,0.25)', border: 'none', borderBottom: '2px solid #fff', outline: 'none', color: '#fff', fontWeight: 700, fontSize: '0.75rem', borderRadius: '2px', padding: '0 2px', minWidth: 0 }}
                                        />
                                    ) : (
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>{proj.name}</span>
                                    ))}
                                    {si === segs.length - 1 && <div className="resize-handle resize-handle-right" />}
                                </div>
                            ));
                        })()}
                    </div>
                </div>

                {/* Taak rijen */}
                {expandedTasks && proj.tasks.map(t => {
                    const noTeam = (t.assignedTo || []).length === 0;
                    return (
                    <div key={t.id} className="gantt-row"
                        onClick={() => { if (!justDraggedRef.current) setSelectedTaskId(prev => prev === t.id ? null : t.id); }}
                        style={{ background: selectedTaskId === t.id ? 'rgba(250,160,82,0.08)' : 'rgba(0,0,0,0.015)', cursor: 'pointer', boxShadow: selectedTaskId === t.id ? 'inset 3px 0 0 var(--accent,#F5850A)' : 'none' }}>
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
                        {/* ===== TEAM KOLOM ===== */}
                        <div className="gantt-team-col" style={{ background: 'rgba(0,0,0,0.015)' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {(t.assignedTo || []).slice(0, 3).map((uid, idx) => {
                                    const u = allUsers.find(x => x.id === uid);
                                    if (!u) return null;
                                    const initials = u.name ? u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
                                    return (
                                        <div key={uid} className="gantt-worker-avatar"
                                            style={{ width: '16px', height: '16px', fontSize: '0.4rem', background: proj.color + 'cc', color: '#fff', marginLeft: idx > 0 ? '-4px' : '0', border: '2px solid #fff', pointerEvents: 'auto' }}
                                            onMouseEnter={e => { const r = e.currentTarget.getBoundingClientRect(); setWorkerTooltip({ name: u.name || u.email, x: r.left + r.width / 2, y: r.top }); }}
                                            onMouseLeave={() => setWorkerTooltip(null)}>
                                            {initials}
                                        </div>
                                    );
                                })}
                                {noTeam && !t.completed && (
                                    <span title="Geen medewerkers ingepland" style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                                        fontSize: '0.55rem', fontWeight: 700,
                                        color: '#ef4444', background: '#fee2e2',
                                        border: '1px solid #fca5a5', borderRadius: '5px',
                                        padding: '1px 5px', whiteSpace: 'nowrap',
                                    }}>
                                        <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '0.45rem' }} />
                                        niet ingepland
                                    </span>
                                )}
                            </div>
                            {/* + knop voor teamtoewijzing */}
                            <button
                                onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setTeamPopup({ taskId: t.id, x: r.left, y: r.bottom }); }}
                                title="Personeel inplannen"
                                style={{ width: '14px', height: '14px', borderRadius: '50%', border: `1.5px solid ${noTeam ? '#fca5a5' : '#d1d5db'}`, background: noTeam ? '#fee2e2' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: noTeam ? '#ef4444' : '#94a3b8', fontSize: '0.45rem', transition: 'all 0.15s', outline: 'none', pointerEvents: 'auto' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = proj.color; e.currentTarget.style.color = proj.color; e.currentTarget.style.background = `${proj.color}14`; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = noTeam ? '#fca5a5' : '#d1d5db'; e.currentTarget.style.color = noTeam ? '#ef4444' : '#94a3b8'; e.currentTarget.style.background = noTeam ? '#fee2e2' : '#fff'; }}>
                                <i className="fa-solid fa-plus" />
                            </button>
                        </div>
                        <div className="gantt-row-timeline">
                            {timelineDates.map((d, i) => (
                                <div key={i} className={`gantt-cell ${isWeekend(d) ? 'weekend' : ''} ${todayStr === formatDate(d) ? 'today' : ''}`} />
                            ))}
                            {t.startDate && t.endDate && (() => {
                                const barColor = noTeam ? '#ef444488' : proj.color + 'bb';
                                const segs = getBarSegments(t.startDate, t.endDate, barColor);
                                if (!segs.length) return null;
                                return segs.map((segStyle, si) => (
                                    <div key={si} className="gantt-bar" data-project-id={proj.id} data-task-id={t.id}
                                        style={{
                                            ...segStyle,
                                            cursor: 'grab', opacity: t.completed ? 0.4 : 1,
                                            borderRadius: si === 0 && segs.length === 1 ? '5px' : si === 0 ? '5px 0 0 5px' : si === segs.length - 1 ? '0 5px 5px 0' : '0',
                                            ...(noTeam && !t.completed && {
                                                background: `repeating-linear-gradient(45deg, #ef444455, #ef444455 4px, #ef444422 4px, #ef444422 8px)`,
                                                border: '1.5px dashed #ef4444',
                                                boxShadow: 'none',
                                            }),
                                        }}>
                                        {si === 0 && <div className="resize-handle resize-handle-left" />}
                                        {si === 0 && (editingBarId === t.id ? (
                                            <input
                                                autoFocus
                                                value={editingBarName}
                                                onChange={e => setEditingBarName(e.target.value)}
                                                onBlur={() => {
                                                    if (editingBarName.trim()) updateProj(prev => ({ ...prev, tasks: prev.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, name: editingBarName.trim() }) }));
                                                    setEditingBarId(null);
                                                }}
                                                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingBarId(null); }}
                                                onMouseDown={e => e.stopPropagation()}
                                                style={{ flex: 1, background: 'rgba(255,255,255,0.25)', border: 'none', borderBottom: '2px solid #fff', outline: 'none', color: '#fff', fontWeight: 700, fontSize: '0.75rem', borderRadius: '2px', padding: '0 2px', minWidth: 0 }}
                                            />
                                        ) : (
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                {noTeam && !t.completed && <i className="fa-solid fa-user-slash" style={{ fontSize: '0.5rem', flexShrink: 0, color: '#ef4444' }} />}
                                                <span style={{ color: noTeam && !t.completed ? '#ef4444' : undefined }}>{t.name}</span>
                                            </span>
                                        ))}
                                        {si === segs.length - 1 && <div className="resize-handle resize-handle-right" />}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                    );
                })}

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

        {/* ===== WORKER TOOLTIP + TEAM POPUP ===== */}
        {workerTooltip && (
            <div style={{
                position: 'fixed',
                left: workerTooltip.x,
                top: workerTooltip.y - 34,
                transform: 'translateX(-50%)',
                background: '#1e293b', color: '#fff',
                fontSize: '0.7rem', fontWeight: 600,
                padding: '4px 9px', borderRadius: '7px',
                whiteSpace: 'nowrap', zIndex: 99999, pointerEvents: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}>
                {workerTooltip.name}
                <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1e293b' }} />
            </div>
        )}

        {/* ===== TEAM POPUP ===== */}
        {teamPopup && (() => {
            const task = proj.tasks.find(t => t.id === teamPopup.taskId);
            if (!task) return null;
            const assigned = task.assignedTo || [];
            const color = proj.color || '#F5850A';
            const toggle = (userId) => {
                const next = assigned.includes(userId)
                    ? assigned.filter(id => id !== userId)
                    : [...assigned, userId];
                updateProj(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id !== task.id ? t : { ...t, assignedTo: next }) }));
            };
            const px = Math.min(teamPopup.x, window.innerWidth - 260);
            const py = teamPopup.y + 6;
            return (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 99990 }} onClick={() => setTeamPopup(null)} />
                    <div style={{
                        position: 'fixed', left: px, top: py, zIndex: 99995,
                        background: '#fff', borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                        border: '1px solid #e2e8f0', padding: '10px',
                        minWidth: '220px', maxWidth: '270px',
                    }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>{task.name}</span>
                            </div>
                            <button onClick={() => setTeamPopup(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.75rem', padding: '2px' }}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                        {/* Medewerker lijst */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {allUsers.map(user => {
                                const on = assigned.includes(user.id);
                                const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
                                return (
                                    <button key={user.id} onClick={() => toggle(user.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '6px 10px', borderRadius: '8px', cursor: 'pointer',
                                            border: on ? `1.5px solid ${color}` : '1.5px solid #f1f5f9',
                                            background: on ? `${color}14` : '#f8fafc',
                                            outline: 'none', width: '100%', textAlign: 'left', transition: 'all 0.12s',
                                        }}
                                        onMouseEnter={e => { if (!on) e.currentTarget.style.background = '#f1f5f9'; }}
                                        onMouseLeave={e => { if (!on) e.currentTarget.style.background = '#f8fafc'; }}>
                                        <div style={{
                                            width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                                            background: on ? color : '#e2e8f0', color: on ? '#fff' : '#64748b',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.55rem', fontWeight: 800,
                                        }}>{initials}</div>
                                        <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: on ? 700 : 500, color: on ? color : '#334155' }}>
                                            {user.name || user.email}
                                        </span>
                                        {on
                                            ? <i className="fa-solid fa-circle-check" style={{ color, fontSize: '0.7rem' }} />
                                            : <i className="fa-regular fa-circle" style={{ color: '#cbd5e1', fontSize: '0.7rem' }} />
                                        }
                                    </button>
                                );
                            })}
                            {allUsers.length === 0 && (
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', padding: '4px' }}>Geen medewerkers gevonden</span>
                            )}
                        </div>
                    </div>
                </>
            );
        })()}
        </>
    );
}
