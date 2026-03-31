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

// Berekent Paaszondag voor een gegeven jaar (algoritme van Butcher)
function getEasterSunday(year) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

// Genereert Nederlandse feestdagen dynamisch voor een gegeven jaar
function getDutchHolidays(year) {
    const easter = getEasterSunday(year);
    const fmt = (d) => formatDate(d);
    const add = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
    return {
        [fmt(new Date(year, 0, 1))]:   'Nieuwjaarsdag',
        [fmt(add(easter, -2))]:        'Goede Vrijdag',
        [fmt(easter)]:                 'Eerste Paasdag',
        [fmt(add(easter, 1))]:         'Tweede Paasdag',
        [fmt(new Date(year, 3, 27))]:  'Koningsdag',
        [fmt(new Date(year, 4, 5))]:   'Bevrijdingsdag',
        [fmt(add(easter, 39))]:        'Hemelvaartsdag',
        [fmt(add(easter, 49))]:        'Eerste Pinksterdag',
        [fmt(add(easter, 50))]:        'Tweede Pinksterdag',
        [fmt(new Date(year, 11, 25))]: 'Eerste Kerstdag',
        [fmt(new Date(year, 11, 26))]: 'Tweede Kerstdag',
    };
}

// Cache per jaar zodat we niet elke render opnieuw berekenen
const _holidayCache = {};
function getHolidays(year) {
    if (!_holidayCache[year]) _holidayCache[year] = getDutchHolidays(year);
    return _holidayCache[year];
}

