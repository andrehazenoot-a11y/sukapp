'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../components/AuthContext';
import './planning.css';

// ===== DUTCH HOLIDAYS =====
const HOLIDAYS_2026 = {
    '2026-01-01': 'Nieuwjaarsdag',
    '2026-04-03': 'Goede Vrijdag',
    '2026-04-06': 'Tweede Paasdag',
    '2026-04-27': 'Koningsdag',
    '2026-05-05': 'Bevrijdingsdag',
    '2026-05-14': 'Hemelvaartsdag',
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
        id: 1, name: 'Nieuwbouw Villa Wassenaar', client: 'Fam. Jansen',
        phone: '0612345678', email: 'jansen@example.nl',
        address: 'Duinweg 42, Wassenaar',
        startDate: '2026-03-02', endDate: '2026-04-17', estimatedHours: 320, hourlyRate: 55, color: '#3b82f6',
        status: 'active', kanbanStatus: 'uitvoering',
        tasks: [
            { id: 't1', name: 'Buitenschilderwerk kozijnen', startDate: '2026-03-02', endDate: '2026-03-13', assignedTo: [2, 4], completed: false },
            { id: 't2', name: 'Binnenschilderwerk begane grond', startDate: '2026-03-16', endDate: '2026-03-27', assignedTo: [2], completed: false },
            { id: 't3', name: 'Binnenschilderwerk verdieping', startDate: '2026-03-30', endDate: '2026-04-10', assignedTo: [3, 4], completed: false },
            { id: 't4', name: 'Oplevering & correcties', startDate: '2026-04-13', endDate: '2026-04-17', assignedTo: [2, 3, 4], completed: false },
        ]
    },
    {
        id: 2, name: 'Onderhoud Rijtjeshuizen Leiden', client: 'Woonstichting Leiden',
        phone: '0715678901', email: 'beheer@woonstichting-leiden.nl',
        address: 'Rapenburg 100, Leiden',
        startDate: '2026-03-09', endDate: '2026-05-08', estimatedHours: 480, hourlyRate: 55, color: '#10b981',
        status: 'active', kanbanStatus: 'uitvoering',
        tasks: [
            { id: 't5', name: 'Houtrot reparatie blok 1-3', startDate: '2026-03-09', endDate: '2026-03-27', assignedTo: [4], completed: false },
            { id: 't6', name: 'Grondverf aanbrengen', startDate: '2026-03-30', endDate: '2026-04-10', assignedTo: [2, 3], completed: false },
            { id: 't7', name: 'Aflakken buitenwerk', startDate: '2026-04-13', endDate: '2026-05-01', assignedTo: [2, 3, 4], completed: false },
            { id: 't8', name: 'Eindcontrole', startDate: '2026-05-04', endDate: '2026-05-08', assignedTo: [4], completed: false },
        ]
    },
    {
        id: 3, name: 'Kantoorpand Voorschoten', client: 'Bakker BV',
        phone: '0687654321', email: 'info@bakkerbv.nl',
        address: 'Industrieweg 8, Voorschoten',
        startDate: '2026-04-20', endDate: '2026-05-22', estimatedHours: 200, hourlyRate: 60, color: '#8b5cf6',
        status: 'planning', kanbanStatus: 'werkvoorbereiding',
        tasks: [
            { id: 't9', name: 'Voorbereiding & schuren', startDate: '2026-04-20', endDate: '2026-04-24', assignedTo: [3], completed: false },
            { id: 't10', name: 'Latex muren binnenzijde', startDate: '2026-04-27', endDate: '2026-05-08', assignedTo: [2, 3], completed: false },
            { id: 't11', name: 'Kozijnen buiten', startDate: '2026-05-11', endDate: '2026-05-22', assignedTo: [2, 4], completed: false },
        ]
    },
    {
        id: 4, name: 'Woonhuis Den Haag', client: 'Fam. de Groot',
        phone: '0698765432', email: 'degroot@example.nl',
        address: 'Laan van Meerdervoort 200, Den Haag',
        startDate: '2026-05-18', endDate: '2026-06-12', estimatedHours: 160, hourlyRate: 55, color: '#f59e0b',
        status: 'planning', kanbanStatus: 'werkvoorbereiding',
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
// Telt alleen werkdagen (ma-vr) inclusief begin en eind
function diffWorkdays(a, b) {
    let count = 0;
    const cur = new Date(a);
    while (cur <= b) {
        const d = cur.getDay();
        if (d !== 0 && d !== 6) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}
function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}
function isWeekend(d) { const day = d.getDay(); return day === 0 || day === 6; }
function isHoliday(d) { return HOLIDAYS_2026[formatDate(d)] || null; }
function isNonWorkDay(d) { return isWeekend(d) || !!isHoliday(d); }
// Splits a date range into Mon–Fri segments (skipping Sa/Su) and returns {left,width}% per segment
function getWorkdaySegments(startDate, endDate, tStart, tEnd, totalDays) {
    const segments = [];
    // Clamp to timeline
    const s = new Date(Math.max(startDate.getTime(), tStart.getTime()));
    const e = new Date(Math.min(endDate.getTime(), tEnd.getTime()));
    if (s > e) return segments;
    let cur = new Date(s);
    const skipDay = (d) => isWeekend(d) || !!HOLIDAYS_2026[formatDate(d)];
    while (cur <= e) {
        // Skip leading weekends AND feestdagen
        while (cur <= e && skipDay(cur)) cur.setDate(cur.getDate() + 1);
        if (cur > e) break;
        const segStart = new Date(cur);
        // Advance through normal workdays (stop at weekend OR feestdag)
        while (cur <= e && !skipDay(cur)) cur.setDate(cur.getDate() + 1);
        const segEnd = new Date(cur); segEnd.setDate(segEnd.getDate() - 1);
        const left  = (diffDays(tStart, segStart) / totalDays) * 100;
        const width = Math.max(((diffDays(segStart, segEnd) + 1) / totalDays) * 100, 0.6);
        segments.push({ left, width });
    }
    return segments;
}

function getMonday(d) { const r = new Date(d); const day = r.getDay(); const diff = r.getDate() - day + (day === 0 ? -6 : 1); r.setDate(diff); return r; }
const MONTHS_NL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
const MONTHS_FULL = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
const DAYS_NL = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

export default function ProjectenPage() {
    const { getAllUsers } = useAuth();
    const allUsers = getAllUsers();
    const [tab, setTab] = useState('project');
    useEffect(() => { document.title = 'Projectplanning | SchildersApp Katwijk'; }, []);

    const [projects, setProjects] = useState(() => {
        if (typeof window === 'undefined') return INITIAL_PROJECTS;
        try { const s = localStorage.getItem('schildersapp_projecten'); return s ? JSON.parse(s) : INITIAL_PROJECTS; } catch { return INITIAL_PROJECTS; }
    });
    const [viewMode, setViewMode] = useState('month'); // week, month
    const [planningView, setPlanningView] = useState('gantt');
    const [zoomLevel, setZoomLevel] = useState(32); // gantt, grid
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null); // {projectId, taskId} for keyboard movement
    const [expandedProjects, setExpandedProjects] = useState(new Set());
    const [showCompletedProjects, setShowCompletedProjects] = useState(new Set());
    const [colorPickerProject, setColorPickerProject] = useState(null);
    const [showNewForm, setShowNewForm] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [newProject, setNewProject] = useState({ name: '', client: '', address: '', startDate: '', endDate: '', estimatedHours: '' });
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [workerTooltip, setWorkerTooltip] = useState(null); // { name, x, y }
    const [teamPopup, setTeamPopup] = useState(null); // { projectId, taskId|null, x, y }
    const [newTask, setNewTask] = useState({ name: '', startDate: '', endDate: '', assignedTo: [] });
    const dragRef = useRef(null);
    const ganttWrapperRef = useRef(null);
    const justDraggedRef = useRef(false);
    const selectedProjectRef = useRef(null);
    const selectedTaskRef = useRef(null);
    const moveBarRef = useRef(null);
    const [zoekTerm, setZoekTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('alle');
    const [bzFilter, setBzFilter] = useState('iedereen'); // Filter voor Bezetting: iedereen, ingepland, niet_ingepland, vakantie
    const [selectedTaskId, setSelectedTaskId] = useState(null); // voor timeline highlight

    // Notitie popup per taak
    const [notePopup, setNotePopup] = useState(null); // { projectId, taskId }
    const [noteInput, setNoteInput] = useState('');
    const [noteTab, setNoteTab] = useState('nieuw'); // 'nieuw' | 'koppel'
    const [noteTooltip, setNoteTooltip] = useState(null); // { notes[], x, y, taskName }
    const [projectNotesCache, setProjectNotesCache] = useState({}); // { [projectId]: [{...}] }
    const [projectNotesLoading, setProjectNotesLoading] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null); // noteId
    const [replyInput, setReplyInput] = useState('');

    // Afwezigheid registratie (vakantie, ziek, vrije dag, dokter)
    const [workerAbsences, setWorkerAbsences] = useState(() => {
        if (typeof window === 'undefined') return [];
        try { return JSON.parse(localStorage.getItem('schilders-absences') || '[]'); } catch { return []; }
    });
    const [absPopup, setAbsPopup] = useState(null); // { workerId, startDate, x, y }
    const [absForm, setAbsForm] = useState({ type: 'vakantie', startDate: '', endDate: '' });
    // Taak bewerken vanuit personeelsplanning
    const [taskEditPopup, setTaskEditPopup] = useState(null); // { projId, taskId, x, y }
    const [taskEditForm, setTaskEditForm] = useState({ name: '', startDate: '', endDate: '' });
    // Toewijzen vanuit bezetting-rij (klik op beschikbaar persoon)
    const [assignPopup, setAssignPopup] = useState(null); // { userId, userName, dateStr, x, y, tasks[] }
    // Afwezigheid bewerken
    const [absEditPopup, setAbsEditPopup] = useState(null); // { absId, x, y }
    // Sleep-om-taak-te-maken
    const [drawCreate, setDrawCreate] = useState(null); // { projectId, startDate, currentDate, x, y, width }
    const [quickTaskPopup, setQuickTaskPopup] = useState(null); // { projectId, startDate, endDate, x, y }
    const [quickTaskName, setQuickTaskName] = useState('');
    const drawCreateRef = useRef(null);

    // Persist projects to localStorage whenever they change
    const _isSavingRef = useRef(false);
    useEffect(() => {
        _isSavingRef.current = true;
        localStorage.setItem('schildersapp_projecten', JSON.stringify(projects));
        _isSavingRef.current = false;
    }, [projects]);

    // Persist absences to localStorage
    useEffect(() => {
        localStorage.setItem('schilders-absences', JSON.stringify(workerAbsences));
    }, [workerAbsences]);

    // ===== CROSS-TAB SYNC: reload when another tab changes project data =====

    useEffect(() => {
        const reloadFromStorage = () => {
            try {
                const s = localStorage.getItem('schildersapp_projecten');
                if (s) setProjects(JSON.parse(s));
            } catch {}
        };
        // storage event fires when ANOTHER tab writes to localStorage
        const onStorage = (e) => {
            if (e.key === 'schildersapp_projecten') reloadFromStorage();
            if (e.key === 'schilders-absences') {
                try {
                    const parsed = JSON.parse(e.newValue || '[]');
                    setWorkerAbsences(parsed);
                } catch {}
            }
            // Vakantiedagen van de uren/verlof pagina — forceer herberekening van bezetting
            if (e.key && e.key.startsWith('schildersapp_vakantie_')) {
                // Bezetting leest direct uit localStorage, dus een kleine state-update genoeg om te herrenderen
                setWorkerAbsences(prev => [...prev]);
            }
        };
        // visibilitychange fires when the user switches back to this tab
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                reloadFromStorage();
                try {
                    const abs = JSON.parse(localStorage.getItem('schilders-absences') || '[]');
                    setWorkerAbsences(abs);
                } catch {}
            }
        };
        // schilders-sync fires when the detail page's "Opslaan" button is clicked
        // (works within the SAME tab, unlike the storage event)
        const onSync = (e) => {
            if (e.detail?.projecten) setProjects(e.detail.projecten);
            else reloadFromStorage();
        };
        window.addEventListener('storage', onStorage);
        window.addEventListener('schilders-sync', onSync);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('schilders-sync', onSync);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

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
        let start = getMonday(currentDate);
        let count = 56; // default 8 weken

        if (viewMode === '1w') {
            count = 7;
        } else if (viewMode === '2w') {
            count = 14;
        } else if (viewMode === '8w') {
            count = 56;
        } else if (viewMode === '1m') {
            // Per maand: start from 1st of month (padded to Monday), end at last day (padded to Sunday)
            const mStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const mEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            start = getMonday(mStart);
            count = diffDays(start, mEnd) + 1;
            // Zorg dat end altijd een complete week is door de remainder aan te vullen
            const remainder = count % 7;
            if (remainder !== 0) count += (7 - remainder);
        } else {
            // Fallback old 'month' mode = 8 weken
            count = 56;
        }

        for (let i = 0; i < count; i++) {
            dates.push(addDays(start, i));
        }
        return dates;
    }, [currentDate, viewMode]);

    // ===== NAVIGATE =====
    const navigate = (dir) => {
        const d = new Date(currentDate);
        if (viewMode === '1w') {
            d.setDate(d.getDate() + dir * 7);
        } else if (viewMode === '2w') {
            d.setDate(d.getDate() + dir * 14);
        } else if (viewMode === '8w') {
            d.setDate(d.getDate() + dir * 28); // scroll by 4 weeks for smoother nav
        } else {
            // 1m
            d.setMonth(d.getMonth() + dir);
        }
        setCurrentDate(d);
    };

    const navigateWeek = (dir) => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + dir * 7);
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
            kanbanStatus: 'werkvoorbereiding',
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
        if (!newTask.name.trim()) return;
        // Datum is optioneel — val terug op projectdatum als niet ingevuld
        const project = projects.find(p => p.id === projectId);
        const task = {
            id: 't' + Date.now(),
            name: newTask.name.trim(),
            startDate: newTask.startDate || project?.startDate || formatDate(new Date()),
            endDate: newTask.endDate || project?.endDate || formatDate(new Date()),
            assignedTo: newTask.assignedTo || [],
            completed: false
        };
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, tasks: [...p.tasks, task] };
        }));
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

    // ===== MOVE TASK UP / DOWN =====
    const moveTaskUp = (projectId, taskId) => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            const tasks = [...p.tasks];
            const idx = tasks.findIndex(t => t.id === taskId);
            if (idx <= 0) return p;
            [tasks[idx - 1], tasks[idx]] = [tasks[idx], tasks[idx - 1]];
            return { ...p, tasks };
        }));
    };
    const moveTaskDown = (projectId, taskId) => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            const tasks = [...p.tasks];
            const idx = tasks.findIndex(t => t.id === taskId);
            if (idx < 0 || idx >= tasks.length - 1) return p;
            [tasks[idx], tasks[idx + 1]] = [tasks[idx + 1], tasks[idx]];
            return { ...p, tasks };
        }));
    };

    // ===== DUPLICATE TASK =====
    const duplicateTask = (projectId, taskId) => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            const idx = p.tasks.findIndex(t => t.id === taskId);
            if (idx < 0) return p;
            const orig = p.tasks[idx];
            const copy = { ...orig, id: 't' + Date.now(), name: orig.name + ' (kopie)', completed: false, notes: [] };
            const tasks = [...p.tasks];
            tasks.splice(idx + 1, 0, copy);
            return { ...p, tasks };
        }));
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
    }, [moveBar, resizeBar]);

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

    // ===== CALCULATE BAR POSITION (pixel-exact, mode-aware) =====
    const getBarSegments = (startStr, endStr, color, extraStyle = {}) => {
        try {
            const start = parseDate(startStr);
            const end   = parseDate(endStr);
            const tStart = timelineDates[0];
            const tEnd   = timelineDates[timelineDates.length - 1];
            if (start > tEnd || end < tStart) return [];
            const totalDays = timelineDates.length;

            if (viewMode === 'week') {
                // Week-weergave: gesegmenteerd met overslaan van weekenden EN feestdagen
                const totalDays = timelineDates.length;
                return getWorkdaySegments(start, end, tStart, tEnd, totalDays).map(seg => ({
                    left:       `${seg.left * zoomLevel / 100 * totalDays}px`,
                    width:      `${Math.max(seg.width * zoomLevel / 100 * totalDays, zoomLevel * 0.9)}px`,
                    background: color,
                    ...extraStyle,
                }));
            }

            // Maand-weergave: gesegmenteerd per weekdagblok (weekenden overgeslagen)
            return getWorkdaySegments(start, end, tStart, tEnd, totalDays).map(seg => ({
                left:       `${seg.left * zoomLevel / 100 * totalDays}px`,
                width:      `${Math.max(seg.width * zoomLevel / 100 * totalDays, zoomLevel * 0.9)}px`,
                background: color,
                ...extraStyle,
            }));
        } catch { return []; }
    };
    // Legacy single-segment style (kept for drag overlay compatibility)
    const getBarStyle = (startStr, endStr, color) => {
        const segs = getBarSegments(startStr, endStr, color);
        return segs.length ? segs[0] : null;
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
        <>
        <div className="content-area" id="view-planning" style={{ maxWidth: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexShrink: 0, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, flexShrink: 0 }}>Planning</h1>

                {/* Inline stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
                    {[
                        { icon: 'fa-diagram-project', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', value: stats.active, label: 'Actief' },
                        { icon: 'fa-clock', color: 'var(--accent)', bg: 'rgba(250,160,82,0.1)', value: `${stats.totalHours}u`, label: 'Uren' },
                        { icon: 'fa-list-check', color: '#16a34a', bg: 'rgba(34,197,94,0.1)', value: stats.totalTasks, label: 'Taken' },
                        { icon: 'fa-users', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', value: allUsers.length, label: 'Pers.' },
                    ].map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 10px 4px 6px' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', flexShrink: 0 }}>
                                <i className={`fa-solid ${s.icon}`} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.1 }}>{s.value}</div>
                                <div style={{ fontSize: '0.55rem', color: '#94a3b8', lineHeight: 1 }}>{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Opslaan + Nieuw Project knoppen */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                        onClick={() => { localStorage.setItem('schildersapp_projecten', JSON.stringify(projects)); }}
                        style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '9px 16px', color: '#475569', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}>
                        <i className="fa-solid fa-floppy-disk" />
                        Opslaan
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowNewForm(!showNewForm)}
                        style={{ background: 'var(--accent)', border: 'none', borderRadius: '10px', padding: '9px 18px', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className={`fa-solid ${showNewForm ? 'fa-xmark' : 'fa-plus'}`} />
                        {showNewForm ? 'Annuleer' : 'Nieuw Project'}
                    </button>
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

            {/* ===== NAVIGATIEBALK: Tabs + Zoek + Filter ===== */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '4px 8px', flexWrap: 'wrap' }}>
                {/* Tabs */}
                {[
                    { id: 'project', icon: 'fa-diagram-project', label: 'Projectplanning' },
                    { id: 'personeel', icon: 'fa-users', label: 'Personeelsplanning' },
                    { id: 'jaar', icon: 'fa-calendar', label: 'Jaarplanning' },
                    { id: 'mappen', icon: 'fa-folder-open', label: 'Projectmappen' },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 11px', borderRadius: '7px', border: 'none', background: tab === t.id ? 'var(--accent)' : 'transparent', color: tab === t.id ? '#fff' : '#64748b', fontWeight: tab === t.id ? 700 : 500, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => { if (tab !== t.id) e.currentTarget.style.background = '#f1f5f9'; }}
                        onMouseLeave={e => { if (tab !== t.id) e.currentTarget.style.background = 'transparent'; }}>
                        <i className={`fa-solid ${t.icon}`} style={{ fontSize: '0.7rem' }} />
                        {t.label}
                    </button>
                ))}

                {/* Scheidingslijn */}
                <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 4px', flexShrink: 0 }} />

                {/* Zoekbalk */}
                <div style={{ position: 'relative', flex: 1, minWidth: '140px' }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.72rem', pointerEvents: 'none' }} />
                    <input value={zoekTerm} onChange={e => setZoekTerm(e.target.value)}
                        placeholder="Zoeken..."
                        style={{ width: '100%', padding: '5px 26px 5px 26px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '0.78rem', background: '#f8fafc', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
                    {zoekTerm && (
                        <button onClick={() => setZoekTerm('')} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.8rem', padding: '1px' }}>
                            <i className="fa-solid fa-xmark" />
                        </button>
                    )}
                </div>

                {/* Status filter */}
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    style={{ padding: '5px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '0.75rem', background: '#f8fafc', color: '#1e293b', fontWeight: 600, cursor: 'pointer' }}>
                    <option value="alle">Alle statussen</option>
                    <option value="active">Actief</option>
                    <option value="planning">In planning</option>
                    <option value="completed">Afgerond</option>
                </select>

                {(zoekTerm || filterStatus !== 'alle') && (
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {filteredProjects.length}/{projects.length}
                    </span>
                )}
            </div>

            {/* ===== TAB 1: PROJECT PLANNING (GANTT) ===== */}
            {tab === 'project' && (
                <div>
                    {/* Compacte toolbar: navigatie + view-knoppen + zoom */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ display: 'flex', gap: '2px' }}>
                                <button onClick={() => navigate(-1)} title="Vorige" style={{ border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '6px 2px 2px 6px', padding: '4px 8px', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>
                                    <i className="fa-solid fa-angles-left" style={{ fontSize: '0.65rem' }} />
                                </button>
                                <button onClick={() => navigateWeek(-1)} title="1 week terug" style={{ border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '2px 6px 6px 2px', padding: '4px 8px', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>
                                    <i className="fa-solid fa-angle-left" style={{ fontSize: '0.72rem' }} />
                                </button>
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b', minWidth: '140px', textAlign: 'center' }}>
                                {(() => {
                                    if (viewMode === '1m') return `${MONTHS_FULL[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
                                    if (viewMode === '8w') {
                                        const end = new Date(currentDate); end.setDate(end.getDate() + 56);
                                        return `${MONTHS_FULL[currentDate.getMonth()]} — ${MONTHS_FULL[end.getMonth()]} ${currentDate.getFullYear()}`;
                                    }
                                    // weeks
                                    return `Week ${getWeekNumber(currentDate)} ${viewMode === '2w' ? '— ' + getWeekNumber(addDays(currentDate, 7)) : ''}`;
                                })()}
                            </span>
                            <div style={{ display: 'flex', gap: '2px' }}>
                                <button onClick={() => navigateWeek(1)} title="1 week vooruit" style={{ border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '6px 2px 2px 6px', padding: '4px 8px', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>
                                    <i className="fa-solid fa-angle-right" style={{ fontSize: '0.72rem' }} />
                                </button>
                                <button onClick={() => navigate(1)} title="Volgende" style={{ border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '2px 6px 6px 2px', padding: '4px 8px', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>
                                    <i className="fa-solid fa-angles-right" style={{ fontSize: '0.65rem' }} />
                                </button>
                            </div>
                            <button onClick={() => setCurrentDate(new Date())} style={{ border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '6px', padding: '4px 9px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginLeft: '2px' }}>Vandaag</button>
                        </div>

                        {/* View Mode Knoppen (1w, 2w, 1m, 8w) */}
                        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '7px', padding: '2px', gap: '2px' }}>
                            {[
                                ['1w', '1 Week'],
                                ['2w', '2 Weken'],
                                ['1m', 'Maand'],
                                ['8w', '8 Weken']
                            ].map(([v, lbl]) => (
                                <button key={v} onClick={() => setViewMode(v)}
                                    style={{ padding: '3px 10px', borderRadius: '5px', border: 'none', background: (viewMode === v || (viewMode === 'month' && v === '8w') || (viewMode === 'week' && v === '2w')) ? '#fff' : 'transparent', color: (viewMode === v || (viewMode === 'month' && v === '8w') || (viewMode === 'week' && v === '2w')) ? '#F5850A' : '#64748b', fontWeight: (viewMode === v || (viewMode === 'month' && v === '8w') || (viewMode === 'week' && v === '2w')) ? 700 : 600, fontSize: '0.68rem', cursor: 'pointer', boxShadow: (viewMode === v || (viewMode === 'month' && v === '8w') || (viewMode === 'week' && v === '2w')) ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                                    {lbl}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {/* Gantt / Grid toggle */}
                            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '7px', padding: '2px', gap: '2px' }}>
                                {[['gantt', 'fa-chart-gantt', 'Gantt'], ['grid', 'fa-grid-2', 'Grid']].map(([v, icon, lbl]) => (
                                    <button key={v} onClick={() => setPlanningView(v)}
                                        style={{ padding: '3px 10px', borderRadius: '5px', border: 'none', background: planningView === v ? '#fff' : 'transparent', color: planningView === v ? '#1e293b' : '#94a3b8', fontWeight: planningView === v ? 700 : 500, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: planningView === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                                        <i className={`fa-solid ${icon}`} style={{ fontSize: '0.65rem' }} />{lbl}
                                    </button>
                                ))}
                            </div>
                            {/* Zoom */}
                            {planningView === 'gantt' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#f1f5f9', borderRadius: '7px', padding: '2px 4px' }}>
                                    <button onClick={() => setZoomLevel(z => Math.max(16, z - 4))}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '3px 6px', fontSize: '0.8rem', color: '#64748b', borderRadius: '4px' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                        <i className="fa-solid fa-magnifying-glass-minus" />
                                    </button>
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, minWidth: '28px', textAlign: 'center' }}>{Math.round(zoomLevel / 32 * 100)}%</span>
                                    <button onClick={() => setZoomLevel(z => Math.min(64, z + 4))}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '3px 6px', fontSize: '0.8rem', color: '#64748b', borderRadius: '4px' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                        <i className="fa-solid fa-magnifying-glass-plus" />
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
                                        <div className="gantt-team-col header">&nbsp;</div>
                                        {yearSpans.map((s, i) => (
                                            <div key={i} className="gantt-header-span year-span" style={{ flex: s.days, minWidth: s.days * cellW }}>{s.year}</div>
                                        ))}
                                    </div>
                                    {/* Month row */}
                                    <div className="gantt-header-row month-row">
                                        <div className="gantt-header-label">&nbsp;</div>
                                        <div className="gantt-team-col header">&nbsp;</div>
                                        {monthSpans.map((s, i) => (
                                            <div key={i} className="gantt-header-span month-span" style={{ flex: s.days, minWidth: s.days * cellW, cursor: 'pointer' }}
                                                onClick={() => { setViewMode('1m'); setCurrentDate(new Date(s.year, s.month, 1)); }}
                                                title={`Ga naar ${MONTHS_FULL[s.month]} ${s.year}`}>{MONTHS_FULL[s.month]}</div>
                                        ))}
                                    </div>
                                    {/* Week number row */}
                                    <div className="gantt-header-row week-row">
                                        <div className="gantt-header-label" style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Week</div>
                                        <div className="gantt-team-col header">&nbsp;</div>
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
                                                    onClick={() => { setViewMode('1w'); setCurrentDate(new Date(s.startDate)); }}
                                                    title={`Ga naar week ${s.week}`}>
                                                    {s.days >= 3 ? `W${s.week}` : `${s.week}`}
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                    {/* Day row */}
                                    <div className="gantt-header-row day-row">
                                        <div className="gantt-header-label" style={{ fontWeight: 700, fontSize: '0.7rem' }}>Project / Taak</div>
                                        <div className="gantt-team-col header">Team</div>
                                        {timelineDates.map((d, i) => {
                                            const dateStr = formatDate(d);
                                            return (
                                                <div key={i} className={`gantt-header-cell ${isWeekend(d) ? 'weekend' : ''} ${formatDate(today) === dateStr ? 'today' : ''}`}
                                                    title={`${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => { setViewMode('1w'); setCurrentDate(new Date(d)); }}>
                                                    <div style={{ fontSize: '0.52rem', color: 'inherit', lineHeight: 1, marginBottom: '1px', opacity: 0.75 }}>{DAYS_NL[d.getDay()]}</div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</div>
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
                                        data-draw-project={p.id}
                                        style={{ cursor: 'pointer', background: selectedProject?.id === p.id ? 'rgba(250,160,82,0.04)' : undefined }}>
                                        <div className="gantt-row-label">
                                            <i className={expandedProjects.has(p.id) ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-right"}
                                                style={{ fontSize: '0.55rem', color: '#94a3b8', width: '14px', textAlign: 'center', flexShrink: 0 }}></i>
                                            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {(() => {
                                                    const pActiveTasks = (p.tasks || []).filter(t => !t.completed);
                                                    const hasUnassigned = pActiveTasks.length > 0 && pActiveTasks.some(t => (t.assignedTo || []).length === 0);
                                                    return hasUnassigned && <i className="fa-solid fa-circle-exclamation" style={{ color: '#ef4444', fontSize: '0.65rem' }} title="Niet alle actieve taken hebben personeel toegewezen"></i>;
                                                })()}
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
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0, justifyContent: 'center' }}>
                                                <input type="date" value={p.startDate}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                        if (!e.target.value) return;
                                                        setProjects(prev => prev.map(pr => pr.id !== p.id ? pr : { ...pr, startDate: e.target.value }));
                                                        setSelectedProject(prev => prev?.id === p.id ? { ...prev, startDate: e.target.value } : prev);
                                                    }}
                                                    style={{ width: '90px', fontSize: '0.6rem', padding: '1px 3px', border: '1px solid #10b981', borderRadius: '4px', background: '#d1fae5', color: '#065f46', fontWeight: 600, cursor: 'pointer', outline: 'none' }} />
                                                <input type="date" value={p.endDate}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                        if (!e.target.value) return;
                                                        setProjects(prev => prev.map(pr => pr.id !== p.id ? pr : { ...pr, endDate: e.target.value }));
                                                        setSelectedProject(prev => prev?.id === p.id ? { ...prev, endDate: e.target.value } : prev);
                                                    }}
                                                    style={{ width: '90px', fontSize: '0.6rem', padding: '1px 3px', border: '1px solid #f43f5e', borderRadius: '4px', background: '#ffe4e6', color: '#9f1239', fontWeight: 600, cursor: 'pointer', outline: 'none' }} />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', minWidth: '26px' }}>
                                                <span style={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 600, textAlign: 'right', width: '100%' }} title="Werkdagen">{diffWorkdays(parseDate(p.startDate), parseDate(p.endDate))}d</span>
                                            </div>
                                        </div>
                                        {/* ===== TEAM KOLOM (project = alle taak-medewerkers) ===== */}
                                        {(() => {
                                            const taskWorkerIds = [...new Set((p.tasks || []).filter(t => !t.completed).flatMap(t => t.assignedTo || []))];
                                            const workers = taskWorkerIds.map(id => allUsers.find(u => u.id === id)).filter(Boolean);
                                            const hasWorkers = workers.length > 0;
                                            return (
                                                <div className="gantt-team-col" style={{ background: hasWorkers ? '#f8fafc' : '#fef2f2', borderLeft: hasWorkers ? '1px solid #e2e8f0' : '2px solid #fecaca' }}>
                                                    <div
                                                        title={hasWorkers ? workers.map(u => u.name).join(', ') + ' — klik om projectpersoneel te beheren' : 'Niemand ingepland op project — klik om toe te voegen'}
                                                        onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setTeamPopup({ projectId: p.id, taskId: null, x: r.left, y: r.bottom }); }}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '4px',
                                                            height: '18px', padding: '0 6px', borderRadius: '8px',
                                                            cursor: 'pointer', transition: 'all 0.15s',
                                                            background: hasWorkers ? p.color + '22' : 'rgba(239,68,68,0.1)',
                                                            border: `1px solid ${hasWorkers ? p.color + '55' : '#ef444466'}`,
                                                            color: hasWorkers ? p.color : '#ef4444',
                                                            pointerEvents: 'auto',
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = hasWorkers ? p.color + '40' : 'rgba(239,68,68,0.2)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = hasWorkers ? p.color + '22' : 'rgba(239,68,68,0.1)'; }}
                                                    >
                                                        <i className={`fa-solid fa-${hasWorkers ? 'users' : 'user-plus'}`} style={{ fontSize: '0.48rem' }} />
                                                        {hasWorkers && <span style={{ fontSize: '0.55rem', fontWeight: 700 }}>{workers.length}</span>}
                                                        {!hasWorkers && <span style={{ fontSize: '0.48rem', fontWeight: 700, textTransform: 'uppercase' }}>Geen</span>}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        <div className="gantt-row-timeline">
                                            {timelineDates.map((d, i) => (
                                                <div key={i}
                                                    className={`gantt-cell ${isWeekend(d) ? 'weekend' : ''} ${formatDate(today) === formatDate(d) ? 'today' : ''} ${isHoliday(d) ? 'holiday' : ''}`}
                                                    style={{ pointerEvents: 'auto', cursor: isWeekend(d) ? 'default' : 'crosshair' }}
                                                    onMouseDown={isWeekend(d) ? undefined : (e) => {
                                                        if (e.button !== 0) return;
                                                        // Only start draw if clicking on the cell itself, not on a bar
                                                        if (e.target.closest('.gantt-bar') || e.target.closest('.resize-handle')) return;
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        const dateStr = formatDate(d);
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const dc = { projectId: p.id, startDate: dateStr, currentDate: dateStr, startX: rect.left, currentX: rect.right, y: rect.top };
                                                        drawCreateRef.current = dc;
                                                        setDrawCreate({ ...dc });
                                                        // Expand project so user sees tasks
                                                        setExpandedProjects(prev => new Set([...prev, p.id]));

                                                        const onMove = (me) => {
                                                            // Find which date the mouse is over
                                                            const timelineEls = document.querySelectorAll(`[data-draw-project="${p.id}"] .gantt-cell`);
                                                            let hovDate = null;
                                                            let hovX = me.clientX;
                                                            timelineEls.forEach((el, idx) => {
                                                                const r = el.getBoundingClientRect();
                                                                if (me.clientX >= r.left && me.clientX <= r.right) {
                                                                    hovDate = formatDate(timelineDates[idx]);
                                                                    hovX = r.right;
                                                                }
                                                            });
                                                            if (hovDate && drawCreateRef.current) {
                                                                const updated = { ...drawCreateRef.current, currentDate: hovDate, currentX: hovX };
                                                                drawCreateRef.current = updated;
                                                                setDrawCreate({ ...updated });
                                                            }
                                                        };
                                                        const onUp = (ue) => {
                                                            document.removeEventListener('mousemove', onMove, true);
                                                            document.removeEventListener('mouseup', onUp, true);
                                                            const dc2 = drawCreateRef.current;
                                                            setDrawCreate(null);
                                                            drawCreateRef.current = null;
                                                            if (!dc2) return;
                                                            const s = dc2.startDate <= dc2.currentDate ? dc2.startDate : dc2.currentDate;
                                                            const eDate = dc2.startDate <= dc2.currentDate ? dc2.currentDate : dc2.startDate;
                                                            setQuickTaskPopup({ projectId: dc2.projectId, startDate: s, endDate: eDate, x: ue.clientX, y: ue.clientY });
                                                            setQuickTaskName('');
                                                        };
                                                        document.addEventListener('mousemove', onMove, true);
                                                        document.addEventListener('mouseup', onUp, true);
                                                    }}
                                                ></div>
                                            ))}
                                            {/* Project bar — schoon zonder avatars */}
                                            {(() => {
                                                const segs = getBarSegments(p.startDate, p.endDate, p.color);
                                                if (!segs.length) return null;
                                                return (
                                                    <React.Fragment key={p.id}>
                                                        {segs.map((segStyle, si) => (
                                                            <div key={si} className="gantt-bar" data-project-id={p.id} data-task-id={null}
                                                                style={{
                                                                    ...segStyle,
                                                                    cursor: 'grab',
                                                                    borderRadius: si === 0 && segs.length === 1 ? '6px' : si === 0 ? '6px 0 0 6px' : si === segs.length - 1 ? '0 6px 6px 0' : '0',
                                                                }}>
                                                                {si === 0 && <div className="resize-handle resize-handle-left"></div>}
                                                                {si === segs.length - 1 && <div className="resize-handle resize-handle-right"></div>}
                                                            </div>
                                                        ))}
                                                        <div style={{
                                                            position: 'absolute', left: segs[0].left, top: '4px', height: '22px',
                                                            width: `calc(${segs[segs.length - 1].left} + ${segs[segs.length - 1].width} - ${segs[0].left})`,
                                                            pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '5px', paddingLeft: '6px', paddingRight: '6px', zIndex: 3, overflow: 'visible'
                                                        }}>
                                                            <span style={{ position: 'sticky', left: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#fff', fontWeight: 500, flexShrink: 1, minWidth: 0, textShadow: '0px 0px 3px rgba(0,0,0,0.6)' }}>
                                                                {p.name}
                                                            </span>
                                                        </div>
                                                    </React.Fragment>
                                                );
                                            })()}
                                            {/* Weekend overlays removed */}
                                        </div>
                                    </div>
                                    {/* Inline task rows when expanded — ALLEEN ACTIEVE taken */}
                                    {expandedProjects.has(p.id) && p.tasks.filter(t => !t.completed).map(t => {
                                        const noTeam = (t.assignedTo || []).length === 0;
                                        return (
                                        <div key={t.id} className="gantt-row" onClick={() => onTaskRowClick(p.id, t.id)}
                                            style={{
                                                background: selectedTask?.taskId === t.id ? 'rgba(245,133,10,0.06)' : '#fff',
                                                cursor: 'pointer',
                                                boxShadow: selectedTask?.taskId === t.id ? 'inset 3px 0 0 var(--accent)' : 'none',
                                                borderBottom: '1px solid #f1f5f9',
                                            }}>
                                            <div className="gantt-row-label" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '2px', padding: '5px 8px 5px 32px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <input type="checkbox" checked={false} onChange={() => toggleTask(p.id, t.id)}
                                                        style={{ width: '13px', height: '13px', accentColor: '#F5850A', cursor: 'pointer', flexShrink: 0 }} />
                                                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // Markeer de taak als geselecteerd (toggle)
                                                                setSelectedTaskId(prev => prev === t.id ? null : t.id);

                                                                const scrollToBar = () => {
                                                                    const bar = document.querySelector(`.gantt-bar[data-project-id="${p.id}"][data-task-id="${t.id}"]`);
                                                                    if (bar) {
                                                                        bar.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                                                                        // requestAnimationFrame: wacht tot React de DOM heeft bijgewerkt (isSelected boxShadow is al gezet)
                                                                        requestAnimationFrame(() => {
                                                                            const selectedBox = bar.style.boxShadow; // React heeft dit al ingesteld
                                                                            bar.style.boxShadow = `0 0 0 3px #F5850A, 0 0 16px #F5850A88`;
                                                                            bar.style.transition = 'box-shadow 0.3s';
                                                                            setTimeout(() => {
                                                                                bar.style.boxShadow = selectedBox || '0 0 0 2.5px #F5850A, 0 0 12px #F5850A66';
                                                                                bar.style.transition = '';
                                                                            }, 1800);
                                                                        });
                                                                        return true;
                                                                    }
                                                                    return false;
                                                                };

                                                                // Probeer direct te scrollen (balk al zichtbaar)
                                                                const found = scrollToBar();
                                                                if (!found && t.startDate) {
                                                                    // Balk staat buiten het venster → navigeer naar de juiste maand, dan scrollen
                                                                    setCurrentDate(parseDate(t.startDate));
                                                                    setTimeout(scrollToBar, 150);
                                                                }
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
                                                            }}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
                                                            style={{ fontWeight: selectedTaskId === t.id ? 700 : 600, fontSize: '0.76rem', color: selectedTaskId === t.id ? '#F5850A' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', outline: 'none', cursor: 'pointer', textDecoration: selectedTaskId === t.id ? 'underline' : 'none', textUnderlineOffset: '2px' }}
                                                        >{t.name}</div>
                                                    </div>

                                                    {/* Actie-knoppen: omhoog, omlaag, kopieer, notitie, verwijder */}
                                                    {[
                                                        { icon: 'fa-chevron-up',   title: 'Omhoog',     color: '#94a3b8', hoverColor: '#3b82f6', action: e => { e.stopPropagation(); moveTaskUp(p.id, t.id); } },
                                                        { icon: 'fa-chevron-down', title: 'Omlaag',     color: '#94a3b8', hoverColor: '#3b82f6', action: e => { e.stopPropagation(); moveTaskDown(p.id, t.id); } },
                                                        { icon: 'fa-copy',         title: 'Kopiëren',   color: '#94a3b8', hoverColor: '#8b5cf6', action: e => { e.stopPropagation(); duplicateTask(p.id, t.id); } },
                                                    ].map((btn, i) => (
                                                        <button key={i} onClick={btn.action} title={btn.title}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', borderRadius: '3px', color: btn.color, flexShrink: 0, fontSize: '0.65rem', transition: 'color 0.15s' }}
                                                            onMouseEnter={e => e.currentTarget.style.color = btn.hoverColor}
                                                            onMouseLeave={e => e.currentTarget.style.color = btn.color}>
                                                            <i className={`fa-solid ${btn.icon}`} />
                                                        </button>
                                                    ))}
                                                    {/* Notitie-knop */}
                                                    <button onClick={e => { e.stopPropagation(); setNotePopup({ projectId: p.id, taskId: t.id }); setNoteInput(''); setNoteTab('nieuw'); }}
                                                        title={`Notities (${(t.notes || []).length})`}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', borderRadius: '3px', color: (t.notes || []).length > 0 ? '#f59e0b' : '#cbd5e1', flexShrink: 0, fontSize: '0.7rem', position: 'relative', transition: 'color 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = '#f59e0b'}
                                                        onMouseLeave={e => e.currentTarget.style.color = (t.notes || []).length > 0 ? '#f59e0b' : '#cbd5e1'}>
                                                        <i className="fa-solid fa-note-sticky" />
                                                        {(t.notes || []).length > 0 && (
                                                            <span style={{ position: 'absolute', top: '-3px', right: '-3px', background: '#f59e0b', color: '#fff', borderRadius: '50%', fontSize: '0.38rem', width: '10px', height: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}>
                                                                {(t.notes || []).length}
                                                            </span>
                                                        )}
                                                    </button>
                                                    {/* Verwijder-knop */}
                                                    <button onClick={(e) => { e.stopPropagation(); deleteTask(p.id, t.id); }}
                                                        title="Taak verwijderen"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', flexShrink: 0, borderRadius: '3px', color: '#cbd5e1', fontSize: '0.7rem', transition: 'color 0.15s' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                                        onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}>
                                                        <i className="fa-solid fa-xmark" />
                                                    </button>

                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', paddingLeft: '19px' }}>
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
                                                        style={{ width: '88px', fontSize: '0.58rem', padding: '1px 2px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', color: '#475569', cursor: 'pointer', outline: 'none' }} />
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
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', background: p.color, borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                                                <button onClick={(e) => { e.stopPropagation(); changeDays(currentDays - 1); }}
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
                                                                <button onClick={(e) => { e.stopPropagation(); changeDays(currentDays + 1); }}
                                                                    style={{ background: 'rgba(0,0,0,0.15)', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px', fontSize: '0.6rem', fontWeight: 700, lineHeight: '16px' }}>+</button>
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
                                                        style={{ width: '88px', fontSize: '0.58rem', padding: '1px 2px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', color: '#475569', cursor: 'pointer', outline: 'none' }} />
                                                </div>
                                            </div>
                                            {/* ===== TEAM KOLOM (taak) ===== */}
                                            {(() => {
                                                const taskWorkers = (t.assignedTo || []).map(uid => allUsers.find(u => u.id === uid)).filter(Boolean);
                                                const hasWorkers = taskWorkers.length > 0;
                                                return (
                                                    <div className="gantt-team-col" style={{ background: hasWorkers ? '#f8fafc' : '#fef2f2', borderLeft: hasWorkers ? '1px solid #e2e8f0' : '2px solid #fecaca' }}>
                                                        <div
                                                            title={hasWorkers ? taskWorkers.map(u => u.name).join(', ') + ' — klik om te beheren' : 'Niemand ingepland op taak — klik om toe te voegen'}
                                                            onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setTeamPopup({ projectId: p.id, taskId: t.id, x: r.left, y: r.bottom }); }}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                                height: '18px', padding: '0 6px', borderRadius: '8px',
                                                                cursor: 'pointer', transition: 'all 0.15s',
                                                                background: hasWorkers ? p.color + '22' : 'rgba(239,68,68,0.1)',
                                                                border: `1px solid ${hasWorkers ? p.color + '55' : '#ef444466'}`,
                                                                color: hasWorkers ? p.color : '#ef4444',
                                                                pointerEvents: 'auto',
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = hasWorkers ? p.color + '40' : 'rgba(239,68,68,0.2)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = hasWorkers ? p.color + '22' : 'rgba(239,68,68,0.1)'; }}
                                                        >
                                                            <i className={`fa-solid fa-${hasWorkers ? 'users' : 'user-plus'}`} style={{ fontSize: '0.48rem' }} />
                                                            {hasWorkers && <span style={{ fontSize: '0.55rem', fontWeight: 700 }}>{taskWorkers.length}</span>}
                                                            {!hasWorkers && <span style={{ fontSize: '0.48rem', fontWeight: 700, textTransform: 'uppercase' }}>Geen</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
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
                                                                {/* Bovenste zone: ruimte voor de zwevende gantt-balk */}
                                                                <div style={{ height: '26px', flexShrink: 0 }} />
                                                                {/* Onderste zone: persoons-chips */}
                                                                <div style={{
                                                                    height: '24px', display: 'flex', alignItems: 'center',
                                                                    gap: '1px', padding: '0 2px', overflow: 'hidden',
                                                                    background: weekend ? 'transparent'
                                                                        : holiday ? 'rgba(245,133,10,0.05)'
                                                                        : inRange ? 'rgba(0,0,0,0.02)'
                                                                        : 'rgba(0,0,0,0.018)',
                                                                    borderTop: holiday ? '1px solid rgba(245,133,10,0.15)'
                                                                        : inRange && !weekend ? `1px solid ${p.color}22`
                                                                        : '1px solid rgba(0,0,0,0.04)',
                                                                }}>
                                                                    {!weekend && !holiday && inRange && (
                                                                        <div
                                                                            title={dayAssigned.length > 0
                                                                                ? dayAssigned.map(u => u.name).join(', ') + ' — klik om te beheren'
                                                                                : 'Niemand ingepland — klik om toe te voegen'}
                                                                            onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setTeamPopup({ projectId: p.id, taskId: t.id, dateStr: ds, x: r.left, y: r.bottom + 4 }); }}
                                                                            style={{
                                                                                display: 'flex', alignItems: 'center', gap: '2px',
                                                                                height: '16px', padding: '0 5px', borderRadius: '8px',
                                                                                cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                                                                                background: dayAssigned.length > 0 ? p.color + '22' : 'rgba(239,68,68,0.1)',
                                                                                border: `1px solid ${dayAssigned.length > 0 ? p.color + '55' : '#ef444466'}`,
                                                                                color: dayAssigned.length > 0 ? p.color : '#ef4444',
                                                                                pointerEvents: 'auto',  /* ← overschrijf .gantt-cell { pointer-events: none } */
                                                                            }}
                                                                            onMouseEnter={e => { e.currentTarget.style.background = dayAssigned.length > 0 ? p.color + '40' : 'rgba(239,68,68,0.2)'; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.background = dayAssigned.length > 0 ? p.color + '22' : 'rgba(239,68,68,0.1)'; }}
                                                                        >
                                                                            <i className={`fa-solid fa-${dayAssigned.length > 0 ? 'users' : 'user-plus'}`} style={{ fontSize: '0.42rem' }} />
                                                                            {dayAssigned.length > 0 && <span style={{ fontSize: '0.42rem', fontWeight: 700 }}>{dayAssigned.length}</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {/* Task bar — zweeft over de bovenste zone */}
                                                    {(() => {
                                                        const noTeam = (t.assignedTo || []).length === 0;
                                                        const barColor = noTeam ? 'repeating-linear-gradient(45deg, #ef444455, #ef444455 4px, #ef444422 4px, #ef444422 8px)' : p.color + 'bb';
                                                        const segs = getBarSegments(t.startDate, t.endDate, barColor);
                                                        const isSelected = selectedTaskId === t.id;
                                                        const hasNotes = (t.notes || []).length > 0;
                                                        if (!segs.length) return null;
                                                        return (
                                                            <React.Fragment key={t.id}>
                                                                {segs.map((segStyle, si) => (
                                                                    <div key={si} className="gantt-bar" data-project-id={p.id} data-task-id={t.id}
                                                                        style={{
                                                                            ...segStyle,
                                                                            display: 'flex', alignItems: 'center',
                                                                            height: '18px', top: '4px', fontSize: '0.58rem',
                                                                            opacity: t.completed ? 0.4 : 1, cursor: 'grab',
                                                                            borderRadius: si === 0 && segs.length === 1 ? '5px' : si === 0 ? '5px 0 0 5px' : si === segs.length - 1 ? '0 5px 5px 0' : '0',
                                                                            border: noTeam ? '1.5px dashed #ef4444' : '1px solid rgba(0,0,0,0.08)',
                                                                            boxSizing: noTeam ? 'border-box' : undefined,
                                                                            boxShadow: noTeam ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
                                                                            ...(isSelected && !noTeam && {
                                                                                boxShadow: `0 0 0 2.5px #F5850A, 0 0 12px #F5850A66`,
                                                                                filter: 'brightness(1.15)',
                                                                            }),
                                                                        }}>
                                                                        {si === 0 && <div className="resize-handle resize-handle-left" />}
                                                                        {si === segs.length - 1 && <div className="resize-handle resize-handle-right" />}
                                                                    </div>
                                                                ))}
                                                                <div style={{
                                                                    position: 'absolute', left: segs[0].left, top: '4px', height: '18px',
                                                                    width: `calc(${segs[segs.length - 1].left} + ${segs[segs.length - 1].width} - ${segs[0].left})`,
                                                                    pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '4px', paddingRight: '4px', minWidth: 0, overflow: 'visible', zIndex: 3
                                                                }}>
                                                                <div style={{ position: 'sticky', left: '4px', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                                                                    {noTeam && <i className="fa-solid fa-user-slash" style={{ fontSize: '0.5rem', flexShrink: 0, color: '#ef4444' }} />}
                                                                    <div style={{ color: noTeam ? '#ef4444' : '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0, textShadow: '0px 0px 3px rgba(0,0,0,0.6)' }}>{t.name}</div>
                                                                    <div style={{ color: noTeam ? '#ef4444' : 'rgba(255,255,255,0.95)', fontSize: '0.55rem', fontWeight: 700, paddingLeft: '2px', flexShrink: 0, whiteSpace: 'nowrap', textShadow: '0px 0px 3px rgba(0,0,0,0.8)' }}>
                                                                        ({diffWorkdays(parseDate(t.startDate), parseDate(t.endDate))}d)
                                                                    </div>
                                                                    {hasNotes && (
                                                                        <span
                                                                            onClick={e => { e.stopPropagation(); setNotePopup({ projectId: p.id, taskId: t.id }); setNoteInput(''); setNoteTab('nieuw'); }}
                                                                            onMouseEnter={e => { const rect = e.currentTarget.getBoundingClientRect(); setNoteTooltip({ notes: t.notes, x: rect.left, y: rect.bottom + 6, taskName: t.name }); }}
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

                                    {/* Inline new task row - only when expanded */}
                                    {expandedProjects.has(p.id) && (
                                        <div className="gantt-row" style={{ background: '#fff8f0', borderTop: '1px dashed #fed7aa' }}>
                                            <div className="gantt-row-label" style={{ paddingLeft: '36px' }}>
                                                <i className="fa-solid fa-plus" style={{ fontSize: '0.55rem', color: '#F5850A', width: '14px', flexShrink: 0 }}></i>
                                                <input type="text" placeholder="+ Nieuwe taak toevoegen..."
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
                                                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.68rem', color: '#F5850A', padding: '2px 4px', fontStyle: 'italic', fontWeight: 500 }}
                                                    onFocus={e => e.currentTarget.parentElement.parentElement.style.background = '#fff3e0'}
                                                    onBlur={e => e.currentTarget.parentElement.parentElement.style.background = '#fff8f0'}
                                                />
                                            </div>
                                            {/* Lege team-kolom voor uitlijning */}
                                            <div className="gantt-team-col" style={{ background: '#fff8f0' }}></div>
                                            <div className="gantt-row-timeline">
                                                {timelineDates.map((d, i) => (
                                                    <div key={i} className={`gantt-cell ${isWeekend(d) ? 'weekend' : ''} ${formatDate(today) === formatDate(d) ? 'today' : ''}`}></div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ===== VOLTOOIDE TAKEN PER PROJECT ===== */}
                                    {expandedProjects.has(p.id) && p.tasks.some(t => t.completed) && (
                                        <>
                                            {/* Scheidingslijn + toggle knop */}
                                            <div
                                                onClick={e => { e.stopPropagation(); setShowCompletedProjects(prev => { const s = new Set(prev); s.has(p.id) ? s.delete(p.id) : s.add(p.id); return s; }); }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 16px', cursor: 'pointer', background: '#f8fafc', borderTop: '1px solid #e2e8f0', userSelect: 'none' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
                                                <i className={`fa-solid ${showCompletedProjects.has(p.id) ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{ fontSize: '0.48rem', color: '#10b981' }} />
                                                <i className="fa-solid fa-circle-check" style={{ color: '#10b981', fontSize: '0.68rem' }} />
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', flex: 1 }}>
                                                    Voltooide taken ({p.tasks.filter(t => t.completed).length})
                                                </span>
                                                <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>
                                                    {showCompletedProjects.has(p.id) ? 'Verbergen' : 'Tonen'}
                                                </span>
                                            </div>

                                            {/* Voltooide taak rijen */}
                                            {showCompletedProjects.has(p.id) && p.tasks.filter(t => t.completed).map(t => (
                                                <div key={t.id} className="gantt-row"
                                                    style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9', opacity: 0.75 }}>
                                                    <div className="gantt-row-label" style={{ paddingLeft: '36px', flexDirection: 'column', alignItems: 'stretch', gap: '1px', padding: '4px 10px 4px 36px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <input type="checkbox" checked={true} onChange={() => toggleTask(p.id, t.id)}
                                                                style={{ width: '13px', height: '13px', accentColor: '#10b981', cursor: 'pointer', flexShrink: 0 }} />
                                                            <div style={{ flex: 1, fontWeight: 500, fontSize: '0.74rem', color: '#94a3b8', textDecoration: 'line-through', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {t.name}
                                                            </div>
                                                            <i className="fa-solid fa-circle-check" style={{ color: '#10b981', fontSize: '0.65rem', flexShrink: 0 }} />
                                                            <button onClick={e => { e.stopPropagation(); deleteTask(p.id, t.id); }}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', borderRadius: '3px', color: '#cbd5e1', flexShrink: 0, fontSize: '0.7rem', transition: 'color 0.15s' }}
                                                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                                onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                                                                <i className="fa-solid fa-xmark" />
                                                            </button>
                                                        </div>
                                                        <div style={{ fontSize: '0.57rem', color: '#94a3b8', paddingLeft: '20px' }}>
                                                            {t.startDate} → {t.endDate}
                                                        </div>
                                                    </div>
                                                    {/* Team kolom voltooide taak */}
                                                    <div className="gantt-team-col" style={{ background: '#f1f5f9', justifyContent: 'center' }}>
                                                        <i className="fa-solid fa-check" style={{ color: '#10b981', fontSize: '0.62rem' }} />
                                                    </div>
                                                    <div className="gantt-row-timeline">
                                                        {timelineDates.map((d, i) => (
                                                            <div key={i} className={`gantt-cell ${isWeekend(d) ? 'weekend' : ''}`} />
                                                        ))}
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
                                </React.Fragment>
                            ))}

                            {/* ===== BEZETTING / BESCHIKBAARHEID — één rij per medewerker ===== */}
                            {(() => {
                                const todayStr = formatDate(today);
                                const YEAR = today.getFullYear();

                                // Pre-laad feestdagen instellingen (van uren-pagina, user kan ze togglen)
                                let enabledHolidays = {};
                                try { enabledHolidays = JSON.parse(localStorage.getItem(`schildersapp_feestdagen_${YEAR}`)) || {}; } catch {}
                                // Als er geen instellingen zijn, zijn standaard ALLE feestdagen actief
                                const allUserIds = allUsers.map(u => u.id);

                                // Pre-laad vakantiedagen per gebruiker uit de uren/verlof pagina
                                // De uren pagina slaat op in: schildersapp_vakantie_2026 (huidig) of schildersapp_vakantie_2026_Naam_Achternaam
                                const vacDaysByUserId = {};
                                allUsers.forEach(u => {
                                    const namePart = u.name ? u.name.replace(/\s/g, '_') : '';
                                    let vacDays = [];
                                    // Probeer first met naamsleutel
                                    try { vacDays = JSON.parse(localStorage.getItem(`schildersapp_vakantie_${YEAR}_${namePart}`)) || []; } catch {}
                                    // Fallback: ook de algemene key zonder naam (voor de ingelogde gebruiker)
                                    if (vacDays.length === 0) {
                                        try { vacDays = JSON.parse(localStorage.getItem(`schildersapp_vakantie_${YEAR}`)) || []; } catch {}
                                    }
                                    if (vacDays.length > 0) {
                                        vacDaysByUserId[u.id] = new Set(vacDays);
                                    }
                                });

                                // Pre-bereken per dag welke userId's bezet zijn
                                const busyByDay = {};
                                const absentByDay = {};
                                timelineDates.forEach(d => {
                                    const ds = formatDate(d);
                                    busyByDay[ds] = new Set(
                                        projects.flatMap(proj =>
                                            (proj.tasks || [])
                                                .filter(t => !t.completed && ds >= t.startDate && ds <= t.endDate)
                                                .flatMap(t => {
                                                    // Dag-specifieke override heeft voorrang op assignedTo
                                                    if (t.assignedByDay && t.assignedByDay[ds] !== undefined) {
                                                        return t.assignedByDay[ds];
                                                    }
                                                    return t.assignedTo || [];
                                                })
                                        )
                                    );
                                    // Combineer: schilders-absences (projecten-tab) + schildersapp_vakantie (uren/verlof-tab)
                                    const absentSet = new Set(
                                        (workerAbsences || []).filter(a => ds >= a.startDate && ds <= a.endDate).map(a => a.userId)
                                    );
                                    // ★ Feestdagen: alle werknemers zijn automatisch afwezig
                                    const holidayName = HOLIDAYS_2026[ds];
                                    const holidayEnabled = holidayName
                                        ? (Object.keys(enabledHolidays).length === 0 ? true : enabledHolidays[ds] !== false)
                                        : false;
                                    if (holidayEnabled) {
                                        allUserIds.forEach(id => absentSet.add(id));
                                    }
                                    // Voeg vakantiedagen toe van de uren-pagina
                                    allUsers.forEach(u => {
                                        if (vacDaysByUserId[u.id]?.has(ds)) {
                                            absentSet.add(u.id);
                                        }
                                    });
                                    absentByDay[ds] = absentSet;
                                });
                                return (
                                    <div style={{ borderTop: '2px solid #F5850A', background: '#fffbf5' }}>
                                        {(() => {
                                            // Bereken direct gefilterde lijst
                                            const bzFilteredUsers = allUsers.filter(u => {
                                                if (u.role === 'Beheerder') return false; // standaard verbergen in bezetting
                                                if (bzFilter === 'iedereen') return true;

                                                let isBusy = false;
                                                let isAbsent = false;

                                                for (const d of timelineDates) {
                                                    if (isWeekend(d)) continue;
                                                    const ds = formatDate(d);
                                                    if (HOLIDAYS_2026[ds] && (Object.keys(enabledHolidays).length === 0 ? true : enabledHolidays[ds] !== false)) continue; // overslaan

                                                    if (absentByDay[ds]?.has(u.id)) isAbsent = true;
                                                    if (busyByDay[ds]?.has(u.id) && !absentByDay[ds]?.has(u.id)) isBusy = true;
                                                }

                                                if (bzFilter === 'ingepland') return isBusy;
                                                if (bzFilter === 'niet_ingepland') return !isBusy && !isAbsent;
                                                if (bzFilter === 'vakantie') return isAbsent;
                                                return true;
                                            });
                                            
                                            // Sorteer optioneel of bewaar volgorde
                                            
                                            return (
                                                <>
                                                    {/* Header-rij voor de bezettingssectie */}
                                                    <div style={{ display: 'flex', minWidth: 'max-content', background: 'linear-gradient(90deg,#fff7ed,#fffbf5)', borderBottom: '1px solid #fed7aa', position: 'sticky', top: 0, zIndex: 5 }}>
                                                        <div className="gantt-header-label" style={{ fontSize: '0.62rem', fontWeight: 700, color: '#F5850A', display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px' }}>
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
                                            <div className="gantt-team-col" style={{ background: 'transparent', fontSize: '0.48rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px', lineHeight: 1.2 }}>
                                                <span style={{ color: '#F5850A' }}>&#9679; bezet</span>
                                                <span style={{ color: '#22c55e' }}>&#9679; vrij</span>
                                                <span style={{ color: '#cbd5e1' }}>&#9679; afwezig</span>
                                            </div>
                                            <div className="gantt-row-timeline" style={{ background: 'transparent', minHeight: '26px' }}>
                                                {timelineDates.map((d, i) => {
                                                    const ds = formatDate(d);
                                                    if (isWeekend(d)) return <div key={i} className="gantt-cell weekend" style={{ minHeight: '26px' }} />;
                                                    const isHol = HOLIDAYS_2026[ds] && (Object.keys(enabledHolidays).length === 0 ? true : enabledHolidays[ds] !== false);
                                                    if (isHol) return <div key={i} className={`gantt-cell${ds === todayStr ? ' today' : ''}`} style={{ minHeight: '26px', background: 'rgba(245,133,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fa-solid fa-star" style={{ fontSize: '0.4rem', color: '#F5850A' }} /></div>;
                                                    const totalWorkers = allUsers.length;
                                                    const absentCount = [...(absentByDay[ds] || [])].length;
                                                    const busyCount = [...(busyByDay[ds] || [])].filter(id => !(absentByDay[ds] || new Set()).has(id)).length;
                                                    const freeCount = Math.max(0, totalWorkers - absentCount - busyCount);
                                                    const allBusy = freeCount === 0 && absentCount < totalWorkers;
                                                    const noneBusy = busyCount === 0 && absentCount < totalWorkers;
                                                    const badgeColor = allBusy ? '#16a34a' : noneBusy ? '#ef4444' : '#F5850A';
                                                    const isToday = ds === todayStr;
                                                    return (
                                                        <div key={i} className={`gantt-cell${isToday ? ' today' : ''}`}
                                                            style={{ minHeight: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            title={`${busyCount} bezet · ${freeCount} vrij · ${absentCount} afwezig`}
                                                        >
                                                            <div style={{
                                                                display: 'flex', alignItems: 'center', gap: '1px',
                                                                background: badgeColor + '18', border: `1px solid ${badgeColor}44`,
                                                                borderRadius: '6px', padding: '1px 4px',
                                                                pointerEvents: 'none',
                                                            }}>
                                                                <i className={`fa-solid fa-${allBusy ? 'circle-check' : noneBusy ? 'circle-xmark' : 'circle-half-stroke'}`}
                                                                    style={{ fontSize: '0.38rem', color: badgeColor }} />
                                                                {zoomLevel >= 22 && <span style={{ fontSize: '0.34rem', fontWeight: 700, color: badgeColor, marginLeft: '1px' }}>
                                                                    {busyCount}/{totalWorkers - absentCount}
                                                                </span>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {/* Eén rij per medewerker */}
                                        {bzFilteredUsers.length === 0 && (
                                            <div style={{ padding: '8px 14px', fontSize: '0.65rem', color: '#94a3b8', fontStyle: 'italic', background: '#fffbf5' }}>
                                                Geen medewerkers gevonden voor dit filter in deze periode.
                                            </div>
                                        )}
                                        {bzFilteredUsers.map(u => {
                                            const ini = u.name ? u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
                                            const isZZP = u.role === 'ZZP' || u.type === 'zzp';
                                            return (
                                                <div key={u.id} className="gantt-row" style={{ background: '#fffbf5', borderBottom: '1px solid #fef3c7', minHeight: '28px' }}>
                                                    {/* Naam label */}
                                                    <div className="gantt-row-label" style={{ padding: '3px 6px 3px 10px', gap: '5px', minHeight: '28px' }}>
                                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: isZZP ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : 'linear-gradient(135deg,#F5850A,#E07000)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem', fontWeight: 700, flexShrink: 0 }}>
                                                            {ini}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name?.split(' ')[0]}</div>
                                                            {isZZP && <div style={{ fontSize: '0.48rem', color: '#8b5cf6', fontWeight: 600 }}>ZZP</div>}
                                                        </div>
                                                    </div>
                                                    {/* Team kolom */}
                                                    <div className="gantt-team-col" style={{ background: 'transparent', fontSize: '0.48rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {projects.reduce((acc, proj) => acc + (proj.tasks || []).filter(t => !t.completed && (t.assignedTo || []).includes(u.id)).length, 0)}t
                                                    </div>
                                                    {/* Tijdlijn — cel per dag */}
                                                    <div className="gantt-row-timeline" style={{ minHeight: '28px' }}>
                                                        {timelineDates.map((d, i) => {
                                                            const ds = formatDate(d);
                                                            if (isWeekend(d)) return <div key={i} className="gantt-cell weekend" style={{ minHeight: '28px' }} />;
                                                            const holidayName = HOLIDAYS_2026[ds];
                                                            // Feestdagen zijn ALTIJD oranje in de weergave (ongeacht verlof-toggle)
                                                            // De enabledHolidays toggle bepaalt alleen de afwezigheidsregistratie
                                                            const holidayActive = !!holidayName;
                                                            const absent = absentByDay[ds]?.has(u.id);
                                                            const busy = !holidayActive && !absent && busyByDay[ds]?.has(u.id);
                                                            const free = !absent && !busy && !holidayActive;
                                                            const isToday = ds === todayStr;
                                                            const userDayTasks = projects.flatMap(proj =>
                                                                (proj.tasks || [])
                                                                    .filter(t => {
                                                                        if (t.completed || ds < t.startDate || ds > t.endDate) return false;
                                                                        // Dag-specifieke override heeft voorrang
                                                                        if (t.assignedByDay && t.assignedByDay[ds] !== undefined) {
                                                                            return t.assignedByDay[ds].includes(u.id);
                                                                        }
                                                                        return (t.assignedTo || []).includes(u.id);
                                                                    })
                                                                    .map(t => ({ proj, task: t }))
                                                            );
                                                            const projColor = userDayTasks[0]?.proj?.color || '#F5850A';
                                                            const tooltipText = holidayActive
                                                                ? `${holidayName} — vrije dag`
                                                                : absent ? `${u.name}: Vrije dag / afwezig`
                                                                : busy ? `${u.name}: ${userDayTasks.map(x => x.task.name).join(', ')}`
                                                                : `${u.name}: Beschikbaar — klik om in te plannen`;

                                                            // ★ Kleurschema
                                                            let cellBg, cellOutline, cellContent;
                                                            if (holidayActive) {
                                                                cellBg = 'rgba(245,133,10,0.18)';
                                                                cellOutline = '1px solid rgba(245,133,10,0.45)';
                                                                cellContent = <i className="fa-solid fa-star" style={{ fontSize: '0.45rem', color: '#F5850A' }} />;
                                                            } else if (absent) {
                                                                cellBg = '#fff';
                                                                cellOutline = '1.5px solid #ef4444';
                                                                cellContent = <i className="fa-solid fa-umbrella-beach" style={{ fontSize: '0.45rem', color: '#ef4444' }} />;
                                                            } else if (busy) {
                                                                cellBg = projColor + '28';
                                                                cellOutline = `1.5px solid ${projColor}`;
                                                                cellContent = zoomLevel >= 28
                                                                    ? <span style={{ fontSize: '0.38rem', fontWeight: 700, color: projColor, textAlign: 'center', lineHeight: 1.1, padding: '0 1px', overflow: 'hidden', maxWidth: '100%' }}>{userDayTasks[0]?.task.name?.slice(0, 7)}</span>
                                                                    : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: projColor }} />;
                                                            } else {
                                                                cellBg = '#fff';
                                                                cellOutline = '1.5px solid #ef4444';
                                                                cellContent = <i className="fa-solid fa-plus" style={{ fontSize: '0.4rem', color: '#ef4444', opacity: 0.45 }} />;
                                                            }
                                                            return (
                                                                <div key={i}
                                                                    className={`gantt-cell${isToday ? ' today' : ''}`}
                                                                    title={tooltipText}
                                                                    onClick={free ? (e) => {
                                                                        const dayTasks = projects.flatMap(proj =>
                                                                            (proj.tasks || [])
                                                                                .filter(t => !t.completed && ds >= t.startDate && ds <= t.endDate)
                                                                                .map(t => ({ proj, task: t }))
                                                                        );
                                                                        setAssignPopup({ userId: u.id, userName: u.name, dateStr: ds, x: e.clientX, y: e.clientY, tasks: dayTasks });
                                                                    } : undefined}
                                                                    style={{
                                                                        minHeight: '28px',
                                                                        cursor: free ? 'pointer' : 'default',
                                                                        background: cellBg,
                                                                        outline: cellOutline,
                                                                        outlineOffset: '-1px',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        transition: 'background 0.1s',
                                                                    }}
                                                                    onMouseEnter={e => { if (free) e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
                                                                    onMouseLeave={e => { if (free) e.currentTarget.style.background = '#fff'; }}
                                                                >
                                                                    {cellContent}
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
                            );
                        })()}
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
                                            {/* Dossier + Expand/collapse */}
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                                                <Link href={`/projecten/${p.id}`} onClick={e => e.stopPropagation()}
                                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '6px', borderRadius: '8px', background: 'rgba(245,133,10,0.08)', color: '#F5850A', textDecoration: 'none', fontSize: '0.72rem', fontWeight: 700, transition: 'background 0.15s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,133,10,0.16)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,133,10,0.08)'}>
                                                    <i className="fa-solid fa-folder-open" /> Dossier
                                                </Link>
                                                <div onClick={(e) => { e.stopPropagation(); setExpandedProjects(prev => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; }); }}
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.65rem', color: '#94a3b8', borderRadius: '8px', border: '1px solid #f1f5f9', transition: 'color 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
                                                    <i className={expandedProjects.has(p.id) ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down"} style={{ fontSize: '0.5rem' }}></i>
                                                    <span>{expandedProjects.has(p.id) ? 'Verbergen' : `Taken (${totalTasks})`}</span>
                                                </div>
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
                                                                <span style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 600, marginLeft: 'auto' }} title="Werkdagen">{diffWorkdays(parseDate(t.startDate), parseDate(t.endDate))}d</span>
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

                            {/* ===== TAAK PERSONEEL INPLANNEN (toont als taak geselecteerd is) ===== */}
                            {selectedTask && (() => {
                                const proj = projects.find(pr => pr.id === selectedTask.projectId);
                                const task = proj?.tasks.find(t => t.id === selectedTask.taskId);
                                if (!proj || !task) return null;
                                const taskColor = proj.color || 'var(--accent)';
                                const updateTaskWorkers = (updated) => {
                                    setProjects(prev => prev.map(pr =>
                                        pr.id !== proj.id ? pr : {
                                            ...pr,
                                            tasks: pr.tasks.map(t => t.id !== task.id ? t : { ...t, assignedTo: updated })
                                        }
                                    ));
                                };
                                return (
                                    <div style={{ marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', background: `${taskColor}08`, borderRadius: '10px', padding: '12px', border: `1.5px solid ${taskColor}30`, marginBottom: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                <i className="fa-solid fa-list-check" style={{ color: taskColor, fontSize: '0.75rem' }}></i>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{task.name}</span>
                                            </div>
                                            <button onClick={() => setSelectedTask(null)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.7rem', padding: '2px 4px' }}>
                                                <i className="fa-solid fa-xmark"></i>
                                            </button>
                                        </div>
                                        {/* Taak datums */}
                                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b' }}>Start:</span>
                                                <input type="date" value={task.startDate}
                                                    onChange={e => {
                                                        const updated = e.target.value;
                                                        setProjects(prev => prev.map(pr => pr.id !== proj.id ? pr : {
                                                            ...pr, tasks: pr.tasks.map(t => t.id !== task.id ? t : { ...t, startDate: updated })
                                                        }));
                                                    }}
                                                    style={{ padding: '3px 7px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.72rem', outline: 'none' }} />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b' }}>Einde:</span>
                                                <input type="date" value={task.endDate}
                                                    onChange={e => {
                                                        const updated = e.target.value;
                                                        setProjects(prev => prev.map(pr => pr.id !== proj.id ? pr : {
                                                            ...pr, tasks: pr.tasks.map(t => t.id !== task.id ? t : { ...t, endDate: updated })
                                                        }));
                                                    }}
                                                    style={{ padding: '3px 7px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.72rem', outline: 'none' }} />
                                            </div>
                                        </div>
                                        {/* Personeel inplannen op taak */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <i className="fa-solid fa-users" style={{ color: taskColor }}></i>
                                                Personeel op taak
                                            </span>
                                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{(task.assignedTo || []).length} ingepland</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {allUsers.map(user => {
                                                const assigned = (task.assignedTo || []).includes(user.id);
                                                const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
                                                return (
                                                    <button key={user.id}
                                                        onClick={() => updateTaskWorkers(assigned ? (task.assignedTo || []).filter(id => id !== user.id) : [...(task.assignedTo || []), user.id])}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '6px',
                                                            padding: '4px 10px 4px 5px', borderRadius: '20px', cursor: 'pointer',
                                                            border: assigned ? `2px solid ${taskColor}` : '2px solid #e2e8f0',
                                                            background: assigned ? `${taskColor}18` : '#fff',
                                                            transition: 'all 0.15s', outline: 'none',
                                                        }}
                                                        onMouseEnter={e => { if (!assigned) { e.currentTarget.style.borderColor = taskColor; e.currentTarget.style.background = `${taskColor}0d`; } }}
                                                        onMouseLeave={e => { if (!assigned) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; } }}
                                                    >
                                                        <div style={{
                                                            width: '22px', height: '22px', borderRadius: '50%',
                                                            background: assigned ? taskColor : '#e2e8f0',
                                                            color: assigned ? '#fff' : '#64748b',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '0.55rem', fontWeight: 700, flexShrink: 0,
                                                        }}>
                                                            {initials}
                                                        </div>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: assigned ? 700 : 500, color: assigned ? taskColor : '#475569', whiteSpace: 'nowrap' }}>
                                                            {user.name?.split(' ')[0] || user.email}
                                                        </span>
                                                        {assigned && <i className="fa-solid fa-check" style={{ fontSize: '0.5rem', color: taskColor }}></i>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ===== PERSONEEL INPLANNEN ===== */}
                            <div style={{ marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-users" style={{ color: selectedProject.color || 'var(--accent)' }}></i>
                                        Personeel inplannen
                                    </span>
                                    <span style={{ fontSize: '0.67rem', color: '#94a3b8' }}>
                                        {/* Tel unieke medewerkers uit ALLE taken — zelfde bron als de team-symbolen */}
                                        {[...new Set((selectedProject.tasks || []).flatMap(t => t.assignedTo || []))].length} ingepland
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {allUsers.map(user => {
                                        // Controleer of deze persoon op MINSTENS ÉÉN taak staat (= zelfde bron als team-symbolen op de projectrij)
                                        const assigned = (selectedProject.tasks || []).some(t => (t.assignedTo || []).includes(user.id));
                                        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
                                        const avatarColor = user.avatarColor || selectedProject.color || '#3b82f6';
                                        return (
                                            <button
                                                key={user.id}
                                                title={assigned ? `${user.name} uitplannen` : `${user.name} inplannen`}
                                                onClick={() => {
                                                    // Toggle op ALLE taken → zelfde logica als Personeelsplanning-tab
                                                    // Zo updaten de team-symbolen op de projectrij direct
                                                    setProjects(prev => prev.map(pr => {
                                                        if (pr.id !== selectedProject.id) return pr;
                                                        const updatedTasks = (pr.tasks || []).map(t => ({
                                                            ...t,
                                                            assignedTo: assigned
                                                                ? (t.assignedTo || []).filter(id => id !== user.id)
                                                                : [...new Set([...(t.assignedTo || []), user.id])]
                                                        }));
                                                        return { ...pr, tasks: updatedTasks };
                                                    }));
                                                    setSelectedProject(prev => {
                                                        if (!prev) return prev;
                                                        const updatedTasks = (prev.tasks || []).map(t => ({
                                                            ...t,
                                                            assignedTo: assigned
                                                                ? (t.assignedTo || []).filter(id => id !== user.id)
                                                                : [...new Set([...(t.assignedTo || []), user.id])]
                                                        }));
                                                        return { ...prev, tasks: updatedTasks };
                                                    });
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '7px',
                                                    padding: '5px 11px 5px 6px',
                                                    borderRadius: '20px',
                                                    border: assigned ? `2px solid ${selectedProject.color || 'var(--accent)'}` : '2px solid #e2e8f0',
                                                    background: assigned ? `${selectedProject.color || 'var(--accent)'}18` : '#fff',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s',
                                                    outline: 'none',
                                                }}
                                                onMouseEnter={e => {
                                                    if (!assigned) { e.currentTarget.style.borderColor = selectedProject.color || 'var(--accent)'; e.currentTarget.style.background = `${selectedProject.color || 'var(--accent)'}0d`; }
                                                }}
                                                onMouseLeave={e => {
                                                    if (!assigned) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }
                                                }}
                                            >
                                                {/* Avatar circle */}
                                                <div style={{
                                                    width: '26px', height: '26px', borderRadius: '50%',
                                                    background: assigned ? (selectedProject.color || '#3b82f6') : avatarColor + '30',
                                                    color: assigned ? '#fff' : (avatarColor || '#64748b'),
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.6rem', fontWeight: 700, flexShrink: 0,
                                                    border: assigned ? 'none' : `1px solid ${avatarColor}60`,
                                                }}>
                                                    {initials}
                                                </div>
                                                {/* Name */}
                                                <span style={{
                                                    fontSize: '0.72rem', fontWeight: assigned ? 700 : 500,
                                                    color: assigned ? (selectedProject.color || 'var(--accent)') : '#475569',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {user.name?.split(' ')[0] || user.email}
                                                </span>
                                                {/* Check icon when assigned */}
                                                {assigned && (
                                                    <i className="fa-solid fa-check" style={{ fontSize: '0.55rem', color: selectedProject.color || 'var(--accent)' }}></i>
                                                )}
                                            </button>
                                        );
                                    })}
                                    {allUsers.length === 0 && (
                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>Geen medewerkers gevonden</span>
                                    )}
                                </div>
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
                                                    autoFocus
                                                    onKeyDown={e => { if (e.key === 'Enter') addTask(selectedProject.id); if (e.key === 'Escape') { setShowTaskForm(false); setNewTask({ name: '', startDate: '', endDate: '', assignedTo: [] }); } }}
                                                    style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                                                    Startdatum <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optioneel)</span>
                                                </label>
                                                <input type="date"
                                                    value={newTask.startDate || selectedProject?.startDate || ''}
                                                    onChange={e => setNewTask({ ...newTask, startDate: e.target.value })}
                                                    style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                                                    Einddatum <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optioneel)</span>
                                                </label>
                                                <input type="date"
                                                    value={newTask.endDate || selectedProject?.endDate || ''}
                                                    onChange={e => setNewTask({ ...newTask, endDate: e.target.value })}
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
            {tab === 'personeel' && (() => {
                const workers = allUsers.filter(u => u.role !== 'Beheerder');
                const tStart = timelineDates[0];
                const tEnd = timelineDates[timelineDates.length - 1];
                const totalDays = timelineDates.length;

                const ABS_TYPES = {
                    vakantie:  { label: 'Vakantie',       color: '#f59e0b', icon: 'fa-umbrella-beach',   bg: 'rgba(245,158,11,0.12)' },
                    ziek:      { label: 'Ziek',           color: '#ef4444', icon: 'fa-face-thermometer', bg: 'rgba(239,68,68,0.12)'  },
                    vrije_dag: { label: 'Vrije dag',      color: '#ec4899', icon: 'fa-calendar-xmark',   bg: 'rgba(236,72,153,0.12)' },
                    dokter:    { label: 'Dokter/Tandarts',color: '#eab308', icon: 'fa-stethoscope',       bg: 'rgba(234,179,8,0.12)'  },
                };

                const toggleWorkerOnProject = (userId, projId) => {
                    setProjects(prev => prev.map(pr => {
                        if (pr.id !== projId) return pr;
                        const on = (pr.tasks || []).some(t => (t.assignedTo || []).includes(userId));
                        return { ...pr, tasks: (pr.tasks || []).map(t => ({ ...t, assignedTo: on ? (t.assignedTo||[]).filter(id=>id!==userId) : [...new Set([...(t.assignedTo||[]),userId])] })) };
                    }));
                };

                const getWorkerBars = (userId) => {
                    const bars = [];
                    projects.forEach(proj => (proj.tasks||[]).forEach(task => {
                        if (!(task.assignedTo||[]).includes(userId)) return;
                        try {
                            const s = parseDate(task.startDate), e = parseDate(task.endDate);
                            if (s > tEnd || e < tStart) return;
                            const segs = getWorkdaySegments(s, e, tStart, tEnd, totalDays);
                            segs.forEach((seg, si) => bars.push({ proj, task, left: seg.left, width: seg.width, si, total: segs.length }));
                        } catch {}
                    }));
                    return bars;
                };

                const getAbsBars = (userId) => (workerAbsences||[]).filter(a=>a.userId===userId).flatMap(a => {
                    try {
                        const s = parseDate(a.startDate), e = parseDate(a.endDate);
                        if (s > tEnd || e < tStart) return [];
                        return getWorkdaySegments(s, e, tStart, tEnd, totalDays).map((seg, si, arr) => ({ ...a, left: seg.left, width: seg.width, si, total: arr.length }));
                    } catch { return []; }
                });

                const isAbsent = (userId, ds) => (workerAbsences||[]).some(a => a.userId===userId && ds>=a.startDate && ds<=a.endDate);

                const dailyCounts = timelineDates.map(d => {
                    if (isWeekend(d)) return null; // gesloten op za/zo
                    const ds = formatDate(d);
                    return workers.filter(u => !isAbsent(u.id,ds) && projects.some(proj => (proj.tasks||[]).some(t => (t.assignedTo||[]).includes(u.id) && ds>=t.startDate && ds<=t.endDate))).length;
                });

                const handleTimelineClick = (e, workerId) => {
                    if (e.target.closest('.abs-bar') || e.target.closest('.task-bar')) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const idx = Math.min(Math.floor(((e.clientX-rect.left)/rect.width)*totalDays), totalDays-1);
                    const ds = formatDate(timelineDates[Math.max(0,idx)]);
                    setAbsForm({ type: 'vakantie', startDate: ds, endDate: ds });
                    setAbsPopup({ workerId, x: e.clientX, y: e.clientY });
                };

                const deleteAbsence = (id) => setWorkerAbsences(prev => prev.filter(a => a.id !== id));

                const saveAbsence = () => {
                    if (!absPopup || !absForm.startDate || !absForm.endDate) return;
                    setWorkerAbsences(prev => [...prev, { id: Date.now(), userId: absPopup.workerId, type: absForm.type, startDate: absForm.startDate, endDate: absForm.endDate }]);
                    setAbsPopup(null);
                };

                // Taak bewerken: klik op project-balk
                const openTaskEdit = (e, proj, task) => {
                    e.stopPropagation();
                    setTaskEditForm({ name: task.name, startDate: task.startDate, endDate: task.endDate });
                    setTaskEditPopup({ projId: proj.id, taskId: task.id, projColor: proj.color, projName: proj.name, x: e.clientX, y: e.clientY });
                };

                const saveTaskEdit = () => {
                    if (!taskEditPopup) return;
                    setProjects(prev => prev.map(pr => {
                        if (pr.id !== taskEditPopup.projId) return pr;
                        return { ...pr, tasks: (pr.tasks || []).map(t => t.id === taskEditPopup.taskId ? { ...t, name: taskEditForm.name, startDate: taskEditForm.startDate, endDate: taskEditForm.endDate } : t) };
                    }));
                    setTaskEditPopup(null);
                };

                // Afwezigheid bewerken: klik op abs-balk
                const openAbsEdit = (e, abs) => {
                    e.stopPropagation();
                    setAbsForm({ type: abs.type, startDate: abs.startDate, endDate: abs.endDate });
                    setAbsEditPopup({ absId: abs.id, x: e.clientX, y: e.clientY });
                };

                const saveAbsEdit = () => {
                    if (!absEditPopup) return;
                    setWorkerAbsences(prev => prev.map(a => a.id === absEditPopup.absId ? { ...a, type: absForm.type, startDate: absForm.startDate, endDate: absForm.endDate } : a));
                    setAbsEditPopup(null);
                };


                return (
                    <div style={{ position: 'relative' }}>

                        {/* ===== TOEWIJZEN POPUP (klik op groene chip bezettingsrij) ===== */}
                        {assignPopup && (
                            <>
                                <div onClick={() => setAssignPopup(null)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
                                <div style={{ position: 'fixed', left: Math.min(assignPopup.x, window.innerWidth - 300), top: Math.min(assignPopup.y + 10, window.innerHeight - 280), zIndex: 9999, background: '#fff', borderRadius: '14px', boxShadow: '0 12px 40px rgba(0,0,0,0.18)', padding: '16px', width: '280px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, flexShrink: 0 }}>
                                            {assignPopup.userName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div>{assignPopup.userName}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 600 }}>Beschikbaar op {assignPopup.dateStr?.split('-').reverse().join('-')}</div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '10px', marginTop: '6px' }}>
                                        Voeg toe aan een taak die actief is op deze dag:
                                    </div>
                                    {assignPopup.tasks.length === 0 ? (
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '12px' }}>
                                            Geen actieve taken op deze dag
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                                            {assignPopup.tasks.map(({ proj, task }) => {
                                                const alreadyOn = (task.assignedTo || []).includes(assignPopup.userId);
                                                return (
                                                    <button key={task.id} disabled={alreadyOn}
                                                        onClick={() => {
                                                            if (alreadyOn) return;
                                                            setProjects(prev => prev.map(pr => pr.id !== proj.id ? pr : {
                                                                ...pr, tasks: pr.tasks.map(t => t.id !== task.id ? t : {
                                                                    ...t, assignedTo: [...(t.assignedTo || []), assignPopup.userId]
                                                                })
                                                            }));
                                                            setAssignPopup(null);
                                                        }}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', border: `2px solid ${proj.color}`, background: alreadyOn ? '#f8fafc' : 'white', cursor: alreadyOn ? 'default' : 'pointer', opacity: alreadyOn ? 0.5 : 1, textAlign: 'left', transition: 'all 0.15s', width: '100%' }}
                                                        onMouseEnter={e => { if (!alreadyOn) e.currentTarget.style.background = proj.color + '22'; }}
                                                        onMouseLeave={e => { if (!alreadyOn) e.currentTarget.style.background = 'white'; }}>
                                                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: proj.color, flexShrink: 0 }} />
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.name}</div>
                                                            <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{proj.name}</div>
                                                        </div>
                                                        {alreadyOn && <i className="fa-solid fa-check" style={{ color: '#22c55e', fontSize: '0.7rem' }} />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <button onClick={() => setAssignPopup(null)} style={{ marginTop: '12px', width: '100%', padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}>Annuleren</button>
                                </div>
                            </>
                        )}

                        {absPopup && (
                            <>
                                <div onClick={() => setAbsPopup(null)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
                                <div style={{ position: 'fixed', left: Math.min(absPopup.x, window.innerWidth-320), top: Math.min(absPopup.y+12, window.innerHeight-290), zIndex: 9999, background: '#fff', borderRadius: '14px', boxShadow: '0 12px 40px rgba(0,0,0,0.18)', padding: '18px', width: '300px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                        <i className="fa-solid fa-calendar-xmark" style={{ color: '#F5850A' }}></i> Afwezigheid registreren
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '14px' }}>
                                        {Object.entries(ABS_TYPES).map(([key, cfg]) => (
                                            <button key={key} onClick={() => setAbsForm(f => ({ ...f, type: key }))}
                                                style={{ padding: '8px 6px', borderRadius: '9px', cursor: 'pointer', border: `2px solid ${absForm.type===key?cfg.color:'#e2e8f0'}`, background: absForm.type===key?cfg.bg:'#f8fafc', color: absForm.type===key?cfg.color:'#64748b', fontWeight: 700, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.12s' }}>
                                                <i className={`fa-solid ${cfg.icon}`}></i>{cfg.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                                        <div><div style={{ fontSize:'0.62rem',fontWeight:700,color:'#64748b',marginBottom:'4px' }}>Van</div>
                                            <input type="date" value={absForm.startDate} onChange={e=>setAbsForm(f=>({...f,startDate:e.target.value}))} style={{ width:'100%',border:'1px solid #e2e8f0',borderRadius:'7px',padding:'6px 8px',fontSize:'0.75rem',outline:'none',boxSizing:'border-box' }} /></div>
                                        <div><div style={{ fontSize:'0.62rem',fontWeight:700,color:'#64748b',marginBottom:'4px' }}>Tot en met</div>
                                            <input type="date" value={absForm.endDate} onChange={e=>setAbsForm(f=>({...f,endDate:e.target.value}))} style={{ width:'100%',border:'1px solid #e2e8f0',borderRadius:'7px',padding:'6px 8px',fontSize:'0.75rem',outline:'none',boxSizing:'border-box' }} /></div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setAbsPopup(null)} style={{ flex:1,padding:'8px',border:'1px solid #e2e8f0',borderRadius:'8px',background:'#f8fafc',color:'#64748b',fontWeight:600,fontSize:'0.75rem',cursor:'pointer' }}>Annuleren</button>
                                        <button onClick={saveAbsence} style={{ flex:2,padding:'8px',border:'none',borderRadius:'8px',background:ABS_TYPES[absForm.type].color,color:'#fff',fontWeight:700,fontSize:'0.75rem',cursor:'pointer' }}>
                                            <i className="fa-solid fa-check" style={{ marginRight:'5px' }}></i>Opslaan
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* === Popup: taak bewerken === */}
                        {taskEditPopup && (
                            <>
                                <div onClick={() => setTaskEditPopup(null)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
                                <div style={{ position: 'fixed', left: Math.min(taskEditPopup.x, window.innerWidth-320), top: Math.min(taskEditPopup.y+12, window.innerHeight-290), zIndex: 9999, background: '#fff', borderRadius: '14px', boxShadow: '0 12px 40px rgba(0,0,0,0.18)', padding: '18px', width: '300px', border: `2px solid ${taskEditPopup.projColor}` }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: taskEditPopup.projColor, flexShrink: 0 }}></div>
                                        Taak bewerken
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: '14px' }}>{taskEditPopup.projName}</div>
                                    <div style={{ marginBottom: '10px' }}>
                                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Taaknaam</div>
                                        <input type="text" value={taskEditForm.name} onChange={e => setTaskEditForm(f => ({ ...f, name: e.target.value }))}
                                            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '7px', padding: '6px 8px', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box', fontWeight: 600 }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                                        <div><div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Startdatum</div>
                                            <input type="date" value={taskEditForm.startDate} onChange={e => setTaskEditForm(f => ({ ...f, startDate: e.target.value }))} style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '7px', padding: '6px 8px', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box' }} /></div>
                                        <div><div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Einddatum</div>
                                            <input type="date" value={taskEditForm.endDate} onChange={e => setTaskEditForm(f => ({ ...f, endDate: e.target.value }))} style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '7px', padding: '6px 8px', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box' }} /></div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setTaskEditPopup(null)} style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>Annuleren</button>
                                        <button onClick={saveTaskEdit} style={{ flex: 2, padding: '8px', border: 'none', borderRadius: '8px', background: taskEditPopup.projColor, color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                                            <i className="fa-solid fa-check" style={{ marginRight: '5px' }}></i>Opslaan
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* === Popup: afwezigheid bewerken === */}
                        {absEditPopup && (
                            <>
                                <div onClick={() => setAbsEditPopup(null)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
                                <div style={{ position: 'fixed', left: Math.min(absEditPopup.x, window.innerWidth-320), top: Math.min(absEditPopup.y+12, window.innerHeight-290), zIndex: 9999, background: '#fff', borderRadius: '14px', boxShadow: '0 12px 40px rgba(0,0,0,0.18)', padding: '18px', width: '300px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span><i className="fa-solid fa-pen-to-square" style={{ color: '#F5850A', marginRight: '7px' }}></i>Afwezigheid bewerken</span>
                                        <button onClick={() => { deleteAbsence(absEditPopup.absId); setAbsEditPopup(null); }} title="Verwijderen" style={{ border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: '6px', padding: '3px 7px', cursor: 'pointer', fontWeight: 700, fontSize: '0.7rem' }}>
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '14px' }}>
                                        {Object.entries(ABS_TYPES).map(([key, cfg]) => (
                                            <button key={key} onClick={() => setAbsForm(f => ({ ...f, type: key }))} style={{ padding: '8px 6px', borderRadius: '9px', cursor: 'pointer', border: `2px solid ${absForm.type===key?cfg.color:'#e2e8f0'}`, background: absForm.type===key?cfg.bg:'#f8fafc', color: absForm.type===key?cfg.color:'#64748b', fontWeight: 700, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.12s' }}>
                                                <i className={`fa-solid ${cfg.icon}`}></i>{cfg.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                                        <div><div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Van</div>
                                            <input type="date" value={absForm.startDate} onChange={e => setAbsForm(f => ({ ...f, startDate: e.target.value }))} style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '7px', padding: '6px 8px', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box' }} /></div>
                                        <div><div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Tot en met</div>
                                            <input type="date" value={absForm.endDate} onChange={e => setAbsForm(f => ({ ...f, endDate: e.target.value }))} style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '7px', padding: '6px 8px', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box' }} /></div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setAbsEditPopup(null)} style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>Annuleren</button>
                                        <button onClick={saveAbsEdit} style={{ flex: 2, padding: '8px', border: 'none', borderRadius: '8px', background: ABS_TYPES[absForm.type].color, color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                                            <i className="fa-solid fa-check" style={{ marginRight: '5px' }}></i>Opslaan
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="planning-toolbar">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button onClick={() => navigate(-1)} style={{ border:'1px solid var(--border-color)',background:'#fff',borderRadius:'8px',padding:'6px 10px',cursor:'pointer' }}><i className="fa-solid fa-chevron-left"></i></button>
                                <span style={{ fontWeight:700,fontSize:'0.82rem',color:'#1e293b',minWidth:'140px',textAlign:'center' }}>
                                    {(() => {
                                        if (viewMode === '1m') return `${MONTHS_FULL[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
                                        if (viewMode === '8w') {
                                            const end = new Date(currentDate); end.setDate(end.getDate() + 56);
                                            return `${MONTHS_FULL[currentDate.getMonth()]} - ${MONTHS_FULL[end.getMonth()]} ${currentDate.getFullYear()}`;
                                        }
                                        return `Week ${getWeekNumber(currentDate)} ${viewMode === '2w' ? '- ' + getWeekNumber(addDays(currentDate, 7)) : ''}`;
                                    })()}
                                </span>
                                <button onClick={() => navigate(1)} style={{ border:'1px solid var(--border-color)',background:'#fff',borderRadius:'8px',padding:'6px 10px',cursor:'pointer' }}><i className="fa-solid fa-chevron-right"></i></button>
                                <button onClick={() => setCurrentDate(new Date())} style={{ border:'1px solid var(--border-color)',background:'#fff',borderRadius:'8px',padding:'6px 10px',cursor:'pointer',fontSize:'0.78rem',fontWeight:600,color:'#64748b' }}>Vandaag</button>
                            </div>
                            <div className="view-btns" style={{ display: 'flex', background: '#f1f5f9', borderRadius: '7px', padding: '2px', gap: '2px' }}>
                                {[
                                    ['1w', '1 Week'],
                                    ['2w', '2 Weken'],
                                    ['1m', 'Maand'],
                                    ['8w', '8 Weken']
                                ].map(([v, lbl]) => (
                                    <button key={v} onClick={() => setViewMode(v)}
                                        style={{ padding: '4px 10px', borderRadius: '5px', border: 'none', background: (viewMode === v || (viewMode === 'month' && v === '8w') || (viewMode === 'week' && v === '2w')) ? '#fff' : 'transparent', color: (viewMode === v || (viewMode === 'month' && v === '8w') || (viewMode === 'week' && v === '2w')) ? '#F5850A' : '#64748b', fontWeight: (viewMode === v || (viewMode === 'month' && v === '8w') || (viewMode === 'week' && v === '2w')) ? 700 : 600, fontSize: '0.72rem', cursor: 'pointer', boxShadow: (viewMode === v || (viewMode === 'month' && v === '8w') || (viewMode === 'week' && v === '2w')) ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                                        {lbl}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display:'flex',alignItems:'center',gap:'16px',padding:'8px 14px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'10px',marginBottom:'12px',flexWrap:'wrap' }}>
                            <span style={{ fontSize:'0.68rem',fontWeight:700,color:'#64748b' }}>
                                <i className="fa-solid fa-circle-info" style={{ color:'#F5850A',marginRight:'4px' }}></i>
                                Klik op tijdlijn → afwezigheid invoeren &nbsp;·&nbsp; Klik op badge → project toewijzen
                            </span>
                            <div style={{ display:'flex',gap:'10px',marginLeft:'auto',flexWrap:'wrap' }}>
                                {Object.entries(ABS_TYPES).map(([key,cfg]) => (
                                    <div key={key} style={{ display:'flex',alignItems:'center',gap:'4px',fontSize:'0.65rem',color:'#64748b' }}>
                                        <div style={{ width:'12px',height:'12px',borderRadius:'3px',background:cfg.color }}></div>{cfg.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="gantt-wrapper" style={{ borderRadius:'12px',overflow:'hidden',border:'1px solid #e2e8f0' }}>
                            <div style={{ display:'flex',borderBottom:'1px solid #e2e8f0',background:'#f8fafc' }}>
                                <div className="gantt-header-label" style={{ fontWeight:700,fontSize:'0.72rem',color:'#64748b',background:'#f8fafc' }}>Medewerker</div>
                                <div style={{ flex:1,display:'flex',flexDirection:'column' }}>
                                    <div style={{ display:'flex',borderBottom:'1px solid #e2e8f0' }}>
                                        {(() => {
                                            const groups=[]; let i=0;
                                            while(i<timelineDates.length){const wk=getWeekNumber(timelineDates[i]);let j=i+1;while(j<timelineDates.length&&getWeekNumber(timelineDates[j])===wk)j++;groups.push({label:`W${wk}`,count:j-i,startD:timelineDates[i]});i=j;}
                                            return groups.map((g,gi)=>(<div key={gi} style={{ flex:g.count,minWidth:`${g.count*zoomLevel}px`,fontSize:'0.6rem',fontWeight:700,color:'#475569',padding:'3px 6px',borderLeft:gi>0?'1px solid #e2e8f0':'none',whiteSpace:'nowrap',overflow:'hidden' }}>{g.label} · {MONTHS_NL[g.startD.getMonth()]}</div>));
                                        })()}
                                    </div>
                                    <div style={{ display:'flex' }}>
                                        {timelineDates.map((d,i)=>(<div key={i} className={`gantt-header-cell ${isWeekend(d)?'weekend':''} ${formatDate(today)===formatDate(d)?'today':''}`} style={{ flex:1,minWidth:`${zoomLevel}px`,textAlign:'center',padding:'2px 0',fontSize:'0.58rem' }}><div style={{ color:'#94a3b8' }}>{DAYS_NL[d.getDay()]}</div><div style={{ fontWeight:700,fontSize:'0.7rem',color:formatDate(today)===formatDate(d)?'var(--accent)':'#334155' }}>{d.getDate()}</div></div>))}
                                    </div>
                                </div>
                            </div>

                            {workers.map(worker => {
                                const bars = getWorkerBars(worker.id);
                                const absBars = getAbsBars(worker.id);
                                const workerAbs = (workerAbsences||[]).filter(a => {
                                    if (a.userId!==worker.id) return false;
                                    try { const s=parseDate(a.startDate),e=parseDate(a.endDate); return !(s>tEnd||e<tStart); } catch { return false; }
                                });
                                return (
                                    <div key={worker.id} className="gantt-row" style={{ minHeight:'64px',borderBottom:'1px solid #f1f5f9',alignItems:'stretch' }}>
                                        <div className="gantt-row-label" style={{ flexDirection:'column',alignItems:'flex-start',padding:'6px 10px',gap:'4px' }}>
                                            <div style={{ display:'flex',alignItems:'center',gap:'8px',width:'100%' }}>
                                                <div style={{ width:'30px',height:'30px',borderRadius:'50%',background:'linear-gradient(135deg,#F5850A,#E07000)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.62rem',fontWeight:700,flexShrink:0,boxShadow:'0 2px 4px rgba(245,133,10,0.35)' }}>{worker.initials||worker.name?.slice(0,2).toUpperCase()}</div>
                                                <div style={{ flex:1,minWidth:0 }}>
                                                    <div style={{ fontWeight:700,fontSize:'0.78rem',color:'#1e293b',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{worker.name}</div>
                                                    <div style={{ fontSize:'0.6rem',color:'#94a3b8' }}>{worker.role}</div>
                                                </div>
                                            </div>
                                            <div style={{ display:'flex',gap:'3px',flexWrap:'wrap',paddingLeft:'38px' }}>
                                                {projects.map(proj => {
                                                    const active=(proj.tasks||[]).some(t=>(t.assignedTo||[]).includes(worker.id));
                                                    return (<button key={proj.id} onClick={()=>toggleWorkerOnProject(worker.id,proj.id)} title={active?`Verwijder van ${proj.name}`:`Voeg toe aan ${proj.name}`} style={{ padding:'1px 6px 1px 4px',borderRadius:'8px',fontSize:'0.58rem',fontWeight:700,cursor:'pointer',border:`2px solid ${proj.color}`,background:active?proj.color:'transparent',color:active?'#fff':proj.color,display:'flex',alignItems:'center',gap:'2px',transition:'all 0.12s' }}><i className={`fa-solid ${active?'fa-check':'fa-plus'}`} style={{ fontSize:'0.42rem' }}></i><span style={{ maxWidth:'72px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{proj.name.split(' ').slice(0,2).join(' ')}</span></button>);
                                                })}
                                                {workerAbs.map(a => (
                                                    <span key={a.id} onClick={e => openAbsEdit(e, a)} title={`${ABS_TYPES[a.type]?.label}: ${a.startDate} → ${a.endDate} · klik om te bewerken`} style={{ padding:'1px 5px',borderRadius:'8px',fontSize:'0.58rem',fontWeight:700,cursor:'pointer',background:ABS_TYPES[a.type]?.color||'#94a3b8',color:'#fff',display:'flex',alignItems:'center',gap:'3px' }}>
                                                        <i className={`fa-solid ${ABS_TYPES[a.type]?.icon}`} style={{ fontSize:'0.4rem' }}></i>{ABS_TYPES[a.type]?.label}<i className="fa-solid fa-pen" style={{ fontSize:'0.4rem',opacity:0.7 }}></i>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Timeline with lane-based bar positioning */}
                                        {(() => {
                                            // Assign lanes to tasks to avoid overlap
                                            const taskEntries = projects.flatMap(proj =>
                                                (proj.tasks||[]).filter(t => (t.assignedTo||[]).includes(worker.id)).map(t => ({ proj, task: t }))
                                            );
                                            const lanes = [];
                                            const taskLane = new Map();
                                            taskEntries.forEach(({ task }) => {
                                                let lane = lanes.findIndex(l => !l.some(t => t.startDate < task.endDate && t.endDate > task.startDate));
                                                if (lane === -1) { lane = lanes.length; lanes.push([]); }
                                                lanes[lane].push(task);
                                                taskLane.set(task.id, lane);
                                            });
                                            const laneH = 28, laneGap = 4, topBase = 4;
                                            const numLanes = Math.max(1, lanes.length);
                                            const rowH = Math.max(48, topBase + numLanes * (laneH + laneGap));
                                            return (
                                                <div className="gantt-row-timeline" style={{ position:'relative', cursor:'crosshair', minHeight:`${rowH}px` }} onClick={e=>handleTimelineClick(e,worker.id)}>
                                                    {timelineDates.map((d,i)=><div key={i} className={`gantt-cell ${isWeekend(d)?'weekend':''} ${formatDate(d)===formatDate(today)?'today':''} ${isHoliday(d)?'holiday':''}`} />)}
                                                    {absBars.map((a) => {
                                                        const cfg=ABS_TYPES[a.type]||ABS_TYPES.vrije_dag;
                                                        const borderR = a.si===0 && a.total===1 ? '6px' : a.si===0 ? '6px 0 0 6px' : a.si===a.total-1 ? '0 6px 6px 0' : '0';
                                                        return (<div key={`${a.id}-${a.si}`} className="abs-bar" title={`${cfg.label}: ${a.startDate} → ${a.endDate} · klik om te bewerken`} onClick={e=>openAbsEdit(e,a)} style={{ position:'absolute',left:`${a.left * zoomLevel / 100 * timelineDates.length}px`,width:`${Math.max(a.width * zoomLevel / 100 * timelineDates.length, zoomLevel * 0.9)}px`,top:0,bottom:0,background:cfg.bg,borderTop:`3px solid ${cfg.color}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',zIndex:1,overflow:'hidden',borderRadius:borderR }}>{a.si===0&&<span style={{ fontSize:'0.6rem',fontWeight:700,color:cfg.color,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',padding:'0 6px',pointerEvents:'none' }}><i className={`fa-solid ${cfg.icon}`} style={{ marginRight:'3px' }}></i>{cfg.label}</span>}</div>);
                                                    })}
                                                    {bars.map((b, bi) => {
                                                        const lane = taskLane.get(b.task.id) ?? 0;
                                                        const top = topBase + lane * (laneH + laneGap);
                                                        const borderR = b.si===0 && b.total===1 ? '6px' : b.si===0 ? '6px 0 0 6px' : b.si===b.total-1 ? '0 6px 6px 0' : '0';
                                                        return (<div key={bi} className="task-bar" title={`${b.task.name} · ${b.proj.name} · klik om te bewerken`} onClick={e=>openTaskEdit(e,b.proj,b.task)} style={{ position:'absolute',left:`${b.left * zoomLevel / 100 * timelineDates.length}px`,width:`${Math.max(b.width * zoomLevel / 100 * timelineDates.length, zoomLevel * 0.9)}px`,top:`${top}px`,height:`${laneH}px`,background:b.proj.color,borderRadius:borderR,display:'flex',alignItems:'center',paddingLeft:b.si===0?'8px':'2px',overflow:'hidden',cursor:'pointer',boxShadow:'0 2px 5px rgba(0,0,0,0.15)',opacity:b.task.completed?0.4:1,zIndex:3 }}>{b.si===0&&<span style={{ fontSize:'0.65rem',fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',pointerEvents:'none' }}>{b.task.name}</span>}</div>);
                                                    })}
                                                    {bars.length===0&&absBars.length===0&&(<div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none' }}><span style={{ fontSize:'0.6rem',color:'#d1d5db',fontStyle:'italic' }}>Klik hier voor afwezigheid</span></div>)}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                );
                            })}

                            <div style={{ display:'flex',borderTop:'2px solid #e2e8f0',background:'#f8fafc' }}>
                                <div className="gantt-header-label" style={{ fontSize:'0.62rem',fontWeight:700,color:'#64748b',display:'flex',alignItems:'center',gap:'5px' }}><i className="fa-solid fa-chart-column" style={{ color:'#F5850A' }}></i> Bezetting</div>
                                <div style={{ flex:1,display:'flex',height:'36px',alignItems:'flex-end' }}>
                                    {dailyCounts.map((count,i)=>{
                                        const d = timelineDates[i];
                                        const weekend = isWeekend(d);
                                        if (weekend) return (
                                            <div key={i} style={{ flex:1,minWidth:`${zoomLevel}px`,height:'100%',background:'repeating-linear-gradient(-45deg,rgba(0,0,0,0.04) 0px,rgba(0,0,0,0.04) 2px,transparent 2px,transparent 6px)',borderLeft:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center' }}>
                                                {zoomLevel>=28&&<span style={{ fontSize:'0.42rem',color:'#cbd5e1',fontWeight:700,writingMode:'vertical-rl' }}>–</span>}
                                            </div>
                                        );
                                        const maxW=workers.length,pct=maxW>0?count/maxW:0,bg=count===0?'#e2e8f0':pct>=1?'#ef4444':pct>=0.6?'#f59e0b':'#22c55e';
                                        const dsI=formatDate(d),absCnt=workers.filter(u=>isAbsent(u.id,dsI)).length;
                                        return (<div key={i} title={`${count} ingepland · ${absCnt} afwezig`} style={{ flex:1,minWidth:`${zoomLevel}px`,height:'100%',display:'flex',flexDirection:'column',justifyContent:'flex-end',borderLeft:'1px solid #e2e8f0',padding:'2px 1px' }}>{absCnt>0&&<div style={{ width:'100%',height:`${(absCnt/maxW)*14}px`,background:'#fca5a5',borderRadius:'1px' }}/>}<div style={{ width:'100%',height:`${Math.max(pct*22,count>0?4:0)}px`,background:bg,borderRadius:'2px 2px 0 0',transition:'height 0.2s' }}/>{zoomLevel>=24&&<div style={{ fontSize:'0.5rem',textAlign:'center',color:count===0?'#e5e7eb':'#64748b',fontWeight:700,lineHeight:1.1 }}>{count>0?count:''}</div>}</div>);
                                    })}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop:'12px',display:'flex',gap:'12px',fontSize:'0.72rem',color:'#64748b',flexWrap:'wrap',alignItems:'center' }}>
                            <span style={{ fontWeight:700,color:'#334155' }}>Projecten:</span>
                            {projects.map(p=>(<div key={p.id} style={{ display:'flex',alignItems:'center',gap:'5px' }}><div style={{ width:'14px',height:'10px',borderRadius:'3px',background:p.color,flexShrink:0 }}></div><span>{p.name.length>22?p.name.substring(0,22)+'…':p.name}</span></div>))}
                            <div style={{ display:'flex',alignItems:'center',gap:'5px',marginLeft:'auto',fontSize:'0.65rem',color:'#94a3b8' }}><i className="fa-solid fa-rotate" style={{ fontSize:'0.6rem' }}></i> Automatisch opgeslagen</div>
                        </div>
                    </div>
                );
            })()}

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
            {/* ===== TAB 4: PROJECTMAPPEN ===== */}
            {tab === 'mappen' && (() => {
                const KANBAN_COLUMNS = [
                    { id: 'werkvoorbereiding', title: 'Werkvoorbereiding', color: '#8b5cf6' },
                    { id: 'uitvoering', title: 'Opdracht / Planning / Uitvoering', color: '#3b82f6' },
                    { id: 'afgerond', title: 'Afgeronde werken', color: '#10b981' },
                    { id: 'archief', title: 'Archief', color: '#64748b' }
                ];

                const handleDragStart = (e, projectId) => {
                    e.dataTransfer.setData('projectId', projectId);
                    e.dataTransfer.effectAllowed = 'move';
                    // Optional styling during drag
                    setTimeout(() => e.target.style.opacity = '0.5', 0);
                };

                const handleDragEnd = (e) => {
                    e.target.style.opacity = '1';
                };

                const handleDragOver = (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
                };

                const handleDragLeave = (e) => {
                    e.currentTarget.style.background = 'transparent';
                };

                const handleDrop = (e, columnId) => {
                    e.preventDefault();
                    e.currentTarget.style.background = 'transparent';
                    const projectId = Number(e.dataTransfer.getData('projectId'));
                    if (projectId) {
                        setProjects(prev => prev.map(pr => pr.id === projectId ? { ...pr, kanbanStatus: columnId } : pr));
                    }
                };

                return (
                    <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', flex: 1, alignItems: 'stretch' }}>
                        {KANBAN_COLUMNS.map(col => {
                            const columnProjects = filteredProjects.filter(p => (p.kanbanStatus || 'werkvoorbereiding') === col.id);
                            
                            return (
                                <div key={col.id} 
                                    style={{ flex: 1, minWidth: '300px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', maxHeight: '100%' }}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, col.id)}
                                >
                                    {/* Kolom Header */}
                                    <div style={{ padding: '16px', borderBottom: '2px solid', borderBottomColor: col.color, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: '12px 12px 0 0' }}>
                                        <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{col.title}</h3>
                                        <span style={{ background: col.color + '22', color: col.color, padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                                            {columnProjects.length}
                                        </span>
                                    </div>
                                    
                                    {/* Mappen Grid in de Kolom */}
                                    <div style={{ padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                        {columnProjects.map(p => {
                                            const done = p.tasks.filter(t => t.completed).length;
                                            const total = p.tasks.length;
                                            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                                            const daysLeft = Math.ceil((new Date(p.endDate + 'T00:00:00') - new Date()) / 86400000);
                                            const teamIds = [...new Set(p.tasks.flatMap(t => t.assignedTo || []))];
                                            const team = allUsers.filter(u => teamIds.includes(u.id));
                                            
                                            return (
                                                <div key={p.id} 
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, p.id)}
                                                    onDragEnd={handleDragEnd}
                                                    style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', overflow: 'hidden', cursor: 'grab', transition: 'box-shadow 0.15s, transform 0.15s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
                                                >
                                                    <div style={{ height: '4px', background: p.color }} />
                                                    <div style={{ padding: '14px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                                                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: p.color + '15', color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                                                                <i className="fa-solid fa-folder-open" />
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>
                                                                    {p.client || '—'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '10px' }}>
                                                            <span><i className="fa-solid fa-location-dot" style={{ opacity: 0.6, marginRight: '4px' }} />{p.address?.split(',')[0] || '—'}</span>
                                                            <span style={{ color: daysLeft < 0 ? '#ef4444' : daysLeft < 14 ? '#f59e0b' : '#64748b', fontWeight: daysLeft < 14 ? 700 : 400 }}>
                                                                {daysLeft < 0 ? 'Verlopen' : `${daysLeft}d`}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <div style={{ display: 'flex' }}>
                                                                {team.slice(0, 3).map((u, i) => (
                                                                    <div key={u.id} title={u.name} style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg,#F5850A,#E07000)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 700, border: '2px solid #fff', marginLeft: i === 0 ? '0' : '-6px', zIndex: team.length - i }}>
                                                                        {u.initials}
                                                                    </div>
                                                                ))}
                                                                {team.length === 0 && <span style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>Geen team</span>}
                                                            </div>
                                                            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: pct === 100 ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <i className="fa-solid fa-check-double" /> {done}/{total}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Link href={`/projecten/${p.id}`}
                                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', background: 'rgba(245,133,10,0.04)', borderTop: '1px solid rgba(245,133,10,0.1)', color: '#F5850A', textDecoration: 'none', fontWeight: 700, fontSize: '0.75rem', transition: 'background 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,133,10,0.08)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,133,10,0.04)'}
                                                    >
                                                        Dossier inzien <i className="fa-solid fa-angle-right" style={{ marginLeft: '4px', fontSize: '0.65rem' }}/>
                                                    </Link>
                                                </div>
                                            );
                                        })}
                                        {columnProjects.length === 0 && (
                                            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic', background: 'transparent', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                                                Sleep hier een map naartoe
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })()}
        </div>

        {/* ===== WORKER AVATAR TOOLTIP (fixed = buiten overflow clipping) ===== */}
        {workerTooltip && (
            <div style={{
                position: 'fixed',
                left: workerTooltip.x,
                top: workerTooltip.y - 36,
                transform: 'translateX(-50%)',
                background: '#1e293b',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '5px 10px',
                borderRadius: '7px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                whiteSpace: 'nowrap',
                zIndex: 99999,
                pointerEvents: 'none',
            }}>
                {workerTooltip.name}
                {/* Arrow */}
                <div style={{
                    position: 'absolute',
                    top: '100%', left: '50%',
                    transform: 'translateX(-50%)',
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '5px solid #1e293b',
                }} />
            </div>
        )}

        {/* ===== TEAM POPUP — inline medewerker toggle voor taken ===== */}
        {teamPopup && (() => {
            const proj = projects.find(pr => pr.id === teamPopup.projectId);
            if (!proj || !teamPopup.taskId) return null;
            const task = proj.tasks.find(t => t.id === teamPopup.taskId);
            if (!task) return null;
            const color = proj.color || 'var(--accent)';
            const dateStr = teamPopup.dateStr || null;

            // Bepaal huidige toewijzing: ALTIJD de hele taak (verzoek compact & gehele taak toewijzen)
            const assigned = task.assignedTo || [];

            const toggle = (userId) => {
                const next = assigned.includes(userId)
                    ? assigned.filter(id => id !== userId)
                    : [...assigned, userId];
                
                // Sla op in assignedTo voor de hele taak
                setProjects(prev => prev.map(pr => pr.id !== proj.id ? pr : {
                    ...pr, tasks: pr.tasks.map(t => t.id !== task.id ? t : { ...t, assignedTo: next })
                }));
            };

            return (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 99990 }}
                        onClick={() => setTeamPopup(null)} />
                    <div style={{
                        position: 'fixed',
                        left: Math.min(teamPopup.x, window.innerWidth - 220),
                        top: teamPopup.y + 6,
                        zIndex: 99995,
                        background: '#fff',
                        borderRadius: '10px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                        border: '1px solid #e2e8f0',
                        padding: '6px',
                        minWidth: '210px',
                        maxWidth: '240px',
                    }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }}></div>
                                <div>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#1e293b' }}>{task.name}</span>
                                    <div style={{ fontSize: '0.55rem', color: '#94a3b8', marginTop: '1px' }}>📋 Toewijzing (hele taak)</div>
                                </div>
                            </div>
                            <button onClick={() => setTeamPopup(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.75rem', padding: '2px' }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {allUsers.map(user => {
                                const on = assigned.includes(user.id);
                                const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
                                return (
                                    <button key={user.id} onClick={() => toggle(user.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '4px 8px',
                                            border: on ? `1.5px solid ${color}` : '1.5px solid #f1f5f9',
                                            background: on ? `${color}14` : '#f8fafc',
                                            borderRadius: '6px',
                                            outline: 'none', width: '100%', textAlign: 'left',
                                            transition: 'all 0.12s',
                                        }}
                                        onMouseEnter={e => { if (!on) e.currentTarget.style.background = '#f1f5f9'; }}
                                        onMouseLeave={e => { if (!on) e.currentTarget.style.background = '#f8fafc'; }}>
                                        <div style={{
                                            width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                                            background: on ? color : '#e2e8f0', color: on ? '#fff' : '#64748b',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.5rem', fontWeight: 800,
                                        }}>{initials}</div>
                                        <span style={{ flex: 1, fontSize: '0.68rem', fontWeight: on ? 700 : 500, color: on ? color : '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {user.name || user.email}
                                        </span>
                                        {on
                                            ? <i className="fa-solid fa-circle-check" style={{ color, fontSize: '0.65rem' }}></i>
                                            : <i className="fa-regular fa-circle" style={{ color: '#cbd5e1', fontSize: '0.65rem' }}></i>
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

        {/* ===== DRAW PREVIEW ===== */}
        {drawCreate && (() => {
            const proj = projects.find(pr => pr.id === drawCreate.projectId);
            const color = proj?.color || '#3b82f6';
            const x1 = Math.min(drawCreate.startX, drawCreate.currentX);
            const x2 = Math.max(drawCreate.startX, drawCreate.currentX);
            const s = drawCreate.startDate <= drawCreate.currentDate ? drawCreate.startDate : drawCreate.currentDate;
            const e = drawCreate.startDate <= drawCreate.currentDate ? drawCreate.currentDate : drawCreate.startDate;
            return (
                <div style={{
                    position: 'fixed', left: x1, top: drawCreate.y,
                    width: Math.max(x2 - x1, 4), height: '30px',
                    background: color, opacity: 0.5, borderRadius: '5px',
                    zIndex: 99980, pointerEvents: 'none',
                    display: 'flex', alignItems: 'center', paddingLeft: '6px',
                    fontSize: '0.65rem', color: '#fff', fontWeight: 600,
                    overflow: 'hidden', whiteSpace: 'nowrap',
                    boxShadow: `0 2px 8px ${color}66`,
                }}>
                    {s !== e ? `${s} - ${e}` : s}
                </div>
            );
        })()}

        {/* ===== QUICK TASK POPUP ===== */}
        {quickTaskPopup && (() => {
            const proj = projects.find(pr => pr.id === quickTaskPopup.projectId);
            if (!proj) return null;
            const color = proj.color || '#3b82f6';
            const saveTask = () => {
                const name = quickTaskName.trim();
                if (!name) return;
                const newT = {
                    id: `t${Date.now()}`,
                    name,
                    startDate: quickTaskPopup.startDate,
                    endDate: quickTaskPopup.endDate,
                    assignedTo: [],
                    completed: false,
                };
                setProjects(prev => prev.map(pr => pr.id !== proj.id ? pr : {
                    ...pr, tasks: [...pr.tasks, newT]
                }));
                setQuickTaskPopup(null);
                setQuickTaskName('');
            };
            const px = Math.min(quickTaskPopup.x, window.innerWidth - 300);
            const py = Math.min(quickTaskPopup.y + 8, window.innerHeight - 160);
            return (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 99990 }} onClick={() => setQuickTaskPopup(null)} />
                    <div style={{
                        position: 'fixed', left: px, top: py, zIndex: 99995,
                        background: '#fff', borderRadius: '12px', padding: '14px 16px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', minWidth: '260px',
                        border: '1px solid rgba(0,0,0,0.07)',
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e293b' }}>{proj.name}</span>
                            <span style={{ fontSize: '0.62rem', color: '#94a3b8', marginLeft: 'auto' }}>
                                {quickTaskPopup.startDate === quickTaskPopup.endDate
                                    ? quickTaskPopup.startDate
                                    : `${quickTaskPopup.startDate} - ${quickTaskPopup.endDate}`}
                            </span>
                        </div>
                        <input
                            autoFocus type="text" value={quickTaskName}
                            onChange={e => setQuickTaskName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveTask(); if (e.key === 'Escape') setQuickTaskPopup(null); }}
                            placeholder="Naam van de taak..."
                            style={{
                                width: '100%', border: `1.5px solid ${color}`, borderRadius: '7px',
                                padding: '7px 10px', fontSize: '0.8rem', outline: 'none',
                                color: '#1e293b', marginBottom: '10px', boxSizing: 'border-box',
                            }}
                        />
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setQuickTaskPopup(null)}
                                style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '0.72rem', cursor: 'pointer' }}>
                                Annuleer
                            </button>
                            <button onClick={saveTask}
                                style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', background: color, color: '#fff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                                + Taak opslaan
                            </button>
                        </div>
                    </div>
                </>
            );
        })()}

        {/* ===== NOTITIE HOVER TOOLTIP OP TIJDLIJN ===== */}
        {noteTooltip && (
            <div onMouseEnter={() => {}} onMouseLeave={() => setNoteTooltip(null)}
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
                                <p style={{ margin: 0, fontSize: '0.72rem', color: '#1e293b', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.text}</p>
                                <span style={{ fontSize: '0.55rem', color: '#94a3b8' }}>{n.isLinked ? '🔗 ' : ''}{n.date}</span>
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

        {/* ===== TAAKNOTITIE POPUP ===== */}
        {notePopup && (() => {
            const proj = projects.find(p => p.id === notePopup.projectId);
            const task = proj?.tasks?.find(t => t.id === notePopup.taskId);
            if (!proj || !task) return null;
            const notes = task.notes || [];

            // Projectnotities laden via API (zelfde als Notities-tabblad in /projecten/[id])
            const projectNotes = projectNotesCache[proj.id] || [];
            // Laad als nog niet beschikbaar of als we naar Koppel-tab switchen
            if (noteTab === 'koppel' && !projectNotesCache[proj.id] && !projectNotesLoading) {
                setProjectNotesLoading(true);
                fetch(`/api/notes?projectId=${proj.id}`)
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            // DB geeft 'content' en 'created_at' terug, wij verwachten 'text' en 'date'
                            const mapped = (data.notes || []).map(n => ({
                                id: n.id,
                                text: n.content || n.text || '',
                                author: n.author || 'Onbekend',
                                type: n.type || 'info',
                                date: n.date ? new Date(n.date).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })
                                    : n.created_at ? new Date(n.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
                            }));
                            setProjectNotesCache(prev => ({ ...prev, [proj.id]: mapped }));
                        } else setProjectNotesCache(prev => ({ ...prev, [proj.id]: [] }));
                    })
                    .catch(() => setProjectNotesCache(prev => ({ ...prev, [proj.id]: [] })))
                    .finally(() => setProjectNotesLoading(false));

            }
            const NOTE_TYPE_COLORS = { info: '#3b82f6', actie: '#f59e0b', probleem: '#ef4444', klant: '#10b981', planning: '#8b5cf6' };

            const addNote = () => {
                const txt = noteInput.trim();
                if (!txt) return;
                const newNote = { id: Date.now(), text: txt, type: 'nieuw', date: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) };
                setProjects(prev => prev.map(pr => pr.id !== proj.id ? pr : {
                    ...pr, tasks: pr.tasks.map(tk => tk.id !== task.id ? tk : { ...tk, notes: [...(tk.notes || []), newNote] })
                }));
                setNoteInput('');
            };
            const linkNote = (pn) => {
                // Koppel projectnotitie als referentie (voorkom duplicaten)
                if (notes.some(n => n.linkedId === pn.id)) return;
                const ref = { id: Date.now(), linkedId: pn.id, text: pn.text, type: pn.type || 'info', author: pn.author, date: pn.date, isLinked: true };
                setProjects(prev => prev.map(pr => pr.id !== proj.id ? pr : {
                    ...pr, tasks: pr.tasks.map(tk => tk.id !== task.id ? tk : { ...tk, notes: [...(tk.notes || []), ref] })
                }));
            };
            const addReply = (noteId, replyText) => {
                const txt = replyText.trim();
                if (!txt) return;
                const author = user?.name || 'Jan Modaal';
                const dateStr = new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const reply = { id: Date.now(), text: txt, author, date: dateStr };
                // Optimistisch toevoegen aan lokale state
                setProjects(prev => prev.map(pr => pr.id !== proj.id ? pr : {
                    ...pr, tasks: pr.tasks.map(tk => tk.id !== task.id ? tk : {
                        ...tk, notes: (tk.notes || []).map(n => n.id !== noteId ? n : { ...n, replies: [...(n.replies || []), reply] })
                    })
                }));
                setReplyInput('');
                setReplyingTo(null);
                // Opslaan via API (synchronisatie)
                if (String(noteId).length > 10 === false) { // alleen echte DB IDs (niet temp IDs)
                    fetch(`/api/notes/${noteId}/replies`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ author, content: txt })
                    }).catch(err => console.error('Kon reactie niet opslaan:', err));
                }
            };

            const deleteNote = (nid) => {
                setProjects(prev => prev.map(pr => pr.id !== proj.id ? pr : {
                    ...pr, tasks: pr.tasks.map(tk => tk.id !== task.id ? tk : { ...tk, notes: (tk.notes || []).filter(n => n.id !== nid) })
                }));
            };

            return (
                <>
                    <div onClick={() => setNotePopup(null)} style={{ position: 'fixed', inset: 0, zIndex: 1099, background: 'rgba(15,23,42,0.25)' }} />
                    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '360px', zIndex: 1100, background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(15,23,42,0.15)', borderLeft: '1px solid #e2e8f0' }}>
                        {/* Header */}
                        <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-note-sticky" style={{ color: '#f59e0b', fontSize: '0.9rem' }} />
                                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>Taaknotities</span>
                                </div>
                                <button onClick={() => setNotePopup(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem', padding: '4px' }}>
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>
                            {/* Breadcrumb */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
                                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: proj.color, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{proj.name}</span>
                                <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.48rem', color: '#cbd5e1' }} />
                                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{task.name}</span>
                            </div>
                            {/* Tabs */}
                            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', gap: '3px' }}>
                                {[['nieuw', 'fa-plus', 'Nieuwe notitie'], ['koppel', 'fa-link', 'Koppel project-notitie']].map(([v, icon, lbl]) => (
                                    <button key={v} onClick={() => {
                                        setNoteTab(v);
                                        // Bij klikken op "Koppel": reset cache voor dit project zodat we fresh data ophalen
                                        if (v === 'koppel') setProjectNotesCache(prev => ({ ...prev, [proj.id]: undefined }));
                                    }}
                                        style={{ flex: 1, padding: '5px 8px', borderRadius: '6px', border: 'none', background: noteTab === v ? '#fff' : 'transparent', color: noteTab === v ? '#1e293b' : '#94a3b8', fontWeight: noteTab === v ? 700 : 500, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', boxShadow: noteTab === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                                        <i className={`fa-solid ${icon}`} style={{ fontSize: '0.6rem' }} />{lbl}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bestaande taaknotities */}
                        {notes.length > 0 && (
                            <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Gekoppeld aan deze taak ({notes.length})</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                                    {notes.map(n => (
                                        <div key={n.id} style={{ background: n.isLinked ? '#f0fdf4' : '#fffbeb', border: `1px solid ${n.isLinked ? '#bbf7d0' : '#fde68a'}`, borderRadius: '8px', padding: '10px 12px', position: 'relative' }}>
                                            {/* Auteur + type balk */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <i className={`fa-solid ${n.isLinked ? 'fa-link' : 'fa-note-sticky'}`} style={{ color: n.isLinked ? '#10b981' : '#f59e0b', fontSize: '0.6rem' }} />
                                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: n.isLinked ? '#10b981' : '#92400e' }}>
                                                        {n.author || 'Onbekend'}{n.isLinked ? ' · project-notitie' : ''}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <button onClick={() => { setReplyingTo(replyingTo === n.id ? null : n.id); setReplyInput(''); }}
                                                        title="Reageer op deze notitie"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: replyingTo === n.id ? '#f59e0b' : '#cbd5e1', fontSize: '0.65rem', padding: '1px 3px', flexShrink: 0, transition: 'color 0.15s', display: 'flex', alignItems: 'center', gap: '3px' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = '#f59e0b'}
                                                        onMouseLeave={e => e.currentTarget.style.color = replyingTo === n.id ? '#f59e0b' : '#cbd5e1'}>
                                                        <i className="fa-solid fa-reply" />
                                                        {(n.replies || []).length > 0 && <span style={{ fontSize: '0.52rem', fontWeight: 700 }}>{n.replies.length}</span>}
                                                    </button>
                                                    <button onClick={() => deleteNote(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '0.65rem', padding: '1px', flexShrink: 0, transition: 'color 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                        onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                                                        <i className="fa-solid fa-xmark" />
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Volledige tekst */}
                                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#1e293b', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n.text}</p>
                                            <span style={{ fontSize: '0.58rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>{n.date}</span>
                                            {/* Reacties */}
                                            {(n.replies || []).length > 0 && (
                                                <div style={{ marginTop: '8px', paddingLeft: '10px', borderLeft: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {n.replies.map(r => (
                                                        <div key={r.id}>
                                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <i className="fa-solid fa-reply" style={{ color: '#94a3b8', fontSize: '0.5rem', transform: 'scaleX(-1)' }} />
                                                                {r.author}
                                                            </div>
                                                            <p style={{ margin: 0, fontSize: '0.74rem', color: '#334155', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{r.text}</p>
                                                            <span style={{ fontSize: '0.55rem', color: '#94a3b8' }}>{r.date}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Inline reply invoer */}
                                            {replyingTo === n.id && (
                                                <div style={{ marginTop: '8px', paddingLeft: '10px', borderLeft: '2px solid #f59e0b' }}>
                                                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>Jouw reactie als {user?.name || 'Jan Modaal'}</div>
                                                    <textarea
                                                        autoFocus
                                                        value={replyInput}
                                                        onChange={e => setReplyInput(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addReply(n.id, replyInput); if (e.key === 'Escape') { setReplyingTo(null); setReplyInput(''); } }}
                                                        placeholder="Typ je reactie... (Ctrl+Enter om op te slaan, Esc om te annuleren)"
                                                        rows={2}
                                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '0.74rem', color: '#1e293b', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fffbeb' }}
                                                    />
                                                    <div style={{ display: 'flex', gap: '6px', marginTop: '5px', justifyContent: 'flex-end' }}>
                                                        <button onClick={() => { setReplyingTo(null); setReplyInput(''); }}
                                                            style={{ padding: '3px 10px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '5px', cursor: 'pointer', fontSize: '0.65rem', color: '#94a3b8' }}>Annuleer</button>
                                                        <button onClick={() => addReply(n.id, replyInput)} disabled={!replyInput.trim()}
                                                            style={{ padding: '3px 10px', background: replyInput.trim() ? '#f59e0b' : '#e2e8f0', border: 'none', borderRadius: '5px', cursor: replyInput.trim() ? 'pointer' : 'not-allowed', fontSize: '0.65rem', fontWeight: 700, color: replyInput.trim() ? '#fff' : '#94a3b8' }}>
                                                            <i className="fa-solid fa-reply" style={{ marginRight: '3px' }} />Verstuur
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div style={{ height: '1px', background: '#f1f5f9', margin: '10px 0 0' }} />
                            </div>
                        )}


                        {/* Tab inhoud */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                            {noteTab === 'nieuw' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {notes.filter(n => !n.isLinked).length === 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', color: '#94a3b8' }}>
                                            <i className="fa-regular fa-note-sticky" style={{ fontSize: '1.8rem', opacity: 0.35 }} />
                                            <span style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>Schrijf hieronder een nieuwe notitie</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Koppel tab — bestaande projectnotities
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {projectNotesLoading && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px', color: '#94a3b8', justifyContent: 'center' }}>
                                            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1rem' }} />
                                            <span style={{ fontSize: '0.75rem' }}>Projectnotities laden...</span>
                                        </div>
                                    )}
                                    {!projectNotesLoading && projectNotes.length === 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px 16px', color: '#94a3b8' }}>
                                            <i className="fa-solid fa-folder-open" style={{ fontSize: '1.8rem', opacity: 0.3 }} />
                                            <span style={{ fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'center' }}>Geen projectnotities gevonden.<br/>Ga naar het <strong>Notities-tabblad</strong> van dit project om er een te maken.</span>
                                        </div>
                                    )}
                                    {projectNotes.map(pn => {
                                        const isAlreadyLinked = notes.some(n => n.linkedId === pn.id);
                                        const typeColor = NOTE_TYPE_COLORS[pn.type] || '#3b82f6';
                                        return (
                                            <div key={pn.id} style={{ background: isAlreadyLinked ? '#f0fdf4' : '#f8fafc', border: `1px solid ${isAlreadyLinked ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: '8px', padding: '10px 12px', display: 'flex', gap: '10px', alignItems: 'flex-start', opacity: isAlreadyLinked ? 0.8 : 1 }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: typeColor, flexShrink: 0, marginTop: '4px' }} />
                                                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                                    <p style={{ margin: '0 0 4px', fontSize: '0.76rem', color: '#1e293b', lineHeight: 1.4, wordBreak: 'break-word', overflow: 'hidden' }}>{pn.text}</p>
                                                    <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{pn.author} · {pn.date}</span>
                                                </div>
                                                <button onClick={() => !isAlreadyLinked && linkNote(pn)}
                                                    title={isAlreadyLinked ? 'Al gekoppeld' : 'Koppel aan taak'}
                                                    style={{ background: isAlreadyLinked ? '#dcfce7' : 'var(--accent)', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: isAlreadyLinked ? 'default' : 'pointer', color: isAlreadyLinked ? '#16a34a' : '#fff', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s' }}>
                                                    <i className={`fa-solid ${isAlreadyLinked ? 'fa-check' : 'fa-link'}`} />
                                                    {isAlreadyLinked ? 'Gekoppeld' : 'Koppel'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Nieuwe notitie invoer (alleen in nieuw-tab) */}
                        {noteTab === 'nieuw' && (
                            <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', flexShrink: 0, background: '#fafafa' }}>
                                <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote(); }}
                                    placeholder="Schrijf een notitie... (Ctrl+Enter om op te slaan)"
                                    rows={3}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#1e293b', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }}
                                    autoFocus />
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

        </>
    );
}