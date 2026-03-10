'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../../components/AuthContext';
import './planning.css';

// ===== DUTCH HOLIDAYS =====
const HOLIDAYS_2026 = {
    '2026-01-01': 'Nieuwjaarsdag',
    '2026-04-03': 'Goede Vrijdag',
    '2026-04-05': 'Eerste Paasdag',
    '2026-04-06': 'Tweede Paasdag',
    '2026-04-27': 'Koningsdag',
    '2026-05-05': 'Bevrijdingsdag',
    '2026-05-14': 'Hemelvaartsdag',
    '2026-05-24': 'Eerste Pinksterdag',
    '2026-05-25': 'Tweede Pinksterdag',
    '2026-12-25': 'Eerste Kerstdag',
    '2026-12-26': 'Tweede Kerstdag',
};

// ===== PROJECT KLEUREN =====
const PROJECT_COLORS = [
    '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
    '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316'
];

// ===== DEMO DATA =====
const INITIAL_PROJECTS = [
    {
        id: 1, name: 'Nieuwbouw Villa Wassenaar', client: 'Fam. Jansen', address: 'Duinweg 42, Wassenaar',
        startDate: '2026-03-02', endDate: '2026-04-17', estimatedHours: 320, color: '#3b82f6',
        status: 'active',
        tasks: [
            { id: 't1', name: 'Buitenschilderwerk kozijnen', startDate: '2026-03-02', endDate: '2026-03-13', assignedTo: [2, 4], completed: false },
            { id: 't2', name: 'Binnenschilderwerk begane grond', startDate: '2026-03-16', endDate: '2026-03-27', assignedTo: [2], completed: false },
            { id: 't3', name: 'Binnenschilderwerk verdieping', startDate: '2026-03-30', endDate: '2026-04-10', assignedTo: [3, 4], completed: false },
            { id: 't4', name: 'Oplevering & correcties', startDate: '2026-04-13', endDate: '2026-04-17', assignedTo: [2, 3, 4], completed: false },
        ]
    },
    {
        id: 2, name: 'Onderhoud Rijtjeshuizen Leiden', client: 'Woonstichting Leiden', address: 'Rapenburg 100, Leiden',
        startDate: '2026-03-09', endDate: '2026-05-08', estimatedHours: 480, color: '#10b981',
        status: 'active',
        tasks: [
            { id: 't5', name: 'Houtrot reparatie blok 1-3', startDate: '2026-03-09', endDate: '2026-03-27', assignedTo: [4], completed: false },
            { id: 't6', name: 'Grondverf aanbrengen', startDate: '2026-03-30', endDate: '2026-04-10', assignedTo: [2, 3], completed: false },
            { id: 't7', name: 'Aflakken buitenwerk', startDate: '2026-04-13', endDate: '2026-05-01', assignedTo: [2, 3, 4], completed: false },
            { id: 't8', name: 'Eindcontrole', startDate: '2026-05-04', endDate: '2026-05-08', assignedTo: [4], completed: false },
        ]
    },
    {
        id: 3, name: 'Kantoorpand Voorschoten', client: 'Bakker BV', address: 'Industrieweg 8, Voorschoten',
        startDate: '2026-04-20', endDate: '2026-05-22', estimatedHours: 200, color: '#8b5cf6',
        status: 'planning',
        tasks: [
            { id: 't9', name: 'Voorbereiding & schuren', startDate: '2026-04-20', endDate: '2026-04-24', assignedTo: [3], completed: false },
            { id: 't10', name: 'Latex muren binnenzijde', startDate: '2026-04-27', endDate: '2026-05-08', assignedTo: [2, 3], completed: false },
            { id: 't11', name: 'Kozijnen buiten', startDate: '2026-05-11', endDate: '2026-05-22', assignedTo: [2, 4], completed: false },
        ]
    },
    {
        id: 4, name: 'Woonhuis Den Haag', client: 'Fam. de Groot', address: 'Laan van Meerdervoort 200',
        startDate: '2026-05-18', endDate: '2026-06-12', estimatedHours: 160, color: '#f59e0b',
        status: 'planning',
        tasks: [
            { id: 't12', name: 'Binnenschilderwerk', startDate: '2026-05-18', endDate: '2026-06-05', assignedTo: [3], completed: false },
            { id: 't13', name: 'Buitenschilderwerk', startDate: '2026-06-08', endDate: '2026-06-12', assignedTo: [2, 3], completed: false },
        ]
    }
];

// ===== HELPERS =====
function parseDate(str) { return new Date(str + 'T00:00:00'); }
function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function diffDays(a, b) { return Math.round((b - a) / (86400000)); }
function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}
function isWeekend(d) { const day = d.getDay(); return day === 0 || day === 6; }
function isHoliday(d) { return HOLIDAYS_2026[formatDate(d)] || null; }
function getMonday(d) { const r = new Date(d); const day = r.getDay(); const diff = r.getDate() - day + (day === 0 ? -6 : 1); r.setDate(diff); return r; }
const MONTHS_NL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
const MONTHS_FULL = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
const DAYS_NL = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

