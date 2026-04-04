'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';

const DAY_NAMES      = ['Ma','Di','Wo','Do','Vr','Za','Zo'];
const DAY_NAMES_FULL = ['Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag','Zondag'];
const MONTH_NAMES       = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const MONTH_NAMES_SHORT = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

// Lokale datumformattering (geen UTC-verschuiving)
function fmtLocal(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

// Feestdagen
function getEaster(year) {
    const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
    return new Date(year,Math.floor((h+l-7*m+114)/31)-1,((h+l-7*m+114)%31)+1);
}
function getDutchHolidays(year) {
    const e = getEaster(year);
    const add = (d,n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
    const fmt = d => fmtLocal(d);
    return {
        [fmt(new Date(year,0,1))]:  'Nieuwjaarsdag',
        [fmt(add(e,-2))]:           'Goede Vrijdag',
        [fmt(e)]:                   'Eerste Paasdag',
        [fmt(add(e,1))]:            'Tweede Paasdag',
        [fmt(new Date(year,3,27))]: 'Koningsdag',
        [fmt(new Date(year,4,5))]:  'Bevrijdingsdag',
        [fmt(add(e,39))]:           'Hemelvaartsdag',
        [fmt(add(e,49))]:           'Eerste Pinksterdag',
        [fmt(add(e,50))]:           'Tweede Pinksterdag',
        [fmt(new Date(year,11,25))]:'Eerste Kerstdag',
        [fmt(new Date(year,11,26))]:'Tweede Kerstdag',
    };
}
const HOLIDAYS = (() => {
    const result = {}; const cy = new Date().getFullYear();
    for (let y = cy-1; y <= cy+2; y++) Object.assign(result, getDutchHolidays(y));
    return result;
})();

function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getMondayOfWeek(week, year) {
    const jan4 = new Date(year, 0, 4);
    const dow = jan4.getDay() || 7;
    const mon = new Date(jan4);
    mon.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);
    return mon;
}

function getMyPlanningForWeek(userId, week, year) {
    try {
        const raw = localStorage.getItem('schildersapp_projecten');
        const projects = raw ? JSON.parse(raw) : [];
        const monday = getMondayOfWeek(week, year);

        // Gebruik lokale formattering (geen UTC-verschuiving!)
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return fmtLocal(d);
        });

        const result = days.map(iso => ({ iso, items: [] }));

        for (const p of projects) {
            if (!p.tasks) continue;
            for (const t of p.tasks) {
                const assignedTo = (t.assignedTo || []).map(x => typeof x === 'object' ? x.id : x).map(Number);
                const uid = Number(userId);

                days.forEach((iso, i) => {
                    const dow = new Date(iso + 'T00:00:00').getDay();
                    if (dow === 0 || dow === 6) return;
                    if (HOLIDAYS[iso]) return;

                    // Gebruik assignedByDay voor dag-specifieke check (zelfde als personeelsplanning)
                    const hasDayOverride = (t.assignedByDay || {})[iso] !== undefined;
                    const dayIds = hasDayOverride
                        ? (t.assignedByDay[iso] || []).map(x => typeof x === 'object' ? x.id : x).map(Number)
                        : assignedTo;

                    if (!dayIds.includes(uid)) return;

                    const inRange = t.startDate && t.endDate && iso >= t.startDate && iso <= t.endDate;
                    if (inRange || hasDayOverride) {
                        result[i].items.push({
                            projectName: p.name,
                            projectId: p.id,
                            color: p.color || '#F5850A',
                            taskName: t.name,
                            taskId: t.id,
                            client: p.client || '',
                            address: p.address || '',
                            completed: t.completed,
                            progress: t.progress || 0,
                            notes: (t.notes || []).filter(n => typeof n === 'object'),
                        });
                    }
                });
            }
        }
        return result;
    } catch { return []; }
}