function isHoliday(d) { return getHolidays(d.getFullYear())[formatDate(d)] || null; }
function snapToWorkday(d) { const r = new Date(d); while (r.getDay() === 0 || r.getDay() === 6 || isHoliday(r)) r.setDate(r.getDate() + 1); return r; }
function snapToWorkdayBack(d) { const r = new Date(d); while (r.getDay() === 0 || r.getDay() === 6 || isHoliday(r)) r.setDate(r.getDate() - 1); return r; }
function diffWorkdays(a, b) { let count = 0; const cur = new Date(a); while (cur <= b) { const d = cur.getDay(); if (d !== 0 && d !== 6) count++; cur.setDate(cur.getDate() + 1); } return count; }

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
    const [expandedTasks, setExpandedTasks] = useState(true);
    const [showCompleted, setShowCompleted] = useState(false);
    const [colorPickerPos, setColorPickerPos] = useState(null);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const selectTaskRef = useRef(null);
    selectTaskRef.current = (id) => setSelectedTaskId(prev => prev === id ? null : id);

    // Inline naam-bewerking op balken (dubbelklik)
    const [editingBarId, setEditingBarId] = useState(null); // 'project' of task.id
    const [editingBarName, setEditingBarName] = useState('');

    // Team popup
    const [teamPopup, setTeamPopup] = useState(null); // { taskId, x, y }
    const [workerTooltip, setWorkerTooltip] = useState(null); // { name, x, y }

    // Notitie popup per taak
    const [notePopup, setNotePopup] = useState(null); // { taskId }
    const [noteInput, setNoteInput] = useState('');
    const [noteTab, setNoteTab] = useState('nieuw'); // 'nieuw' | 'koppel'
    const [projectNotesCache, setProjectNotesCache] = useState(null); // geladen project-notities
    const [projectNotesLoading, setProjectNotesLoading] = useState(false);
    const [noteTooltip, setNoteTooltip] = useState(null); // { notes[], x, y, taskName }
    const [noteUploading, setNoteUploading] = useState(false);
    const [noteDragOver, setNoteDragOver] = useState(false);

    // Taak toevoegen
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTask, setNewTask] = useState({ name: '', startDate: '', endDate: '' });

    // Draw-create: sleep om nieuwe taak aan te maken
    const [drawCreate, setDrawCreate] = useState(null); // { startDate, endDate, leftPx, widthPx }
    const drawCreateRef = useRef(null);

    // Naam-popup na draw-create
    const [quickTaskPopup, setQuickTaskPopup] = useState(null); // { startDate, endDate, x, y }
    const [quickTaskName, setQuickTaskName] = useState('');

    // Alleen planning taken weergeven in de gantt
    const planningTasks = useMemo(() => (proj.tasks || []), [proj.tasks]);

    // ===== BEZETTING STATES EN HOOKS =====
    const [allProjects, setAllProjects] = useState([]);
    const [workerAbsences, setWorkerAbsences] = useState([]);
    const [enabledHolidays, setEnabledHolidays] = useState({});
    const [bzFilter, setBzFilter] = useState('iedereen');

    useEffect(() => {
        const h = (e) => { if (e.detail?.taskId) { setNotePopup({ taskId: e.detail.taskId }); } };
        window.addEventListener('open-task-notes-modal', h);
        return () => window.removeEventListener('open-task-notes-modal', h);
    }, []);

    useEffect(() => {
        const loadAll = () => {
            try {
                const sp = localStorage.getItem('schildersapp_projecten');
                if (sp) setAllProjects(JSON.parse(sp));
                const wa = localStorage.getItem('schilders-absences');
                if (wa) setWorkerAbsences(JSON.parse(wa));
                const eh = localStorage.getItem('schildersapp_enabled_holidays');
                if (eh) setEnabledHolidays(JSON.parse(eh));
            } catch (e) { console.error('Fout bij laden Bezetting data', e); }
        };
        loadAll();
        const handleSync = () => loadAll();
        window.addEventListener('storage', handleSync);
        window.addEventListener('schilders-sync', handleSync);
        return () => {
            window.removeEventListener('storage', handleSync);
            window.removeEventListener('schilders-sync', handleSync);
        };
    }, []);

    const HOLIDAYS_2026 = {
        '2026-01-01': 'Nieuwjaarsdag',
        '2026-04-03': 'Goede Vrijdag',
        '2026-04-05': '1e Paasdag',
        '2026-04-06': '2e Paasdag',
        '2026-04-27': 'Koningsdag',
        '2026-05-05': 'Bevrijdingsdag',
        '2026-05-14': 'Hemelvaartsdag',
        '2026-05-24': '1e Pinksterdag',
        '2026-05-25': '2e Pinksterdag',
        '2026-12-25': '1e Kerstdag',
        '2026-12-26': '2e Kerstdag'
    };

    const isHoliday = useCallback((d) => {
        if (!d) return false;
        const s = formatDate(d);
        if (HOLIDAYS_2026[s]) {
            if (Object.keys(enabledHolidays).length === 0) return HOLIDAYS_2026[s];
            return enabledHolidays[s] !== false ? HOLIDAYS_2026[s] : false;
        }
        return false;
    }, [enabledHolidays]);

    // Refs
    const ganttWrapperRef = useRef(null);
    const timelineDatesRef = useRef([]);
    const justDraggedRef = useRef(false);
    const dragRef = useRef(null);
    const projRef = useRef(proj);
    projRef.current = proj;
    const forceSaveRef = useRef(forceSave);
    forceSaveRef.current = forceSave;
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

    const navigateWeek = (dir) => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + dir * 7);
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

    // --- Native DOM drag handler met live weekend-snapping ---
    useEffect(() => {
        const wrapper = ganttWrapperRef.current;
        if (!wrapper) return;

        // Vliegende datum-tooltip
        const tooltip = document.createElement('div');
        tooltip.style.cssText = 'position:fixed;z-index:100001;background:#1e293b;color:#fff;font-size:0.72rem;font-weight:700;padding:5px 10px;border-radius:8px;pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3);opacity:0;transition:opacity 0.1s;';
        document.body.appendChild(tooltip);

        // Helper: bereken einde op basis van start + werkdagen
        const computeEnd = (startD, workdays) => {
            let e = new Date(startD); let n = workdays - 1;
            while (n > 0) { e.setDate(e.getDate()+1); if(e.getDay()!==0&&e.getDay()!==6&&!isHoliday(e)) n--; }
            return e;
        };
        const fmtNL = (str) => { const d = parseDate(str); return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`; };

        // Absolute setters
        const setStartAbs = (tId, ns) => setProj(prev => {
            if (tId) return { ...prev, tasks: prev.tasks.map(t => t.id !== tId ? t : { ...t, startDate: formatDate(ns) }) };
            return { ...prev, startDate: formatDate(ns) };
        });
        const setEndAbs = (tId, ne) => setProj(prev => {
            if (tId) return { ...prev, tasks: prev.tasks.map(t => t.id !== tId ? t : { ...t, endDate: formatDate(ne) }) };
            return { ...prev, endDate: formatDate(ne) };
        });
        const setDatesAbs = (tId, ns, ne) => setProj(prev => {
            if (tId) return { ...prev, tasks: prev.tasks.map(t => t.id !== tId ? t : { ...t, startDate: formatDate(ns), endDate: formatDate(ne) }) };
            
            const oldProjStart = parseDate(prev.startDate);
            const newProjStart = parseDate(formatDate(ns));
            
            return { ...prev, startDate: formatDate(ns), endDate: formatDate(ne),
                tasks: prev.tasks.map(t => {
                    const startOffsetWdays = diffWorkdays(oldProjStart, parseDate(t.startDate)) - 1;
                    const taskWdays = diffWorkdays(parseDate(t.startDate), parseDate(t.endDate));
                    
                    const nStart = computeEnd(newProjStart, Math.max(1, startOffsetWdays + 1));
                    const nEnd = computeEnd(nStart, Math.max(1, taskWdays));
                    
                    return { ...t, startDate: formatDate(nStart), endDate: formatDate(nEnd) };
                }) 
            };
        });

        const handleMouseDown = (e) => {
            if (e.button !== 0) return;
            const bar = e.target.closest('.gantt-bar');
            if (!bar) return;
            const isResizeHandle = e.target.classList.contains('resize-handle');
            const isLeftResize = e.target.classList.contains('resize-handle-left');
            const rawTaskId = bar.dataset.taskId;
            const taskId = (rawTaskId && rawTaskId !== 'null' && rawTaskId !== '') ? rawTaskId : null;
            const editId = taskId || 'project';

            // Lees originele datums uit data-attributen
            const origStart = bar.dataset.startDate;
            const origEnd   = bar.dataset.endDate;
            if (!origStart || !origEnd) return;
            const origWorkdays = Math.max(diffWorkdays(parseDate(origStart), parseDate(origEnd)), 1);

            // ── Dubbelklik detectie (binnen 350ms op zelfde balk) ──
            if (!isResizeHandle) {
                const now = Date.now();
                if (dblClickRef.current.id === editId && now - dblClickRef.current.t < 350) {
                    dblClickRef.current = { t: 0, id: null };
                    e.stopPropagation(); e.preventDefault();
                    const name = taskId ? projRef.current.tasks.find(t => t.id === taskId)?.name : projRef.current.name;
                    setEditingBarId(editId);
                    setEditingBarName(name || '');
                    return;
                }
                dblClickRef.current = { t: Date.now(), id: editId };
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

            const state = { startX: e.clientX, cellWidth, rawDaysMoved: 0, lastClientX: e.clientX, scrollAccum: 0, animFrame: null };
            dragRef.current = state;
            tooltip.style.opacity = '1';

            const applyPosition = (rawDays) => {
                if (isResizeHandle) {
                    if (isLeftResize) {
                        const ns = snapToWorkday(addDays(parseDate(origStart), rawDays));
                        if (ns > parseDate(origEnd)) return;
                        setStartAbs(taskId, ns);
                        tooltip.textContent = `↔ ${fmtNL(formatDate(ns))} → ${fmtNL(origEnd)}`;
                    } else {
                        const ne = snapToWorkdayBack(addDays(parseDate(origEnd), rawDays));
                        if (ne < parseDate(origStart)) return;
                        setEndAbs(taskId, ne);
                        tooltip.textContent = `↔ ${fmtNL(origStart)} → ${fmtNL(formatDate(ne))}`;
                    }
                } else {
                    const ns = snapToWorkday(addDays(parseDate(origStart), rawDays));
                    const ne = computeEnd(ns, origWorkdays);
                    setDatesAbs(taskId, ns, ne);
                    tooltip.textContent = `⟷ ${fmtNL(formatDate(ns))} → ${fmtNL(formatDate(ne))}`;
                }
            };

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
                            const dx = state.lastClientX - state.startX;
                            const rawDays = Math.round(dx / state.cellWidth);
                            state.rawDaysMoved = rawDays;
                            applyPosition(rawDays);
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
                const rawDays = Math.round(dx / state.cellWidth);
                tooltip.style.left = (ev.clientX + 14) + 'px';
                tooltip.style.top  = (ev.clientY - 36) + 'px';
                if (rawDays !== state.rawDaysMoved) {
                    state.rawDaysMoved = rawDays;
                    applyPosition(rawDays);
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
                tooltip.style.opacity = '0';
                // Datums zijn al live gesnapped — sla op na korte delay zodat React state bijgewerkt is
                if (state.rawDaysMoved === 0 && !isResizeHandle && taskId) {
                    selectTaskRef.current(taskId);
                }
                setTimeout(() => {
                    justDraggedRef.current = false;
                    forceSaveRef.current();
                }, 200);
            };

            overlay.addEventListener('mousemove', onMove);
            overlay.addEventListener('mouseup', onUp);
            document.addEventListener('mousemove', onMove, true);
            document.addEventListener('mouseup', onUp, true);
        };
        wrapper.addEventListener('mousedown', handleMouseDown, true);
        return () => {
            wrapper.removeEventListener('mousedown', handleMouseDown, true);
            if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps


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
    const moveTaskUp = (tid) => updateProj(prev => {
        const tasks = [...prev.tasks];
        const idx = tasks.findIndex(t => t.id === tid);
        if (idx <= 0) return prev;
        [tasks[idx - 1], tasks[idx]] = [tasks[idx], tasks[idx - 1]];
        return { ...prev, tasks };
    });
    const moveTaskDown = (tid) => updateProj(prev => {
        const tasks = [...prev.tasks];
        const idx = tasks.findIndex(t => t.id === tid);
        if (idx < 0 || idx >= tasks.length - 1) return prev;
        [tasks[idx], tasks[idx + 1]] = [tasks[idx + 1], tasks[idx]];
        return { ...prev, tasks };
    });
    const duplicateTask = (tid) => updateProj(prev => {
        const idx = prev.tasks.findIndex(t => t.id === tid);
        if (idx < 0) return prev;
        const orig = prev.tasks[idx];
        const copy = { ...orig, id: 't' + Date.now(), name: orig.name + ' (kopie)', completed: false, notes: [] };
        const tasks = [...prev.tasks];
        tasks.splice(idx + 1, 0, copy);
        return { ...prev, tasks };
    });

    // Directe taak aanmaak via draw-create popup
    const confirmQuickTask = useCallback((name) => {
        if (!name?.trim() || !quickTaskPopup) return;
        const task = {
            id: 't' + Date.now(),
            name: name.trim(),
            startDate: quickTaskPopup.startDate,
            endDate: quickTaskPopup.endDate,
            completed: false,
            assignedTo: [],
        };
        updateProj(prev => ({ ...prev, tasks: [...prev.tasks, task] }));
        setQuickTaskPopup(null);
        setQuickTaskName('');
    }, [quickTaskPopup, updateProj]);

    // Draw-create: start op mousedown op een lege cel in de projectbalk-rij of taak-rij
    const handleDrawMouseDown = useCallback((e, startDateStr, taskId = null) => {
        if (e.button !== 0) return;
        // Sla over als er al een balk-drag actief is
        if (dragRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        // De cel zit DIRECT in de gantt-row-timeline div
        const timelineEl = e.currentTarget.parentElement;
        if (!timelineEl) return;
        const tlRect = timelineEl.getBoundingClientRect();
        const cellWidth = tlRect.width / timelineDatesRef.current.length;

        // Snap startdatum naar werkdag
        const startD = snapToWorkday(parseDate(startDateStr));

        const dc = { startDate: formatDate(startD), endDate: formatDate(startD) };
        drawCreateRef.current = dc;
        setDrawCreate({ ...dc });

        // Anker: het klik-punt, wijzigt NOOIT (ook niet als je achterwaarts sleept)
        const anchorDate = formatDate(startD);

        const getDateFromX = (clientX) => {
            const dx = clientX - tlRect.left;
            const idx = Math.max(0, Math.min(Math.floor(dx / cellWidth), timelineDatesRef.current.length - 1));
            return timelineDatesRef.current[idx];
        };

        const onMove = (me) => {
            if (!drawCreateRef.current) return;
            const hoverD = getDateFromX(me.clientX);
            const hoverStr = formatDate(hoverD);
            // Bepaal start en einde op basis van het anker
            const s = hoverStr < anchorDate ? hoverStr : anchorDate;
            const eRaw = hoverStr >= anchorDate ? hoverStr : anchorDate;
            // Snap naar werkdagen
            const ns = snapToWorkday(parseDate(s));
            const ne = snapToWorkdayBack(parseDate(eRaw));
            const safeEnd = ne < ns ? ns : ne;
            const updated = { startDate: formatDate(ns), endDate: formatDate(safeEnd) };
            drawCreateRef.current = updated;
            setDrawCreate(updated);
        };


        const onUp = (ue) => {
            document.removeEventListener('mousemove', onMove, true);
            document.removeEventListener('mouseup', onUp, true);
            const dc2 = drawCreateRef.current;
            setDrawCreate(null);
            drawCreateRef.current = null;
            if (!dc2 || !dc2.startDate || !dc2.endDate) return;

            if (taskId) {
                // Update bestaande taak
                updateProj(prev => {
                    const newTasks = (prev.tasks || []).map(tx => tx.id === taskId ? { ...tx, startDate: dc2.startDate, endDate: dc2.endDate } : tx);
                    const np = { ...prev, tasks: newTasks };
                    forceSave(np);
                    return np;
                });
            } else {
                // Project-rij: maak nieuwe taak popup
                setQuickTaskPopup({ startDate: dc2.startDate, endDate: dc2.endDate, x: ue.clientX, y: ue.clientY });
                setQuickTaskName('');
            }
        };

        document.addEventListener('mousemove', onMove, true);
        document.addEventListener('mouseup', onUp, true);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
                    <div style={{ display: 'flex', gap: '2px' }}>
                        <button onClick={() => navigate(-1)} title="1 maand terug" style={{ border: '1px solid var(--border-color,#e2e8f0)', background: '#fff', borderRadius: '8px 2px 2px 8px', padding: '6px 10px', cursor: 'pointer', color: '#64748b' }}>
                            <i className="fa-solid fa-angles-left" style={{ fontSize: '0.65rem' }} />
                        </button>
                        <button onClick={() => navigateWeek(-1)} title="1 week terug" style={{ border: '1px solid var(--border-color,#e2e8f0)', background: '#fff', borderRadius: '2px 8px 8px 2px', padding: '6px 10px', cursor: 'pointer', color: '#64748b' }}>
                            <i className="fa-solid fa-angle-left" />
                        </button>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: '155px', textAlign: 'center' }}>
                        {`${MONTHS_FULL[currentDate.getMonth()]} — ${MONTHS_FULL[(currentDate.getMonth() + 1) % 12]} ${currentDate.getFullYear()}`}
                    </span>
                    <div style={{ display: 'flex', gap: '2px' }}>
                        <button onClick={() => navigateWeek(1)} title="1 week vooruit" style={{ border: '1px solid var(--border-color,#e2e8f0)', background: '#fff', borderRadius: '8px 2px 2px 8px', padding: '6px 10px', cursor: 'pointer', color: '#64748b' }}>
                            <i className="fa-solid fa-angle-right" />
                        </button>
                        <button onClick={() => navigate(1)} title="1 maand vooruit" style={{ border: '1px solid var(--border-color,#e2e8f0)', background: '#fff', borderRadius: '2px 8px 8px 2px', padding: '6px 10px', cursor: 'pointer', color: '#64748b' }}>
                            <i className="fa-solid fa-angles-right" style={{ fontSize: '0.65rem' }} />
                        </button>
                    </div>
                    <button onClick={() => setCurrentDate(new Date())} style={{ border: '1px solid var(--border-color,#e2e8f0)', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginLeft: '2px' }}>Vandaag</button>
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
                    <div className="gantt-header-label" style={{ minWidth: '420px', maxWidth: '420px' }}>&nbsp;</div>
                    <div className="gantt-progress-col header">&nbsp;</div>
                    <div className="gantt-team-col header">&nbsp;</div>
                    {yearSpans.map((s, i) => (
                        <div key={i} className="gantt-header-span year-span" style={{ flex: s.days, minWidth: s.days * cellW }}>{s.year}</div>
                    ))}
                </div>
                {/* Maand */}
                <div className="gantt-header-row month-row">
                    <div className="gantt-header-label" style={{ minWidth: '420px', maxWidth: '420px' }}>&nbsp;</div>
                    <div className="gantt-progress-col header">&nbsp;</div>
                    <div className="gantt-team-col header">&nbsp;</div>
                    {monthSpans.map((s, i) => (
                        <div key={i} className="gantt-header-span month-span" style={{ flex: s.days, minWidth: s.days * cellW, cursor: 'pointer' }}
                            onClick={() => { setViewMode('month'); setCurrentDate(new Date(s.year, s.month, 1)); }}
                            title={`Ga naar ${MONTHS_FULL[s.month]} ${s.year}`}>{MONTHS_FULL[s.month]}</div>
                    ))}
                </div>
                {/* Week */}
                <div className="gantt-header-row week-row">
                    <div className="gantt-header-label" style={{ fontSize: '0.6rem', color: '#94a3b8', minWidth: '420px', maxWidth: '420px' }}>Week</div>
                    <div className="gantt-progress-col header">&nbsp;</div>
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
                    <div className="gantt-header-label" style={{ fontWeight: 700, fontSize: '0.7rem', minWidth: '420px', maxWidth: '420px' }}>Project / Taak</div>
                    <div className="gantt-progress-col header">Vtg</div>
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
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {(() => {
                                const activeTasks = planningTasks.filter(t => !t.completed);
                                const hasUnassigned = activeTasks.length > 0 && activeTasks.some(t => (t.assignedTo || []).length === 0);
                                return hasUnassigned && <i className="fa-solid fa-circle-exclamation" style={{ color: '#ef4444', fontSize: '0.65rem' }} title="Niet alle actieve taken hebben personeel toegewezen"></i>;
                            })()}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0, justifyContent: 'center' }}>
                            <input type="date" value={proj.startDate} onClick={e => e.stopPropagation()}
                                onChange={e => { if (e.target.value) updateProj(prev => ({ ...prev, startDate: e.target.value })); }}
                                style={{ width: '90px', fontSize: '0.6rem', padding: '1px 3px', border: '1px solid #10b981', borderRadius: '4px', background: '#d1fae5', color: '#065f46', fontWeight: 600, cursor: 'pointer', outline: 'none' }} />
                            <input type="date" value={proj.endDate} onClick={e => e.stopPropagation()}
                                onChange={e => { if (e.target.value) updateProj(prev => ({ ...prev, endDate: e.target.value })); }}
                                style={{ width: '90px', fontSize: '0.6rem', padding: '1px 3px', border: '1px solid #f43f5e', borderRadius: '4px', background: '#ffe4e6', color: '#9f1239', fontWeight: 600, cursor: 'pointer', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', minWidth: '26px' }}>
                            <span style={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 600, textAlign: 'right', width: '100%' }}>
                                {proj.startDate && proj.endDate ? `${diffDays(parseDate(proj.startDate), parseDate(proj.endDate)) + 1}d` : ''}
                            </span>
                        </div>
                    </div>
                    {/* Voortgang kolom project */}
                    <div className="gantt-progress-col" style={{ background: '#f8fafc' }} />
                    {/* Project-niveau team kolom */}
                    {(() => {
                        const taskWorkerIds = [...new Set(planningTasks.filter(t => !t.completed).flatMap(t => t.assignedTo || []))];
                        const workers = taskWorkerIds.map(id => allUsers.find(u => u.id === id)).filter(Boolean);
                        const hasWorkers = workers.length > 0;
                        return (
                            <div className="gantt-team-col" style={{ background: hasWorkers ? '#f8fafc' : '#fef2f2', borderLeft: hasWorkers ? '1px solid #e2e8f0' : '2px solid #fecaca', justifyContent: 'center' }}>
                                <div
                                    title={hasWorkers ? workers.map(u => u.name).join(', ') + ' — klik om projectpersoneel te beheren' : 'Niemand ingepland op project — klik om toe te voegen'}
                                    onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setTeamPopupPos({ taskId: null, x: r.left, y: r.bottom }); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        height: '18px', padding: '0 6px', borderRadius: '8px',
                                        cursor: 'pointer', transition: 'all 0.15s',
                                        background: hasWorkers ? proj.color + '22' : 'rgba(239,68,68,0.1)',
                                        border: `1px solid ${hasWorkers ? proj.color + '55' : '#ef444466'}`,
                                        color: hasWorkers ? proj.color : '#ef4444',
                                        pointerEvents: 'auto',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = hasWorkers ? proj.color + '40' : 'rgba(239,68,68,0.2)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = hasWorkers ? proj.color + '22' : 'rgba(239,68,68,0.1)'; }}
                                >
                                    <i className={`fa-solid fa-${hasWorkers ? 'users' : 'user-plus'}`} style={{ fontSize: '0.48rem' }} />
                                    {hasWorkers && <span style={{ fontSize: '0.55rem', fontWeight: 700 }}>{workers.length}</span>}
                                    {!hasWorkers && <span style={{ fontSize: '0.48rem', fontWeight: 700, textTransform: 'uppercase' }}>Geen</span>}
                                </div>
                            </div>
                        );
                    })()}
                    <div className="gantt-row-timeline" data-draw-timeline="project">
                        {timelineDates.map((d, i) => {
                            const ds = formatDate(d);
                            const weekend = isWeekend(d);
                            const isHol = isHoliday(d);
                            return (
                                <div key={i}
                                    className={`gantt-cell ${weekend ? 'weekend' : ''} ${todayStr === ds ? 'today' : ''}`}
                                    style={{ cursor: weekend || isHol ? 'default' : 'crosshair', pointerEvents: 'auto' }}
                                    onMouseDown={weekend || isHol ? undefined : (e) => {
                                        // Alleen als er geen bestaande balk wordt geraakt
                                        const path = e.nativeEvent.composedPath ? e.nativeEvent.composedPath() : [];
                                        if (path.some(el => el.classList && (el.classList.contains('gantt-bar') || el.classList.contains('resize-handle')))) return;
                                        handleDrawMouseDown(e, ds);
                                    }}
                                />
                            );
                        })}
                        {/* Preview-balk tijdens draw-create */}
                        {drawCreate && !drawCreate.taskId && (() => {
                            const segs = getBarSegments(drawCreate.startDate, drawCreate.endDate, proj.color + '88');
                            return segs.map((seg, si) => (
                                <div key={si} style={{
                                    ...seg,
                                    position: 'absolute', top: '4px', height: '22px',
                                    borderRadius: '5px',
                                    border: `2px dashed ${proj.color}`,
                                    pointerEvents: 'none', zIndex: 10,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden',
                                }}>
                                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: proj.color, whiteSpace: 'nowrap', paddingLeft: 4, textShadow: '0 0 4px #fff' }}>
                                        {drawCreate.startDate !== drawCreate.endDate
                                            ? `${drawCreate.startDate} → ${drawCreate.endDate}`
                                            : drawCreate.startDate}
                                    </span>
                                </div>
                            ));
                        })()}

                        {proj.startDate && proj.endDate && (() => {
                            const segs = getBarSegments(proj.startDate, proj.endDate, proj.color);
                            if (!segs.length) return null;
                            return (
                                <React.Fragment key={proj.id + '_timeline'}>
                                    {segs.map((segStyle, si) => (
                                        <div key={si} className="gantt-bar" data-project-id={proj.id} data-task-id={null}
                                            data-start-date={proj.startDate} data-end-date={proj.endDate}
                                            style={{
                                                ...segStyle, cursor: 'grab',
                                                borderRadius: si === 0 && segs.length === 1 ? '5px' : si === 0 ? '5px 0 0 5px' : si === segs.length - 1 ? '0 5px 5px 0' : '0',
                                            }}>
                                            {si === 0 && <div className="resize-handle resize-handle-left" />}
                                            {si === segs.length - 1 && <div className="resize-handle resize-handle-right" />}
                                        </div>
                                    ))}
                                    <div style={{
                                        position: 'absolute', left: segs[0].left, top: '4px', height: '22px',
                                        width: `calc(${segs[segs.length - 1].left} + ${segs[segs.length - 1].width} - ${segs[0].left})`,
                                        pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '5px', paddingLeft: '6px', paddingRight: '6px', zIndex: 3, overflow: 'visible'
                                    }}>
                                        {editingBarId === 'project' ? (
                                            <div style={{ position: 'sticky', left: '4px', display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
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
                                                    style={{ pointerEvents: 'auto', flex: 1, background: 'rgba(255,255,255,0.25)', border: 'none', borderBottom: '2px solid #fff', outline: 'none', color: '#fff', fontWeight: 700, fontSize: '0.75rem', borderRadius: '2px', padding: '0 2px', minWidth: 0 }}
                                                />
                                            </div>
                                        ) : (
                                            <span style={{ position: 'sticky', left: '6px', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0, color: '#fff', textShadow: '0px 0px 3px rgba(0,0,0,0.6)' }}>
                                                {proj.name}
                                            </span>
                                        )}
                                    </div>
                                </React.Fragment>
                            );
                        })()}
                    </div>
                </div>

                {/* Taak rijen — alleen ACTIEVE taken */}
                {expandedTasks && planningTasks.filter(t => !t.completed).map(t => {
                    const noTeam = (t.assignedTo || []).length === 0;
                    return (
                    <div key={t.id} className="gantt-row"
                        onClick={() => { if (!justDraggedRef.current) setSelectedTaskId(prev => prev === t.id ? null : t.id); }}
                        style={{
                            background: selectedTaskId === t.id ? 'rgba(245,133,10,0.06)' : '#fff',
                            cursor: 'pointer',
                            boxShadow: selectedTaskId === t.id ? 'inset 3px 0 0 #F5850A' : 'none',
                            borderBottom: '1px solid #f1f5f9',
                        }}>
                        <div className="gantt-row-label" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '2px', padding: '5px 8px 5px 32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input type="checkbox" checked={false} onChange={e => { e.stopPropagation(); toggleTask(t.id); }}
                                    style={{ width: '13px', height: '13px', accentColor: '#F5850A', cursor: 'pointer', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                    <div
                                        onDoubleClick={e => { e.stopPropagation(); const el = e.currentTarget; el.contentEditable = 'true'; el.focus(); const r = document.createRange(); r.selectNodeContents(el); window.getSelection().removeAllRanges(); window.getSelection().addRange(r); }}
                                        onBlur={e => { e.target.contentEditable = 'false'; const n = e.target.textContent.trim(); if (n && n !== t.name) updateProj(prev => ({ ...prev, tasks: prev.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, name: n }) })); }}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
                                        style={{ fontWeight: 600, fontSize: '0.76rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', outline: 'none', cursor: 'pointer' }}
                                    >{t.name}</div>
                                </div>

                                {/* Actie-knoppen top rij: omhoog, omlaag, verwijder */}
                                {[
                                    { icon: 'fa-chevron-up',   title: 'Omhoog',   color: '#94a3b8', hover: '#3b82f6', action: e => { e.stopPropagation(); moveTaskUp(t.id); } },
                                    { icon: 'fa-chevron-down', title: 'Omlaag',   color: '#94a3b8', hover: '#3b82f6', action: e => { e.stopPropagation(); moveTaskDown(t.id); } },
                                ].map((btn, i) => (
                                    <button key={i} onClick={btn.action} title={btn.title}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', borderRadius: '3px', color: btn.color, flexShrink: 0, fontSize: '0.65rem', transition: 'color 0.15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.color = btn.hover; e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = btn.color; e.currentTarget.style.background = 'none'; }}>
                                        <i className={`fa-solid ${btn.icon}`} />
                                    </button>
                                ))}
                                {/* Verwijder-knop */}
                                <button onClick={e => { e.stopPropagation(); deleteTask(t.id); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', borderRadius: '3px', color: '#cbd5e1', flexShrink: 0, fontSize: '0.7rem', transition: 'color 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'none'; }}>
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', paddingLeft: '19px' }}>
                                <input type="date" value={t.startDate} onClick={e => e.stopPropagation()}
                                    onChange={e => { if (e.target.value) updateProj(prev => ({ ...prev, tasks: prev.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, startDate: e.target.value }) })); }}
                                    style={{ width: '88px', fontSize: '0.58rem', padding: '1px 2px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', color: '#475569', cursor: 'pointer', outline: 'none' }} />
                                {t.startDate && t.endDate && (() => {
                                    const currentDays = Math.max(diffWorkdays(parseDate(t.startDate), parseDate(t.endDate)), 1);
                                    const changeDays = (newDays) => {
                                        if (newDays < 1) return;
                                        // addWorkdays starts today, so add newDays - 1
                                        const newEnd = formatDate(addWorkdays(parseDate(t.startDate), newDays - 1));
                                        updateProj(prev => ({ ...prev, tasks: prev.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, endDate: newEnd }) }));
                                    };
                                    return (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', background: proj.color, borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                            <button onClick={e => { e.stopPropagation(); changeDays(currentDays - 1); }}
                                                style={{ background: 'rgba(0,0,0,0.15)', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px', fontSize: '0.6rem', fontWeight: 700, lineHeight: '16px' }}>−</button>
                                            <input
                                                type="number" min="1"
                                                defaultValue={currentDays}
                                                key={currentDays}
                                                onClick={e => e.stopPropagation()}
                                                onFocus={e => e.target.select()}
                                                onBlur={e => { const v = parseInt(e.target.value); if (v > 0) changeDays(v); }}
                                                onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt(e.target.value); if (v > 0) { changeDays(v); e.target.blur(); } } e.stopPropagation(); }}
                                                style={{ width: '24px', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontWeight: 700, fontSize: '0.56rem', textAlign: 'center', padding: '0', MozAppearance: 'textfield' }}
                                            />
                                            <button onClick={e => { e.stopPropagation(); changeDays(currentDays + 1); }}
                                                style={{ background: 'rgba(0,0,0,0.15)', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px', fontSize: '0.6rem', fontWeight: 700, lineHeight: '16px' }}>+</button>
                                        </div>
                                    );
                                })()}
                                <input type="date" value={t.endDate} onClick={e => e.stopPropagation()}
                                    onChange={e => { if (e.target.value) updateProj(prev => ({ ...prev, tasks: prev.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, endDate: e.target.value }) })); }}
                                    style={{ width: '88px', fontSize: '0.58rem', padding: '1px 2px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', color: '#475569', cursor: 'pointer', outline: 'none' }} />
                                
                                {/* Rij-2 knoppen: kopiëren, memo, notities (recht uitlijnen) */}
                                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1px' }}>
                                    <button onClick={e => { e.stopPropagation(); duplicateTask(t.id); }} title="Kopiëren"
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', borderRadius: '3px', color: '#94a3b8', flexShrink: 0, fontSize: '0.65rem', transition: 'color 0.15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.color = '#8b5cf6'; e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none'; }}>
                                        <i className="fa-solid fa-copy" />
                                    </button>
                                    {/* Memo-indicator */}
                                    {t.memo && (
                                        <span title={t.memo} style={{ color: '#f59e0b', fontSize: '0.65rem', cursor: 'default' }}>
                                            <i className="fa-solid fa-note-sticky" />
                                        </span>
                                    )}
                                    {/* Notitie-knop */}
                                    <button onClick={e => { e.stopPropagation(); setNotePopup({ taskId: t.id }); setNoteInput(''); setNoteTab('nieuw'); }}
                                        title={`Notities (${(t.notes || []).length})`}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', borderRadius: '3px', color: (t.notes || []).length > 0 ? '#f59e0b' : '#cbd5e1', flexShrink: 0, fontSize: '0.65rem', position: 'relative', transition: 'color 0.15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.color = '#f59e0b'; e.currentTarget.style.background = 'rgba(245,158,11,0.08)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = (t.notes || []).length > 0 ? '#f59e0b' : '#cbd5e1'; e.currentTarget.style.background = 'none'; }}>
                                        <i className="fa-solid fa-note-sticky" />
                                        {(t.notes || []).length > 0 && (
                                            <span style={{ position: 'absolute', top: '-3px', right: '-3px', background: '#f59e0b', color: '#fff', borderRadius: '50%', fontSize: '0.48rem', width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}>
                                                {(t.notes || []).length}
                                            </span>
                                        )}
                                    </button>
                                    {/* Attachment-indicator */}
                                    {(t.attachments || []).length > 0 && (
                                        <button onClick={e => { e.stopPropagation(); setNotePopup({ taskId: t.id }); setNoteInput(''); setNoteTab('bijlagen'); }}
                                            title={`Bijlagen (${(t.attachments || []).length})`}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', borderRadius: '3px', color: '#10b981', flexShrink: 0, fontSize: '0.62rem', position: 'relative', transition: 'color 0.15s' }}>
                                            <i className="fa-solid fa-paperclip" />
                                            <span style={{ position: 'absolute', top: '-3px', right: '-3px', background: '#10b981', color: '#fff', borderRadius: '50%', fontSize: '0.48rem', minWidth: '12px', height: '12px', padding: '0 2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}>
                                                {(t.attachments || []).length}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* ===== VOORTGANG KOLOM (taak) ===== */}
                        {(() => {
                            const prog = t.progress || 0;
                            const col = prog > 0 ? '#10b981' : '#cbd5e1';
                            return (
                                <div className="gantt-progress-col" style={{ background: '#fff' }}>
                                    <div
                                        title={`Voortgang: ${prog}%`}
                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: col, background: col + '18', borderRadius: '6px', padding: '3px 4px' }}>
                                        <i className="fa-solid fa-chart-simple" style={{ fontSize: '0.7rem' }} />
                                        <span style={{ fontSize: '0.58rem', fontWeight: 800, lineHeight: 1 }}>{prog}%</span>
                                    </div>
                                </div>
                            );
                        })()}
                        {/* TEAM KOLOM (taak) */}
                        <div className="gantt-team-col" style={{ background: '#fff' }}>
                            {(() => {
                                const taskWorkers = (t.assignedTo || []).map(uid => allUsers.find(u => u.id === uid)).filter(Boolean);
                                const hasWorkers = taskWorkers.length > 0;
                                return (
                                    <div
                                        title={hasWorkers ? taskWorkers.map(u => u.name).join(', ') + ' — klik om te beheren' : 'Niemand ingepland — klik om toe te voegen'}
                                        onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setTeamPopup({ taskId: t.id, x: r.left, y: r.bottom }); }}
                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.15s', background: hasWorkers ? proj.color + '22' : 'rgba(239,68,68,0.1)', border: `1.5px solid ${hasWorkers ? proj.color + '88' : '#ef444466'}`, color: hasWorkers ? proj.color : '#ef4444', pointerEvents: 'auto', gap: '1px' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = hasWorkers ? proj.color + '44' : 'rgba(239,68,68,0.22)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = hasWorkers ? proj.color + '22' : 'rgba(239,68,68,0.1)'; }}>
                                        <i className={`fa-solid fa-${hasWorkers ? 'users' : 'user-plus'}`} style={{ fontSize: '0.55rem' }} />
                                        {hasWorkers && <span style={{ fontSize: '0.46rem', fontWeight: 700, lineHeight: 1 }}>{taskWorkers.length}</span>}
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="gantt-row-timeline" style={{ position: 'relative' }}>
                            {/* Achtergrondcellen — twee zones per cel */}
                            {timelineDates.map((d, i) => {
                                const ds = formatDate(d);
                                const inRange = ds >= t.startDate && ds <= t.endDate;
                                const weekend = isWeekend(d);
                                const holiday = !weekend && isHoliday(d);
                                const isToday = formatDate(today) === ds;
                                // Toegewezen personen op deze dag
                                const dayAssigned = (() => {
                                    const dayIds = t.assignedByDay?.[ds] ?? t.assignedTo ?? [];
                                    return dayIds
                                        .map(uid => allUsers.find(u => u.id === uid))
                                        .filter(Boolean);
                                })();
                                return (
                                    <div key={i}
                                        className={`gantt-cell ${weekend ? 'weekend' : ''} ${holiday ? 'holiday' : ''} ${isToday ? 'today' : ''}`}
                                        style={{ display: 'flex', flexDirection: 'column', padding: 0 }}
                                    >
                                        {/* Bovenste zone: klikbaar voor draw-create */}
                                        <div
                                            style={{ height: '30px', flexShrink: 0, cursor: weekend || holiday ? 'default' : 'crosshair', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onMouseDown={weekend || holiday ? undefined : (e) => {
                                                const path = e.nativeEvent.composedPath ? e.nativeEvent.composedPath() : [];
                                                if (path.some(el => el.classList && (el.classList.contains('gantt-bar') || el.classList.contains('resize-handle')))) return;
                                                handleDrawMouseDown(e, ds, t.id);
                                            }}
                                        >
                                            {holiday && <i className="fa-solid fa-star" style={{ fontSize: '0.4rem', color: '#F5850A', pointerEvents: 'none', zIndex: 1 }} title={isHoliday(d)} />}
                                        </div>
                                        {/* Onderste zone: persoons-chips */}
                                        <div style={{
                                            height: '24px', display: 'flex', alignItems: 'center',
                                            gap: '1px', padding: '0 2px', overflow: 'hidden',
                                            background: weekend ? 'transparent'
                                                : holiday ? 'rgba(245,133,10,0.05)'
                                                : inRange ? 'rgba(0,0,0,0.02)'
                                                : 'rgba(0,0,0,0.018)',
                                            borderTop: holiday ? '1px solid rgba(245,133,10,0.15)'
                                                : inRange && !weekend ? `1px solid ${proj.color}22`
                                                : '1px solid rgba(0,0,0,0.04)',
                                        }}>
                                            {!weekend && !holiday && inRange && (
                                                <div
                                                    title={dayAssigned.length > 0 ? dayAssigned.map(u => u.name).join(', ') + ' — klik om te wijzigen' : 'Niemand ingepland — klik om toe te voegen'}
                                                    onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setTeamPopup({ taskId: t.id, dateStr: ds, x: r.left, y: r.bottom + 4 }); }}
                                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', background: dayAssigned.length > 0 ? proj.color + '22' : 'rgba(239,68,68,0.1)', border: `1.5px solid ${dayAssigned.length > 0 ? proj.color + '88' : '#ef444466'}`, color: dayAssigned.length > 0 ? proj.color : '#ef4444', pointerEvents: 'auto', gap: '1px' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = dayAssigned.length > 0 ? proj.color + '44' : 'rgba(239,68,68,0.22)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = dayAssigned.length > 0 ? proj.color + '22' : 'rgba(239,68,68,0.1)'; }}>
                                                    <i className={`fa-solid fa-${dayAssigned.length > 0 ? 'users' : 'user-plus'}`} style={{ fontSize: '0.38rem' }} />
                                                    {dayAssigned.length > 0 && <span style={{ fontSize: '0.34rem', fontWeight: 700, lineHeight: 1 }}>{dayAssigned.length}</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {/* Preview-balk tijdens draw-create */}
                            {drawCreate && drawCreate.taskId === t.id && (() => {
                                const segs = getBarSegments(drawCreate.startDate, drawCreate.endDate, proj.color + '88');
                                return segs.map((seg, si) => (
                                    <div key={si} style={{
                                        ...seg,
                                        position: 'absolute', top: '4px', height: '18px',
                                        borderRadius: '5px',
                                        border: `2px dashed ${proj.color}`,
                                        background: proj.color + '44',
                                        pointerEvents: 'none', zIndex: 10,
                                    }} />
                                ));
                            })()}

                            {t.startDate && t.endDate && (() => {
                                const barColor = proj.color + 'bb';

                                const segs = getBarSegments(t.startDate, t.endDate, barColor);
                                if (!segs.length) return null;
                                return (
                                    <React.Fragment key={t.id + '_timeline'}>
                                        {segs.map((segStyle, si) => (
                                            <div key={si} className="gantt-bar" data-project-id={proj.id} data-task-id={t.id}
                                                data-start-date={t.startDate} data-end-date={t.endDate}
                                                style={{
                                                    ...segStyle,
                                                    display: 'flex', alignItems: 'center',
                                                    cursor: 'grab', height: '24px', top: '3px', fontSize: '0.42rem',
                                                    borderRadius: si === 0 && segs.length === 1 ? '7px' : si === 0 ? '7px 0 0 7px' : si === segs.length - 1 ? '0 7px 7px 0' : '0',
                                                    border: '1px solid rgba(0,0,0,0.08)',
                                                    boxShadow: selectedTaskId === t.id
                                                        ? `0 0 0 2.5px #F5850A, 0 0 12px #F5850A66`
                                                        : '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)',
                                                    ...(selectedTaskId === t.id && { filter: 'brightness(1.15)' }),
                                                    overflow: 'hidden',
                                                }}>
                                                {/* Glans-overlay */}
                                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 55%)', borderRadius: 'inherit', pointerEvents: 'none' }} />
                                                {/* Lichte overlay over hele balk */}
                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.48)', pointerEvents: 'none' }} />
                                                {/* Voortgang */}
                                                <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${t.progress || 0}%`, height: '3px', background: '#16a34a', pointerEvents: 'none' }} />
                                                {si === 0 && <div className="resize-handle resize-handle-left" />}
                                                {si === segs.length - 1 && <div className="resize-handle resize-handle-right" />}
                                            </div>
                                        ))}
                                        <div style={{
                                            position: 'absolute', left: segs[0].left, top: '3px', height: '24px',
                                            width: `calc(${segs[segs.length - 1].left} + ${segs[segs.length - 1].width} - ${segs[0].left})`,
                                            pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '5px', paddingRight: '5px', minWidth: 0, overflow: 'visible', zIndex: 3
                                        }}>
                                            <div style={{ position: 'sticky', left: '5px', display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden' }}>
                                                <div style={{ color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0, textShadow: '0px 0px 3px rgba(0,0,0,0.6)' }}>{t.name}</div>
                                                {/* 📝 Notitie badge op balk */}
                                                {(t.notes || []).length > 0 && (
                                                    <span
                                                        onClick={e => { e.stopPropagation(); setNotePopup({ taskId: t.id }); setNoteInput(''); setNoteTab('nieuw'); }}
                                                        onMouseEnter={e => {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setNoteTooltip({ notes: t.notes, x: rect.left, y: rect.bottom + 6, taskName: t.name });
                                                        }}
                                                        onMouseLeave={() => setNoteTooltip(null)}
                                                        style={{ pointerEvents: 'all', display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'rgba(255,255,255,0.9)', borderRadius: '4px', padding: '0 4px', fontSize: '0.52rem', color: '#92400e', fontWeight: 700, flexShrink: 0, cursor: 'pointer', lineHeight: '14px', marginLeft: 'auto', userSelect: 'none' }}>
                                                        <i className="fa-solid fa-note-sticky" style={{ fontSize: '0.5rem' }} />
                                                        {(t.notes || []).length > 1 && <span>{(t.notes || []).length}</span>}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })()}
                        </div>
                    </div>
                    );
                })}

                {/* ===== VOLTOOIDE TAKEN SECTIE ===== */}
                {planningTasks.some(t => t.completed) && (
                    <>
                        {/* Scheidingslijn met knop */}
                        <div
                            onClick={() => setShowCompleted(v => !v)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '6px 16px', cursor: 'pointer',
                                background: '#f8fafc', borderTop: '1px solid #e2e8f0',
                                borderBottom: showCompleted ? '1px solid #e2e8f0' : 'none',
                                userSelect: 'none',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                                <i className={`fa-solid ${showCompleted ? 'fa-chevron-down' : 'fa-chevron-right'}`}
                                    style={{ fontSize: '0.5rem', color: '#10b981', transition: 'transform 0.2s' }} />
                                <i className="fa-solid fa-circle-check" style={{ color: '#10b981', fontSize: '0.72rem' }} />
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981' }}>
                                    Voltooide taken ({planningTasks.filter(t => t.completed).length})
                                </span>
                            </div>
                            <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                                {showCompleted ? 'Verbergen' : 'Tonen'}
                            </span>
                        </div>

                        {/* Voltooide rijen */}
                        {showCompleted && planningTasks.filter(t => t.completed).map(t => (
                            <div key={t.id} className="gantt-row"
                                style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9', opacity: 0.75 }}>
                                <div className="gantt-row-label" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1px', padding: '4px 8px 4px 32px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <input type="checkbox" checked={true} onChange={e => { e.stopPropagation(); toggleTask(t.id); }}
                                            style={{ width: '13px', height: '13px', accentColor: '#10b981', cursor: 'pointer', flexShrink: 0 }} />
                                        <div style={{ flex: 1, fontWeight: 500, fontSize: '0.74rem', color: '#94a3b8', textDecoration: 'line-through', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {t.name}
                                        </div>
                                        <i className="fa-solid fa-circle-check" style={{ color: '#10b981', fontSize: '0.65rem', flexShrink: 0 }} />
                                        <button onClick={e => { e.stopPropagation(); deleteTask(t.id); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', borderRadius: '3px', color: '#cbd5e1', flexShrink: 0, fontSize: '0.7rem', transition: 'color 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                            onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                                            <i className="fa-solid fa-xmark" />
                                        </button>
                                    </div>
                                    <div style={{ fontSize: '0.57rem', color: '#94a3b8', paddingLeft: '19px' }}>
                                        {t.startDate} → {t.endDate}
                                    </div>
                                </div>
                                {/* Lege voortgang kolom voor voltooide taken */}
                                <div className="gantt-progress-col" style={{ background: '#f8fafc' }} />
                                {/* Lege team kolom voor voltooide taken */}
                                <div className="gantt-team-col" style={{ background: '#f1f5f9', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '0.55rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <i className="fa-solid fa-check" />
                                    </span>
                                </div>
                                <div className="gantt-row-timeline">
                                    {timelineDates.map((d, i) => {
                                        const ds = formatDate(d);
                                        const weekend = isWeekend(d);
                                        const isHol = isHoliday(d);
                                        return (
                                            <div key={i}
                                                className={`gantt-cell ${weekend ? 'weekend' : ''}`}
                                                style={{ cursor: weekend || isHol ? 'default' : 'crosshair', pointerEvents: 'auto' }}
                                                onMouseDown={weekend || isHol ? undefined : (e) => {
                                                    const path = e.nativeEvent.composedPath ? e.nativeEvent.composedPath() : [];
                                                    if (path.some(el => el.classList && (el.classList.contains('gantt-bar') || el.classList.contains('resize-handle')))) return;
                                                    handleDrawMouseDown(e, ds, t.id);
                                                }}
                                            />
                                        );
                                    })}

                                    {t.startDate && t.endDate && (() => {
                                        const segs = getBarSegments(t.startDate, t.endDate, '#10b981');
                                        if (!segs.length) return null;
                                        return (
                                            <React.Fragment key={t.id + '_completed'}>
                                                {segs.map((segStyle, si) => (
                                                    <div key={si} className="gantt-bar"
                                                        style={{
                                                            ...segStyle, height: '16px', top: '7px',
                                                            display: 'flex', alignItems: 'center',
                                                            opacity: 0.45, background: '#10b981aa', cursor: 'default',
                                                            borderRadius: si === 0 && segs.length === 1 ? '4px' : si === 0 ? '4px 0 0 4px' : si === segs.length - 1 ? '0 4px 4px 0' : '0',
                                                        }}>
                                                    </div>
                                                ))}
                                                <div style={{
                                                    position: 'absolute', left: segs[0].left, top: '7px', height: '16px',
                                                    width: `calc(${segs[segs.length - 1].left} + ${segs[segs.length - 1].width} - ${segs[0].left})`,
                                                    pointerEvents: 'none', paddingLeft: '4px', textDecoration: 'line-through', display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, overflow: 'visible', zIndex: 3
                                                }}>
                                                <div style={{ position: 'sticky', left: '4px', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                                                    <div style={{ color: '#fff', fontSize: '0.58rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0, textShadow: '0px 0px 3px rgba(0,0,0,0.6)' }}>{t.name}</div>
                                                    <div style={{ color: 'rgba(255,255,255,0.95)', fontSize: '0.55rem', fontWeight: 700, paddingLeft: '2px', flexShrink: 0, whiteSpace: 'nowrap', textShadow: '0px 0px 3px rgba(0,0,0,0.8)' }}>
                                                        ({diffWorkdays(parseDate(t.startDate), parseDate(t.endDate))}d)
                                                    </div>
                                                </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })()}
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {/* Lege staat */}
                {planningTasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 20px', background: '#fff' }}>
                        <i className="fa-solid fa-chart-gantt" style={{ fontSize: '2rem', color: '#cbd5e1', display: 'block', marginBottom: '8px' }} />
                        <p style={{ color: '#94a3b8', margin: '0 0 12px', fontSize: '0.88rem' }}>Nog geen taken gepland</p>
                        <button onClick={() => { setNewTask({ name: '', startDate: proj.startDate, endDate: proj.endDate }); setShowAddTask(true); }}
                            style={{ padding: '8px 18px', borderRadius: '9px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                            <i className="fa-solid fa-plus" style={{ marginRight: 5 }} />Eerste taak toevoegen
                        </button>
                    </div>
                )}

                {/* ===== BEZETTING / BESCHIKBAARHEID ===== */}
                <div style={{ borderTop: '2px solid #F5850A', background: '#fffbf5' }}>
                    {(() => {
                        const allUserIds = allUsers.map(u => u.id);
                        
                        // Vakantiedagen ophalen
                        const vacDaysByUserId = {};
                        const YEAR = new Date().getFullYear();
                        allUsers.forEach(u => {
                            let vacDays = [];
                            try { vacDays = JSON.parse(localStorage.getItem(`schildersapp_vakantie_${YEAR}_${u.name.replace(/\s+/g, '_')}`)) || []; } catch {}
                            if (vacDays.length === 0) {
                                try { vacDays = JSON.parse(localStorage.getItem(`schildersapp_vakantie_${YEAR}`)) || []; } catch {}
                            }
                            if (vacDays.length > 0) vacDaysByUserId[u.id] = new Set(vacDays);
                        });

                        const busyByDay = {};
                        const absentByDay = {};
                        timelineDates.forEach(d => {
                            const ds = formatDate(d);
                            busyByDay[ds] = new Set(
                                allProjects.flatMap(pr =>
                                    (pr.tasks || [])
                                        .filter(t => !t.completed && ds >= t.startDate && ds <= t.endDate)
                                        .flatMap(t => {
                                            if (t.assignedByDay && t.assignedByDay[ds] !== undefined) return t.assignedByDay[ds];
                                            return t.assignedTo || [];
                                        })
                                )
                            );
                            
                            const absentSet = new Set(
                                (workerAbsences || []).filter(a => ds >= a.startDate && ds <= a.endDate).map(a => a.userId)
                            );
                            if (isHoliday(d)) {
                                allUserIds.forEach(id => absentSet.add(id));
                            }
                            allUsers.forEach(u => {
                                if (vacDaysByUserId[u.id]?.has(ds)) absentSet.add(u.id);
                            });
                            absentByDay[ds] = absentSet;
                        });

                        const bzFilteredUsers = allUsers.filter(u => {
                            if (u.role === 'Beheerder') return false;
                            if (bzFilter === 'iedereen') return true;

                            let isBusy = false;
                            let isAbsent = false;

                            for (const d of timelineDates) {
                                if (isWeekend(d)) continue;
                                const ds = formatDate(d);
                                if (isHoliday(d)) continue;

                                if (absentByDay[ds]?.has(u.id)) isAbsent = true;
                                if (busyByDay[ds]?.has(u.id) && !absentByDay[ds]?.has(u.id)) isBusy = true;
                            }

                            if (bzFilter === 'ingepland') return isBusy;
                            if (bzFilter === 'niet_ingepland') return !isBusy && !isAbsent;
                            if (bzFilter === 'vakantie') return isAbsent;
                            return true;
                        });

                        return (
                            <>
                                <div style={{ display: 'flex', minWidth: 'max-content', background: 'linear-gradient(90deg,#fff7ed,#fffbf5)', borderBottom: '1px solid #fed7aa', position: 'sticky', top: 0, zIndex: 5 }}>
                                    <div className="gantt-header-label" style={{ minWidth: '420px', maxWidth: '420px', fontSize: '0.62rem', fontWeight: 700, color: '#F5850A', display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px' }}>
                                        <i className="fa-solid fa-users" style={{ fontSize: '0.7rem' }} />
                                        <span>Bezetting</span>
                                        <span style={{ fontSize: '0.5rem', color: '#94a3b8', fontWeight: 400 }}>({bzFilteredUsers.length} pers.)</span>
                                        <select
                                            value={bzFilter}
                                            onChange={e => setBzFilter(e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                            style={{ marginLeft: 'auto', marginRight: '6px', fontSize: '0.6rem', padding: '2px 4px', borderRadius: '4px', border: '1px solid #fed7aa', color: '#F5850A', outline: 'none', background: '#fff', cursor: 'pointer' }}>
                                            <option value="iedereen">Iedereen</option>
                                            <option value="ingepland">Ingepland</option>
                                            <option value="niet_ingepland">Niet ingepland</option>
                                            <option value="vakantie">Vakantie/Afwezig</option>
                                        </select>
                                    </div>
                                    <div className="gantt-progress-col" style={{ background: 'transparent' }}></div>
                                    <div className="gantt-team-col" style={{ background: 'transparent', fontSize: '0.48rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px', lineHeight: 1.2 }}>
                                        <span style={{ color: '#F5850A' }}>&#9679; bezet</span>
                                        <span style={{ color: '#22c55e' }}>&#9679; vrij</span>
                                    </div>
                                    <div className="gantt-row-timeline" style={{ background: 'transparent', minHeight: '26px' }} />
                                </div>
                                
                                {bzFilteredUsers.map(u => {
                                    const initials = u.name ? u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
                                    return (
                                        <div key={u.id} className="gantt-row" style={{ background: '#fff' }}>
                                            <div className="gantt-row-label" style={{ minWidth: '420px', maxWidth: '420px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800 }}>{initials}</div>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1e293b' }}>{u.name || u.email}</div>
                                                <div style={{ fontSize: '0.55rem', color: '#94a3b8', marginLeft: 'auto' }}>{u.role}</div>
                                            </div>
                                            <div className="gantt-progress-col" style={{ background: '#f8fafc' }} />
                                            <div className="gantt-team-col" style={{ background: '#f8fafc' }} />
                                            <div className="gantt-row-timeline">
                                                {timelineDates.map((d, i) => {
                                                    const ds = formatDate(d);
                                                    const weekend = isWeekend(d);
                                                    const holiday = isHoliday(d);
                                                    const isAbsent = absentByDay[ds]?.has(u.id) || holiday;
                                                    const isBusy = busyByDay[ds]?.has(u.id) && !isAbsent;

                                                    let bg = 'transparent';
                                                    if (weekend) bg = '#f1f3f6';
                                                    else if (isAbsent) bg = 'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 3px, #e2e8f0 3px, #e2e8f0 6px)';
                                                    else if (isBusy) bg = 'rgba(245,133,10,0.15)';
                                                    else bg = 'rgba(34,197,94,0.06)';

                                                    return (
                                                        <div key={i} className={`gantt-cell ${weekend ? 'weekend' : ''}`}
                                                            style={{
                                                                background: bg,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            }}>
                                                            {!weekend && !isAbsent && isBusy && <i className="fa-solid fa-briefcase" style={{ color: '#F5850A', fontSize: '0.45rem' }} />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        );
                    })()}
                </div>
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

        {/* ===== NOTITIE HOVER TOOLTIP ===== */}
        {noteTooltip && (
            <div onMouseLeave={() => setNoteTooltip(null)}
                style={{
                    position: 'fixed',
                    left: Math.min(noteTooltip.x, window.innerWidth - 300),
                    top: noteTooltip.y,
                    zIndex: 2000,
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(15,23,42,0.15)',
                    padding: '10px 14px',
                    maxWidth: '280px',
                    minWidth: '200px',
                    pointerEvents: 'none',
                }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <i className="fa-solid fa-note-sticky" style={{ color: '#f59e0b' }} />
                    {noteTooltip.taskName} — {noteTooltip.notes.length} notiti{noteTooltip.notes.length === 1 ? 'e' : 'es'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {noteTooltip.notes.slice(0, 4).map((n, i) => (
                        <div key={i} style={{ display: 'flex', gap: '7px', alignItems: 'flex-start' }}>
                            <i className={`fa-solid ${n.isLinked ? 'fa-link' : 'fa-note-sticky'}`}
                                style={{ color: n.isLinked ? '#10b981' : '#f59e0b', fontSize: '0.58rem', marginTop: '2px', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: n.isLinked ? '#10b981' : '#92400e', marginBottom: '1px' }}>{n.author || 'Onbekend'}</div>
                                <p style={{ margin: 0, fontSize: '0.72rem', color: '#1e293b', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.text}</p>
                                <span style={{ fontSize: '0.55rem', color: '#94a3b8' }}>{n.date}</span>
                            </div>
                        </div>
                    ))}
                    {noteTooltip.notes.length > 4 && (
                        <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontStyle: 'italic' }}>+ {noteTooltip.notes.length - 4} meer...</span>
                    )}
                </div>
                <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #f1f5f9', fontSize: '0.6rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    Klik op 📝 om notities te beheren
                </div>
            </div>
        )}

        {/* ===== NOTITIE POPUP ===== */}

        {notePopup && (() => {
            const task = proj.tasks.find(t => t.id === notePopup.taskId);
            if (!task) return null;
            const notes = task.notes || [];

            // Laad project-notities (lokaal) wanneer Koppel-tab actief is
            const pNotes = projectNotesCache || [];
            if (noteTab === 'koppel' && !projectNotesCache && !projectNotesLoading) {
                setProjectNotesLoading(true);
                try {
                    const localNotes = localStorage.getItem(`schildersapp_notes_${proj.id}`);
                    if (localNotes) {
                        const parsed = JSON.parse(localNotes);
                        setProjectNotesCache(parsed.map(n => ({
                            id: n.id,
                            text: n.text || n.content || '',
                            author: n.author || 'Onbekend',
                            type: n.type || 'info',
                            date: n.date || '',
                        })));
                    } else {
                        setProjectNotesCache([]);
                    }
                } catch (e) {
                    setProjectNotesCache([]);
                }
                setProjectNotesLoading(false);
            }

            const addNote = () => {
                const txt = noteInput.trim();
                if (!txt) return;
                const newNote = { id: Date.now(), text: txt, type: 'nieuw', date: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) };
                updateProj(prev => ({ ...prev, tasks: prev.tasks.map(tk => tk.id !== task.id ? tk : { ...tk, notes: [...(tk.notes || []), newNote] }) }));
                setNoteInput('');
            };
            const linkNote = (pn) => {
                if (notes.some(n => n.linkedId === pn.id)) return;
                const ref = { id: Date.now(), linkedId: pn.id, text: pn.text, type: pn.type || 'info', author: pn.author, date: pn.date, isLinked: true };
                updateProj(prev => ({ ...prev, tasks: prev.tasks.map(tk => tk.id !== task.id ? tk : { ...tk, notes: [...(tk.notes || []), ref] }) }));
            };
            const deleteNote = (nid) => {
                updateProj(prev => ({ ...prev, tasks: prev.tasks.map(tk => tk.id !== task.id ? tk : { ...tk, notes: (tk.notes || []).filter(n => n.id !== nid) }) }));
            };
            const removeAttachment = (idx) => {
                if (window.confirm('Bijlage verwijderen?')) {
                    updateProj(prev => ({ ...prev, tasks: prev.tasks.map(tk => tk.id !== task.id ? tk : { ...tk, attachments: (tk.attachments || []).filter((_, i) => i !== idx) }) }));
                }
            };
            const handleTaskUpload = async (files) => {
                if (!files || files.length === 0) return;
                setNoteUploading(true);
                const results = [];
                for (const file of Array.from(files)) {
                    try {
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('projectId', proj.id);
                        formData.append('category', 'taken');
                        const res = await fetch('/api/upload', { method: 'POST', body: formData });
                        const uploadResult = await res.json();
                        if (uploadResult.success) {
                            results.push({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, url: uploadResult.url, data: null });
                        } else {
                            const dataUrl = await new Promise(res2 => { const r = new FileReader(); r.onload = ev => res2(ev.target.result); r.readAsDataURL(file); });
                            results.push({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, data: dataUrl });
                        }
                    } catch {
                        const dataUrl = await new Promise(res2 => { const r = new FileReader(); r.onload = ev => res2(ev.target.result); r.readAsDataURL(file); });
                        results.push({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, data: dataUrl });
                    }
                }
                updateProj(prev => ({ ...prev, tasks: prev.tasks.map(tk => tk.id !== task.id ? tk : { ...tk, attachments: [...(tk.attachments || []), ...results] }) }));
                setNoteUploading(false);
            };
            const NOTE_TYPE_COLORS = { info: '#3b82f6', actie: '#f59e0b', probleem: '#ef4444', klant: '#10b981', planning: '#8b5cf6' };

            return (
                <>
                    {/* Overlay */}
                    <div onClick={() => setNotePopup(null)} style={{ position: 'fixed', inset: 0, zIndex: 1099, background: 'rgba(15,23,42,0.25)' }} />
                    {/* Paneel */}
                    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '360px', zIndex: 1100, background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(15,23,42,0.15)', borderLeft: '1px solid #e2e8f0' }}>
                        {/* Header */}
                        <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-note-sticky" style={{ color: '#f59e0b', fontSize: '0.9rem' }} />
                                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>Taaknotities</span>
                                    {notes.length > 0 && <span style={{ background: '#f59e0b', color: '#fff', borderRadius: '10px', fontSize: '0.6rem', fontWeight: 700, padding: '1px 7px' }}>{notes.length}</span>}
                                </div>
                                <button onClick={() => setNotePopup(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem', padding: '4px' }}>
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
                                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: proj.color, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{proj.name}</span>
                                <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.48rem', color: '#cbd5e1' }} />
                                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{task.name}</span>
                            </div>
                            {/* Tabs: Nieuw / Koppel / Bijlagen */}
                            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', gap: '3px' }}>
                                {[['nieuw', 'fa-plus', 'Notitie'], ['koppel', 'fa-link', 'Koppelen'], ['bijlagen', 'fa-paperclip', 'Bijlagen']].map(([v, icon, lbl]) => (
                                    <button key={v} onClick={() => {
                                        setNoteTab(v);
                                        if (v === 'koppel') setProjectNotesCache(null);
                                    }}
                                        style={{ flex: 1, padding: '5px 8px', borderRadius: '6px', border: 'none', background: noteTab === v ? '#fff' : 'transparent', color: noteTab === v ? '#1e293b' : '#94a3b8', fontWeight: noteTab === v ? 700 : 500, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', boxShadow: noteTab === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                                        <i className={`fa-solid ${icon}`} style={{ fontSize: '0.6rem' }} />{lbl}
                                        {v === 'bijlagen' && (task.attachments || []).length > 0 && (
                                            <span style={{ marginLeft: 2, background: noteTab === v ? '#eff6ff' : '#e2e8f0', color: noteTab === v ? '#3b82f6' : '#64748b', borderRadius: 10, padding: '1px 5px', fontSize: '0.55rem', fontWeight: 700 }}>{(task.attachments || []).length}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab-inhoud */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Gekoppelde/eigen notities bovenaan */}
                            {notes.length > 0 && (
                                <div style={{ marginBottom: '8px' }}>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Gekoppeld aan deze taak ({notes.length})</div>
                                    {notes.map(n => (
                                        <div key={n.id} style={{ background: n.isLinked ? '#f0fdf4' : '#fffbeb', border: `1px solid ${n.isLinked ? '#bbf7d0' : '#fde68a'}`, borderRadius: '8px', padding: '10px 12px', position: 'relative', marginBottom: '6px' }}>
                                            {/* Auteur + verwijder knop */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <i className={`fa-solid ${n.isLinked ? 'fa-link' : 'fa-note-sticky'}`} style={{ color: n.isLinked ? '#10b981' : '#f59e0b', fontSize: '0.6rem' }} />
                                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: n.isLinked ? '#10b981' : '#92400e' }}>
                                                        {n.author || 'Onbekend'}{n.isLinked ? ' · project-notitie' : ''}
                                                    </span>
                                                </div>
                                                <button onClick={() => deleteNote(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.7rem', padding: '1px', flexShrink: 0, transition: 'color 0.15s' }}
                                                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                    onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                                                    <i className="fa-solid fa-trash" />
                                                </button>
                                            </div>
                                            {/* Volledige tekst */}
                                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#1e293b', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n.text}</p>
                                            <span style={{ fontSize: '0.58rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>{n.date}</span>
                                        </div>
                                    ))}
                                </div>
                            )}


                            {noteTab === 'nieuw' && notes.length === 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', color: '#94a3b8', gap: '8px' }}>
                                    <i className="fa-regular fa-note-sticky" style={{ fontSize: '1.8rem', opacity: 0.35 }} />
                                    <span style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>Schrijf hieronder een nieuwe notitie</span>
                                </div>
                            )}

                            {noteTab === 'koppel' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Projectnotities om te koppelen</div>
                                    {projectNotesLoading && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px', color: '#94a3b8', justifyContent: 'center' }}>
                                            <i className="fa-solid fa-spinner fa-spin" />
                                            <span style={{ fontSize: '0.75rem' }}>Notities laden...</span>
                                        </div>
                                    )}
                                    {!projectNotesLoading && pNotes.length === 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px', color: '#94a3b8' }}>
                                            <i className="fa-solid fa-folder-open" style={{ fontSize: '1.5rem', opacity: 0.3 }} />
                                            <span style={{ fontSize: '0.73rem', fontStyle: 'italic', textAlign: 'center' }}>Geen projectnotities gevonden.<br/>Voeg ze toe via het <strong>Notities-tabblad</strong>.</span>
                                        </div>
                                    )}
                                    {pNotes.map(pn => {
                                        const isLinked = notes.some(n => n.linkedId === pn.id);
                                        const typeColor = NOTE_TYPE_COLORS[pn.type] || '#3b82f6';
                                        return (
                                            <div key={pn.id} style={{ background: isLinked ? '#f0fdf4' : '#f8fafc', border: `1px solid ${isLinked ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: '8px', padding: '10px 12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: typeColor, flexShrink: 0, marginTop: '4px' }} />
                                                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                                    <p style={{ margin: '0 0 4px', fontSize: '0.76rem', color: '#1e293b', lineHeight: 1.4, wordBreak: 'break-word', overflow: 'hidden' }}>{pn.text}</p>
                                                    <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{pn.author} · {pn.date}</span>
                                                </div>
                                                <button onClick={() => !isLinked && linkNote(pn)}
                                                    title={isLinked ? 'Al gekoppeld' : 'Koppel aan taak'}
                                                    style={{ background: isLinked ? '#dcfce7' : '#F5850A', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: isLinked ? 'default' : 'pointer', color: isLinked ? '#16a34a' : '#fff', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s' }}>
                                                    <i className={`fa-solid ${isLinked ? 'fa-check' : 'fa-link'}`} />
                                                    {isLinked ? 'Gekoppeld' : 'Koppel'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {noteTab === 'bijlagen' && (() => {
                                const taskAtts = task.attachments || [];
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bestand uploaden</div>
                                        <label
                                            onDragOver={e => { e.preventDefault(); setNoteDragOver(true); }}
                                            onDragLeave={() => setNoteDragOver(false)}
                                            onDrop={e => { e.preventDefault(); setNoteDragOver(false); handleTaskUpload(e.dataTransfer.files); }}
                                            style={{
                                                border: noteDragOver ? '2px dashed #3b82f6' : '2px dashed #cbd5e1',
                                                background: noteDragOver ? '#eff6ff' : '#f8fafc',
                                                borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s'
                                            }}>
                                            {noteUploading ? (
                                                <div style={{ color: '#3b82f6', fontSize: '0.8rem' }}><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Uploaden...</div>
                                            ) : (
                                                <div style={{ color: '#64748b', fontSize: '0.75rem', lineHeight: 1.5 }}>
                                                    <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '1.4rem', color: noteDragOver ? '#3b82f6' : '#94a3b8', marginBottom: 6 }} /><br/>
                                                    <strong>Sleep bestanden hierheen</strong> of klik om te uploaden
                                                    <div style={{ fontSize: '0.65rem', marginTop: 4, opacity: 0.7 }}>Foto's, PDF, Word, Excel, E-mail</div>
                                                </div>
                                            )}
                                            <input type="file" multiple style={{ display: 'none' }} onChange={e => handleTaskUpload(e.target.files)} disabled={noteUploading} />
                                        </label>

                                        {taskAtts.length > 0 && (
                                            <div style={{ marginTop: '4px' }}>
                                                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Bijlagen ({taskAtts.length})</div>
                                                {taskAtts.map((att, i) => {
                                                    const isImg = att.type?.startsWith('image/') || ['.jpg','.jpeg','.png','.gif'].some(ext => att.name?.toLowerCase().endsWith(ext));
                                                    const icon = isImg ? 'fa-image' : att.type?.includes('pdf') ? 'fa-file-pdf' : 'fa-file';
                                                    const url = att.url || att.data;
                                                    return (
                                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '6px' }}>
                                                            <i className={`fa-solid ${icon}`} style={{ color: isImg ? '#10b981' : '#ef4444', fontSize: '0.9rem' }} />
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: '0.72rem', color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
                                                                <div style={{ fontSize: '0.55rem', color: '#94a3b8' }}>{Math.round(att.size / 1024)} KB</div>
                                                            </div>
                                                            {url && (
                                                                <button onClick={() => window.open(url, '_blank')} style={{ background: '#f1f5f9', border: 'none', borderRadius: '5px', padding: '3px 8px', fontSize: '0.65rem', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Open</button>
                                                            )}
                                                            <button onClick={() => removeAttachment(i)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 4px' }}
                                                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                                                                <i className="fa-solid fa-trash" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Nieuw notitie invoer — alleen bij 'nieuw' tab */}
                        {noteTab === 'nieuw' && (
                            <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', flexShrink: 0, background: '#fafafa' }}>
                                <textarea
                                    value={noteInput}
                                    onChange={e => setNoteInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote(); }}
                                    placeholder="Schrijf een notitie... (Ctrl+Enter om op te slaan)"
                                    rows={3}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#1e293b', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }}
                                    autoFocus
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                    <button onClick={addNote} disabled={!noteInput.trim()}
                                        style={{ padding: '7px 16px', background: noteInput.trim() ? '#f59e0b' : '#e2e8f0', color: noteInput.trim() ? '#fff' : '#94a3b8', border: 'none', borderRadius: '7px', cursor: noteInput.trim() ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}>
                                        <i className="fa-solid fa-plus" /> Notitie toevoegen
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            );
        })()}
        {/* ===== QUICK TASK AANMAKEN POPUP (na draw-create) ===== */}
        {quickTaskPopup && (() => {
            const fmtNL = (str) => { const d = parseDate(str); return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`; };
            // Bereken positie: zorg dat popup in viewport blijft
            const px = Math.min(quickTaskPopup.x, window.innerWidth - 320);
            const py = Math.min(quickTaskPopup.y + 10, window.innerHeight - 180);
            return (
                <>
                    <div onClick={() => { setQuickTaskPopup(null); setQuickTaskName(''); }}
                        style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(15,23,42,0.15)' }} />
                    <div style={{
                        position: 'fixed', left: px, top: py, zIndex: 9999,
                        background: '#fff', borderRadius: '14px', padding: '18px 20px',
                        boxShadow: '0 8px 40px rgba(15,23,42,0.22)', border: '1px solid #e2e8f0',
                        minWidth: '280px', maxWidth: '320px',
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: proj.color + '22', border: `2px solid ${proj.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className="fa-solid fa-plus" style={{ fontSize: '0.6rem', color: proj.color }} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>Nieuwe taak aanmaken</div>
                                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '1px' }}>
                                    {fmtNL(quickTaskPopup.startDate)} → {fmtNL(quickTaskPopup.endDate)}
                                    <span style={{ marginLeft: 6, background: proj.color + '22', color: proj.color, borderRadius: '6px', padding: '1px 6px', fontWeight: 700 }}>
                                        {diffWorkdays(parseDate(quickTaskPopup.startDate), parseDate(quickTaskPopup.endDate))} werkdag{diffWorkdays(parseDate(quickTaskPopup.startDate), parseDate(quickTaskPopup.endDate)) !== 1 ? 'en' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* Naam invoer */}
                        <input
                            autoFocus
                            type="text"
                            value={quickTaskName}
                            onChange={e => setQuickTaskName(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && quickTaskName.trim()) confirmQuickTask(quickTaskName);
                                if (e.key === 'Escape') { setQuickTaskPopup(null); setQuickTaskName(''); }
                            }}
                            placeholder="Naam van de taak..."
                            style={{
                                width: '100%', boxSizing: 'border-box', padding: '10px 14px',
                                borderRadius: '9px', border: `2px solid ${proj.color}44`, outline: 'none',
                                fontSize: '0.88rem', fontWeight: 600, color: '#1e293b',
                                background: '#f8fafc', fontFamily: 'inherit',
                                transition: 'border-color 0.15s',
                            }}
                            onFocus={e => e.target.style.borderColor = proj.color}
                            onBlur={e => e.target.style.borderColor = proj.color + '44'}
                        />
                        {/* Knoppen */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <button
                                onClick={() => confirmQuickTask(quickTaskName)}
                                disabled={!quickTaskName.trim()}
                                style={{
                                    flex: 1, padding: '9px 0', borderRadius: '9px', border: 'none',
                                    background: quickTaskName.trim() ? proj.color : '#e2e8f0',
                                    color: quickTaskName.trim() ? '#fff' : '#94a3b8',
                                    fontWeight: 700, fontSize: '0.82rem', cursor: quickTaskName.trim() ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    transition: 'all 0.15s',
                                }}>
                                <i className="fa-solid fa-check" /> Aanmaken
                            </button>
                            <button
                                onClick={() => { setQuickTaskPopup(null); setQuickTaskName(''); }}
                                style={{ padding: '9px 14px', borderRadius: '9px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                    </div>
                </>
            );
        })()}
        </>
    );
}