export default function ProjectenPage() {
    const { getAllUsers } = useAuth();
    const allUsers = getAllUsers();
    const [tab, setTab] = useState('project');
    const [projects, setProjects] = useState(INITIAL_PROJECTS);
    const [viewMode, setViewMode] = useState('month'); // week, month
    const [planningView, setPlanningView] = useState('gantt');
    const [zoomLevel, setZoomLevel] = useState(32); // gantt, grid
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null); // {projectId, taskId} for keyboard movement
    const [expandedProjects, setExpandedProjects] = useState(new Set());
    const [colorPickerProject, setColorPickerProject] = useState(null);
    const [showNewForm, setShowNewForm] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [newProject, setNewProject] = useState({ name: '', client: '', address: '', startDate: '', endDate: '', estimatedHours: '' });
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [newTask, setNewTask] = useState({ name: '', startDate: '', endDate: '', assignedTo: [] });
    const dragRef = useRef(null);
    const ganttWrapperRef = useRef(null);
    const justDraggedRef = useRef(false);
    const selectedProjectRef = useRef(null);
    const selectedTaskRef = useRef(null);
    const moveBarRef = useRef(null);
    const [zoekTerm, setZoekTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('alle');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ===== ZOEKEN & FILTEREN =====
    const filteredProjects = useMemo(() => {
        const q = zoekTerm.toLowerCase().trim();
        return projects.filter(p => {
            const matchZoek = !q || p.name.toLowerCase().includes(q) || (p.client || '').toLowerCase().includes(q) || (p.address || '').toLowerCase().includes(q);
            const matchStatus = filterStatus === 'alle' || p.status === filterStatus;
            return matchZoek && matchStatus;
        });
    }, [projects, zoekTerm, filterStatus]);

    // ===== GENERATE TIMELINE DATES =====
    const timelineDates = useMemo(() => {
        const dates = [];
        let start;
        let count;
        if (viewMode === 'week') {
            start = getMonday(currentDate);
            count = 14; // 2 weken
        } else {
            start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
            count = diffDays(start, endOfMonth) + 1;
        }
        for (let i = 0; i < count; i++) {
            dates.push(addDays(start, i));
        }
        return dates;
    }, [currentDate, viewMode]);

    // ===== NAVIGATE =====
    const navigate = (dir) => {
        const d = new Date(currentDate);
        if (viewMode === 'week') d.setDate(d.getDate() + dir * 14);
        else d.setMonth(d.getMonth() + dir);
        setCurrentDate(d);
    };

    // ===== ADD PROJECT =====
    const addProject = () => {
        if (!newProject.name || !newProject.startDate || !newProject.endDate) return;
        const p = {
            id: Date.now(),
            ...newProject,
            estimatedHours: parseInt(newProject.estimatedHours) || 0,
            color: PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
            status: 'planning',
            tasks: []
        };
        setProjects([...projects, p]);
        setNewProject({ name: '', client: '', address: '', startDate: '', endDate: '', estimatedHours: '' });
        setShowNewForm(false);
    };

    // ===== DELETE PROJECT =====
    const deleteProject = (id) => {
        if (window.confirm('Dit project verwijderen?')) {
            setProjects(projects.filter(p => p.id !== id));
            if (selectedProject?.id === id) setSelectedProject(null);
        }
    };

    // ===== TOGGLE TASK COMPLETE =====
    const toggleTask = (projectId, taskId) => {
        setProjects(projects.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) };
        }));
    };

    // ===== ADD TASK =====
    const addTask = (projectId) => {
        if (!newTask.name || !newTask.startDate || !newTask.endDate) return;
        const task = {
            id: 't' + Date.now(),
            name: newTask.name,
            startDate: newTask.startDate,
            endDate: newTask.endDate,
            assignedTo: newTask.assignedTo,
            completed: false
        };
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, tasks: [...p.tasks, task] };
        }));
        // Update selectedProject too
        setSelectedProject(prev => prev ? { ...prev, tasks: [...prev.tasks, task] } : prev);
        setNewTask({ name: '', startDate: '', endDate: '', assignedTo: [] });
        setShowTaskForm(false);
    };

    // ===== DELETE TASK =====
    const deleteTask = (projectId, taskId) => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, tasks: p.tasks.filter(t => t.id !== taskId) };
        }));
        setSelectedProject(prev => prev ? { ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) } : prev);
    };

    // ===== MOVE / DRAG BAR =====
    const moveBar = useCallback((projectId, taskId, daysDelta) => {
        setProjects(prev => prev.map(p => {
            if (taskId) {
                if (p.id !== projectId) return p;
                return {
                    ...p,
                    tasks: p.tasks.map(t => {
                        if (t.id !== taskId) return t;
                        const newStart = addDays(parseDate(t.startDate), daysDelta);
                        const newEnd = addDays(parseDate(t.endDate), daysDelta);
                        return { ...t, startDate: formatDate(newStart), endDate: formatDate(newEnd) };
                    })
                };
            } else {
                if (p.id !== projectId) return p;
                const newStart = addDays(parseDate(p.startDate), daysDelta);
                const newEnd = addDays(parseDate(p.endDate), daysDelta);
                return {
                    ...p,
                    startDate: formatDate(newStart),
                    endDate: formatDate(newEnd),
                    tasks: p.tasks.map(t => ({
                        ...t,
                        startDate: formatDate(addDays(parseDate(t.startDate), daysDelta)),
                        endDate: formatDate(addDays(parseDate(t.endDate), daysDelta)),
                    }))
                };
            }
        }));
        // Sync selectedProject
        setSelectedProject(prev => {
            if (!prev || prev.id !== projectId) return prev;
            const updated = prev;
            if (taskId) {
                return {
                    ...updated,
                    tasks: updated.tasks.map(t => {
                        if (t.id !== taskId) return t;
                        return { ...t, startDate: formatDate(addDays(parseDate(t.startDate), daysDelta)), endDate: formatDate(addDays(parseDate(t.endDate), daysDelta)) };
                    })
                };
            } else {
                return {
                    ...updated,
                    startDate: formatDate(addDays(parseDate(updated.startDate), daysDelta)),
                    endDate: formatDate(addDays(parseDate(updated.endDate), daysDelta)),
                    tasks: updated.tasks.map(t => ({
                        ...t,
                        startDate: formatDate(addDays(parseDate(t.startDate), daysDelta)),
                        endDate: formatDate(addDays(parseDate(t.endDate), daysDelta)),
                    }))
                };
            }
        });
    }, []);

    // ===== DRAG HANDLER — registered via useEffect for native DOM events =====
    // (The actual handler is in the useEffect below, not React's onMouseDown)

    // ===== RESIZE BAR =====
    const resizeBar = useCallback((projectId, taskId, edge, daysDelta) => {
        const update = (item) => {
            if (edge === 'left') {
                const newStart = addDays(parseDate(item.startDate), daysDelta);
                if (newStart >= parseDate(item.endDate)) return item;
                return { ...item, startDate: formatDate(newStart) };
            } else {
                const newEnd = addDays(parseDate(item.endDate), daysDelta);
                if (newEnd <= parseDate(item.startDate)) return item;
                return { ...item, endDate: formatDate(newEnd) };
            }
        };
        setProjects(prev => prev.map(p => {
            if (taskId) {
                if (p.id !== projectId) return p;
                return { ...p, tasks: p.tasks.map(t => t.id === taskId ? update(t) : t) };
            } else {
                if (p.id !== projectId) return p;
                return update(p);
            }
        }));
        setSelectedProject(prev => {
            if (!prev || prev.id !== projectId) return prev;
            if (taskId) {
                return { ...prev, tasks: prev.tasks.map(t => t.id === taskId ? update(t) : t) };
            } else {
                return update(prev);
            }
        });
    }, []);

    // ===== RESIZE HANDLER — registered via useEffect for native DOM events =====
    // (The actual handler is in the useEffect below)

    // ===== ROW CLICK (with drag guard) =====
    const onRowClick = useCallback((p) => {
        if (justDraggedRef.current) return;
        setSelectedProject(prev => prev?.id === p.id ? null : p);
        setSelectedTask(null); // Clear task selection when clicking project row
        setExpandedProjects(prev => {
            const next = new Set(prev);
            if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
            return next;
        });
    }, []);

    // ===== TASK ROW CLICK =====
    const onTaskRowClick = useCallback((projectId, taskId) => {
        if (justDraggedRef.current) return;
        setSelectedTask(prev => (prev?.taskId === taskId ? null : { projectId, taskId }));
    }, []);

    // ===== MIRROR STATE TO REFS (for native event handlers) =====
    selectedProjectRef.current = selectedProject;
    selectedTaskRef.current = selectedTask;
    moveBarRef.current = moveBar;

    // ===== KEYBOARD SHORTCUTS: Arrow keys to move bars =====
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Only handle arrow keys when not in an input/editable
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

            const days = e.shiftKey ? 7 : 1;
            const direction = e.key === 'ArrowRight' ? days : -days;
            const sp = selectedProjectRef.current;
            const st = selectedTaskRef.current;
            const mb = moveBarRef.current;

            if (st && mb) {
                e.preventDefault();
                mb(st.projectId, st.taskId, direction);
            } else if (sp && mb) {
                e.preventDefault();
                mb(sp.id, null, direction);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []); // Empty deps — reads from refs, never stale


    // ===== NATIVE DOM DRAG + RESIZE HANDLERS (bypasses React event system) =====
    useEffect(() => {
        const ganttWrapper = ganttWrapperRef.current;
        if (!ganttWrapper) return;

        const handleMouseDown = (e) => {
            // Only left-click
            if (e.button !== 0) return;

            const bar = e.target.closest('.gantt-bar');
            if (!bar) return;

            const isResizeHandle = e.target.classList.contains('resize-handle');
            const isLeftResize = e.target.classList.contains('resize-handle-left');

            // Get project/task IDs from data attributes
            const projectId = Number(bar.dataset.projectId);
            const rawTaskId = bar.dataset.taskId;
            const taskId = (rawTaskId && rawTaskId !== 'null' && rawTaskId !== '') ? rawTaskId : null;
            if (!projectId || isNaN(projectId)) return;

            e.stopPropagation();
            e.preventDefault();

            const timelineEl = bar.parentElement;
            if (!timelineEl) return;
            const cellWidth = timelineEl.offsetWidth / timelineDatesRef.current.length;

            justDraggedRef.current = true;

            // CRITICAL: Freeze wrapper scroll during drag to prevent native scroll stealing mousemove
            const savedOverflow = ganttWrapper.style.overflowX;
            ganttWrapper.style.overflowX = 'hidden';

            // Block wheel scroll during drag
            const blockWheel = (ev) => { ev.preventDefault(); };
            ganttWrapper.addEventListener('wheel', blockWheel, { passive: false });

            // Create fullscreen overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;touch-action:none;cursor:' + (isResizeHandle ? 'col-resize' : 'grabbing') + ';';
            document.body.appendChild(overlay);
            document.body.style.userSelect = 'none';

            const state = { startX: e.clientX, cellWidth, moved: 0, lastClientX: e.clientX, scrollAccum: 0, animFrame: null };
            dragRef.current = state;

            // Auto-scroll at edges (only for bar move, not resize)
            if (!isResizeHandle) {
                const EDGE_ZONE = 60, SCROLL_SPEED = 8;
                const autoScroll = () => {
                    if (!dragRef.current) return;
                    // Temporarily restore scroll for programmatic scrolling
                    ganttWrapper.style.overflowX = 'auto';
                    const rect = ganttWrapper.getBoundingClientRect();
                    const x = state.lastClientX;
                    let scrollDelta = 0;
                    if (x > rect.right - EDGE_ZONE) scrollDelta = SCROLL_SPEED;
                    else if (x < rect.left + EDGE_ZONE) scrollDelta = -SCROLL_SPEED;
                    if (scrollDelta !== 0) {
                        ganttWrapper.scrollLeft += scrollDelta;
                        state.scrollAccum += scrollDelta;
                        const scrollDays = Math.round(state.scrollAccum / state.cellWidth);
                        if (scrollDays !== 0) {
                            state.scrollAccum -= scrollDays * state.cellWidth;
                            state.startX -= scrollDays * state.cellWidth;
                            state.moved += scrollDays;
                            moveBar(projectId, taskId, scrollDays);
                        }
                    }
                    // Re-freeze scroll
                    ganttWrapper.style.overflowX = 'hidden';
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
                    if (isResizeHandle) {
                        const edge = isLeftResize ? 'left' : 'right';
                        resizeBar(projectId, taskId, edge, delta);
                    } else {
                        moveBar(projectId, taskId, delta);
                    }
                }
            };
            const onUp = () => {
                dragRef.current = null;
                if (state.animFrame) cancelAnimationFrame(state.animFrame);
                // Remove ALL listeners (both overlay and document fallback)
                overlay.removeEventListener('mousemove', onMove);
                overlay.removeEventListener('mouseup', onUp);
                document.removeEventListener('mousemove', onMove, true);
                document.removeEventListener('mouseup', onUp, true);
                ganttWrapper.removeEventListener('wheel', blockWheel);
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                // Restore wrapper scroll
                ganttWrapper.style.overflowX = savedOverflow || 'auto';
                document.body.style.userSelect = '';
                setTimeout(() => { justDraggedRef.current = false; }, 200);
            };
            // Attach to BOTH overlay and document (document as fallback)
            overlay.addEventListener('mousemove', onMove);
            overlay.addEventListener('mouseup', onUp);
            document.addEventListener('mousemove', onMove, true);
            document.addEventListener('mouseup', onUp, true);
        };

        ganttWrapper.addEventListener('mousedown', handleMouseDown, true);
        return () => ganttWrapper.removeEventListener('mousedown', handleMouseDown, true);
    });

    // Ref to keep timelineDates current for the effect
    const timelineDatesRef = useRef(timelineDates);
    timelineDatesRef.current = timelineDates;

    // ===== UPDATE PROJECT DATES (for inputs & shift buttons) =====
    const updateProjectDates = (projectId, newStartDate, newEndDate) => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, startDate: newStartDate || p.startDate, endDate: newEndDate || p.endDate };
        }));
        setSelectedProject(prev => {
            if (!prev || prev.id !== projectId) return prev;
            return { ...prev, startDate: newStartDate || prev.startDate, endDate: newEndDate || prev.endDate };
        });
    };

    // ===== SHIFT PROJECT =====
    const shiftProject = (projectId, days) => {
        moveBar(projectId, null, days);
    };

    // ===== CALCULATE BAR POSITION =====
    const getBarStyle = (startStr, endStr, color) => {
        const start = parseDate(startStr);
        const end = parseDate(endStr);
        const timelineStart = timelineDates[0];
        const timelineEnd = timelineDates[timelineDates.length - 1];

        const barStart = start < timelineStart ? timelineStart : start;
        const barEnd = end > timelineEnd ? timelineEnd : end;

        if (barStart > timelineEnd || barEnd < timelineStart) return null;

        const totalDays = timelineDates.length;
        const offsetDays = diffDays(timelineStart, barStart);
        const durationDays = diffDays(barStart, barEnd) + 1;

        const leftPct = (offsetDays / totalDays) * 100;
        const widthPct = (durationDays / totalDays) * 100;

        return {
            left: `${leftPct}%`,
            width: `${Math.max(widthPct, 2)}%`,
            background: color,
        };
    };

    // ===== PERSONNEL ASSIGNMENTS =====
    const getPersonnelAssignments = (userId, date) => {
        const dateStr = formatDate(date);
        const assignments = [];
        projects.forEach(p => {
            p.tasks.forEach(t => {
                if (t.assignedTo?.includes(userId) && dateStr >= t.startDate && dateStr <= t.endDate) {
                    assignments.push({ project: p, task: t });
                }
            });
        });
        return assignments;
    };

    // ===== STATS =====
    const stats = {
        active: projects.filter(p => p.status === 'active').length,
        planning: projects.filter(p => p.status === 'planning').length,
        totalHours: projects.reduce((s, p) => s + p.estimatedHours, 0),
        totalTasks: projects.reduce((s, p) => s + p.tasks.length, 0),
    };

    // ===== RENDER =====
    return (
        <div className="content-area" id="view-planning">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Planning</h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>Project- en personeelsplanning met Gantt overzicht</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowNewForm(!showNewForm)}
                    style={{ background: 'var(--accent)', border: 'none', borderRadius: '10px', padding: '10px 18px', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <i className={`fa-solid ${showNewForm ? 'fa-xmark' : 'fa-plus'}`}></i>
                    {showNewForm ? 'Annuleer' : 'Nieuw Project'}
                </button>
            </div>

            {/* Zoekbalk + statusfilter */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.82rem', pointerEvents: 'none' }}></i>
                    <input
                        value={zoekTerm}
                        onChange={e => setZoekTerm(e.target.value)}
                        placeholder="Zoek op projectnaam, klant of adres..."
                        style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem', background: '#fff', color: '#1e293b', outline: 'none' }}
                    />
                    {zoekTerm && (
                        <button onClick={() => setZoekTerm('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem', padding: '2px' }}>
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    )}
                </div>
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff', color: '#1e293b', fontWeight: 600, cursor: 'pointer', minWidth: '130px' }}
                >
                    <option value="alle">Alle statussen</option>
                    <option value="active">Actief</option>
                    <option value="planning">In planning</option>
                    <option value="completed">Afgerond</option>
                </select>
                {(zoekTerm || filterStatus !== 'alle') && (
                    <span style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {filteredProjects.length} van {projects.length} projecten
                    </span>
                )}
            </div>

            {/* Stats */}
            <div className="planning-stats">
                <div className="planning-stat">
                    <div className="planning-stat-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                        <i className="fa-solid fa-diagram-project"></i>
                    </div>
                    <div>
                        <div className="planning-stat-value">{stats.active}</div>
                        <div className="planning-stat-label">Actieve projecten</div>
                    </div>
                </div>
                <div className="planning-stat">
                    <div className="planning-stat-icon" style={{ background: 'rgba(250,160,82,0.1)', color: 'var(--accent)' }}>
                        <i className="fa-solid fa-clock"></i>
                    </div>
                    <div>
                        <div className="planning-stat-value">{stats.totalHours}u</div>
                        <div className="planning-stat-label">Totaal uren</div>
                    </div>
                </div>
                <div className="planning-stat">
                    <div className="planning-stat-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
                        <i className="fa-solid fa-list-check"></i>
                    </div>
                    <div>
                        <div className="planning-stat-value">{stats.totalTasks}</div>
                        <div className="planning-stat-label">Taken</div>
                    </div>
                </div>
                <div className="planning-stat">
                    <div className="planning-stat-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                        <i className="fa-solid fa-users"></i>
                    </div>
                    <div>
                        <div className="planning-stat-value">{allUsers.length}</div>
                        <div className="planning-stat-label">Medewerkers</div>
                    </div>
                </div>
            </div>

            {/* New Project Form */}
            {showNewForm && (
                <div className="project-detail-panel" style={{ marginBottom: '16px' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#1e293b' }}>
                        <i className="fa-solid fa-plus" style={{ color: 'var(--accent)', marginRight: '8px' }}></i>
                        Nieuw project aanmaken
                    </h3>
                    <div className="new-project-form">
                        <div>
                            <label>Projectnaam *</label>
                            <input placeholder="bijv. Villa Wassenaar" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} />
                        </div>
                        <div>
                            <label>Klant</label>
                            <input placeholder="bijv. Fam. Jansen" value={newProject.client} onChange={e => setNewProject({ ...newProject, client: e.target.value })} />
                        </div>
                        <div>
                            <label>Adres</label>
                            <input placeholder="bijv. Duinweg 42, Wassenaar" value={newProject.address} onChange={e => setNewProject({ ...newProject, address: e.target.value })} />
                        </div>
                        <div>
                            <label>Geschatte uren</label>
                            <input type="number" placeholder="bijv. 200" value={newProject.estimatedHours} onChange={e => setNewProject({ ...newProject, estimatedHours: e.target.value })} />
                        </div>
                        <div>
                            <label>Startdatum *</label>
                            <input type="date" value={newProject.startDate} onChange={e => setNewProject({ ...newProject, startDate: e.target.value })} />
                        </div>
                        <div>
                            <label>Einddatum *</label>
                            <input type="date" value={newProject.endDate} onChange={e => setNewProject({ ...newProject, endDate: e.target.value })} />
                        </div>
                        <div className="full-width" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowNewForm(false)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>Annuleer</button>
                            <button onClick={addProject} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                                <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>Project Aanmaken
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="planning-tabs">
                <button className={`planning-tab ${tab === 'project' ? 'active' : ''}`} onClick={() => setTab('project')}>
                    <i className="fa-solid fa-diagram-project"></i> Projectplanning
                </button>
                <button className={`planning-tab ${tab === 'personeel' ? 'active' : ''}`} onClick={() => setTab('personeel')}>
                    <i className="fa-solid fa-users"></i> Personeelsplanning
                </button>
                <button className={`planning-tab ${tab === 'jaar' ? 'active' : ''}`} onClick={() => setTab('jaar')}>
                    <i className="fa-solid fa-calendar"></i> Jaarplanning
                </button>
            </div>

            {/* ===== TAB 1: PROJECT PLANNING (GANTT) ===== */}
            {tab === 'project' && (
                <div>
                    <div className="planning-toolbar">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button onClick={() => navigate(-1)} style={{ border: '1px solid var(--border-color)', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>
                                <i className="fa-solid fa-chevron-left"></i>
                            </button>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: '140px', textAlign: 'center' }}>
                                {viewMode === 'week'
                                    ? `Week ${Math.ceil((timelineDates[0].getDate()) / 7)} — ${MONTHS_FULL[timelineDates[0].getMonth()]} ${timelineDates[0].getFullYear()}`
                                    : `${MONTHS_FULL[currentDate.getMonth()]} — ${MONTHS_FULL[(currentDate.getMonth() + 1) % 12]} ${currentDate.getFullYear()}`
                                }
                            </span>
                            <button onClick={() => navigate(1)} style={{ border: '1px solid var(--border-color)', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>
                                <i className="fa-solid fa-chevron-right"></i>
                            </button>
                            <button onClick={() => setCurrentDate(new Date())} style={{ border: '1px solid var(--border-color)', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                                Vandaag
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div className="view-btns">
                                <button className={`view-btn ${planningView === 'gantt' ? 'active' : ''}`} onClick={() => setPlanningView('gantt')}><i className="fa-solid fa-chart-gantt" style={{ marginRight: '4px' }}></i>Gantt</button>
                                <button className={`view-btn ${planningView === 'grid' ? 'active' : ''}`} onClick={() => setPlanningView('grid')}><i className="fa-solid fa-grid-2" style={{ marginRight: '4px' }}></i>Grid</button>
                            </div>
                            {planningView === 'gantt' && (
                                <div className="view-btns">
                                    <button className={`view-btn ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>Week</button>
                                    <button className={`view-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>Maand</button>
                                </div>
                            )}
                            {planningView === 'gantt' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2px 4px' }}>
                                    <button onClick={() => setZoomLevel(z => Math.max(16, z - 4))} title="Uitzoomen"
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 6px', fontSize: '0.85rem', color: '#64748b', borderRadius: '4px' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                                        <i className="fa-solid fa-magnifying-glass-minus"></i>
                                    </button>
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, minWidth: '30px', textAlign: 'center' }}>{Math.round(zoomLevel / 32 * 100)}%</span>
                                    <button onClick={() => setZoomLevel(z => Math.min(64, z + 4))} title="Inzoomen"
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 6px', fontSize: '0.85rem', color: '#64748b', borderRadius: '4px' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                                        <i className="fa-solid fa-magnifying-glass-plus"></i>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fixed color picker overlay */}
                    {colorPickerProject && (() => {
                        const p = projects.find(pr => pr.id === colorPickerProject.id);
                        if (!p) return null;
                        return (
                            <>
                                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9998 }}
                                    onClick={() => setColorPickerProject(null)} />
                                <div style={{ position: 'fixed', top: colorPickerProject.y, left: colorPickerProject.x, zIndex: 9999, background: '#fff', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.18)', padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '5px', width: '196px' }}>
                                    {['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48', '#a855f7', '#0ea5e9', '#d946ef', '#78716c'].map(c => (
                                        <div key={c} onClick={() => { setProjects(prev => prev.map(pr => pr.id !== p.id ? pr : { ...pr, color: c })); setSelectedProject(prev => prev?.id === p.id ? { ...prev, color: c } : prev); setColorPickerProject(null); }}
                                            style={{ width: '20px', height: '20px', borderRadius: '4px', background: c, cursor: 'pointer', border: p.color === c ? '2px solid #1e293b' : '2px solid transparent', transition: 'transform 0.1s' }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'} />
                                    ))}
                                </div>
                            </>
                        );
                    })()}

                    {planningView === 'gantt' && (
                        <div className="gantt-wrapper" ref={ganttWrapperRef} style={{ '--cell-w': `${zoomLevel}px` }}>
                            {/* 3-Layer Header: Year / Month / Day */}
                            {(() => {
                                // Build month spans
                                const monthSpans = [];
                                let curMonth = -1, curYear = -1, spanCount = 0;
                                timelineDates.forEach((d, i) => {
                                    if (d.getMonth() !== curMonth || d.getFullYear() !== curYear) {
                                        if (spanCount > 0) monthSpans.push({ month: curMonth, year: curYear, days: spanCount });
                                        curMonth = d.getMonth(); curYear = d.getFullYear(); spanCount = 1;
                                    } else { spanCount++; }
                                    if (i === timelineDates.length - 1) monthSpans.push({ month: curMonth, year: curYear, days: spanCount });
                                });
                                // Build year spans
                                const yearSpans = [];
                                let cYear = -1, yCnt = 0;
                                timelineDates.forEach((d, i) => {
                                    if (d.getFullYear() !== cYear) {
                                        if (yCnt > 0) yearSpans.push({ year: cYear, days: yCnt });
                                        cYear = d.getFullYear(); yCnt = 1;
                                    } else { yCnt++; }
                                    if (i === timelineDates.length - 1) yearSpans.push({ year: cYear, days: yCnt });
                                });
                                const cellW = zoomLevel;
                                return <>
                                    {/* Year row */}
                                    <div className="gantt-header-row year-row">
                                        <div className="gantt-header-label">&nbsp;</div>
                                        {yearSpans.map((s, i) => (
                                            <div key={i} className="gantt-header-span year-span" style={{ flex: s.days, minWidth: s.days * cellW }}>{s.year}</div>
                                        ))}
                                    </div>
                                    {/* Month row */}
                                    <div className="gantt-header-row month-row">
                                        <div className="gantt-header-label">&nbsp;</div>
                                        {monthSpans.map((s, i) => (
                                            <div key={i} className="gantt-header-span month-span" style={{ flex: s.days, minWidth: s.days * cellW, cursor: 'pointer' }}
                                                onClick={() => { setViewMode('month'); setCurrentDate(new Date(s.year, s.month, 1)); }}
                                                title={`Ga naar ${MONTHS_FULL[s.month]} ${s.year}`}>{MONTHS_FULL[s.month]}</div>
                                        ))}
                                    </div>
                                    {/* Week number row */}
                                    <div className="gantt-header-row week-row">
                                        <div className="gantt-header-label" style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Week</div>
                                        {(() => {
                                            const weekSpans = [];
                                            let curWeek = -1, wCount = 0, weekStartDate = null;
                                            timelineDates.forEach((d, i) => {
                                                const wn = getWeekNumber(d);
                                                if (wn !== curWeek) {
                                                    if (wCount > 0) weekSpans.push({ week: curWeek, days: wCount, startDate: weekStartDate });
                                                    curWeek = wn; wCount = 1; weekStartDate = new Date(d);
                                                } else { wCount++; }
                                                if (i === timelineDates.length - 1) weekSpans.push({ week: curWeek, days: wCount, startDate: weekStartDate });
                                            });
                                            return weekSpans.map((s, i) => (
                                                <div key={i} className="gantt-header-span" style={{ flex: s.days, minWidth: s.days * cellW, fontSize: '0.58rem', fontWeight: 600, color: '#64748b', background: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent', borderRight: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', whiteSpace: 'nowrap', cursor: 'pointer' }}
                                                    onClick={() => { setViewMode('week'); setCurrentDate(new Date(s.startDate)); }}
                                                    title={`Ga naar week ${s.week}`}>
                                                    {s.days >= 3 ? `W${s.week}` : `${s.week}`}
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                    {/* Day row */}
                                    <div className="gantt-header-row day-row">
                                        <div className="gantt-header-label" style={{ fontWeight: 700, fontSize: '0.7rem' }}>Project / Taak</div>
                                        {timelineDates.map((d, i) => {
                                            const dateStr = formatDate(d);
                                            return (
                                                <div key={i} className={`gantt-header-cell ${isWeekend(d) ? 'weekend' : ''} ${formatDate(today) === dateStr ? 'today' : ''}`}
                                                    title={`${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => { setViewMode('week'); setCurrentDate(new Date(d)); }}>
                                                    <div style={{ fontSize: '0.62rem', fontWeight: 700 }}>{d.getDate()}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>;
                            })()}

                            {/* Project rows with inline tasks */}
                            {filteredProjects.map(p => (
                                <React.Fragment key={p.id}>
                                    <div className="gantt-row" onClick={() => onRowClick(p)}
                                        style={{ cursor: 'pointer', background: selectedProject?.id === p.id ? 'rgba(250,160,82,0.04)' : undefined }}>
                                        <div className="gantt-row-label">
                                            <i className={expandedProjects.has(p.id) ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-right"}
                                                style={{ fontSize: '0.55rem', color: '#94a3b8', width: '14px', textAlign: 'center', flexShrink: 0 }}></i>
                                            <div style={{ flexShrink: 0 }}>
                                                <div className="project-dot" onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setColorPickerProject(prev => prev?.id === p.id ? null : { id: p.id, x: r.left, y: r.bottom + 4 }); }}
                                                    style={{ background: p.color, cursor: 'pointer', width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.1)' }} title="Kies kleur" />
                                            </div>
                                            <div style={{ overflow: 'hidden', flex: 1 }}>
                                                <div
                                                    onDoubleClick={(e) => {
                                                        e.stopPropagation();
                                                        const el = e.currentTarget;
                                                        el.contentEditable = 'true';
                                                        el.focus();
                                                        const range = document.createRange();
                                                        range.selectNodeContents(el);
                                                        const sel = window.getSelection();
                                                        sel.removeAllRanges();
                                                        sel.addRange(range);
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.contentEditable = 'false';
                                                        const newName = e.target.textContent.trim();
                                                        if (newName && newName !== p.name) {
                                                            setProjects(prev => prev.map(pr => pr.id !== p.id ? pr : { ...pr, name: newName }));
                                                            setSelectedProject(prev => prev?.id === p.id ? { ...prev, name: newName } : prev);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
                                                    style={{ fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', outline: 'none', cursor: 'pointer' }}
                                                >{p.name}</div>
                                                {(p.client || p.address) && (
                                                    <div style={{ fontSize: '0.6rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {p.client}{p.client && p.address ? ' — ' : ''}{p.address && (
                                                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.address)}`}
                                                                target="_blank" rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{ color: 'var(--accent)', textDecoration: 'none' }}
                                                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                                            ><i className="fa-solid fa-location-dot" style={{ fontSize: '0.5rem', marginRight: '2px' }}></i>{p.address}</a>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                <input type="date" value={p.startDate}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                        if (!e.target.value) return;
                                                        setProjects(prev => prev.map(pr => pr.id !== p.id ? pr : { ...pr, startDate: e.target.value }));
                                                        setSelectedProject(prev => prev?.id === p.id ? { ...prev, startDate: e.target.value } : prev);
                                                    }}
                                                    style={{ width: '90px', fontSize: '0.6rem', padding: '1px 3px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#fff', color: '#334155', fontWeight: 500, cursor: 'pointer', outline: 'none' }} />
                                                <span style={{ fontSize: '0.55rem', color: '#cbd5e1' }}>→</span>
                                                <input type="date" value={p.endDate}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                        if (!e.target.value) return;
                                                        setProjects(prev => prev.map(pr => pr.id !== p.id ? pr : { ...pr, endDate: e.target.value }));
                                                        setSelectedProject(prev => prev?.id === p.id ? { ...prev, endDate: e.target.value } : prev);
                                                    }}
                                                    style={{ width: '90px', fontSize: '0.6rem', padding: '1px 3px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#fff', color: '#334155', fontWeight: 500, cursor: 'pointer', outline: 'none' }} />
                                                <span style={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 600, minWidth: '26px', textAlign: 'right' }}>{diffDays(parseDate(p.startDate), parseDate(p.endDate)) + 1}d</span>
                                            </div>
                                        </div>
                                        <div className="gantt-row-timeline">
                                            {timelineDates.map((d, i) => (
                                                <div key={i} className={`gantt-cell ${isWeekend(d) ? 'weekend' : ''} ${formatDate(today) === formatDate(d) ? 'today' : ''} ${isHoliday(d) ? 'holiday' : ''}`}></div>
                                            ))}
                                            {/* Project bar */}
                                            {(() => {
                                                const style = getBarStyle(p.startDate, p.endDate, p.color);
                                                if (!style) return null;
                                                return <div className="gantt-bar" data-project-id={p.id} data-task-id={null} style={{ ...style, cursor: 'grab' }}
                                                >
                                                    <div className="resize-handle resize-handle-left" ></div>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>{p.name}</span>
                                                    <div className="resize-handle resize-handle-right" ></div>
                                                </div>;
                                            })()}
                                        </div>
                                    </div>
                                    {/* Inline task rows when expanded */}
                                    {expandedProjects.has(p.id) && p.tasks.map(t => (
                                        <div key={t.id} className="gantt-row" onClick={() => onTaskRowClick(p.id, t.id)}
                                            style={{ background: selectedTask?.taskId === t.id ? 'rgba(250,160,82,0.08)' : 'rgba(0,0,0,0.015)', cursor: 'pointer', borderLeft: selectedTask?.taskId === t.id ? '3px solid var(--accent)' : '3px solid transparent' }}>
                                            <div className="gantt-row-label" style={{ paddingLeft: '36px', flexDirection: 'column', alignItems: 'stretch', gap: '2px', padding: '4px 10px 4px 36px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <input type="checkbox" checked={t.completed} onChange={() => toggleTask(p.id, t.id)}
                                                        style={{ width: '14px', height: '14px', accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }} />
                                                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const bar = document.querySelector(`.gantt-bar[data-project-id="${p.id}"][data-task-id="${t.id}"]`);
                                                                if (bar) bar.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                                                            }}
                                                            onDoubleClick={(e) => {
                                                                e.stopPropagation();
                                                                const el = e.currentTarget;
                                                                el.contentEditable = 'true';
                                                                el.focus();
                                                                const range = document.createRange();
                                                                range.selectNodeContents(el);
                                                                const sel = window.getSelection();
                                                                sel.removeAllRanges();
                                                                sel.addRange(range);
                                                            }}
                                                            onBlur={(e) => {
                                                                e.target.contentEditable = 'false';
                                                                const newName = e.target.textContent.trim();
                                                                if (newName && newName !== t.name) {
                                                                    setProjects(prev => prev.map(pr => pr.id !== p.id ? pr : {
                                                                        ...pr, tasks: pr.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, name: newName })
                                                                    }));
                                                                    setSelectedProject(prev => prev?.id === p.id ? { ...prev, tasks: prev.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, name: newName }) } : prev);
                                                                }
                                                                e.target.style.borderBottomColor = 'transparent';
                                                            }}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
                                                            style={{ fontWeight: 500, fontSize: '0.78rem', textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? '#94a3b8' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', outline: 'none', cursor: 'pointer', borderBottom: '1px dashed transparent' }}
                                                        >{t.name}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '20px' }}>
                                                    <input type="date" value={t.startDate}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => {
                                                            const newStart = e.target.value;
                                                            if (!newStart) return;
                                                            setProjects(prev => prev.map(pr => pr.id !== p.id ? pr : {
                                                                ...pr, tasks: pr.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, startDate: newStart })
                                                            }));
                                                            setSelectedProject(prev => prev?.id === p.id ? { ...prev, tasks: prev.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, startDate: newStart }) } : prev);
                                                        }}
                                                        style={{ width: '95px', fontSize: '0.6rem', padding: '1px 3px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#fff', color: '#334155', fontWeight: 500, cursor: 'pointer', outline: 'none' }} />
                                                    {(() => {
                                                        const currentDays = diffDays(parseDate(t.startDate), parseDate(t.endDate)) + 1;
                                                        const changeDays = (newDays) => {
                                                            if (newDays < 1) return;
                                                            const newEnd = formatDate(addDays(parseDate(t.startDate), newDays - 1));
                                                            setProjects(prev => prev.map(pr => pr.id !== p.id ? pr : {
                                                                ...pr, tasks: pr.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, endDate: newEnd })
                                                            }));
                                                            setSelectedProject(prev => prev?.id === p.id ? { ...prev, tasks: prev.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, endDate: newEnd }) } : prev);
                                                        };
                                                        return (
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--accent)', borderRadius: '12px', overflow: 'hidden', width: '62px', justifyContent: 'center', flexShrink: 0 }}>
                                                                <button onClick={(e) => { e.stopPropagation(); changeDays(currentDays - 1); }}
                                                                    style={{ background: 'rgba(0,0,0,0.15)', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 5px', fontSize: '0.7rem', fontWeight: 700, lineHeight: '18px' }}>−</button>
                                                                <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.62rem', padding: '0 4px', minWidth: '22px', textAlign: 'center' }}>{currentDays}d</span>
                                                                <button onClick={(e) => { e.stopPropagation(); changeDays(currentDays + 1); }}
                                                                    style={{ background: 'rgba(0,0,0,0.15)', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 5px', fontSize: '0.7rem', fontWeight: 700, lineHeight: '18px' }}>+</button>
                                                            </div>
                                                        );
                                                    })()}
                                                    <input type="date" value={t.endDate}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => {
                                                            const newEnd = e.target.value;
                                                            if (!newEnd) return;
                                                            setProjects(prev => prev.map(pr => pr.id !== p.id ? pr : {
                                                                ...pr, tasks: pr.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, endDate: newEnd })
                                                            }));
                                                            setSelectedProject(prev => prev?.id === p.id ? { ...prev, tasks: prev.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, endDate: newEnd }) } : prev);
                                                        }}
                                                        style={{ width: '95px', fontSize: '0.6rem', padding: '1px 3px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#fff', color: '#334155', fontWeight: 500, cursor: 'pointer', outline: 'none' }} />
                                                    <button onClick={(e) => { e.stopPropagation(); deleteTask(p.id, t.id); }}
                                                        title="Taak verwijderen"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0, borderRadius: '4px', marginLeft: 'auto' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                                                        <i className="fa-solid fa-xmark" style={{ color: '#ef4444', fontSize: '0.8rem' }}></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="gantt-row-timeline">
                                                {timelineDates.map((d, i) => (
                                                    <div key={i} className={`gantt-cell ${isWeekend(d) ? 'weekend' : ''} ${formatDate(today) === formatDate(d) ? 'today' : ''}`}></div>
                                                ))}
                                                {(() => {
                                                    const style = getBarStyle(t.startDate, t.endDate, p.color + 'bb');
                                                    if (!style) return null;
                                                    return <div className="gantt-bar" data-project-id={p.id} data-task-id={t.id} style={{ ...style, height: '18px', top: '6px', fontSize: '0.58rem', opacity: t.completed ? 0.4 : 1, cursor: 'grab' }}
                                                    >
                                                        <div className="resize-handle resize-handle-left" ></div>
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>{t.name}</span>
                                                        <div className="resize-handle resize-handle-right" ></div>
                                                    </div>;
                                                })()}
                                            </div>
                                        </div>
                                    ))}
                                    {/* Inline new task row - only when expanded */}
                                    {expandedProjects.has(p.id) && (
                                        <div className="gantt-row" style={{ background: 'rgba(0,0,0,0.01)' }}>
                                            <div className="gantt-row-label" style={{ paddingLeft: '36px' }}>
                                                <i className="fa-solid fa-plus" style={{ fontSize: '0.55rem', color: '#94a3b8', width: '14px', flexShrink: 0 }}></i>
                                                <input type="text" placeholder="Nieuwe taak..."
                                                    onClick={(e) => e.stopPropagation()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                                            const name = e.target.value.trim();
                                                            const newTask = { id: Date.now(), name, startDate: p.startDate, endDate: p.endDate, completed: false, assignedTo: [] };
                                                            setProjects(prev => prev.map(pr => pr.id !== p.id ? pr : { ...pr, tasks: [...pr.tasks, newTask] }));
                                                            setSelectedProject(prev => prev?.id === p.id ? { ...prev, tasks: [...prev.tasks, newTask] } : prev);
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.68rem', color: '#94a3b8', padding: '2px 4px', fontStyle: 'italic' }} />
                                            </div>
                                            <div className="gantt-row-timeline">
                                                {timelineDates.map((d, i) => (
                                                    <div key={i} className={`gantt-cell ${isWeekend(d) ? 'weekend' : ''} ${formatDate(today) === formatDate(d) ? 'today' : ''}`}></div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {/* Grid view */}
                    {planningView === 'grid' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', padding: '16px 0' }}>
                            {filteredProjects.map(p => {
                                const completedTasks = p.tasks.filter(t => t.completed).length;
                                const totalTasks = p.tasks.length;
                                const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                                const totalDays = diffDays(parseDate(p.startDate), parseDate(p.endDate)) + 1;
                                const daysElapsed = diffDays(parseDate(p.startDate), today) + 1;
                                const timeProgress = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));
                                return (
                                    <div key={p.id} onClick={() => { setSelectedProject(prev => prev?.id === p.id ? null : p); }}
                                        style={{
                                            background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                                            overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s',
                                            boxShadow: selectedProject?.id === p.id ? '0 0 0 2px var(--accent)' : '0 1px 3px rgba(0,0,0,0.06)'
                                        }}
                                        onMouseEnter={(e) => { if (selectedProject?.id !== p.id) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = selectedProject?.id === p.id ? '0 0 0 2px var(--accent)' : '0 1px 3px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                    >
                                        {/* Color strip */}
                                        <div style={{ height: '4px', background: p.color }}></div>
                                        <div style={{ padding: '16px' }}>
                                            {/* Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{p.name}</h4>
                                                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>{p.client}</p>
                                                </div>
                                                <span style={{
                                                    fontSize: '0.6rem', fontWeight: 600, padding: '3px 8px', borderRadius: '12px',
                                                    background: p.status === 'actief' ? 'rgba(34,197,94,0.1)' : p.status === 'gepland' ? 'rgba(59,130,246,0.1)' : 'rgba(148,163,184,0.1)',
                                                    color: p.status === 'actief' ? '#16a34a' : p.status === 'gepland' ? '#2563eb' : '#64748b',
                                                    textTransform: 'capitalize'
                                                }}>{p.status || 'Actief'}</span>
                                            </div>
                                            {/* Dates */}
                                            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '0.7rem', color: '#64748b' }}>
                                                <div><i className="fa-regular fa-calendar" style={{ marginRight: '4px', color: '#94a3b8' }}></i>{p.startDate?.split('-').reverse().join('-')}</div>
                                                <div><i className="fa-solid fa-arrow-right" style={{ marginRight: '4px', color: '#cbd5e1', fontSize: '0.6rem' }}></i>{p.endDate?.split('-').reverse().join('-')}</div>
                                                <div style={{ marginLeft: 'auto', fontWeight: 600 }}>{totalDays}d</div>
                                            </div>
                                            {/* Progress bar */}
                                            <div style={{ marginBottom: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94a3b8', marginBottom: '4px' }}>
                                                    <span>Voortgang taken</span>
                                                    <span style={{ fontWeight: 600, color: progress === 100 ? '#16a34a' : '#64748b' }}>{progress}%</span>
                                                </div>
                                                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: progress + '%', background: progress === 100 ? '#22c55e' : p.color, borderRadius: '3px', transition: 'width 0.3s' }}></div>
                                                </div>
                                            </div>
                                            {/* Time progress */}
                                            <div style={{ marginBottom: '12px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94a3b8', marginBottom: '4px' }}>
                                                    <span>Tijdlijn</span>
                                                    <span style={{ fontWeight: 600, color: timeProgress > 90 && progress < 80 ? '#ef4444' : '#64748b' }}>{timeProgress}%</span>
                                                </div>
                                                <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: timeProgress + '%', background: timeProgress > 90 && progress < 80 ? '#ef4444' : '#94a3b8', borderRadius: '2px', transition: 'width 0.3s' }}></div>
                                                </div>
                                            </div>
                                            {/* Footer stats */}
                                            <div style={{ display: 'flex', gap: '12px', fontSize: '0.68rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <i className="fa-solid fa-list-check" style={{ color: '#94a3b8', fontSize: '0.6rem' }}></i>
                                                    <span>{completedTasks}/{totalTasks} taken</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <i className="fa-regular fa-clock" style={{ color: '#94a3b8', fontSize: '0.6rem' }}></i>
                                                    <span>{p.estimatedHours || 0}u</span>
                                                </div>
                                                {p.address && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                                                        <i className="fa-solid fa-location-dot" style={{ color: '#94a3b8', fontSize: '0.6rem' }}></i>
                                                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.address)}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--accent)', textDecoration: 'none' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                                        >{p.address}</a>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Expand/collapse toggle */}
                                            <div
                                                onClick={(e) => { e.stopPropagation(); setExpandedProjects(prev => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; }); }}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 0', marginTop: '8px', cursor: 'pointer', fontSize: '0.65rem', color: '#94a3b8', borderTop: '1px dashed #e2e8f0', transition: 'color 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                                            >
                                                <i className={expandedProjects.has(p.id) ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down"} style={{ fontSize: '0.5rem' }}></i>
                                                <span>{expandedProjects.has(p.id) ? 'Taken verbergen' : `Taken tonen (${totalTasks})`}</span>
                                            </div>
                                            {/* Expandable task list */}
                                            {expandedProjects.has(p.id) && (
                                                <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                                                    {p.tasks.map(t => (
                                                        <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <input type="checkbox" checked={t.completed} onChange={() => toggleTask(p.id, t.id)}
                                                                    style={{ width: '13px', height: '13px', accentColor: p.color, cursor: 'pointer', flexShrink: 0 }} />
                                                                <div
                                                                    onDoubleClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const el = e.currentTarget;
                                                                        el.contentEditable = 'true';
                                                                        el.focus();
                                                                        const range = document.createRange();
                                                                        range.selectNodeContents(el);
                                                                        const sel = window.getSelection();
                                                                        sel.removeAllRanges();
                                                                        sel.addRange(range);
                                                                    }}
                                                                    onBlur={(e) => {
                                                                        e.target.contentEditable = 'false';
                                                                        const newName = e.target.textContent.trim();
                                                                        if (newName && newName !== t.name) {
                                                                            setProjects(prev => prev.map(pr => pr.id !== p.id ? pr : { ...pr, tasks: pr.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, name: newName }) }));
                                                                            setSelectedProject(prev => prev?.id === p.id ? { ...prev, tasks: prev.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, name: newName }) } : prev);
                                                                        }
                                                                    }}
                                                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
                                                                    style={{ flex: 1, fontSize: '0.72rem', fontWeight: 500, color: t.completed ? '#94a3b8' : '#334155', textDecoration: t.completed ? 'line-through' : 'none', cursor: 'pointer', outline: 'none', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                                                                >{t.name}</div>
                                                                <button onClick={(e) => { e.stopPropagation(); deleteTask(p.id, t.id); }}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0, borderRadius: '3px' }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                                                                    <i className="fa-solid fa-xmark" style={{ color: '#ef4444', fontSize: '0.65rem' }}></i>
                                                                </button>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '19px' }}>
                                                                <input type="date" value={t.startDate}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={(e) => {
                                                                        if (!e.target.value) return;
                                                                        setProjects(prev => prev.map(pr => pr.id !== p.id ? pr : { ...pr, tasks: pr.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, startDate: e.target.value }) }));
                                                                        setSelectedProject(prev => prev?.id === p.id ? { ...prev, tasks: prev.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, startDate: e.target.value }) } : prev);
                                                                    }}
                                                                    style={{ fontSize: '0.6rem', padding: '1px 3px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#fff', color: '#334155', cursor: 'pointer', outline: 'none', width: '90px' }} />
                                                                <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.45rem', color: '#cbd5e1' }}></i>
                                                                <input type="date" value={t.endDate}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={(e) => {
                                                                        if (!e.target.value) return;
                                                                        setProjects(prev => prev.map(pr => pr.id !== p.id ? pr : { ...pr, tasks: pr.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, endDate: e.target.value }) }));
                                                                        setSelectedProject(prev => prev?.id === p.id ? { ...prev, tasks: prev.tasks.map(tk => tk.id !== t.id ? tk : { ...tk, endDate: e.target.value }) } : prev);
                                                                    }}
                                                                    style={{ fontSize: '0.6rem', padding: '1px 3px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#fff', color: '#334155', cursor: 'pointer', outline: 'none', width: '90px' }} />
                                                                <span style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 600, marginLeft: 'auto' }}>{diffDays(parseDate(t.startDate), parseDate(t.endDate)) + 1}d</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {/* Add new task */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0' }}>
                                                        <i className="fa-solid fa-plus" style={{ fontSize: '0.45rem', color: '#c0c7d0', width: '13px', flexShrink: 0 }}></i>
                                                        <input type="text" placeholder="Nieuwe taak..."
                                                            onClick={(e) => e.stopPropagation()}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && e.target.value.trim()) {
                                                                    const name = e.target.value.trim();
                                                                    const newTask = { id: Date.now(), name, startDate: p.startDate, endDate: p.endDate, completed: false, assignedTo: [] };
                                                                    setProjects(prev => prev.map(pr => pr.id !== p.id ? pr : { ...pr, tasks: [...pr.tasks, newTask] }));
                                                                    setSelectedProject(prev => prev?.id === p.id ? { ...prev, tasks: [...prev.tasks, newTask] } : prev);
                                                                    e.target.value = '';
                                                                }
                                                            }}
                                                            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.65rem', color: '#94a3b8', padding: '2px 4px', fontStyle: 'italic' }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Selected project details */}
                    {selectedProject && (
                        <div className="project-detail-panel">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: selectedProject.color }}></div>
                                        {selectedProject.name}
                                    </h3>
                                    <p style={{ margin: '4px 0', fontSize: '0.82rem', color: '#64748b' }}>
                                        {selectedProject.client} — {selectedProject.address}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <span className={`capacity-badge ${selectedProject.status === 'active' ? 'green' : 'orange'}`}>
                                        {selectedProject.status === 'active' ? 'Actief' : 'Gepland'}
                                    </span>
                                    <button onClick={() => deleteProject(selectedProject.id)} style={{ background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer' }}>
                                        <i className="fa-solid fa-trash-can" style={{ color: '#ef4444', fontSize: '0.7rem' }}></i>
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '14px', fontSize: '0.82rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <strong style={{ fontSize: '0.72rem', color: '#64748b' }}>Start:</strong>
                                    <input type="date" value={selectedProject.startDate}
                                        onChange={e => updateProjectDates(selectedProject.id, e.target.value, null)}
                                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.78rem', outline: 'none', cursor: 'pointer' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <strong style={{ fontSize: '0.72rem', color: '#64748b' }}>Einde:</strong>
                                    <input type="date" value={selectedProject.endDate}
                                        onChange={e => updateProjectDates(selectedProject.id, null, e.target.value)}
                                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.78rem', outline: 'none', cursor: 'pointer' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <strong style={{ fontSize: '0.72rem', color: '#64748b' }}>Uren:</strong>
                                    <span>{selectedProject.estimatedHours}u</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <strong style={{ fontSize: '0.72rem', color: '#64748b' }}>Taken:</strong>
                                    <span>{selectedProject.tasks.filter(t => t.completed).length}/{selectedProject.tasks.length}</span>
                                </div>
                            </div>

                            {/* Week/dag shift knoppen */}
                            <div style={{ display: 'flex', gap: '4px', marginTop: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginRight: '6px' }}>Verschuif:</span>
                                <button onClick={() => shiftProject(selectedProject.id, -7)}
                                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="fa-solid fa-angles-left" style={{ fontSize: '0.6rem' }}></i> 1 week
                                </button>
                                <button onClick={() => shiftProject(selectedProject.id, -1)}
                                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="fa-solid fa-angle-left" style={{ fontSize: '0.6rem' }}></i> 1 dag
                                </button>
                                <button onClick={() => shiftProject(selectedProject.id, 1)}
                                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    1 dag <i className="fa-solid fa-angle-right" style={{ fontSize: '0.6rem' }}></i>
                                </button>
                                <button onClick={() => shiftProject(selectedProject.id, 7)}
                                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    1 week <i className="fa-solid fa-angles-right" style={{ fontSize: '0.6rem' }}></i>
                                </button>
                            </div>

                            {/* Progress bar */}
                            <div style={{ marginTop: '12px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: '3px',
                                    background: selectedProject.color,
                                    width: `${selectedProject.tasks.length ? (selectedProject.tasks.filter(t => t.completed).length / selectedProject.tasks.length * 100) : 0}%`,
                                    transition: 'width 0.3s'
                                }}></div>
                            </div>

                            {/* Nieuwe taak formulier */}
                            <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                {!showTaskForm ? (
                                    <button onClick={() => setShowTaskForm(true)}
                                        style={{ background: 'none', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: '#94a3b8', fontWeight: 600, fontSize: '0.8rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-plus"></i> Nieuwe taak toevoegen
                                    </button>
                                ) : (
                                    <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr 1fr' }}>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>Taaknaam *</label>
                                                <input placeholder="bijv. Buitenschilderwerk" value={newTask.name} onChange={e => setNewTask({ ...newTask, name: e.target.value })}
                                                    style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>Startdatum *</label>
                                                <input type="date" value={newTask.startDate} onChange={e => setNewTask({ ...newTask, startDate: e.target.value })}
                                                    style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>Einddatum *</label>
                                                <input type="date" value={newTask.endDate} onChange={e => setNewTask({ ...newTask, endDate: e.target.value })}
                                                    style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                                            </div>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Medewerkers toewijzen</label>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    {allUsers.filter(u => u.role !== 'Beheerder').map(u => (
                                                        <button key={u.id}
                                                            onClick={() => setNewTask(prev => ({
                                                                ...prev,
                                                                assignedTo: prev.assignedTo.includes(u.id)
                                                                    ? prev.assignedTo.filter(id => id !== u.id)
                                                                    : [...prev.assignedTo, u.id]
                                                            }))}
                                                            style={{
                                                                padding: '4px 10px', borderRadius: '14px', cursor: 'pointer',
                                                                fontSize: '0.72rem', fontWeight: 600, border: 'none',
                                                                background: newTask.assignedTo.includes(u.id) ? selectedProject.color : '#e2e8f0',
                                                                color: newTask.assignedTo.includes(u.id) ? '#fff' : '#64748b',
                                                                transition: 'all 0.15s'
                                                            }}>
                                                            {u.initials} {u.name.split(' ')[0]}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                <button onClick={() => { setShowTaskForm(false); setNewTask({ name: '', startDate: '', endDate: '', assignedTo: [] }); }}
                                                    style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#64748b', fontSize: '0.78rem' }}>Annuleer</button>
                                                <button onClick={() => addTask(selectedProject.id)}
                                                    style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: selectedProject.color, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>
                                                    <i className="fa-solid fa-check" style={{ marginRight: '4px' }}></i>Toevoegen
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )
            }

            {/* ===== TAB 2: PERSONEELSPLANNING ===== */}
            {
                tab === 'personeel' && (
                    <div>
                        <div className="planning-toolbar">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button onClick={() => navigate(-1)} style={{ border: '1px solid var(--border-color)', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>
                                    <i className="fa-solid fa-chevron-left"></i>
                                </button>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: '140px', textAlign: 'center' }}>
                                    {viewMode === 'week'
                                        ? `Week ${Math.ceil(timelineDates[0]?.getDate() / 7)} — ${MONTHS_FULL[timelineDates[0]?.getMonth()]} ${timelineDates[0]?.getFullYear()}`
                                        : `${MONTHS_FULL[currentDate.getMonth()]} — ${MONTHS_FULL[(currentDate.getMonth() + 1) % 12]} ${currentDate.getFullYear()}`
                                    }
                                </span>
                                <button onClick={() => navigate(1)} style={{ border: '1px solid var(--border-color)', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>
                                    <i className="fa-solid fa-chevron-right"></i>
                                </button>
                                <button onClick={() => setCurrentDate(new Date())} style={{ border: '1px solid var(--border-color)', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                                    Vandaag
                                </button>
                            </div>
                            <div className="view-btns">
                                <button className={`view-btn ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>Week</button>
                                <button className={`view-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>Maand</button>
                            </div>
                        </div>

                        <div className="gantt-wrapper">
                            {/* Header */}
                            <div className="gantt-header">
                                <div className="gantt-header-project">Medewerker</div>
                                {timelineDates.map((d, i) => (
                                    <div key={i} className={`gantt-header-cell ${isWeekend(d) ? 'weekend' : ''} ${formatDate(today) === formatDate(d) ? 'today' : ''}`}>
                                        <div>{DAYS_NL[d.getDay()]}</div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 700 }}>{d.getDate()}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Personnel rows */}
                            {allUsers.filter(u => u.role !== 'Beheerder').map(u => (
                                <div key={u.id} className="personnel-row">
                                    <div className="personnel-label">
                                        <div className="personnel-avatar">{u.initials}</div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{u.name}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{u.role}</div>
                                        </div>
                                    </div>
                                    {timelineDates.map((d, i) => {
                                        const we = isWeekend(d);
                                        const hol = isHoliday(d);
                                        const assignments = getPersonnelAssignments(u.id, d);
                                        const cellClass = we ? 'weekend' : assignments.length > 1 ? 'overloaded' : assignments.length === 1 ? 'busy' : '';

                                        return (
                                            <div key={i} className={`personnel-cell ${cellClass} ${formatDate(today) === formatDate(d) ? 'today' : ''}`}
                                                title={hol || assignments.map(a => a.project.name).join(', ') || 'Beschikbaar'}>
                                                {hol ? (
                                                    <span style={{ fontSize: '0.6rem', color: '#ef4444' }}>🏴</span>
                                                ) : we ? null : assignments.length > 0 ? (
                                                    <div style={{
                                                        width: '90%', height: '70%', borderRadius: '4px',
                                                        background: assignments[0].project.color,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: '#fff', fontSize: '0.55rem', fontWeight: 700
                                                    }}>
                                                        {assignments.length > 1 ? `${assignments.length}×` : assignments[0].project.name.substring(0, 3)}
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        {/* Legenda */}
                        <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '0.75rem', color: '#64748b', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '16px', height: '12px', borderRadius: '3px', background: 'rgba(250,160,82,0.2)' }}></div>
                                Ingepland
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '16px', height: '12px', borderRadius: '3px', background: 'rgba(239,68,68,0.15)' }}></div>
                                Meerdere projecten
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '16px', height: '12px', borderRadius: '3px', background: 'rgba(0,0,0,0.04)' }}></div>
                                Weekend
                            </div>
                            {filteredProjects.map(p => (
                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ width: '16px', height: '12px', borderRadius: '3px', background: p.color }}></div>
                                    {p.name.length > 20 ? p.name.substring(0, 20) + '…' : p.name}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* ===== TAB 3: JAARPLANNING ===== */}
            {
                tab === 'jaar' && (() => {
                    // Build a 365/366-day array for the selected year
                    const year = currentDate.getFullYear();
                    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
                    const totalDays = isLeap ? 366 : 365;
                    const yearStart = new Date(year, 0, 1);

                    // Month spans for header
                    const monthSpans = Array.from({ length: 12 }, (_, m) => {
                        const days = new Date(year, m + 1, 0).getDate();
                        return { month: m, days };
                    });

                    // Pixel width per day
                    const DAY_W = 3; // px per day — tight but enough to drag
                    const LABEL_W = 200; // sidebar width px
                    const totalW = totalDays * DAY_W;

                    const yearBarStyle = (startStr, endStr, color) => {
                        const s = new Date(Math.max(new Date(startStr + 'T00:00:00'), yearStart));
                        const e = new Date(Math.min(new Date(endStr + 'T00:00:00'), new Date(year, 11, 31)));
                        if (s > new Date(year, 11, 31) || e < yearStart) return null;
                        const offsetDays = Math.round((s - yearStart) / 86400000);
                        const durDays = Math.round((e - s) / 86400000) + 1;
                        return {
                            left: offsetDays * DAY_W,
                            width: Math.max(durDays * DAY_W, 6),
                            background: color,
                        };
                    };

                    return (
                        <div>
                            <div className="planning-toolbar">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button onClick={() => setCurrentDate(new Date(year - 1, 0, 1))} style={{ border: '1px solid var(--border-color)', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>
                                        <i className="fa-solid fa-chevron-left"></i>
                                    </button>
                                    <span style={{ fontWeight: 700, fontSize: '1rem', minWidth: '60px', textAlign: 'center' }}>{year}</span>
                                    <button onClick={() => setCurrentDate(new Date(year + 1, 0, 1))} style={{ border: '1px solid var(--border-color)', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>
                                        <i className="fa-solid fa-chevron-right"></i>
                                    </button>
                                    <button onClick={() => setCurrentDate(new Date())} style={{ border: '1px solid var(--border-color)', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Vandaag</button>
                                </div>
                                <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                                    <i className="fa-solid fa-hand-pointer" style={{ marginRight: '5px' }}></i>
                                    Drag om te verplaatsen · Rand slepen om te verlengen/verkorten
                                </div>
                            </div>

                            {/* Year bar chart */}
                            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}
                                ref={el => {
                                    if (!el || el._yearDragBound) return;
                                    el._yearDragBound = true;

                                    el.addEventListener('mousedown', (e) => {
                                        if (e.button !== 0) return;
                                        const bar = e.target.closest('.year-drag-bar');
                                        if (!bar) return;
                                        e.preventDefault();
                                        e.stopPropagation();

                                        const projectId = Number(bar.dataset.projectId);
                                        const isLeft = e.target.classList.contains('year-resize-left');
                                        const isRight = e.target.classList.contains('year-resize-right');
                                        const isResize = isLeft || isRight;

                                        const startX = e.clientX;
                                        let moved = 0;

                                        const overlay = document.createElement('div');
                                        overlay.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;cursor:${isResize ? 'col-resize' : 'grabbing'};`;
                                        document.body.appendChild(overlay);
                                        document.body.style.userSelect = 'none';

                                        const onMove = (ev) => {
                                            const dx = ev.clientX - startX;
                                            const daysDelta = Math.round(dx / DAY_W);
                                            if (daysDelta !== moved) {
                                                const delta = daysDelta - moved;
                                                moved = daysDelta;
                                                if (isResize) {
                                                    resizeBar(projectId, null, isLeft ? 'left' : 'right', delta);
                                                } else {
                                                    moveBar(projectId, null, delta);
                                                }
                                            }
                                        };
                                        const onUp = () => {
                                            overlay.removeEventListener('mousemove', onMove);
                                            overlay.removeEventListener('mouseup', onUp);
                                            document.removeEventListener('mousemove', onMove, true);
                                            document.removeEventListener('mouseup', onUp, true);
                                            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                                            document.body.style.userSelect = '';
                                        };
                                        overlay.addEventListener('mousemove', onMove);
                                        overlay.addEventListener('mouseup', onUp);
                                        document.addEventListener('mousemove', onMove, true);
                                        document.addEventListener('mouseup', onUp, true);
                                    }, true);
                                }}>

                                {/* Month header */}
                                <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2 }}>
                                    <div style={{ width: LABEL_W, minWidth: LABEL_W, padding: '8px 12px', fontWeight: 700, fontSize: '0.78rem', color: '#475569', borderRight: '1px solid #e2e8f0' }}>Project</div>
                                    <div style={{ flex: 1, overflowX: 'hidden', display: 'flex' }}>
                                        {monthSpans.map((s, i) => (
                                            <div key={i} style={{ width: s.days * DAY_W, minWidth: s.days * DAY_W, textAlign: 'center', padding: '8px 0', fontSize: '0.72rem', fontWeight: 700, color: new Date().getMonth() === i && new Date().getFullYear() === year ? '#F5850A' : '#64748b', borderRight: '1px solid #e2e8f0', background: new Date().getMonth() === i && new Date().getFullYear() === year ? 'rgba(245,133,10,0.06)' : 'transparent' }}>
                                                {MONTHS_NL[i]}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Project rows */}
                                <div style={{ overflowX: 'auto' }} id="year-scroll">
                                    {filteredProjects.map((p, pi) => {
                                        const bs = yearBarStyle(p.startDate, p.endDate, p.color);
                                        return (
                                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f1f5f9', background: pi % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                {/* Label */}
                                                <div style={{ width: LABEL_W, minWidth: LABEL_W, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }}></div>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                                                </div>
                                                {/* Timeline */}
                                                <div style={{ flex: 1, position: 'relative', height: 36, minWidth: totalW }}>
                                                    {/* Today line */}
                                                    {new Date().getFullYear() === year && (
                                                        <div style={{ position: 'absolute', left: Math.round((new Date() - yearStart) / 86400000) * DAY_W, top: 0, bottom: 0, width: 1, background: '#ef4444', zIndex: 1, pointerEvents: 'none' }}></div>
                                                    )}
                                                    {/* Month dividers */}
                                                    {monthSpans.slice(0, 11).reduce((acc, s, i) => { acc.push(acc[acc.length - 1] + s.days); return acc; }, [monthSpans[0].days]).map((x, i) => (
                                                        <div key={i} style={{ position: 'absolute', left: x * DAY_W, top: 0, bottom: 0, width: 1, background: '#f1f5f9', pointerEvents: 'none' }}></div>
                                                    ))}
                                                    {/* Draggable bar */}
                                                    {bs && (
                                                        <div className="year-drag-bar" data-project-id={p.id}
                                                            style={{ position: 'absolute', left: bs.left, width: bs.width, top: 6, height: 24, borderRadius: 6, background: bs.background, cursor: 'grab', display: 'flex', alignItems: 'center', zIndex: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.15)', userSelect: 'none' }}>
                                                            {/* Left resize handle */}
                                                            <div className="year-resize-left" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'col-resize', borderRadius: '6px 0 0 6px', background: 'rgba(0,0,0,0.15)' }}></div>
                                                            {/* Label */}
                                                            <span style={{ flex: 1, textAlign: 'center', fontSize: '0.6rem', color: '#fff', fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', padding: '0 10px', pointerEvents: 'none' }}>
                                                                {bs.width > 40 ? p.name.substring(0, Math.floor(bs.width / 7)) : ''}
                                                            </span>
                                                            {/* Right resize handle */}
                                                            <div className="year-resize-right" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'col-resize', borderRadius: '0 6px 6px 0', background: 'rgba(0,0,0,0.15)' }}></div>
                                                        </div>
                                                    )}
                                                    {!bs && (
                                                        <div style={{ position: 'absolute', left: 0, right: 0, top: 14, height: 8, background: '#f1f5f9', borderRadius: 4 }}></div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Feestdagen rij */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', borderTop: '2px solid #fee2e2', background: '#fff5f5' }}>
                                        <div style={{ width: LABEL_W, minWidth: LABEL_W, padding: '8px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#ef4444', borderRight: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '6px', height: 60 }}>
                                            <i className="fa-solid fa-calendar-xmark"></i> Feestdagen
                                        </div>
                                        <div style={{ position: 'relative', minWidth: totalW, height: 60 }}>
                                            {Object.entries(HOLIDAYS_2026)
                                                .filter(([d]) => new Date(d).getFullYear() === year)
                                                .map(([d, name]) => {
                                                    const dayOffset = Math.round((new Date(d + 'T00:00:00') - yearStart) / 86400000);
                                                    return (
                                                        <div key={d} title={name} style={{ position: 'absolute', left: dayOffset * DAY_W - 1, top: 6, width: Math.max(DAY_W, 2), bottom: 6, background: 'rgba(239,68,68,0.25)', borderRadius: 2, borderLeft: '1px solid #ef4444' }}>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()
            }
        </div>
    );
}