export default function MedewerkerPlanning() {
    const { user } = useAuth();
    const today = new Date();
    const todayIso = fmtLocal(today); // lokale datum, geen UTC-verschuiving

    const [week, setWeek] = useState(getISOWeek(today));
    const [replyText, setReplyText] = useState('');
    const [replyType, setReplyType] = useState('info');
    const [replyImage, setReplyImage] = useState(null);
    const [year, setYear] = useState(today.getFullYear());
    const [planning, setPlanning] = useState([]);
    const [detail, setDetail] = useState(null);
    const [detailTab, setDetailTab] = useState('uren'); // 'info' | 'checklist' | 'uren'
    const [vacDays, setVacDays] = useState(new Set());
    const [urenAantal, setUrenAantal] = useState('');
    const [urenNote, setUrenNote] = useState('');
    const [urenLijst, setUrenLijst] = useState([]);
    const [urenEditId, setUrenEditId] = useState(null);   // id van blok dat bewerkt wordt
    const [urenEditVal, setUrenEditVal] = useState('');   // uren waarde tijdens bewerken
    const [urenEditNote, setUrenEditNote] = useState(''); // opmerking tijdens bewerken
    // Meerwerk
    const [meerwerkText, setMeerwerkText] = useState('');
    const [meerwerkImage, setMeerwerkImage] = useState(null);
    const [meerwerkVideoUrl, setMeerwerkVideoUrl] = useState(null);        // object URL voor preview
    const [meerwerkVideoServerUrl, setMeerwerkVideoServerUrl] = useState(null); // server URL na upload
    const [videoRecording, setVideoRecording] = useState(false);
    const [videoUploading, setVideoUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [videoSec, setVideoSec] = useState(0);
    const [sttActive, setSttActive] = useState(false);
    const [sttInterim, setSttInterim] = useState('');
    // Uren accordion secties
    const [urenSection, setUrenSection] = useState(null); // 'meerwerk' | 'ziek' | 'andere'
    const [showProjectChange, setShowProjectChange] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');
    const [changeProject, setChangeProject] = useState(null);
    const [meerwerkUren, setMeerwerkUren] = useState('');
    const [ziekeNote, setZiekeNote] = useState('');
    const [andereOmschrijving, setAndereOmschrijving] = useState('');
    const [andereUren, setAndereUren] = useState('');
    const [localProgress, setLocalProgress] = useState(0);
    const [progressSaved, setProgressSaved] = useState(false);
    // ── Info tab secties ──
    const [poSectOpen, setPoSectOpen] = useState({ werkomschrijving: false, checklist: false, opmerkingen: false, bestanden: false, fotos: false });
    const [previewAtt, setPreviewAtt] = useState(null);
    const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [infoNotities, setInfoNotities] = useState([]);
    const [poNoteText, setPoNoteText] = useState('');
    const [poNoteType, setPoNoteType] = useState('info');
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingNoteText, setEditingNoteText] = useState('');
    const [poNoteMedia, setPoNoteMedia] = useState(null);
    const [poNoteMediaUploading, setPoNoteMediaUploading] = useState(false);
    const [addingMediaToNoteId, setAddingMediaToNoteId] = useState(null);
    const [addMediaUploading, setAddMediaUploading] = useState(false);
    const [replyingToNoteId, setReplyingToNoteId] = useState(null);
    const [infoReplyText, setInfoReplyText] = useState('');
    const [fotoUploading, setFotoUploading] = useState(false);
    const [infoAdminFotos, setInfoAdminFotos] = useState([]);
    const [infoVersion, setInfoVersion] = useState(0);
    const noteMediaInputRef = useRef(null);
    const noteAddMediaInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const recognitionRef = useRef(null);
    const videoRecorderRef = useRef(null);
    const videoChunksRef = useRef([]);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        setPlanning(getMyPlanningForWeek(user.id, week, year));
    }, [user, week, year]);

    const [weekUren, setWeekUren] = useState([]);
    useEffect(() => {
        if (!user) return;
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            setWeekUren(all.filter(e => e.userId === user.id));
        } catch { setWeekUren([]); }
    }, [user, week, year, urenLijst]);

    // Vakantiedagen laden uit localStorage
    useEffect(() => {
        if (!user) return;
        const yr = year;
        const key = `schildersapp_vakantie_${yr}_${user.name}`;
        try {
            const raw = localStorage.getItem(key);
            const arr = raw ? JSON.parse(raw) : [];
            setVacDays(new Set(arr));
        } catch { setVacDays(new Set()); }
    }, [user, year]);

    // Notities laden zodra detail-modal opent
    useEffect(() => {
        if (!detail?.projectId) { setInfoNotities([]); return; }
        const pid = detail.projectId;
        const loadLocal = () => {
            try { setInfoNotities(JSON.parse(localStorage.getItem(`schildersapp_notes_${pid}`) || '[]')); } catch { setInfoNotities([]); }
        };
        const loadServer = async () => {
            try {
                const res = await fetch(`/api/notes?projectId=${pid}`);
                const data = await res.json();
                if (data.success) {
                    const n = data.notes.map(n => ({ ...n, text: n.text || n.content || '' }));
                    setInfoNotities(n);
                    localStorage.setItem(`schildersapp_notes_${pid}`, JSON.stringify(n));
                }
            } catch { loadLocal(); }
        };
        loadServer();
        window.addEventListener('schilders-sync', loadLocal);
        return () => window.removeEventListener('schilders-sync', loadLocal);
    }, [detail?.projectId]);

    // Admin-fotos laden
    useEffect(() => {
        if (!detail?.projectId) { setInfoAdminFotos([]); return; }
        const pid = detail.projectId;
        const load = () => {
            try { setInfoAdminFotos(JSON.parse(localStorage.getItem(`schildersapp_photos_${pid}`) || '[]')); } catch { setInfoAdminFotos([]); }
        };
        load();
        window.addEventListener('photos-updated', load);
        return () => window.removeEventListener('photos-updated', load);
    }, [detail?.projectId]);

    const monday = getMondayOfWeek(week, year);
    const friday = new Date(monday); friday.setDate(monday.getDate() + 4);
    const weekLabel = `${monday.getDate()} ${MONTH_NAMES_SHORT[monday.getMonth()]} – ${friday.getDate()} ${MONTH_NAMES_SHORT[friday.getMonth()]} ${year}`;

    function prevWeek() {
        if (week === 1) { setWeek(52); setYear(y => y - 1); } else setWeek(w => w - 1);
    }
    function nextWeek() {
        if (week === 52) { setWeek(1); setYear(y => y + 1); } else setWeek(w => w + 1);
    }

    // Alleen ma-vr tonen
    const workDays = planning.slice(0, 5);
    const hasAny = workDays.some(d => d.items.length > 0);

    function handleImageSelect(e) {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxW = 900;
                const scale = Math.min(1, maxW / img.width);
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                setReplyImage(canvas.toDataURL('image/jpeg', 0.72));
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    function saveReply() {
        if (!replyText.trim() && !replyImage) return;
        if (!user || !detail) return;
        const newNote = {
            type: replyType,
            text: replyText.trim(),
            author: user.name,
            date: todayIso,
            ...(replyImage ? { image: replyImage } : {}),
        };
        try {
            const raw = localStorage.getItem('schildersapp_projecten');
            const projects = raw ? JSON.parse(raw) : [];
            const updated = projects.map(p => {
                if (p.id !== detail.projectId) return p;
                return {
                    ...p,
                    tasks: (p.tasks || []).map(t => {
                        if (t.id !== detail.taskId) return t;
                        return { ...t, notes: [...(t.notes || []), newNote] };
                    }),
                };
            });
            localStorage.setItem('schildersapp_projecten', JSON.stringify(updated));
        } catch {}
        setDetail(prev => ({ ...prev, notes: [...(prev.notes || []), newNote] }));
        setReplyText('');
        setReplyType('info');
        setReplyImage(null);
    }

    function loadUren(taskId, dateIso) {
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            return all.filter(e => e.taskId === taskId && e.date === dateIso && e.userId === user?.id);
        } catch { return []; }
    }

    function saveUren() {
        const h = parseFloat(urenAantal);
        if (!h || h <= 0 || !detail || !user) return;
        const entry = {
            id: Date.now(),
            userId: user.id,
            userName: user.name,
            projectId: detail.projectId,
            projectName: detail.projectName,
            taskId: detail.taskId,
            taskName: detail.taskName,
            date: detail.date,
            hours: h,
            note: urenNote.trim(),
        };
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            all.push(entry);
            localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(all));
        } catch {}
        setUrenLijst(prev => [...prev, entry]);
        setUrenAantal('');
        setUrenNote('');
    }

    function saveUrenEdit(id) {
        const h = parseFloat(urenEditVal);
        if (!h || h <= 0) return;
        const update = (list) => list.map(e => e.id === id ? { ...e, hours: h, note: urenEditNote.trim() } : e);
        setUrenLijst(prev => update(prev));
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(update(all)));
        } catch {}
        setUrenEditId(null);
    }

    function deleteUren(id) {
        setUrenLijst(prev => prev.filter(e => e.id !== id));
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(all.filter(e => e.id !== id)));
        } catch {}
        if (urenEditId === id) setUrenEditId(null);
    }

    // ── Spraak naar tekst ──
    function startSpeechToText() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            alert('Spraakherkenning wordt niet ondersteund in deze browser. Gebruik Chrome of Edge.');
            return;
        }
        const rec = new SR();
        rec.lang = 'nl-NL';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            if (final) {
                setMeerwerkText(prev => (prev ? prev + ' ' : '') + final.trim());
                setSttInterim('');
            } else {
                setSttInterim(interim);
            }
        };
        rec.onerror = () => { setSttActive(false); setSttInterim(''); };
        rec.onend = () => { setSttActive(false); setSttInterim(''); };
        rec.start();
        recognitionRef.current = rec;
        setSttActive(true);
        setSttInterim('');
    }

    function stopSpeechToText() {
        recognitionRef.current?.stop();
        setSttActive(false);
        setSttInterim('');
    }

    // ── Video opnemen + server upload ──
    const MAX_VIDEO_SEC = 30;

    function uploadVideoBlob(blob, filename, projectId) {
        setVideoUploading(true);
        setUploadProgress(0);
        const fd = new FormData();
        fd.append('file', blob, filename);
        fd.append('projectId', projectId || 'algemeen');
        fd.append('category', 'meerwerk');
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100));
        };
        xhr.onload = () => {
            try {
                const data = JSON.parse(xhr.responseText);
                if (data.success && data.url) {
                    setMeerwerkVideoServerUrl(data.url);
                    setUploadProgress(100);
                } else {
                    alert('Upload mislukt: ' + (data.error || 'onbekende fout'));
                    setMeerwerkVideoUrl(null);
                }
            } catch {
                alert('Upload mislukt — onverwacht antwoord van server.');
                setMeerwerkVideoUrl(null);
            }
            setVideoUploading(false);
        };
        xhr.onerror = () => {
            alert('Upload mislukt — controleer de verbinding.');
            setMeerwerkVideoUrl(null);
            setVideoUploading(false);
        };
        xhr.open('POST', '/api/upload');
        xhr.send(fd);
    }

    function startVideoRecording() {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 640 }, audio: true })
            .then(stream => {
                videoChunksRef.current = [];
                const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
                    ? 'video/webm;codecs=vp8,opus' : 'video/webm';
                const mr = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1000000 });
                mr.ondataavailable = e => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
                mr.onstop = () => {
                    stream.getTracks().forEach(t => t.stop());
                    const blob = new Blob(videoChunksRef.current, { type: mimeType });
                    const previewUrl = URL.createObjectURL(blob);
                    setMeerwerkVideoUrl(previewUrl);
                    setVideoRecording(false);
                    clearInterval(timerRef.current);
                    uploadVideoBlob(blob, `meerwerk_${Date.now()}.webm`, detail?.projectId);
                };
                mr.start();
                videoRecorderRef.current = mr;
                setVideoRecording(true);
                setVideoSec(0);
                timerRef.current = setInterval(() => {
                    setVideoSec(s => {
                        if (s + 1 >= MAX_VIDEO_SEC) {
                            mr.stop();
                            clearInterval(timerRef.current);
                        }
                        return s + 1;
                    });
                }, 1000);
            })
            .catch(() => alert('Cameratoegang geweigerd. Controleer de browserinstellingen.'));
    }

    function stopVideoRecording() {
        videoRecorderRef.current?.stop();
        clearInterval(timerRef.current);
    }

    function handleVideoFile(e) {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('video/')) return;
        const previewUrl = URL.createObjectURL(file);
        setMeerwerkVideoUrl(previewUrl);
        uploadVideoBlob(file, file.name, detail?.projectId);
        e.target.value = '';
    }

    function handleMeerwerkImage(e) {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxW = 900;
                const scale = Math.min(1, maxW / img.width);
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                setMeerwerkImage(canvas.toDataURL('image/jpeg', 0.72));
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    function saveMeerwerk() {
        if (!meerwerkText.trim() && !meerwerkImage && !meerwerkVideoServerUrl) return;
        if (!detail || !user) return;
        if (sttActive) stopSpeechToText();
        const entry = {
            id: Date.now(),
            userId: user.id,
            userName: user.name,
            projectId: detail.projectId,
            projectName: detail.projectName,
            taskId: detail.taskId,
            taskName: detail.taskName,
            date: detail.date,
            text: meerwerkText.trim(),
            hours: parseFloat(meerwerkUren) || null,
            image: meerwerkImage || null,
            video: meerwerkVideoServerUrl || null,
            status: 'ingediend',
        };
        try {
            const raw = localStorage.getItem('schildersapp_meerwerk');
            const all = raw ? JSON.parse(raw) : [];
            all.push(entry);
            localStorage.setItem('schildersapp_meerwerk', JSON.stringify(all));
        } catch (err) {
            if (err.name === 'QuotaExceededError') {
                alert('Opslag vol — de video is te groot om op te slaan. Probeer een kortere video.');
                return;
            }
        }
        setMeerwerkText('');
        setMeerwerkImage(null);
        setMeerwerkVideoServerUrl(null);
        setMeerwerkVideoUrl(null);
        setMeerwerkUren('');
        setUrenSection(null);
        alert('Meerwerk ingediend — de beheerder wordt op de hoogte gesteld.');
    }

    function saveSick() {
        if (!detail) return;
        const entry = {
            id: 'ziek_' + Date.now(),
            userId: user.id,
            projectId: detail.projectId,
            taskId: detail.taskId,
            taskName: detail.taskName,
            date: detail.date,
            type: 'ziek',
            note: ziekeNote.trim() || 'Ziek gemeld',
        };
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            all.push(entry);
            localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(all));
            setUrenLijst(loadUren(detail.taskId, detail.date));
        } catch {}
        setZiekeNote('');
        setUrenSection(null);
        alert('Ziekmelding opgeslagen.');
    }

    function saveAndereUren() {
        if (!detail || !andereOmschrijving.trim() || !parseFloat(andereUren)) return;
        const entry = {
            id: 'andere_' + Date.now(),
            userId: user.id,
            projectId: detail.projectId,
            taskId: detail.taskId,
            taskName: detail.taskName,
            date: detail.date,
            hours: parseFloat(andereUren),
            type: 'andere',
            note: andereOmschrijving.trim(),
        };
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            all.push(entry);
            localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(all));
            setUrenLijst(loadUren(detail.taskId, detail.date));
        } catch {}
        setAndereOmschrijving('');
        setAndereUren('');
        setUrenSection(null);
    }

    function saveProjectChange(newTask, newProject) {
        try {
            const raw = localStorage.getItem('schildersapp_projecten');
            const projects = raw ? JSON.parse(raw) : [];
            const dateIso = detail.date;
            const uid = Number(user.id);

            // Oude taak: verwijder user uit assignedByDay voor deze dag
            // (zelfde mechanisme als de personeelsplanning gebruikt)
            for (const p of projects) {
                for (const t of (p.tasks || [])) {
                    // eslint-disable-next-line eqeqeq
                    if (t.id == detail.taskId) {
                        const current = ((t.assignedByDay || {})[dateIso] ?? t.assignedTo ?? [])
                            .map(x => typeof x === 'object' ? x.id : x).map(Number);
                        t.assignedByDay = { ...(t.assignedByDay || {}), [dateIso]: current.filter(x => x !== uid) };
                    }
                }
            }

            // Nieuwe taak: voeg user toe aan assignedByDay + workerDates voor deze dag
            // workerDates zorgt dat de Gantt in de personeelsplanning een balkje toont op precies deze dag
            for (const p of projects) {
                // eslint-disable-next-line eqeqeq
                if (p.id != newProject.id) continue;
                for (const t of (p.tasks || [])) {
                    // eslint-disable-next-line eqeqeq
                    if (t.id != newTask.id) continue;
                    // assignedByDay → medewerker planning dag-weergave
                    const current = ((t.assignedByDay || {})[dateIso] || [])
                        .map(x => typeof x === 'object' ? x.id : x).map(Number);
                    if (!current.includes(uid)) current.push(uid);
                    t.assignedByDay = { ...(t.assignedByDay || {}), [dateIso]: current };
                    // workerDates → Gantt balkje in personeelsplanning
                    t.workerDates = { ...(t.workerDates || {}), [uid]: { startDate: dateIso, endDate: dateIso } };
                }
            }


            localStorage.setItem('schildersapp_projecten', JSON.stringify(projects));
            setPlanning(getMyPlanningForWeek(user.id, week, year));
            setDetail(null);
        } catch (e) { console.error('saveProjectChange fout:', e); }
    }

    function saveProgress(progress, markCompleted = false) {
        try {
            const raw = localStorage.getItem('schildersapp_projecten');
            const projects = raw ? JSON.parse(raw) : [];
            for (const p of projects) {
                for (const t of (p.tasks || [])) {
                    // eslint-disable-next-line eqeqeq
                    if (t.id == detail.taskId) {
                        t.progress = progress;
                        if (markCompleted) t.completed = true;
                        if (progress < 100) t.completed = false;
                    }
                }
            }
            localStorage.setItem('schildersapp_projecten', JSON.stringify(projects));
            setDetail(prev => ({ ...prev, progress, completed: markCompleted || (progress === 100) }));
            setLocalProgress(progress);
            setProgressSaved(true);
            setPlanning(getMyPlanningForWeek(user.id, week, year));
            setTimeout(() => setProgressSaved(false), 2000);
        } catch (e) { console.error('saveProgress fout:', e); }
    }

    const NOTE_TYPES_MW = {
        info:     { label: 'Info',     color: '#3b82f6', bg: '#eff6ff', icon: 'fa-circle-info' },
        actie:    { label: 'Actie',    color: '#f59e0b', bg: '#fffbeb', icon: 'fa-bolt' },
        probleem: { label: 'Probleem', color: '#ef4444', bg: '#fef2f2', icon: 'fa-triangle-exclamation' },
        klant:    { label: 'Klant',    color: '#10b981', bg: '#f0fdf4', icon: 'fa-user' },
        planning: { label: 'Planning', color: '#8b5cf6', bg: '#f5f3ff', icon: 'fa-calendar-days' },
    };

    function saveInfoProject(updatedProject) {
        try {
            const all = JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]');
            localStorage.setItem('schildersapp_projecten', JSON.stringify(all.map(p => p.id === updatedProject.id ? updatedProject : p)));
            window.dispatchEvent(new Event('schilders-sync'));
            setInfoVersion(v => v + 1);
        } catch {}
        fetch('/api/projecten', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: updatedProject }) }).catch(() => {});
    }

    const openPreview = async (b) => {
        setPreviewAtt(b);
        setPreviewBlobUrl(null);
        const src = b.data || b.url;
        if (src && src.startsWith('/')) {
            setPreviewLoading(true);
            try {
                const res = await fetch(src);
                const rawBlob = await res.blob();
                const isPdf = b.type === 'application/pdf' || b.name?.toLowerCase().endsWith('.pdf');
                const blob = isPdf ? new Blob([rawBlob], { type: 'application/pdf' }) : rawBlob;
                setPreviewBlobUrl(URL.createObjectURL(blob));
            } catch {} finally { setPreviewLoading(false); }
        } else { setPreviewBlobUrl(src); }
    };
    const closePreview = () => { setPreviewAtt(null); setPreviewBlobUrl(null); setPreviewLoading(false); };

    const handleFoto = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !detail) return;
        setFotoUploading(true);
        e.target.value = '';
        try {
            const now = new Date();
            const stamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
            const voornaam = user?.name ? user.name.split(' ')[0] : 'foto';
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', String(detail.projectId));
            formData.append('category', 'medewerker-fotos');
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Upload mislukt');
            const infoProj = JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]').find(p => p.id == detail.projectId) || {};
            saveInfoProject({ ...infoProj, fotos: [...(infoProj.fotos || []), { id: Date.now(), name: `${voornaam}_${stamp}.jpg`, type: file.type || 'image/jpeg', url: data.url, datum: now.toLocaleDateString('nl-NL'), tijd: now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }), auteur: user?.name || '' }] });
        } catch (err) { console.error('Foto upload mislukt:', err); } finally { setFotoUploading(false); }
    };

    const deleteFoto = (id) => {
        const infoProj = JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]').find(p => p.id == detail.projectId) || {};
        saveInfoProject({ ...infoProj, fotos: (infoProj.fotos || []).filter(f => f.id !== id) });
    };

    const handleNoteMedia = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPoNoteMediaUploading(true);
        e.target.value = '';
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', String(detail.projectId));
            formData.append('category', 'notitie-media');
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setPoNoteMedia({ url: data.url, mediaType: file.type.startsWith('video/') ? 'video' : 'image' });
        } catch (err) { console.error('Media upload mislukt:', err); } finally { setPoNoteMediaUploading(false); }
    };

    const saveNoteEdit = (noteId) => {
        if (!editingNoteText.trim()) return;
        const updated = infoNotities.map(n => n.id === noteId ? { ...n, text: editingNoteText.trim(), content: editingNoteText.trim() } : n);
        setInfoNotities(updated);
        localStorage.setItem(`schildersapp_notes_${detail.projectId}`, JSON.stringify(updated));
        fetch('/api/notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: noteId, content: editingNoteText.trim() }) }).catch(() => {});
        setEditingNoteId(null);
        setEditingNoteText('');
    };

    const deleteInfoNote = (noteId) => {
        if (!window.confirm('Notitie verwijderen?')) return;
        const updated = infoNotities.filter(n => n.id !== noteId);
        setInfoNotities(updated);
        localStorage.setItem(`schildersapp_notes_${detail.projectId}`, JSON.stringify(updated));
        fetch(`/api/notes?id=${noteId}`, { method: 'DELETE' }).catch(() => {});
    };

    const addInfoReply = (noteId) => {
        if (!infoReplyText.trim()) return;
        const reply = { id: Date.now(), author: user?.name || 'Medewerker', text: infoReplyText.trim(), created_at: new Date().toISOString() };
        const updated = infoNotities.map(n => n.id === noteId ? { ...n, replies: [...(n.replies || []), reply] } : n);
        setInfoNotities(updated);
        localStorage.setItem(`schildersapp_notes_${detail.projectId}`, JSON.stringify(updated));
        fetch('/api/notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: noteId, addReply: { author: reply.author, text: reply.text } }) }).catch(() => {});
        setInfoReplyText('');
        setReplyingToNoteId(null);
    };

    const handleAddMediaToNote = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !addingMediaToNoteId) return;
        e.target.value = '';
        const noteId = addingMediaToNoteId;
        setAddMediaUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', String(detail.projectId));
            formData.append('category', 'notitie-media');
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
            const updated = infoNotities.map(n => n.id === noteId ? { ...n, photo: data.url, mediaType } : n);
            setInfoNotities(updated);
            localStorage.setItem(`schildersapp_notes_${detail.projectId}`, JSON.stringify(updated));
            fetch('/api/notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: noteId, content: updated.find(n => n.id === noteId)?.text || '', photo: data.url, mediaType }) }).catch(() => {});
        } catch (err) { console.error('Media upload mislukt:', err); } finally { setAddMediaUploading(false); setAddingMediaToNoteId(null); }
    };

    const addNotitie = () => {
        if ((!poNoteText.trim() && !poNoteMedia) || !detail?.projectId) return;
        const localId = Date.now();
        const note = { id: localId, text: poNoteText.trim(), type: poNoteType, author: user?.name || 'Medewerker', date: new Date().toISOString().split('T')[0], photo: poNoteMedia?.url || null, mediaType: poNoteMedia?.mediaType || null, replies: [] };
        setInfoNotities(prev => { const u = [note, ...prev]; localStorage.setItem(`schildersapp_notes_${detail.projectId}`, JSON.stringify(u)); return u; });
        window.dispatchEvent(new Event('schilders-sync'));
        fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: detail.projectId, content: note.text || ' ', author: note.author, type: note.type, date: note.date, photo: note.photo, mediaType: note.mediaType }) })
            .then(r => r.json()).then(data => { if (data.success && data.id) setInfoNotities(prev => { const u = prev.map(n => n.id === localId ? { ...n, id: data.id } : n); localStorage.setItem(`schildersapp_notes_${detail.projectId}`, JSON.stringify(u)); return u; }); }).catch(() => {});
        setPoNoteText('');
        setPoNoteMedia(null);
    };

    const sectionHeader = (key, icon, title, badge) => (
        <div onClick={() => setPoSectOpen(s => ({ ...s, [key]: !s[key] }))}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px', cursor: 'pointer', borderBottom: poSectOpen[key] ? '1px solid #f1f5f9' : 'none', background: '#fff' }}>
            <i className={`fa-solid ${icon}`} style={{ color: '#F5850A', fontSize: '0.9rem', width: '18px' }} />
            <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{title}</span>
            {badge != null && badge > 0 && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', borderRadius: '10px', padding: '2px 8px' }}>{badge}</span>
            )}
            <i className={`fa-solid fa-chevron-${poSectOpen[key] ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.78rem' }} />
        </div>
    );

    function openDetail(item, dateIso) {
        setDetail({ ...item, date: dateIso });
        setDetailTab('uren');
        setReplyText('');
        setReplyType('info');
        setReplyImage(null);
        setUrenAantal('');
        setUrenNote('');
        setUrenLijst(loadUren(item.taskId, dateIso));
        setMeerwerkText('');
        setMeerwerkImage(null);
        setMeerwerkVideoServerUrl(null);
        setMeerwerkVideoUrl(null);
        setUploadProgress(0);
        setMeerwerkUren('');
        setUrenSection(null);
        setShowProjectChange(false);
        setProjectSearch('');
        setChangeProject(null);
        setZiekeNote('');
        setAndereOmschrijving('');
        setAndereUren('');
        setLocalProgress(item.progress || 0);
        setProgressSaved(false);
        setPoSectOpen({ werkomschrijving: false, checklist: false, opmerkingen: false, bestanden: false, fotos: false });
        setPoNoteText('');
        setPoNoteType('info');
        setPoNoteMedia(null);
        setReplyingToNoteId(null);
        setInfoReplyText('');
        setEditingNoteId(null);
        setPreviewAtt(null);
        setPreviewBlobUrl(null);
        if (sttActive) stopSpeechToText();
        if (videoRecording) stopVideoRecording();
    }

    return (
        <div style={{ padding: '16px' }}>
            {/* Week navigatie — sticky */}
            <div style={{ position: 'sticky', top: 0, zIndex: 50, marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: '16px', padding: '8px', boxShadow: '0 2px 12px rgba(0,0,0,0.10)', border: '1px solid #f1f5f9' }}>
                <button onClick={prevWeek} style={{ background: '#f8fafc', border: 'none', borderRadius: '10px', padding: '9px 14px', cursor: 'pointer', fontSize: '0.9rem', color: '#475569' }}>
                    <i className="fa-solid fa-chevron-left" />
                </button>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>Week {week}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1px' }}>{weekLabel}</div>
                </div>
                <button onClick={nextWeek} style={{ background: '#f8fafc', border: 'none', borderRadius: '10px', padding: '9px 14px', cursor: 'pointer', fontSize: '0.9rem', color: '#475569' }}>
                    <i className="fa-solid fa-chevron-right" />
                </button>
            </div>

            {!hasAny && vacDays.size === 0 ? (
                <div style={{ background: '#fff', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', color: '#94a3b8', border: '1.5px dashed #e2e8f0' }}>
                    <i className="fa-regular fa-calendar" style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block', opacity: 0.5 }} />
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '6px', color: '#64748b' }}>Niets gepland</div>
                    <div style={{ fontSize: '0.85rem' }}>Je staat deze week niet ingepland op een project.</div>
                </div>
            ) : (
                workDays.map((day, di) => {
                    const isToday = day.iso === todayIso;
                    const isPast = day.iso < todayIso;
                    const holiday = HOLIDAYS[day.iso];
                    const isVacation = vacDays.has(day.iso);
                    const isFree = holiday || isVacation;
                    const dagTotaalU = Math.round(weekUren.filter(u => u.date === day.iso).reduce((s, u) => s + (u.hours || 0), 0) * 10) / 10;

                    return (
                        <div key={day.iso} style={{ marginBottom: '16px' }}>
                            {/* Badges — alleen tonen als relevant */}
                            {(isToday || holiday || isVacation) && (
                                <div style={{ marginBottom: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {isToday && <span style={{ fontSize: '0.7rem', fontWeight: 600, background: '#fff8f0', color: '#F5850A', padding: '1px 7px', borderRadius: '999px', border: '1px solid #fde8cc' }}>vandaag</span>}
                                    {holiday && <span style={{ fontSize: '0.7rem', fontWeight: 600, background: '#fef9c3', color: '#854d0e', padding: '1px 7px', borderRadius: '999px' }}>⭐ {holiday}</span>}
                                    {isVacation && !holiday && <span style={{ fontSize: '0.7rem', fontWeight: 600, background: '#f0fdf4', color: '#16a34a', padding: '1px 7px', borderRadius: '999px' }}>☂ Vakantie</span>}
                                </div>
                            )}

                            {/* Items — datum-kolom links van de gekleurde streep */}
                            {isFree ? (
                                <div style={{ display: 'flex', alignItems: 'stretch', gap: '0' }}>
                                    <div style={{ width: '38px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', paddingRight: '6px' }}>
                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', color: '#16a34a' }}>{DAY_NAMES[di]}</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>{new Date(day.iso + 'T00:00:00').getDate()}</span>
                                    </div>
                                    <div style={{ flex: 1, padding: '10px 14px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>
                                        {holiday ? `⭐ ${holiday} — vrije dag` : '☂ Vakantie — vrije dag'}
                                    </div>
                                </div>
                            ) : day.items.length === 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                                    <div style={{ width: '38px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: '6px' }}>
                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', color: isPast ? '#cbd5e1' : '#94a3b8' }}>{DAY_NAMES[di]}</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: isPast ? '#94a3b8' : '#1e293b', lineHeight: 1 }}>{new Date(day.iso + 'T00:00:00').getDate()}</span>
                                    </div>
                                    <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontStyle: 'italic' }}>Geen projecten ingepland</span>
                                </div>
                            ) : (
                            <div style={{ display: 'flex', alignItems: 'stretch', gap: '0' }}>
                                <div style={{ width: '44px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', paddingRight: '8px', paddingTop: '8px', paddingBottom: '8px' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 600, color: isToday ? '#F5850A' : isPast ? '#cbd5e1' : '#94a3b8', lineHeight: 1 }}>{DAY_NAMES_FULL[di].substring(0, 2)}</span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 900, lineHeight: 1, color: isToday ? '#F5850A' : isPast ? '#94a3b8' : '#1e293b' }}>{new Date(day.iso + 'T00:00:00').getDate()}</span>
                                    {dagTotaalU > 0 ? (
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: dagTotaalU >= 7.5 ? '#10b981' : '#f97316', lineHeight: 1 }}>{dagTotaalU}u</span>
                                    ) : <span />}
                                </div>
                                <div style={{ flex: 1 }}>
                                {day.items.map((item, ii) => {
                                const dagUren = weekUren.filter(u => u.taskId === item.taskId && u.date === day.iso);
                                const totaalU = Math.round(dagUren.reduce((s, u) => s + (u.hours || 0), 0) * 10) / 10;
                                const urenVol = totaalU >= 7.5;
                                const urenDeels = totaalU > 0 && !urenVol;
                                return (
                                <div key={ii} onClick={() => openDetail(item, day.iso)} style={{
                                    marginBottom: '7px',
                                    background: urenVol ? '#f0fdf4' : urenDeels ? '#fff8f0' : item.completed ? '#fafafa' : '#fff',
                                    borderRadius: '13px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                                    boxShadow: item.completed ? 'none' : '0 2px 10px rgba(0,0,0,0.07)',
                                    border: `1px solid ${urenVol ? '#86efac' : urenDeels ? '#fed7aa' : '#f1f5f9'}`,
                                    cursor: 'pointer', opacity: item.completed ? 0.6 : 1,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                                        <div style={{ width: '5px', background: item.color, flexShrink: 0 }} />
                                        <div style={{ flex: 1, padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.87rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.projectName}</div>
                                                <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.taskName}</div>
                                                {item.client && <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{item.client}</div>}
                                                {item.notes && item.notes.length > 0 && (
                                                    <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <i className="fa-solid fa-note-sticky" style={{ fontSize: '0.62rem', color: '#f59e0b' }} />
                                                        <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 600 }}>{item.notes.length} notitie{item.notes.length !== 1 ? 's' : ''}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {item.completed
                                                ? <i className="fa-solid fa-circle-check" style={{ color: '#10b981', fontSize: '0.9rem', flexShrink: 0 }} />
                                                : item.progress > 0
                                                    ? <span style={{ fontSize: '0.7rem', fontWeight: 800, color: item.color, flexShrink: 0 }}>{item.progress}%</span>
                                                    : <i className="fa-solid fa-chevron-right" style={{ color: '#d1d5db', fontSize: '0.65rem', flexShrink: 0 }} />
                                            }
                                        </div>
                                    </div>
                                    {/* Voortgangsbalk onderaan kaart */}
                                    {(item.progress > 0 || item.completed) && (
                                        <div style={{ height: '3px', background: '#f1f5f9' }}>
                                            <div style={{ height: '100%', width: `${item.completed ? 100 : item.progress}%`, background: item.completed ? '#10b981' : item.color, transition: 'width 0.3s' }} />
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                                </div>
                            </div>
                            )}
                        </div>
                    );
                })
            )}


            {/* Detail modal */}
            {detail && (
                <>
                    <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
                    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px 20px 0 0', zIndex: 310, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
                        {/* Header */}
                        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
                            <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 14px' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                                <div style={{ width: '6px', height: '44px', background: detail.color, borderRadius: '3px', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail.projectName}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail.taskName}</div>
                                </div>
                                <button onClick={() => { setDetailTab('info'); setShowProjectChange(true); setProjectSearch(''); setChangeProject(null); }}
                                    style={{ padding: '5px 11px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#475569', cursor: 'pointer', flexShrink: 0 }}>
                                    Wijzigen
                                </button>
                            </div>
                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '12px', padding: '4px', marginBottom: '0' }}>
                                {[['info','fa-circle-info','Info'],['checklist','fa-list-check','Checklist'],['uren','fa-clock','Uren']].map(([t, ic, l]) => (
                                    <button key={t} onClick={() => setDetailTab(t)}
                                        style={{ flex: 1, padding: '8px 4px', borderRadius: '9px', border: 'none',
                                            background: detailTab === t ? '#fff' : 'transparent',
                                            color: detailTab === t ? '#F5850A' : '#64748b',
                                            fontWeight: detailTab === t ? 700 : 500, fontSize: '0.75rem', cursor: 'pointer',
                                            boxShadow: detailTab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.15s' }}>
                                        <i className={`fa-solid ${ic}`} style={{ fontSize: '0.7rem' }} />
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab inhoud — scrollbaar */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 32px' }}>

                            {/* ── TAB: INFO ── */}
                            {detailTab === 'info' && (() => {
                                const infoProject = (() => { try { return (JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]')).find(p => p.id == detail.projectId) || {}; } catch { return {}; } })();
                                const infoTask = (infoProject.tasks || []).find(t => t.id === detail.taskId) || {};
                                const infoRow = (icon, content, border = true) => content ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', ...(border ? { borderBottom: '1px solid #f1f5f9' } : {}) }}>
                                        <i className={`fa-solid ${icon}`} style={{ color: '#94a3b8', width: '18px', textAlign: 'center', fontSize: '0.88rem' }} />
                                        {content}
                                    </div>
                                ) : null;
                                return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                    {infoRow('fa-user', detail.client && <span style={{ fontSize: '0.88rem', color: '#1e293b' }}>{detail.client}</span>)}
                                    {infoRow('fa-location-dot', detail.address && (
                                        <a href={`https://maps.google.com/?q=${encodeURIComponent(detail.address)}`} target="_blank" rel="noreferrer"
                                            style={{ fontSize: '0.88rem', color: '#F5850A', textDecoration: 'none', fontWeight: 600 }}>
                                            {detail.address} <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.65rem' }} />
                                        </a>
                                    ))}
                                    {infoRow('fa-phone', infoProject.phone && (
                                        <a href={`tel:${infoProject.phone}`} style={{ fontSize: '0.88rem', color: '#F5850A', textDecoration: 'none', fontWeight: 600 }}>
                                            {infoProject.phone}
                                        </a>
                                    ))}
                                    {infoRow('fa-envelope', infoProject.email && (
                                        <a href={`mailto:${infoProject.email}`} style={{ fontSize: '0.88rem', color: '#F5850A', textDecoration: 'none', fontWeight: 600 }}>
                                            {infoProject.email}
                                        </a>
                                    ))}
                                    <div style={{ padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Voortgang</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {progressSaved && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>✓ Opgeslagen</span>}
                                                <span style={{ fontSize: '1rem', fontWeight: 800, color: localProgress === 100 ? '#10b981' : '#F5850A', minWidth: '42px', textAlign: 'right' }}>{localProgress}%</span>
                                            </div>
                                        </div>
                                        {/* Slider */}
                                        <input type="range" min="0" max="100" step="5" value={localProgress}
                                            onChange={e => setLocalProgress(Number(e.target.value))}
                                            onMouseUp={e => saveProgress(Number(e.target.value))}
                                            onTouchEnd={e => saveProgress(localProgress)}
                                            style={{ width: '100%', accentColor: localProgress === 100 ? '#10b981' : '#F5850A', cursor: 'pointer', marginBottom: '10px' }} />
                                        {/* Snelknoppen */}
                                        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                                            {[25, 50, 75, 100].map(v => (
                                                <button key={v} onClick={() => saveProgress(v)}
                                                    style={{ flex: 1, padding: '5px 0', border: `1.5px solid ${localProgress === v ? (v === 100 ? '#10b981' : '#F5850A') : '#e2e8f0'}`, borderRadius: '8px', background: localProgress === v ? (v === 100 ? '#f0fdf4' : '#fff8f0') : '#f8fafc', fontSize: '0.72rem', fontWeight: 700, color: localProgress === v ? (v === 100 ? '#10b981' : '#F5850A') : '#94a3b8', cursor: 'pointer' }}>
                                                    {v}%
                                                </button>
                                            ))}
                                        </div>
                                        {/* Taak afgerond knop */}
                                        <button onClick={() => saveProgress(100, true)}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: detail.completed ? '#f0fdf4' : 'linear-gradient(135deg,#10b981,#059669)', color: detail.completed ? '#10b981' : '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <i className={`fa-solid fa-${detail.completed ? 'circle-check' : 'check'}`} />
                                            {detail.completed ? 'Taak afgerond' : 'Markeer als afgerond'}
                                        </button>
                                    </div>

                                    {/* ── Project/taak wijzigen ── */}
                                    <div style={{ borderTop: '1px solid #f1f5f9' }}>
                                        {showProjectChange && (() => {
                                            const allProjects = (() => { try { return JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]'); } catch { return []; } })();
                                            const filtered = allProjects.filter(p => p.name?.toLowerCase().includes(projectSearch.toLowerCase()));
                                            return (
                                                <div style={{ paddingBottom: '8px' }}>
                                                    <input autoFocus value={projectSearch}
                                                        onChange={e => { setProjectSearch(e.target.value); setChangeProject(null); }}
                                                        placeholder="Zoek project..."
                                                        style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
                                                            fontSize: '0.87rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }} />
                                                    {!changeProject && filtered.slice(0, 6).map(p => (
                                                        <div key={p.id} onClick={() => setChangeProject(p)}
                                                            style={{ padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '6px',
                                                                cursor: 'pointer', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color || '#F5850A', flexShrink: 0, display: 'inline-block' }} />
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                                                {p.client && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{p.client}</div>}
                                                            </div>
                                                            <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.65rem' }} />
                                                        </div>
                                                    ))}
                                                    {changeProject && (
                                                        <div>
                                                            <button onClick={() => setChangeProject(null)}
                                                                style={{ background: 'none', border: 'none', color: '#F5850A', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', marginBottom: '8px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <i className="fa-solid fa-chevron-left" style={{ fontSize: '0.65rem' }} />{changeProject.name}
                                                            </button>
                                                            {(changeProject.tasks || []).filter(t => t.startDate && t.endDate).map(t => (
                                                                <div key={t.id} onClick={() => saveProjectChange(t, changeProject)}
                                                                    style={{ padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '6px',
                                                                        cursor: 'pointer', background: '#f8fafc' }}>
                                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{t.name}</div>
                                                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1px' }}>{t.startDate} – {t.endDate}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {false && (() => { return ( /* REMOVED */
                                            <div>
                                                {/* Werkomschrijving - removed */}
                                                <div style={{ background: '#f8fafc', borderRadius: '12px', overflow: 'hidden' }}>
                                                    {sectionHeader('werkomschrijving', 'fa-align-left', 'Werkomschrijving')}
                                                    {poSectOpen.werkomschrijving && (
                                                        <div style={{ padding: '12px 16px' }}>
                                                            {proj.werkomschrijving
                                                                ? <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>{proj.werkomschrijving}</p>
                                                                : <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', fontStyle: 'italic' }}>Nog geen werkomschrijving beschikbaar.</p>}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Checklist */}
                                                <div style={{ background: '#f8fafc', borderRadius: '12px', overflow: 'hidden' }}>
                                                    {sectionHeader('checklist', 'fa-list-check', 'Checklist', checklist.length > 0 ? `${checklist.filter(c => c.done).length}/${checklist.length}` : null)}
                                                    {poSectOpen.checklist && (
                                                        <div style={{ padding: '8px 16px 12px' }}>
                                                            {checklist.length === 0
                                                                ? <div style={{ textAlign: 'center', padding: '12px 0', color: '#cbd5e1', fontSize: '0.82rem' }}>Geen checklistitems</div>
                                                                : <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    {checklist.map((item, idx) => (
                                                                        <label key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', cursor: 'pointer', borderBottom: idx < checklist.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                                                            <input type="checkbox" checked={!!item.done}
                                                                                onChange={() => saveInfoProject({ ...proj, checklist: checklist.map((c, i) => i === idx ? { ...c, done: !c.done } : c) })}
                                                                                style={{ width: '17px', height: '17px', accentColor: '#F5850A', flexShrink: 0 }} />
                                                                            <span style={{ fontSize: '0.88rem', color: item.done ? '#94a3b8' : '#1e293b', textDecoration: item.done ? 'line-through' : 'none', flex: 1 }}>{item.text || <em style={{ color: '#cbd5e1' }}>leeg item</em>}</span>
                                                                        </label>
                                                                    ))}
                                                                  </div>}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Notities */}
                                                <div style={{ background: '#f8fafc', borderRadius: '12px', overflow: 'hidden' }}>
                                                    {sectionHeader('opmerkingen', 'fa-note-sticky', 'Notities', infoNotities.length > 0 ? infoNotities.length : null)}
                                                    {poSectOpen.opmerkingen && (
                                                        <div style={{ padding: '8px 16px 12px' }}>
                                                            {infoNotities.length === 0 && <div style={{ textAlign: 'center', padding: '12px 0', color: '#cbd5e1', fontSize: '0.82rem' }}>Nog geen notities</div>}
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                                                {infoNotities.map(note => {
                                                                    const nt = NOTE_TYPES_MW[note.type] || NOTE_TYPES_MW.info;
                                                                    const isOwn = note.author === user?.name;
                                                                    return (
                                                                        <div key={note.id} style={{ background: nt.bg, border: `1.5px solid ${nt.color}33`, borderRadius: '10px', padding: '10px 12px', marginLeft: isOwn ? '16px' : 0, marginRight: isOwn ? 0 : '16px' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '20px', background: nt.color, color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>
                                                                                    <i className={`fa-solid ${nt.icon}`} style={{ fontSize: '0.6rem' }} />
                                                                                    {nt.label}
                                                                                </span>
                                                                                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{note.author}</span>
                                                                                <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: 'auto' }}>{note.date}</span>
                                                                                {isOwn && editingNoteId !== note.id && (
                                                                                    <button onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.text || ''); }}
                                                                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 2px', fontSize: '0.7rem' }}>
                                                                                        <i className="fa-solid fa-pencil" />
                                                                                    </button>
                                                                                )}
                                                                                {user?.role === 'Beheerder' && (
                                                                                    <button onClick={() => deleteInfoNote(note.id)}
                                                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 2px', fontSize: '0.7rem', opacity: 0.6 }}>
                                                                                        <i className="fa-solid fa-trash" />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            {editingNoteId === note.id
                                                                                ? <textarea autoFocus value={editingNoteText} onChange={e => setEditingNoteText(e.target.value)}
                                                                                    onBlur={() => saveNoteEdit(note.id)}
                                                                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNoteEdit(note.id); } if (e.key === 'Escape') { setEditingNoteId(null); } }}
                                                                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1.5px solid ${nt.color}`, fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
                                                                                : <div style={{ fontSize: '0.85rem', color: '#1e293b', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{note.text}</div>}
                                                                            {note.photo && (
                                                                                <div style={{ marginTop: '8px' }}>
                                                                                    {note.mediaType === 'video'
                                                                                        ? <video src={note.photo} controls style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', display: 'block' }} />
                                                                                        : <img src={note.photo} alt="" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', cursor: 'pointer', display: 'block' }} onClick={() => openPreview({ url: note.photo, data: note.photo, name: 'notitie-foto', type: 'image/jpeg' })} />}
                                                                                </div>
                                                                            )}
                                                                            {(note.replies?.length > 0 || replyingToNoteId === note.id) && (
                                                                                <div style={{ marginTop: '8px', borderLeft: `2px solid ${nt.color}44`, paddingLeft: '10px' }}>
                                                                                    {(note.replies || []).map(r => (
                                                                                        <div key={r.id} style={{ marginBottom: '5px' }}>
                                                                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>{r.author}</span>
                                                                                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginLeft: '5px' }}>{r.created_at ? new Date(r.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                                                                            <div style={{ fontSize: '0.82rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{r.text}</div>
                                                                                        </div>
                                                                                    ))}
                                                                                    {replyingToNoteId === note.id && (
                                                                                        <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                                                                            <input autoFocus value={infoReplyText} onChange={e => setInfoReplyText(e.target.value)}
                                                                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInfoReply(note.id); } if (e.key === 'Escape') { setReplyingToNoteId(null); } }}
                                                                                                placeholder="Typ reactie… (Enter)"
                                                                                                style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: `1.5px solid ${nt.color}88`, fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none' }} />
                                                                                            <button onClick={() => addInfoReply(note.id)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: nt.color, color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>↵</button>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            {replyingToNoteId !== note.id && (
                                                                                <button onClick={() => { setReplyingToNoteId(note.id); setInfoReplyText(''); }}
                                                                                    style={{ marginTop: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.72rem', padding: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                                    <i className="fa-regular fa-comment" /> Reageer {note.replies?.length > 0 && `(${note.replies.length})`}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                                                                <textarea value={poNoteText} onChange={e => setPoNoteText(e.target.value)}
                                                                    placeholder="Nieuwe notitie… (Enter om op te slaan)" rows={2}
                                                                    onBlur={() => { if (poNoteText.trim() || poNoteMedia) addNotitie(); }}
                                                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (poNoteText.trim() || poNoteMedia) addNotitie(); } }}
                                                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', color: '#1e293b', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', outline: 'none', marginBottom: '8px', background: '#fff' }} />
                                                                {poNoteMedia && (
                                                                    <div style={{ marginBottom: '8px', position: 'relative', display: 'inline-block' }}>
                                                                        {poNoteMedia.mediaType === 'video'
                                                                            ? <video src={poNoteMedia.url} style={{ maxHeight: '80px', borderRadius: '6px', display: 'block' }} />
                                                                            : <img src={poNoteMedia.url} alt="" style={{ maxHeight: '80px', borderRadius: '6px', display: 'block' }} />}
                                                                        <button onClick={() => setPoNoteMedia(null)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', color: '#fff', cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fa-solid fa-xmark" /></button>
                                                                    </div>
                                                                )}
                                                                <input ref={noteMediaInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleNoteMedia} />
                                                                <input ref={noteAddMediaInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleAddMediaToNote} />
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                                                                    {Object.entries(NOTE_TYPES_MW).map(([key, nt]) => (
                                                                        <button key={key} onClick={() => setPoNoteType(key)}
                                                                            style={{ padding: '3px 9px', borderRadius: '20px', border: `1.5px solid ${poNoteType === key ? nt.color : nt.color + '55'}`, background: poNoteType === key ? nt.bg : nt.color + '12', color: nt.color, fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', opacity: poNoteType === key ? 1 : 0.65 }}>
                                                                            {nt.label}
                                                                        </button>
                                                                    ))}
                                                                    <button type="button" onClick={() => noteMediaInputRef.current?.click()} disabled={poNoteMediaUploading}
                                                                        style={{ padding: '3px 9px', borderRadius: '20px', border: `1.5px solid ${poNoteMedia ? '#10b981' : '#e2e8f0'}`, background: poNoteMedia ? '#f0fdf4' : 'transparent', color: poNoteMedia ? '#10b981' : '#94a3b8', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        {poNoteMediaUploading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paperclip" />}
                                                                        {poNoteMedia ? '✓' : 'Bijlage'}
                                                                    </button>
                                                                    <button onClick={addNotitie} disabled={!poNoteText.trim() && !poNoteMedia}
                                                                        style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: '8px', border: 'none', background: (poNoteText.trim() || poNoteMedia) ? '#F5850A' : '#e2e8f0', color: (poNoteText.trim() || poNoteMedia) ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: '0.78rem', cursor: (poNoteText.trim() || poNoteMedia) ? 'pointer' : 'default' }}>
                                                                        <i className="fa-solid fa-paper-plane" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Bestanden */}
                                                <div style={{ background: '#f8fafc', borderRadius: '12px', overflow: 'hidden' }}>
                                                    {sectionHeader('bestanden', 'fa-paperclip', 'Bestanden', bestanden.length > 0 ? bestanden.length : null)}
                                                    {poSectOpen.bestanden && (
                                                        <div style={{ padding: '8px 16px 12px' }}>
                                                            {bestanden.length === 0
                                                                ? <div style={{ textAlign: 'center', padding: '12px 0', color: '#cbd5e1', fontSize: '0.82rem' }}>Geen bestanden</div>
                                                                : <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    {bestanden.map((b, idx) => {
                                                                        const isImg = b.type?.startsWith('image/');
                                                                        const isPdf = b.type === 'application/pdf' || b.name?.toLowerCase().endsWith('.pdf');
                                                                        return (
                                                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: idx < bestanden.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                                                                <i className={`fa-solid ${isImg ? 'fa-image' : isPdf ? 'fa-file-pdf' : 'fa-file'}`} style={{ color: isImg ? '#10b981' : isPdf ? '#ef4444' : '#64748b', fontSize: '1.1rem', width: '20px', flexShrink: 0 }} />
                                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                                    <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label || b.name}</div>
                                                                                    {b.label && b.name !== b.label && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{b.name}</div>}
                                                                                </div>
                                                                                <button onClick={() => openPreview(b)} style={{ padding: '5px 10px', borderRadius: '7px', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontSize: '0.82rem' }}>
                                                                                    <i className="fa-solid fa-eye" />
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                  </div>}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Projectfoto's */}
                                                <div style={{ background: '#f8fafc', borderRadius: '12px', overflow: 'hidden' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: poSectOpen.fotos ? '1px solid #f1f5f9' : 'none' }}>
                                                        <div onClick={() => setPoSectOpen(s => ({ ...s, fotos: !s.fotos }))} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px', cursor: 'pointer' }}>
                                                            <i className="fa-solid fa-camera" style={{ color: '#F5850A', fontSize: '0.9rem', width: '18px' }} />
                                                            <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Projectfoto's</span>
                                                            {allFotos.length > 0 && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', borderRadius: '10px', padding: '2px 8px' }}>{allFotos.length}</span>}
                                                            <i className={`fa-solid fa-chevron-${poSectOpen.fotos ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.78rem' }} />
                                                        </div>
                                                        {poSectOpen.fotos && (
                                                            <button onClick={() => cameraInputRef.current?.click()} disabled={fotoUploading}
                                                                style={{ margin: '0 12px', padding: '7px 14px', borderRadius: '8px', border: 'none', background: '#F5850A', color: '#fff', cursor: fotoUploading ? 'default' : 'pointer', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, opacity: fotoUploading ? 0.7 : 1 }}>
                                                                {fotoUploading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-camera" />}
                                                                {fotoUploading ? 'Bezig…' : 'Foto maken'}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} style={{ display: 'none' }} />
                                                    {poSectOpen.fotos && (
                                                        <div style={{ padding: '12px 16px' }}>
                                                            {allFotos.length === 0
                                                                ? <div style={{ textAlign: 'center', padding: '24px 0', color: '#cbd5e1', fontSize: '0.85rem' }}>
                                                                    <i className="fa-solid fa-camera" style={{ fontSize: '2rem', display: 'block', marginBottom: '8px', opacity: 0.4 }} />
                                                                    Nog geen foto's — tik op "Foto maken" om te beginnen
                                                                  </div>
                                                                : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                                                    {allFotos.map((foto, idx) => (
                                                                        <div key={foto.id || idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9', cursor: 'pointer' }}
                                                                            onClick={() => openPreview({ name: foto.name, type: foto.type || 'image/jpeg', data: foto.src, url: foto.src, label: foto.name, auteur: foto.auteur, datum: foto.datum || foto.date, tijd: foto.tijd })}>
                                                                            <img src={foto.src} alt={foto.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                                                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.65))', padding: '16px 6px 4px', pointerEvents: 'none' }}>
                                                                                {foto.auteur && <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.58rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{foto.auteur}</div>}
                                                                                {foto.tijd && <div style={{ color: '#fff', fontSize: '0.6rem', fontWeight: 600 }}>{foto.tijd}</div>}
                                                                            </div>
                                                                            {!foto.isAdmin && (
                                                                                <button onClick={e => { e.stopPropagation(); if (window.confirm('Foto verwijderen?')) deleteFoto(foto.id); }}
                                                                                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', color: '#fff', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                    <i className="fa-solid fa-xmark" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                  </div>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                );
                            })()}

                            {/* ── TAB: CHECKLIST ── */}
                            {detailTab === 'checklist' && (() => {
                                const proj = (() => { try { return (JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]')).find(p => p.id == detail.projectId) || {}; } catch { return {}; } })();
                                const checklist = proj.checklist || [];
                                const done = checklist.filter(c => c.done).length;
                                return (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', padding: '10px 12px', background: '#fff8f0', borderRadius: '10px', border: '1px solid #fde8cc' }}>
                                        <i className="fa-solid fa-list-check" style={{ color: '#F5850A', fontSize: '0.9rem' }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F5850A' }}>{detail.projectName}</div>
                                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Checklist — {done}/{checklist.length} voltooid</div>
                                        </div>
                                        {checklist.length > 0 && (
                                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#F5850A', background: '#fff3e0', borderRadius: '20px', padding: '3px 10px' }}>
                                                {Math.round((done / checklist.length) * 100)}%
                                            </div>
                                        )}
                                    </div>

                                    {/* Voortgangsbalk */}
                                    {checklist.length > 0 && (
                                        <div style={{ marginBottom: '16px' }}>
                                            <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${Math.round((done / checklist.length) * 100)}%`, background: '#10b981', borderRadius: '3px', transition: 'width 0.3s' }} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Checklistitems */}
                                    {checklist.length === 0
                                        ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#cbd5e1', fontSize: '0.85rem' }}>
                                            <i className="fa-solid fa-list-check" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px', opacity: 0.4 }} />
                                            Geen checklistitems voor dit project
                                          </div>
                                        : <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {checklist.map((item, idx) => (
                                                <label key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: item.done ? '#f0fdf4' : '#fff', borderRadius: '10px', border: `1.5px solid ${item.done ? '#bbf7d0' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                                                    <input type="checkbox" checked={!!item.done}
                                                        onChange={() => saveInfoProject({ ...proj, checklist: checklist.map((c, i) => i === idx ? { ...c, done: !c.done } : c) })}
                                                        style={{ width: '18px', height: '18px', accentColor: '#10b981', flexShrink: 0 }} />
                                                    <span style={{ fontSize: '0.88rem', color: item.done ? '#94a3b8' : '#1e293b', textDecoration: item.done ? 'line-through' : 'none', flex: 1, lineHeight: 1.4 }}>
                                                        {item.text || <em style={{ color: '#cbd5e1' }}>leeg item</em>}
                                                    </span>
                                                    {item.done && <i className="fa-solid fa-circle-check" style={{ color: '#10b981', fontSize: '0.85rem', flexShrink: 0 }} />}
                                                </label>
                                            ))}
                                          </div>
                                    }

                                </div>
                                );
                            })()}

                            {/* ── TAB: UREN ── */}
                            {detailTab === 'uren' && (() => {
                                const totalVandaag = urenLijst.reduce((s, e) => s + (e.hours || 0), 0);
                                const canSaveUren = parseFloat(urenAantal) > 0;
                                const canSaveMeerwerk = (meerwerkText.trim() || meerwerkImage || meerwerkVideoServerUrl) && !videoUploading;
                                const fmtSec = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
                                const detailDayObj = new Date(detail.date + 'T00:00:00');
                                const detailDayName = DAY_NAMES_FULL[detailDayObj.getDay() === 0 ? 6 : detailDayObj.getDay() - 1];
                                const detailDayNum = detailDayObj.getDate();
                                const detailMonth = MONTH_NAMES[detailDayObj.getMonth()];
                                const detailYear = detailDayObj.getFullYear();
                                return (
                                    <div>
                                        {/* ── Datum header met navigatie ── */}
                                        {(() => {
                                            function prevWorkday(iso) {
                                                const d = new Date(iso + 'T00:00:00');
                                                do { d.setDate(d.getDate() - 1); } while (d.getDay() === 0 || d.getDay() === 6 || HOLIDAYS[fmtLocal(d)]);
                                                return fmtLocal(d);
                                            }
                                            function nextWorkday(iso) {
                                                const d = new Date(iso + 'T00:00:00');
                                                do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6 || HOLIDAYS[fmtLocal(d)]);
                                                return fmtLocal(d);
                                            }
                                            function goToDay(iso) {
                                                setDetail(prev => ({ ...prev, date: iso }));
                                                setUrenLijst(loadUren(detail.taskId, iso));
                                                setUrenAantal('');
                                                setUrenNote('');
                                                setUrenEditId(null);
                                            }
                                            const heeftUren = urenLijst.length > 0;
                                            const accentColor = heeftUren ? '#10b981' : '#F5850A';
                                            const bgColor = heeftUren ? '#f0fdf4' : '#f8fafc';
                                            const borderColor = heeftUren ? '#86efac' : '#e2e8f0';
                                            return (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', height: '72px', boxSizing: 'border-box', background: bgColor, borderRadius: '14px', marginBottom: '18px', border: `1.5px solid ${borderColor}`, transition: 'background 0.2s, border-color 0.2s' }}>
                                                    <button onClick={() => goToDay(prevWorkday(detail.date))}
                                                        style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer', color: '#475569', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <i className="fa-solid fa-chevron-left" />
                                                    </button>
                                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: accentColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
                                                            <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', lineHeight: 1 }}>{detailDayName.substring(0, 2)}</span>
                                                            <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{detailDayNum}</span>
                                                        </div>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{detailDayName}</div>
                                                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '1px' }}>{detailMonth} {detailYear}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: heeftUren ? '#10b981' : '#cbd5e1', lineHeight: 1 }}>
                                                            {heeftUren ? `${Math.round(totalVandaag * 10) / 10}u` : '—'}
                                                        </div>
                                                        {heeftUren && <i className="fa-solid fa-check" style={{ fontSize: '0.6rem', color: '#10b981' }} />}
                                                    </div>
                                                    <button onClick={() => goToDay(nextWorkday(detail.date))}
                                                        style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer', color: '#475569', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <i className="fa-solid fa-chevron-right" />
                                                    </button>
                                                </div>
                                            );
                                        })()}

                                        {/* Geregistreerde blokken */}
                                        <div style={{ marginBottom: '14px' }}>
                                            {urenLijst.length === 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', color: '#94a3b8' }}>
                                                    <i className="fa-solid fa-clock" style={{ fontSize: '0.8rem', flexShrink: 0 }} />
                                                    <span style={{ fontSize: '0.85rem', flex: 1 }}>Nog geen uren geregistreerd</span>
                                                </div>
                                            )}
                                            {urenLijst.map((e) => (
                                                    <div key={e.id} style={{ marginBottom: '6px', border: `1.5px solid ${urenEditId === e.id ? '#F5850A' : '#e2e8f0'}`, borderRadius: '10px', overflow: 'hidden' }}>
                                                        {urenEditId === e.id ? (
                                                            /* Bewerkbare modus */
                                                            <div style={{ padding: '10px 12px', background: '#fff8f0' }}>
                                                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                                                                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Uren</label>
                                                                    <input type="number" min="0.5" max="24" step="0.5"
                                                                        value={urenEditVal}
                                                                        onChange={ev => setUrenEditVal(ev.target.value)}
                                                                        style={{ width: '70px', padding: '6px 8px', border: '1.5px solid #F5850A', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', color: '#1e293b' }} />
                                                                    <input value={urenEditNote}
                                                                        onChange={ev => setUrenEditNote(ev.target.value)}
                                                                        placeholder="Opmerking"
                                                                        style={{ flex: 1, padding: '6px 8px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', color: '#1e293b' }} />
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                                    <button onClick={() => saveUrenEdit(e.id)}
                                                                        style={{ flex: 1, padding: '7px', background: '#F5850A', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                                                        <i className="fa-solid fa-check" style={{ marginRight: '5px' }} />Opslaan
                                                                    </button>
                                                                    <button onClick={() => deleteUren(e.id)}
                                                                        style={{ padding: '7px 12px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '8px', color: '#ef4444', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                                                                        <i className="fa-solid fa-trash" />
                                                                    </button>
                                                                    <button onClick={() => setUrenEditId(null)}
                                                                        style={{ padding: '7px 12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#64748b', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                                                                        Annuleren
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            /* Weergave modus */
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: '#f8fafc', cursor: e.type === 'ziek' ? 'default' : 'pointer' }}
                                                                onClick={() => { if (e.type === 'ziek') return; setUrenEditId(e.id); setUrenEditVal(String(e.hours)); setUrenEditNote(e.note || ''); }}>
                                                                <i className={`fa-solid ${e.type === 'ziek' ? 'fa-bed-pulse' : e.type === 'andere' ? 'fa-stethoscope' : 'fa-clock'}`}
                                                                    style={{ color: e.type === 'ziek' ? '#ef4444' : e.type === 'andere' ? '#6366f1' : '#10b981', fontSize: '0.8rem', flexShrink: 0 }} />
                                                                <span style={{ fontSize: '0.85rem', color: '#475569', flex: 1 }}>
                                                                    {e.type === 'ziek' ? (e.note || 'Ziek gemeld') : e.type === 'andere' ? (e.note || 'Andere uren') : (e.note || 'Daguren')}
                                                                </span>
                                                                {e.hours ? <span style={{ fontWeight: 700, color: '#F5850A', fontSize: '0.95rem' }}>{e.hours}u</span> : <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>Ziek</span>}
                                                                {e.type !== 'ziek' && <i className="fa-solid fa-pen" style={{ color: '#cbd5e1', fontSize: '0.68rem' }} />}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>

                                        {/* Uren invoer — simpel */}
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '10px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '5px' }}>Aantal uren</label>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <button onClick={() => setUrenAantal('7.5')}
                                                        style={{ padding: '10px 20px', borderRadius: '10px', border: `1.5px solid ${urenAantal === '7.5' ? '#F5850A' : '#e2e8f0'}`,
                                                            background: urenAantal === '7.5' ? '#fff8f0' : '#f8fafc',
                                                            color: urenAantal === '7.5' ? '#F5850A' : '#64748b',
                                                            fontWeight: urenAantal === '7.5' ? 700 : 500, fontSize: '0.95rem', cursor: 'pointer' }}>
                                                        7.5u
                                                    </button>
                                                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>of</span>
                                                    <input type="number" min="0.5" max="24" step="0.5"
                                                        value={urenAantal === '7.5' ? '' : urenAantal}
                                                        onChange={e => setUrenAantal(e.target.value)}
                                                        placeholder="Aantal uren"
                                                        style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
                                                            fontSize: '0.95rem', fontFamily: 'inherit', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
                                                </div>
                                            </div>
                                        </div>
                                        <input value={urenNote} onChange={e => setUrenNote(e.target.value)}
                                            placeholder="Opmerking (optioneel)"
                                            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
                                                fontSize: '0.87rem', fontFamily: 'inherit', color: '#1e293b', boxSizing: 'border-box', outline: 'none', marginBottom: '10px' }} />
                                        {(() => {
                                            const invoer = parseFloat(urenAantal) || 0;
                                            if (invoer <= 7.5) return null;
                                            const overwerk = Math.round((invoer - 7.5) * 10) / 10;
                                            return (
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '12px', marginBottom: '10px' }}>
                                                    <i className="fa-solid fa-circle-info" style={{ color: '#3b82f6', fontSize: '1rem', flexShrink: 0, marginTop: '1px' }} />
                                                    <div>
                                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e40af', marginBottom: '2px' }}>Overwerkuren</div>
                                                        <div style={{ fontSize: '0.78rem', color: '#1e3a8a', lineHeight: 1.45 }}>
                                                            <strong>7,5u</strong> normale uren + <strong>{overwerk}u</strong> overwerkuren worden geregistreerd.
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        <button onClick={saveUren} disabled={!canSaveUren}
                                            style={{ width: '100%', padding: '12px',
                                                background: canSaveUren ? '#F5850A' : '#f1f5f9',
                                                border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.92rem',
                                                cursor: canSaveUren ? 'pointer' : 'default',
                                                color: canSaveUren ? '#fff' : '#94a3b8', marginBottom: '24px' }}>
                                            <i className="fa-solid fa-floppy-disk" style={{ marginRight: '7px' }} />
                                            {canSaveUren
                                                ? parseFloat(urenAantal) > 7.5
                                                    ? `Opslaan (7,5u normaal + ${Math.round((parseFloat(urenAantal)-7.5)*10)/10}u overwerk)`
                                                    : `${urenAantal}u opslaan`
                                                : 'Kies aantal uren'}
                                        </button>

                                        {/* ── Accordion secties ── */}
                                        <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                                            {/* ── Meerwerk ── */}
                                            <div style={{ borderRadius: '12px', border: `1.5px solid ${urenSection === 'meerwerk' ? '#f59e0b' : '#e2e8f0'}`, overflow: 'hidden' }}>
                                                <button onClick={() => setUrenSection(s => s === 'meerwerk' ? null : 'meerwerk')}
                                                    style={{ width: '100%', padding: '13px 16px', background: urenSection === 'meerwerk' ? '#fffbeb' : '#f8fafc',
                                                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                                                    <i className="fa-solid fa-circle-plus" style={{ color: '#f59e0b', fontSize: '1rem' }} />
                                                    <span style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Meerwerk melden</span>
                                                    <i className={`fa-solid fa-chevron-${urenSection === 'meerwerk' ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.75rem' }} />
                                                </button>
                                                {urenSection === 'meerwerk' && (
                                                    <div style={{ padding: '14px 16px 16px', background: '#fff', borderTop: '1.5px solid #fde68a' }}>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                                                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Extra uren</label>
                                                            <input type="number" min="0.5" max="24" step="0.5"
                                                                value={meerwerkUren}
                                                                onChange={e => setMeerwerkUren(e.target.value)}
                                                                placeholder="bijv. 2"
                                                                style={{ width: '90px', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
                                                                    fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', color: '#1e293b' }} />
                                                        </div>
                                                        <textarea
                                                            value={meerwerkText}
                                                            onChange={e => setMeerwerkText(e.target.value)}
                                                            placeholder="Omschrijf het meerwerk... wat heb je extra gedaan en waarom?"
                                                            rows={3}
                                                            style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px',
                                                                fontSize: '0.87rem', resize: 'none', fontFamily: 'inherit', outline: 'none',
                                                                boxSizing: 'border-box', color: '#1e293b', marginBottom: '10px' }}
                                                        />

                                                        {/* Luisteren indicator */}
                                                        {sttActive && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#fef2f2', borderRadius: '10px', border: '1.5px solid #fca5a5', marginBottom: '10px' }}>
                                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 600 }}>Luisteren... spreek nu</div>
                                                                    {sttInterim && <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sttInterim}</div>}
                                                                </div>
                                                                <button onClick={stopSpeechToText}
                                                                    style={{ padding: '6px 14px', background: '#ef4444', border: 'none', borderRadius: '8px',
                                                                        color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', flexShrink: 0 }}>
                                                                    Stop
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Video opname bezig */}
                                                        {videoRecording && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#fef2f2', borderRadius: '10px', border: '1.5px solid #fca5a5', marginBottom: '10px' }}>
                                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                                                                <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600, flex: 1 }}>
                                                                    Video opname {videoSec}s / {MAX_VIDEO_SEC}s
                                                                </span>
                                                                <button onClick={stopVideoRecording}
                                                                    style={{ padding: '6px 14px', background: '#ef4444', border: 'none', borderRadius: '8px',
                                                                        color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                                                                    Stop
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Foto preview */}
                                                        {meerwerkImage && (
                                                            <div style={{ position: 'relative', marginBottom: '10px', display: 'inline-block', width: '100%' }}>
                                                                <img src={meerwerkImage} alt="preview" style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '10px', border: '1.5px solid #e2e8f0', display: 'block' }} />
                                                                <button onClick={() => setMeerwerkImage(null)}
                                                                    style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                                                                        width: '26px', height: '26px', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <i className="fa-solid fa-xmark" />
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Video preview + upload status */}
                                                        {(meerwerkVideoUrl || videoUploading) && !videoRecording && (
                                                            <div style={{ position: 'relative', marginBottom: '10px', width: '100%' }}>
                                                                {meerwerkVideoUrl && (
                                                                    <video src={meerwerkVideoUrl} controls playsInline
                                                                        style={{ width: '100%', maxHeight: '200px', borderRadius: '10px', border: `1.5px solid ${videoUploading ? '#f59e0b' : meerwerkVideoServerUrl ? '#86efac' : '#e2e8f0'}`, display: 'block', background: '#000' }} />
                                                                )}
                                                                {videoUploading && (
                                                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px' }}>
                                                                        <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#fff', fontSize: '2rem' }} />
                                                                        <span style={{ color: '#fff', fontSize: '0.88rem', fontWeight: 700 }}>Uploaden... {uploadProgress}%</span>
                                                                        <div style={{ width: '100%', maxWidth: '180px', height: '6px', background: 'rgba(255,255,255,0.25)', borderRadius: '3px', overflow: 'hidden' }}>
                                                                            <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#F5850A', borderRadius: '3px', transition: 'width 0.2s' }} />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {meerwerkVideoServerUrl && !videoUploading && (
                                                                    <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(16,185,129,0.9)', borderRadius: '8px', padding: '3px 8px', fontSize: '0.68rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <i className="fa-solid fa-check" />Opgeslagen op server
                                                                    </div>
                                                                )}
                                                                <button onClick={() => { setMeerwerkVideoServerUrl(null); setMeerwerkVideoUrl(null); setVideoUploading(false); setUploadProgress(0); }}
                                                                    style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                                                                        width: '26px', height: '26px', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <i className="fa-solid fa-xmark" />
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Actieknoppen */}
                                                        <div style={{ display: 'flex', gap: '7px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                                            {!sttActive ? (
                                                                <button onClick={startSpeechToText}
                                                                    style={{ flex: '0 0 auto', padding: '9px 12px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '10px',
                                                                        fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                    <i className="fa-solid fa-microphone" />Inspreken
                                                                </button>
                                                            ) : (
                                                                <button onClick={stopSpeechToText}
                                                                    style={{ flex: '0 0 auto', padding: '9px 12px', background: '#ef4444', border: 'none', borderRadius: '10px',
                                                                        fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                    <i className="fa-solid fa-stop" />Stop
                                                                </button>
                                                            )}
                                                            {!meerwerkImage && (
                                                                <label style={{ flex: '0 0 auto', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: '10px',
                                                                    fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                    <i className="fa-solid fa-camera" />Foto
                                                                    <input type="file" accept="image/*" capture="environment" onChange={handleMeerwerkImage} style={{ display: 'none' }} />
                                                                </label>
                                                            )}
                                                            {!meerwerkVideoUrl && !videoRecording && (
                                                                <button onClick={startVideoRecording}
                                                                    style={{ flex: '0 0 auto', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: '10px',
                                                                        fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                    <i className="fa-solid fa-video" />Video
                                                                </button>
                                                            )}
                                                            <label style={{ flex: '0 0 auto', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: '10px',
                                                                fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                <i className="fa-solid fa-photo-film" />Gallerij
                                                                <input type="file" accept="image/*,video/*" onChange={e => {
                                                                    const file = e.target.files[0];
                                                                    if (!file) return;
                                                                    if (file.type.startsWith('image/')) handleMeerwerkImage(e);
                                                                    else handleVideoFile(e);
                                                                }} style={{ display: 'none' }} />
                                                            </label>
                                                        </div>

                                                        <button onClick={saveMeerwerk} disabled={!canSaveMeerwerk}
                                                            style={{ width: '100%', padding: '12px',
                                                                background: canSaveMeerwerk ? '#f59e0b' : '#f1f5f9',
                                                                border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.92rem',
                                                                cursor: canSaveMeerwerk ? 'pointer' : 'default',
                                                                color: canSaveMeerwerk ? '#fff' : '#94a3b8' }}>
                                                            {videoUploading
                                                                ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '7px' }} />Video uploaden...</>
                                                                : <><i className="fa-solid fa-paper-plane" style={{ marginRight: '7px' }} />Meerwerk indienen</>
                                                            }
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── Ziek melden ── */}
                                            <div style={{ borderRadius: '12px', border: `1.5px solid ${urenSection === 'ziek' ? '#fca5a5' : '#e2e8f0'}`, overflow: 'hidden' }}>
                                                <button onClick={() => setUrenSection(s => s === 'ziek' ? null : 'ziek')}
                                                    style={{ width: '100%', padding: '13px 16px', background: urenSection === 'ziek' ? '#fef2f2' : '#f8fafc',
                                                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                                                    <i className="fa-solid fa-bed-pulse" style={{ color: '#ef4444', fontSize: '1rem' }} />
                                                    <span style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Ziek melden</span>
                                                    <i className={`fa-solid fa-chevron-${urenSection === 'ziek' ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.75rem' }} />
                                                </button>
                                                {urenSection === 'ziek' && (
                                                    <div style={{ padding: '14px 16px 16px', background: '#fff', borderTop: '1.5px solid #fca5a5' }}>
                                                        <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '12px', marginTop: 0 }}>
                                                            Meld jezelf ziek voor <strong>{detail.date}</strong>. De beheerder wordt op de hoogte gesteld.
                                                        </p>
                                                        <input
                                                            value={ziekeNote}
                                                            onChange={e => setZiekeNote(e.target.value)}
                                                            placeholder="Opmerking (optioneel)"
                                                            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
                                                                fontSize: '0.87rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                                                                color: '#1e293b', marginBottom: '12px' }}
                                                        />
                                                        <button onClick={saveSick}
                                                            style={{ width: '100%', padding: '12px', background: '#ef4444', border: 'none', borderRadius: '12px',
                                                                fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', color: '#fff' }}>
                                                            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '7px' }} />Ziek melden
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── Andere uren ── */}
                                            <div style={{ borderRadius: '12px', border: `1.5px solid ${urenSection === 'andere' ? '#a5b4fc' : '#e2e8f0'}`, overflow: 'hidden' }}>
                                                <button onClick={() => setUrenSection(s => s === 'andere' ? null : 'andere')}
                                                    style={{ width: '100%', padding: '13px 16px', background: urenSection === 'andere' ? '#f5f3ff' : '#f8fafc',
                                                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                                                    <i className="fa-solid fa-stethoscope" style={{ color: '#6366f1', fontSize: '1rem' }} />
                                                    <span style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Andere uren</span>
                                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>dokter · tandarts</span>
                                                    <i className={`fa-solid fa-chevron-${urenSection === 'andere' ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.75rem' }} />
                                                </button>
                                                {urenSection === 'andere' && (
                                                    <div style={{ padding: '14px 16px 16px', background: '#fff', borderTop: '1.5px solid #a5b4fc' }}>
                                                        <input
                                                            value={andereOmschrijving}
                                                            onChange={e => setAndereOmschrijving(e.target.value)}
                                                            placeholder="Omschrijving (bijv. doktersbezoek)"
                                                            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
                                                                fontSize: '0.87rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                                                                color: '#1e293b', marginBottom: '10px' }}
                                                        />
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                                                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Aantal uren</label>
                                                            <input type="number" min="0.5" max="8" step="0.5"
                                                                value={andereUren}
                                                                onChange={e => setAndereUren(e.target.value)}
                                                                placeholder="bijv. 1.5"
                                                                style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
                                                                    fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', color: '#1e293b' }} />
                                                        </div>
                                                        <button onClick={saveAndereUren} disabled={!andereOmschrijving.trim() || !parseFloat(andereUren)}
                                                            style={{ width: '100%', padding: '12px',
                                                                background: andereOmschrijving.trim() && parseFloat(andereUren) ? '#6366f1' : '#f1f5f9',
                                                                border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.92rem',
                                                                cursor: andereOmschrijving.trim() && parseFloat(andereUren) ? 'pointer' : 'default',
                                                                color: andereOmschrijving.trim() && parseFloat(andereUren) ? '#fff' : '#94a3b8' }}>
                                                            <i className="fa-solid fa-floppy-disk" style={{ marginRight: '7px' }} />Opslaan
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </>
            )}

            {/* Preview modal */}
            {previewAtt && (
                <div onClick={closePreview}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div onClick={e => e.stopPropagation()}
                        style={{ background: '#1e293b', borderRadius: '14px', overflow: 'hidden', maxWidth: '95vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70vw' }}>{previewAtt.label || previewAtt.name}</div>
                            <button onClick={closePreview} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e2e8f0', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.85rem', marginLeft: '12px', flexShrink: 0 }}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {previewAtt.type?.startsWith('image/') ? (
                                <img src={previewBlobUrl || previewAtt.data || previewAtt.url} alt={previewAtt.name}
                                    style={{ maxWidth: '90vw', maxHeight: 'calc(90vh - 70px)', objectFit: 'contain', display: 'block' }} />
                            ) : previewLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '60px 40px' }}>
                                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#ef4444' }} />
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Bestand laden…</div>
                                </div>
                            ) : previewBlobUrl ? (
                                <embed src={previewBlobUrl} type="application/pdf"
                                    style={{ width: '80vw', height: 'calc(90vh - 70px)', display: 'block' }} />
                            ) : (
                                <div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: '40px' }}>Bestand kan niet worden weergegeven.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
