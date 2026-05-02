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

function getISOWeekAndYear(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return { week, year: d.getUTCFullYear() };
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
        // Dedup: verwijder dubbele taskIds per dag (b.v. bij overlap inRange + assignedByDay)
        result.forEach(day => {
            const seen = new Set();
            day.items = day.items.filter(item => {
                if (seen.has(item.taskId)) return false;
                seen.add(item.taskId);
                return true;
            });
        });
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
    const [dagKiezer, setDagKiezer] = useState(null); // { date, iso } — keuze menu voor lege dag
    const [detailTab, setDetailTab] = useState('uren'); // 'info' | 'checklist' | 'uren'
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [inlineExpanded, setInlineExpanded] = useState(null); // { taskId, dayIso }
    const [inlineUrenInput, setInlineUrenInput] = useState('');
    const [inlineNote, setInlineNote] = useState('');
    const [inlineSaved, setInlineSaved] = useState(false);
    const [inlineType, setInlineType] = useState('project'); // 'project' | 'meerwerk'
    const [inlineMatOpen, setInlineMatOpen] = useState(false);
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
    const [werkbonnen, setWerkbonnen] = useState([]);
    const [selectedWerkbon, setSelectedWerkbon] = useState(null);
    const [showWerkbonPicker, setShowWerkbonPicker] = useState(false);
    const [werkbonSearch, setWerkbonSearch] = useState('');
    const [werkbonUren, setWerkbonUren] = useState('');
    const [werkbonGeselecteerd, setWerkbonGeselecteerd] = useState(null);
    const [werkbonZoek, setWerkbonZoek] = useState('');
    const [werkbonSaved, setWerkbonSaved] = useState(false);
    const [werkbonKoppelingOpgeslagen, setWerkbonKoppelingOpgeslagen] = useState(false);
    const [showNieuwWerkbon, setShowNieuwWerkbon] = useState(false);
    const [wbDetailUren, setWbDetailUren] = useState('');
    const [wbDetailUrenSaved, setWbDetailUrenSaved] = useState(false);
    const [wbMaterialen, setWbMaterialen] = useState([]);
    const [wbMatNaam, setWbMatNaam] = useState('');
    const [wbMatHoeveelheid, setWbMatHoeveelheid] = useState('1 stuk');
    const [wbMatSaving, setWbMatSaving] = useState(false);
    const [materiaalPopup, setMateriaalPopup] = useState(null); // { dayIso, taskId }
    const [meerwerkUren, setMeerwerkUren] = useState('');
    const [ziekeNote, setZiekeNote] = useState('');
    const [ziekEditEntry, setZiekEditEntry] = useState(null);
    const [ziekEditNote, setZiekEditNote] = useState('');
    const [meerwerkEditEntry, setMeerwerkEditEntry] = useState(null);
    const [meerwerkEditText, setMeerwerkEditText] = useState('');
    const [meerwerkEditUren, setMeerwerkEditUren] = useState('');
    const [meerwerkMateriaal, setMeerwerkMateriaal] = useState([]);
    const [meerwerkMatNaam, setMeerwerkMatNaam] = useState('');
    const [meerwerkMatHoeveelheid, setMeerwerkMatHoeveelheid] = useState('1 stuk');
    const [matRijen, setMatRijen] = useState([]);
    const [matKolommen, setMatKolommen] = useState({});
    const [matZoekResultaten, setMatZoekResultaten] = useState([]);
    const [matOpslagen, setMatOpslagen] = useState({});
    const [matVerkoop, setMatVerkoop] = useState({});
    // Standalone materialen (los van meerwerk)
    const [losMateriaalLijst, setLosMateriaalLijst] = useState([]);
    const [losMatNaam, setLosMatNaam] = useState('');
    const [losMatHoeveelheid, setLosMatHoeveelheid] = useState('1 stuk');
    const [losMatZoek, setLosMatZoek] = useState([]);
    const [losMatPrijs, setLosMatPrijs] = useState('');
    const [losMatBtw, setLosMatBtw] = useState('21');
    const [losMatOpslag, setLosMatOpslag] = useState('');
    const [losMatCode, setLosMatCode] = useState('');
    const [losMatEenheid, setLosMatEenheid] = useState('');
    const [weekLosMateriaal, setWeekLosMateriaal] = useState([]);
    const [andereOmschrijving, setAndereOmschrijving] = useState('');
    const [andereUren, setAndereUren] = useState('');
    const [localProgress, setLocalProgress] = useState(0);
    const [progressSaved, setProgressSaved] = useState(false);
    const [hoverProg, setHoverProg] = useState(null);
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

    // Haal projecten op van server zodat planning altijd up-to-date is
    useEffect(() => {
        if (!user) return;
        const uid = user.id;
        const w = week;
        const y = year;
        // Direct tonen vanuit localStorage (snel)
        setPlanning(getMyPlanningForWeek(uid, w, y));
        // Daarna server ophalen — merge met lokale progress/completed zodat die niet overschreven worden
        fetch('/api/projecten')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    try {
                        const local = JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]');
                        const localMap = {};
                        local.forEach(p => (p.tasks || []).forEach(t => {
                            if (t.progress > 0 || t.completed) localMap[t.id] = { progress: t.progress, completed: t.completed };
                        }));
                        data.forEach(p => (p.tasks || []).forEach(t => {
                            if (localMap[t.id]) { t.progress = localMap[t.id].progress; t.completed = localMap[t.id].completed; }
                        }));
                    } catch {}
                    localStorage.setItem('schildersapp_projecten', JSON.stringify(data));
                    setPlanning(getMyPlanningForWeek(uid, w, y));
                }
            })
            .catch(() => {});
    }, [user, week, year]);

    const [weekUren, setWeekUren] = useState([]);
    useEffect(() => {
        if (!user) return;
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            const mijnUren = all.filter(e => e.userId === user.id);

            // OOK urv2-data voor de huidige week inlezen (ingevuld via /urenregistratie)
            const urv2Key = `schildersapp_urv2_u${user.id}_w${week}_${year}`;
            const urv2Raw = localStorage.getItem(urv2Key);
            if (urv2Raw) {
                const urv2Rows = JSON.parse(urv2Raw);
                const monday = getMondayOfWeek(week, year);
                urv2Rows.forEach(row => {
                    if (!row.projectId) return;
                    Object.entries(row.types || {}).forEach(([typeId, hrs]) => {
                        if (typeId === 'ziek' || typeId === 'vrij') return;
                        (hrs || []).forEach((h, di) => {
                            const hours = parseFloat(h) || 0;
                            if (hours <= 0) return;
                            const d = new Date(monday);
                            d.setDate(monday.getDate() + di);
                            const dateIso = fmtLocal(d);
                            const alreadyExists = mijnUren.some(e =>
                                e.date === dateIso &&
                                !e._fromUrv2 &&
                                (String(e.projectId) === String(row.projectId) || e.projectId == null)
                            );
                            if (!alreadyExists) {
                                mijnUren.push({
                                    id: `urv2_${row.projectId}_${di}`,
                                    userId: user.id,
                                    projectId: row.projectId,
                                    date: dateIso,
                                    hours,
                                    note: row.notes?.[typeId]?.[di] || '',
                                    _fromUrv2: true,
                                });
                            }
                        });
                    });
                });
            }

            setWeekUren(mijnUren);
        } catch { setWeekUren([]); }
    }, [user, week, year, urenLijst]);

    const [weekMeerwerk, setWeekMeerwerk] = useState([]);
    useEffect(() => {
        if (!user) return;
        try {
            const raw = localStorage.getItem('schildersapp_meerwerk');
            const all = raw ? JSON.parse(raw) : [];
            setWeekMeerwerk(all.filter(e => e.userId === user.id));
        } catch { setWeekMeerwerk([]); }
    }, [user, week, year, urenLijst]);

    // Laad uren van API bij wisseling van week/jaar en merge met localStorage
    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            try {
                const res = await fetch(`/api/uren?userId=${user.id}&week=${week}&jaar=${year}`);
                const rows = await res.json();
                if (!Array.isArray(rows) || rows.length === 0) return;

                const apiData = rows[0]?.data;
                if (!apiData) return;

                // Merge uren: lokale entries hebben voorrang, ontbrekende aanvullen vanuit API
                const urenRaw = localStorage.getItem('schildersapp_uren_registraties');
                const localUren = urenRaw ? JSON.parse(urenRaw) : [];
                const localIds = new Set(localUren.map(e => String(e.id)));
                const apiUren = Array.isArray(apiData.uren) ? apiData.uren : [];
                const toAdd = apiUren
                    .filter(e => !localIds.has(String(e.id)))
                    .map(e => String(e.id).startsWith('urv2_') ? { ...e, _fromUrv2: true } : e);
                if (toAdd.length > 0) {
                    localStorage.setItem('schildersapp_uren_registraties', JSON.stringify([...localUren, ...toAdd]));
                    setUrenLijst(prev => [...prev]); // trigger weekUren effect
                }

                // Merge meerwerk
                const meerwerkRaw = localStorage.getItem('schildersapp_meerwerk');
                const localMeerwerk = meerwerkRaw ? JSON.parse(meerwerkRaw) : [];
                const localMwIds = new Set(localMeerwerk.map(e => String(e.id)));
                const apiMeerwerk = Array.isArray(apiData.meerwerk) ? apiData.meerwerk : [];
                const mwToAdd = apiMeerwerk.filter(e => !localMwIds.has(String(e.id)));
                if (mwToAdd.length > 0) {
                    const mergedMw = [...localMeerwerk, ...mwToAdd];
                    localStorage.setItem('schildersapp_meerwerk', JSON.stringify(mergedMw));
                    setWeekMeerwerk(mergedMw.filter(e => e.userId === user.id));
                }
            } catch (e) {
                console.log('[loadUrenFromApi] ophalen mislukt:', e);
            }
        })();
    }, [user?.id, week, year]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!user) return;
        try {
            const raw = localStorage.getItem('schildersapp_dag_materialen');
            const all = raw ? JSON.parse(raw) : [];
            setWeekLosMateriaal(all.filter(e => e.userId === user.id));
        } catch { setWeekLosMateriaal([]); }
    }, [user, week, year, losMateriaalLijst]);

    // Achtergrond-sync: stuur alle lokale materialen naar DB als ze nog niet gesynchroniseerd zijn
    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            try {
                const dagRaw = localStorage.getItem('schildersapp_dag_materialen');
                const dagAll = dagRaw ? JSON.parse(dagRaw) : [];
                const urenRaw = localStorage.getItem('schildersapp_uren_registraties');
                const urenAll = urenRaw ? JSON.parse(urenRaw) : [];
                // Haal werkbonnen op
                const wbData = await fetch(`/api/werkbonnen?medewerker_id=${user.id}`).then(r => r.json()).catch(() => []);
                if (!Array.isArray(wbData)) return;
                // Groepeer lokale materialen per (taskId, date)
                const groepen = {};
                for (const m of dagAll) {
                    if (m.userId !== user.id) continue;
                    const key = `${m.taskId}||${m.date}`;
                    if (!groepen[key]) groepen[key] = [];
                    groepen[key].push(m);
                }
                let gewijzigd = false;
                for (const key of Object.keys(groepen)) {
                    const [taskId, date] = key.split('||');
                    // Zoek werkbon voor deze dag
                    const wbEntry = urenAll.find(e => e.type === 'werkbon' && String(e.taskId) === String(taskId) && e.date === date);
                    if (!wbEntry) continue;
                    let wbId = wbEntry.werkbonId;
                    if (!wbId && wbEntry.werkbonNaam) {
                        const match = wbData.find(w => w.naam === wbEntry.werkbonNaam);
                        if (!match?.id) continue;
                        wbId = match.id;
                        // Backfill werkbonId
                        for (const e of urenAll) {
                            if (e.type === 'werkbon' && String(e.taskId) === String(taskId) && e.date === date) {
                                e.werkbonId = wbId;
                                gewijzigd = true;
                            }
                        }
                    }
                    if (!wbId) continue;
                    // Haal bestaande DB-materialen op
                    const dbRes = await fetch(`/api/werkbonnen/${wbId}/materialen`).then(r => r.json()).catch(() => null);
                    const dbNamen = new Set((dbRes?.materialen || []).map(m => m.naam));
                    // POST ontbrekende materialen
                    for (const m of groepen[key]) {
                        if (m.dbId || dbNamen.has(m.naam)) continue;
                        const r = await fetch(`/api/werkbonnen/${wbId}/materialen`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ naam: m.naam, hoeveelheid: m.hoeveelheid }),
                        }).then(r => r.json()).catch(() => null);
                        if (r?.ok && r.id) {
                            m.dbId = r.id;
                            gewijzigd = true;
                        }
                    }
                }
                if (gewijzigd) {
                    localStorage.setItem('schildersapp_dag_materialen', JSON.stringify(dagAll));
                    // schildersapp_uren_registraties wordt NIET teruggeschreven hier —
                    // de async API calls kunnen lang duren en intussen kunnen nieuwe uren
                    // zijn opgeslagen via saveUren(). Terugschrijven zou die overschrijven.
                }
            } catch {}
        })();
    }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Materiaalbot productdata laden (uitgeschakelde artikelen worden gefilterd)
    useEffect(() => {
        try {
            const r = localStorage.getItem('schildersapp_materiaal_data');
            const c = localStorage.getItem('schildersapp_materiaal_cols');
            const u = localStorage.getItem('schildersapp_materiaal_uitgeschakeld');
            const colMap = c ? JSON.parse(c) : {};
            const uitgeschakeldSet = new Set(u ? JSON.parse(u) : []);
            const alleRijen = r ? JSON.parse(r) : [];
            const actieveRijen = alleRijen.filter(row => {
                const rk = row[colMap.code] || row[colMap.naam] || '';
                return !uitgeschakeldSet.has(rk);
            });
            setMatRijen(actieveRijen);
            setMatKolommen(colMap);
            // Opslagen en verkoopprijzen ingesteld door beheerder in Materiaalzoeker
            try {
                const oRaw = localStorage.getItem('schildersapp_materiaal_opslagen');
                const vRaw = localStorage.getItem('schildersapp_materiaal_verkoop');
                setMatOpslagen(oRaw ? JSON.parse(oRaw) : {});
                setMatVerkoop(vRaw ? JSON.parse(vRaw) : {});
            } catch {}
        } catch {}
    }, []);

    // Vakantiedagen laden uit localStorage
    useEffect(() => {
        if (!user) return;
        const yr = year;
        const key = `schildersapp_vakantie_${yr}_${(user.name || '').replace(/\s/g, '_')}`;
        try {
            const raw = localStorage.getItem(key);
            const arr = raw ? JSON.parse(raw) : [];
            setVacDays(new Set(arr));
        } catch { setVacDays(new Set()); }
    }, [user, year]);

    // Admin-afwezigheid laden van API
    const [myAbsences, setMyAbsences] = useState([]);
    useEffect(() => {
        if (!user) return;
        fetch(`/api/absences?userId=${user.id}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setMyAbsences(data);
                } else {
                    try {
                        const all = JSON.parse(localStorage.getItem('schilders-absences') || '[]');
                        setMyAbsences(all.filter(a => String(a.userId) === String(user.id)));
                    } catch { setMyAbsences([]); }
                }
            })
            .catch(() => {
                try {
                    const all = JSON.parse(localStorage.getItem('schilders-absences') || '[]');
                    setMyAbsences(all.filter(a => String(a.userId) === String(user.id)));
                } catch { setMyAbsences([]); }
            });
    }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Dag-swipe navigatie
    const todayDayIdx = (() => {
        const dow = today.getDay(); // 0=Zo, 1=Ma..5=Vr
        return dow >= 1 && dow <= 5 ? dow - 1 : 0;
    })();
    const isCurrentWeek = week === getISOWeek(today) && year === today.getFullYear();
    const [selectedDayIdx, setSelectedDayIdx] = useState(isCurrentWeek ? todayDayIdx : 0);
    const swipeTouchStart = useRef(null);

    useEffect(() => {
        setSelectedDayIdx(isCurrentWeek ? todayDayIdx : 0);
    }, [week, year]);

    function handleSwipeStart(e) {
        swipeTouchStart.current = e.touches[0].clientX;
    }
    function handleSwipeEnd(e) {
        if (swipeTouchStart.current === null) return;
        const dx = e.changedTouches[0].clientX - swipeTouchStart.current;
        swipeTouchStart.current = null;
        if (Math.abs(dx) < 50) return;
        if (dx < 0) setSelectedDayIdx(i => Math.min(4, i + 1));
        else setSelectedDayIdx(i => Math.max(0, i - 1));
    }

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
            // Voor vrij-items: alle uren van die dag teruggeven (taskId-onafhankelijk)
            if (String(taskId).startsWith('vrij-')) {
                return all.filter(e => e.date === dateIso && e.userId === user?.id);
            }
            // Eerst exact op taskId
            const byTask = all.filter(e => e.taskId === taskId && e.date === dateIso && e.userId === user?.id);
            if (byTask.length > 0) return byTask;
            // Fallback: entries van /urenregistratie hebben geen taskId, match op projectId
            const task = (() => { try { const p = JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]'); for (const pr of p) for (const t of (pr.tasks||[])) if (String(t.id)===String(taskId)) return { projectId: pr.id }; } catch {} return null; })();
            if (!task) return [];
            return all.filter(e => !e.taskId && String(e.projectId) === String(task.projectId) && e.date === dateIso && e.userId === user?.id);
        } catch { return []; }
    }

    // Sync uren + notitie vanuit planning naar urv2-formaat (urenregistratie)
    function syncToUrv2(dateIso, projectId) {
        try {
            const date = new Date(dateIso + 'T00:00:00');
            const dow = date.getDay(); // 0=Zo, 6=Za
            if (dow === 0 || dow === 6) return;
            const di = dow - 1; // 0=Ma..4=Vr
            const { week, year } = getISOWeekAndYear(date);
            const weekKey = `schildersapp_urv2_u${user.id}_w${week}_${year}`;

            // Herbereken totaal uren + laatste notitie voor dit project+dag
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            const dagEntries = all.filter(e =>
                e.date === dateIso &&
                String(e.projectId) === String(projectId) &&
                e.userId === user.id &&
                e.type !== 'ziek' && e.type !== 'andere'
            );
            const totalHours = dagEntries.reduce((s, e) => s + (e.hours || 0), 0);
            const noteText = dagEntries.slice().reverse().find(e => e.note)?.note || '';

            // Laad urv2
            let urv2 = [];
            try { const u = localStorage.getItem(weekKey); urv2 = u ? JSON.parse(u) : []; } catch {}

            // Vind of maak project rij
            let row = urv2.find(p => String(p.projectId) === String(projectId));
            if (!row) {
                row = { id: 'p' + Date.now(), projectId: String(projectId), types: { normaal: ['', '', '', '', ''] }, notes: { normaal: ['', '', '', '', ''] } };
                urv2.push(row);
            }
            if (!row.types.normaal) row.types.normaal = ['', '', '', '', ''];
            if (!row.notes) row.notes = {};
            if (!row.notes.normaal) row.notes.normaal = ['', '', '', '', ''];

            row.types.normaal[di] = totalHours > 0 ? String(totalHours) : '';
            row.notes.normaal[di] = noteText;

            localStorage.setItem(weekKey, JSON.stringify(urv2));
        } catch {}
    }

    async function syncUrenToApi(userId, weekNr, jaarNr) {
        try {
            const urenRaw = localStorage.getItem('schildersapp_uren_registraties');
            const allUren = urenRaw ? JSON.parse(urenRaw) : [];

            const meerwerkRaw = localStorage.getItem('schildersapp_meerwerk');
            const allMeerwerk = meerwerkRaw ? JSON.parse(meerwerkRaw) : [];

            const weekUrenData = allUren.filter(e => {
                if (e.userId !== userId) return false;
                if (!e.date) return false;
                if (String(e.id).startsWith('urv2_')) return false;
                const { week: w, year: y } = getISOWeekAndYear(new Date(e.date + 'T00:00:00'));
                return w === weekNr && y === jaarNr;
            });

            const weekMeerwerkData = allMeerwerk.filter(e => {
                if (e.userId !== userId) return false;
                if (!e.date) return false;
                const { week: w, year: y } = getISOWeekAndYear(new Date(e.date + 'T00:00:00'));
                return w === weekNr && y === jaarNr;
            });

            await fetch('/api/uren', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: String(userId),
                    userName: user?.name || null,
                    week: weekNr,
                    jaar: jaarNr,
                    data: { uren: weekUrenData, meerwerk: weekMeerwerkData },
                }),
            });
        } catch (e) {
            console.log('[syncUrenToApi] sync mislukt:', e);
        }
    }

    async function saveUren() {
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
        let updatedList;
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            // Vervang bestaande entry voor dezelfde taak + dag (geen duplicaten)
            const gefilterd = all.filter(e =>
                !(String(e.taskId) === String(detail.taskId) && e.date === detail.date && e.userId === user.id && !e.type)
            );
            gefilterd.push(entry);
            localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(gefilterd));
            updatedList = gefilterd;
        } catch { updatedList = [...urenLijst, entry]; }
        setUrenLijst(prev => [
            ...prev.filter(e => !(String(e.taskId) === String(detail.taskId) && e.date === detail.date && e.userId === user.id && !e.type)),
            entry,
        ]);
        setUrenAantal('');
        setUrenNote('');
        // PATCH werkbon uren als werkbon gekoppeld is aan deze dag
        // Eerst via localStorage, daarna via selectedWerkbon state als fallback
        let werkbonId = getWerkbonIdVoorDag(detail.taskId, detail.date);
        if (!werkbonId && selectedWerkbon?.id) {
            werkbonId = selectedWerkbon.id;
            // Sla koppeling ook op in localStorage zodat volgende saves hem ook vinden
            try {
                const raw2 = localStorage.getItem('schildersapp_uren_registraties');
                const all2 = raw2 ? JSON.parse(raw2) : [];
                const datum = detail.date;
                const filtered2 = all2.filter(e => !(e.type === 'werkbon' && String(e.taskId) === String(detail.taskId) && e.date === datum && !e.hours));
                filtered2.push({
                    id: Date.now() + 1,
                    userId: user?.id,
                    userName: user?.name,
                    projectId: detail?.projectId || null,
                    projectName: detail?.projectName || null,
                    taskId: detail?.taskId || null,
                    taskName: detail?.taskName || null,
                    date: datum,
                    hours: null,
                    type: 'werkbon',
                    werkbonNaam: selectedWerkbon.naam,
                    werkbonId: selectedWerkbon.id,
                });
                localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(filtered2));
            } catch {}
        }
        if (werkbonId) {
            const dagEntries = updatedList.filter(e =>
                String(e.taskId) === String(detail.taskId) &&
                e.date === detail.date &&
                e.userId === user?.id &&
                e.type !== 'ziek' && e.type !== 'andere' && e.type !== 'werkbon'
            );
            const totaal = Math.round(dagEntries.reduce((s, e) => s + (e.hours || 0), 0) * 10) / 10;
            try {
                await fetch(`/api/werkbonnen/${werkbonId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uren: totaal }),
                });
            } catch {}
        }
        if (detail) syncToUrv2(detail.date, detail.projectId);
        syncUrenToApi(user.id, week, year);
    }

    function saveUrenInline(hours, note) {
        const h = parseFloat(hours);
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
            note: (note || '').trim(),
        };
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            const gefilterd = all.filter(e =>
                !(String(e.taskId) === String(detail.taskId) && e.date === detail.date && e.userId === user.id && !e.type)
            );
            gefilterd.push(entry);
            localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(gefilterd));
        } catch {}
        setUrenLijst(prev => [
            ...prev.filter(e => !(String(e.taskId) === String(detail.taskId) && e.date === detail.date && e.userId === user.id && !e.type)),
            entry,
        ]);
        setInlineUrenInput('');
        setInlineNote('');
        setInlineSaved(true);
        setTimeout(() => { setInlineSaved(false); setInlineExpanded(null); }, 1500);
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
        if (detail) syncToUrv2(detail.date, detail.projectId);
    }

    function deleteUren(id) {
        const entry = urenLijst.find(e => e.id === id);
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            // If deleting a sick entry, remove all sick entries for this user+date
            const updated = entry?.type === 'ziek'
                ? all.filter(e => !(e.userId === user?.id && e.date === entry.date && e.type === 'ziek'))
                : all.filter(e => e.id !== id);
            localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(updated));
        } catch {}
        setUrenLijst(prev => entry?.type === 'ziek'
            ? prev.filter(e => e.type !== 'ziek')
            : prev.filter(e => e.id !== id));
        if (urenEditId === id) setUrenEditId(null);
        if (detail && entry) syncToUrv2(entry.date, detail.projectId);
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
        if (!meerwerkText.trim() && !meerwerkImage && !meerwerkVideoServerUrl && meerwerkMateriaal.length === 0) return;
        if (!detail || !user) return;
        if (sttActive) stopSpeechToText();
        try {
            const raw = localStorage.getItem('schildersapp_meerwerk');
            const all = raw ? JSON.parse(raw) : [];
            if (meerwerkEditEntry) {
                // Update bestaande entry
                const updated = all.map(e => String(e.id) === String(meerwerkEditEntry.id)
                    ? { ...e, text: meerwerkText.trim(), hours: parseFloat(meerwerkUren) || e.hours, image: meerwerkImage || e.image, video: meerwerkVideoServerUrl || e.video, materiaal: meerwerkMateriaal }
                    : e);
                localStorage.setItem('schildersapp_meerwerk', JSON.stringify(updated));
                setWeekMeerwerk(updated.filter(e => e.userId === user.id));
            } else {
                // Nieuwe entry aanmaken
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
                    materiaal: meerwerkMateriaal,
                    status: 'ingediend',
                };
                all.push(entry);
                localStorage.setItem('schildersapp_meerwerk', JSON.stringify(all));
                setWeekMeerwerk(all.filter(e => e.userId === user.id));
            }
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
        setMeerwerkMateriaal([]);
        setMeerwerkMatNaam('');
        setMeerwerkMatHoeveelheid('1 stuk');
        setMatZoekResultaten([]);
        setMeerwerkEditEntry(null);
        syncUrenToApi(user.id, week, year);
        setUrenSection(null);
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
        syncUrenToApi(user.id, week, year);
        setUrenSection(null);
        alert('Ziekmelding opgeslagen.');
    }

    function saveMeerwerkEdit() {
        if (!meerwerkEditEntry) return;
        try {
            const raw = localStorage.getItem('schildersapp_meerwerk');
            const all = raw ? JSON.parse(raw) : [];
            const updated = all.map(e => String(e.id) === String(meerwerkEditEntry.id)
                ? { ...e, text: meerwerkEditText.trim() || e.text, hours: parseFloat(meerwerkEditUren) || e.hours }
                : e);
            localStorage.setItem('schildersapp_meerwerk', JSON.stringify(updated));
            setWeekMeerwerk(updated.filter(e => e.userId === user.id));
        } catch {}
        setMeerwerkEditEntry(null);
    }

    function deleteMeerwerkEntry(id) {
        const targetId = id ?? meerwerkEditEntry?.id;
        if (!targetId) return;
        try {
            const raw = localStorage.getItem('schildersapp_meerwerk');
            const all = raw ? JSON.parse(raw) : [];
            const updated = all.filter(e => String(e.id) !== String(targetId));
            localStorage.setItem('schildersapp_meerwerk', JSON.stringify(updated));
            setWeekMeerwerk(updated.filter(e => e.userId === user.id));
        } catch {}
        setMeerwerkEditEntry(null);
    }

    function saveZiekEdit() {
        if (!ziekEditEntry) return;
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            const updated = all.map(e => String(e.id) === String(ziekEditEntry.id) ? { ...e, note: ziekEditNote.trim() || 'Ziek gemeld' } : e);
            localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(updated));
            setWeekUren(updated.filter(e => e.userId === user.id));
        } catch {}
        setZiekEditEntry(null);
    }

    function deleteZiekEntry() {
        if (!ziekEditEntry) return;
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            // Delete all sick entries for this user+date (prevents duplicate entries from re-appearing)
            const updated = all.filter(e => !(e.userId === user.id && e.date === ziekEditEntry.date && e.type === 'ziek'));
            localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(updated));
            setWeekUren(updated.filter(e => e.userId === user.id));
        } catch {}
        setZiekEditEntry(null);
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
        syncUrenToApi(user.id, week, year);
        setUrenSection(null);
    }

    async function saveWerkbonUren() {
        const uren = parseFloat(werkbonUren) || null;
        const naam = werkbonGeselecteerd?.naam || werkbonZoek.trim();
        if (!naam) return;
        const datum = detail?.date || new Date().toISOString().slice(0, 10);
        let newWerkbonId = null;
        try {
            let res;
            if (werkbonGeselecteerd?.id) {
                // Update bestaande werkbon
                const body = { datum };
                if (uren && uren > 0) body.uren = uren;
                res = await fetch(`/api/werkbonnen/${werkbonGeselecteerd.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            } else {
                // Nieuwe werkbon aanmaken (uren is optioneel)
                res = await fetch('/api/werkbonnen', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        medewerkerId: user?.id,
                        medewerkerNaam: user?.name,
                        naam,
                        datum,
                        uren: uren || null,
                        taskId: detail?.taskId || null,
                        taskNaam: detail?.taskName || null,
                    }),
                });
            }
            const data = await res.json();
            if (!data.ok) { alert('Opslaan mislukt: ' + (data.error || 'onbekende fout')); return; }
            newWerkbonId = data.id || werkbonGeselecteerd?.id || null;
        } catch (e) {
            alert('Verbindingsfout: ' + e.message);
            return;
        }
        // Zet selectedWerkbon zodat de bon zichtbaar blijft na opslaan
        const wb = {
            id: newWerkbonId,
            naam,
            datum,
            uren: uren || null,
            taskId: detail?.taskId || null,
            taskNaam: detail?.taskName || null,
        };
        setSelectedWerkbon(wb);
        setWbDetailUren(uren ? String(uren) : '');
        // Lokaal opslaan voor de urenlijst weergave
        if (uren && uren > 0) {
            const localEntry = {
                id: Date.now(),
                userId: user?.id,
                userName: user?.name,
                projectId: detail?.projectId || null,
                projectName: detail?.projectName || null,
                taskId: detail?.taskId || null,
                taskName: detail?.taskName || null,
                date: datum,
                hours: uren,
                type: 'werkbon',
                werkbonNaam: naam,
                werkbonId: newWerkbonId,
            };
            try {
                const raw = localStorage.getItem('schildersapp_uren_registraties');
                const all = raw ? JSON.parse(raw) : [];
                all.push(localEntry);
                localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(all));
            } catch {}
            setUrenLijst(prev => [...prev, localEntry]);
        }
        setWerkbonSaved(true);
        setWerkbonUren('');
        setWerkbonGeselecteerd(null);
        setWerkbonZoek('');
        setUrenSection(null);
        setShowNieuwWerkbon(false);
        setShowDetailModal(false);
        setTimeout(() => setWerkbonSaved(false), 2000);
    }

    async function saveWerkbonKoppeling(werkbonOverride) {
        const bon = werkbonOverride || selectedWerkbon;
        if (!bon?.id) return;
        const datum = detail?.date || new Date().toISOString().slice(0, 10);
        try {
            const body = {
                datum,
                taskId: detail?.taskId || null,
                taskNaam: detail?.taskName || null,
            };
            const res = await fetch(`/api/werkbonnen/${bon.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!data.ok) { alert('Opslaan mislukt: ' + (data.error || 'onbekende fout')); return; }
        } catch (e) {
            alert('Verbindingsfout: ' + e.message);
            return;
        }
        // Lokaal opslaan zodat het zichtbaar is in de planningsweergave
        const localEntry = {
            id: Date.now(),
            userId: user?.id,
            userName: user?.name,
            projectId: detail?.projectId || null,
            projectName: detail?.projectName || null,
            taskId: detail?.taskId || null,
            taskName: detail?.taskName || null,
            date: datum,
            hours: null,
            type: 'werkbon',
            werkbonNaam: bon.naam,
            werkbonId: bon.id,
        };
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            // Verwijder ALLE eerdere werkbon-koppeling-entries voor deze taskId+dag (ongeacht naam)
            const filtered = all.filter(e => !(e.type === 'werkbon' && String(e.taskId) === String(detail?.taskId) && e.date === datum && !e.hours));
            filtered.push(localEntry);
            localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(filtered));
        } catch {}
        setUrenLijst(prev => {
            const filtered = prev.filter(e => !(e.type === 'werkbon' && String(e.taskId) === String(detail?.taskId) && !e.hours));
            return [...filtered, localEntry];
        });
        setWerkbonKoppelingOpgeslagen(true);
        setShowWerkbonPicker(false);
        setTimeout(() => {
            setWerkbonKoppelingOpgeslagen(false);
            // selectedWerkbon blijft staan — bon blijft zichtbaar na koppelen
        }, 2000);
    }

    // Laad materialen als selectedWerkbon verandert
    useEffect(() => {
        if (!selectedWerkbon?.id) { setWbMaterialen([]); setWbDetailUren(''); return; }
        fetch(`/api/werkbonnen/${selectedWerkbon.id}/materialen`)
            .then(r => r.json())
            .then(d => setWbMaterialen(d.materialen || []))
            .catch(() => {});
    }, [selectedWerkbon?.id]);

    // Sync uren input met urenLijst voor vandaag (niet het DB-totaal van de werkbon)
    useEffect(() => {
        if (!selectedWerkbon?.id) return;
        const dagUren = urenLijst
            .filter(e => e.type !== 'werkbon' && e.type !== 'werkbon_uren' && e.type !== 'ziek' && e.type !== 'andere')
            .reduce((s, e) => s + (e.hours || 0), 0);
        setWbDetailUren(dagUren > 0 ? String(Math.round(dagUren * 10) / 10) : '');
    }, [selectedWerkbon?.id, urenLijst]);

    async function saveWbDetailUren() {
        if (!selectedWerkbon?.id || !detail) return;
        const uren = parseFloat(wbDetailUren);
        if (!uren || uren <= 0) return;
        const datum = detail.date || new Date().toISOString().slice(0, 10);
        // Vervang bestaande werkbon_uren entry voor vandaag
        const entry = {
            id: Date.now(),
            userId: user?.id,
            userName: user?.name,
            taskId: detail.taskId || null,
            taskName: detail.taskName || null,
            date: datum,
            hours: uren,
            type: 'werkbon_uren',
            werkbonId: selectedWerkbon.id,
            werkbonNaam: selectedWerkbon.naam,
        };
        setUrenLijst(prev => [...prev.filter(e => e.type !== 'werkbon_uren'), entry]);
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            const gefilterd = all.filter(e => !(e.type === 'werkbon_uren' && String(e.taskId) === String(detail.taskId) && e.date === datum && e.userId === user?.id));
            gefilterd.push(entry);
            localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(gefilterd));
        } catch {}
        // Patch ook de werkbon met het dag-totaal
        try {
            await fetch(`/api/werkbonnen/${selectedWerkbon.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uren }),
            });
        } catch {}
        setWbDetailUrenSaved(true);
        setTimeout(() => setWbDetailUrenSaved(false), 2000);
    }

    async function addWbMateriaal() {
        if (!selectedWerkbon?.id || !wbMatNaam.trim()) return;
        setWbMatSaving(true);
        const res = await fetch(`/api/werkbonnen/${selectedWerkbon.id}/materialen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ naam: wbMatNaam.trim(), hoeveelheid: wbMatHoeveelheid || '1 stuk', medewerkerNaam: user?.name || null }),
        });
        const data = await res.json();
        if (data.ok) {
            setWbMaterialen(prev => [...prev, { id: data.id, naam: wbMatNaam.trim(), hoeveelheid: wbMatHoeveelheid || '1 stuk' }]);
            setWbMatNaam('');
            setWbMatHoeveelheid('1 stuk');
        }
        setWbMatSaving(false);
    }

    async function deleteWbMateriaal(matId) {
        if (!selectedWerkbon?.id) return;
        await fetch(`/api/werkbonnen/${selectedWerkbon.id}/materialen`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matId }),
        });
        setWbMaterialen(prev => prev.filter(m => m.id !== matId));
    }

    function getWerkbonIdVoorDag(taskId, dateIso) {
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            const entry = all.find(e => e.type === 'werkbon' && String(e.taskId) === String(taskId) && e.date === dateIso);
            if (!entry) return null;
            if (entry.werkbonId) return entry.werkbonId;
            // Fallback: zoek werkbonId op naam in de geladen werkbonnen-lijst
            if (entry.werkbonNaam && werkbonnen.length > 0) {
                const match = werkbonnen.find(w => w.naam === entry.werkbonNaam);
                if (match?.id) {
                    // Backfill werkbonId in localStorage zodat volgende aanroepen direct werken
                    try {
                        const updated = all.map(e2 =>
                            e2.type === 'werkbon' && String(e2.taskId) === String(taskId) && e2.date === dateIso
                                ? { ...e2, werkbonId: match.id }
                                : e2
                        );
                        localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(updated));
                    } catch {}
                    return match.id;
                }
            }
            return null;
        } catch { return null; }
    }

    function loadLosMateriaal(taskId, dateIso) {
        try {
            const raw = localStorage.getItem('schildersapp_dag_materialen');
            const all = raw ? JSON.parse(raw) : [];
            return all.filter(e => e.taskId === taskId && e.date === dateIso && e.userId === user?.id);
        } catch { return []; }
    }

    async function voegLosMateriaalToe(naam, hoeveelheid) {
        if (!naam.trim() || !detail || !user) return;
        const rk = losMatCode || naam.trim();
        const inkoop = losMatPrijs ? parseFloat(String(losMatPrijs).replace(',', '.')) : null;
        const opslagPct = parseFloat(matOpslagen[rk]) || (losMatOpslag ? parseFloat(String(losMatOpslag).replace(',', '.')) : 0);

        // Exacte prioriteit als materiaalbot getVerkoopprijs():
        // 1. Handmatige verkoopprijs beheerder → altijd prioriteit
        // 2. Bereken: inkoop + inkoop×21% BTW + inkoop×opslag%
        let verkoopIncl = null;
        let verkoopExcl = null;
        let btwPct = 21;
        const handmatig = matVerkoop[rk];
        if (handmatig != null && handmatig !== '') {
            const v = parseFloat(handmatig);
            if (v > 0) { verkoopIncl = v; verkoopExcl = v; }
        } else if (inkoop != null && inkoop > 0) {
            verkoopExcl = Math.round(inkoop * (1 + opslagPct / 100) * 100) / 100;
            verkoopIncl = Math.round((inkoop + inkoop * 0.21 + inkoop * opslagPct / 100) * 100) / 100;
        }

        const entry = {
            id: Date.now(),
            userId: user.id,
            userName: user.name,
            taskId: detail.taskId,
            projectId: detail.projectId || null,
            projectName: detail.projectName || null,
            date: detail.date,
            naam: naam.trim(),
            hoeveelheid: hoeveelheid.trim() || '1 stuk',
            code: losMatCode || null,
            eenheid: losMatEenheid || null,
            inkoopprijs: inkoop,
            btw: btwPct,
            opslagPct,
            verkoopExcl,
            verkoopIncl,
            aangemaakt_op: new Date().toISOString(),
        };
        // Probeer ook in DB op te slaan als werkbon gekoppeld is
        const werkbonId = getWerkbonIdVoorDag(detail.taskId, detail.date);
        if (werkbonId) {
            try {
                const res = await fetch(`/api/werkbonnen/${werkbonId}/materialen`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ naam: entry.naam, hoeveelheid: entry.hoeveelheid, prijs: entry.verkoopIncl, medewerkerNaam: user?.name || null }),
                });
                const data = await res.json();
                if (data.ok && data.id) entry.dbId = data.id;
            } catch {}
        }
        try {
            const raw = localStorage.getItem('schildersapp_dag_materialen');
            const all = raw ? JSON.parse(raw) : [];
            all.push(entry);
            localStorage.setItem('schildersapp_dag_materialen', JSON.stringify(all));
        } catch {}
        setLosMateriaalLijst(prev => [...prev, entry]);
        setLosMatNaam('');
        setLosMatHoeveelheid('1 stuk');
        setLosMatPrijs('');
        setLosMatBtw('21');
        setLosMatOpslag('');
        setLosMatCode('');
        setLosMatEenheid('');
        setLosMatZoek([]);
    }

    async function verwijderLosMateriaal(id) {
        const entry = losMateriaalLijst.find(e => e.id === id);
        // Verwijder uit DB als werkbon gekoppeld en dbId bekend
        if (entry?.dbId && detail) {
            const werkbonId = getWerkbonIdVoorDag(detail.taskId, detail.date);
            if (werkbonId) {
                try {
                    await fetch(`/api/werkbonnen/${werkbonId}/materialen`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ matId: entry.dbId }),
                    });
                } catch {}
            }
        }
        try {
            const raw = localStorage.getItem('schildersapp_dag_materialen');
            const all = raw ? JSON.parse(raw) : [];
            localStorage.setItem('schildersapp_dag_materialen', JSON.stringify(all.filter(e => e.id !== id)));
        } catch {}
        setLosMateriaalLijst(prev => prev.filter(e => e.id !== id));
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
            setDetail(prev => ({
                ...prev,
                projectName: newProject.name,
                projectId:   newProject.id,
                color:       newProject.color || '#F5850A',
                taskName:    newTask.name,
                taskId:      newTask.id,
                client:      newProject.client || '',
                address:     newProject.address || '',
                completed:   newTask.completed,
                progress:    newTask.progress || 0,
                notes:       (newTask.notes || []).filter(n => typeof n === 'object'),
            }));
        } catch (e) { console.error('saveProjectChange fout:', e); }
    }

    function saveProgress(progress, markCompleted = false) {
        const completed = markCompleted || (progress === 100);
        try {
            // 1. Update planning state direct — werkt altijd, ongeacht localStorage
            setPlanning(prev => prev.map(day => {
                if (day.iso !== detail?.date) return day;
                const hasItem = day.items.some(it => String(it.taskId) === String(detail?.taskId));
                if (hasItem) {
                    return {
                        ...day,
                        items: day.items.map(it =>
                            String(it.taskId) === String(detail?.taskId)
                                ? { ...it, progress, completed }
                                : it
                        ),
                    };
                } else {
                    // Synthetisch item (day.items was leeg): inject zodat displayItems het oppikt
                    return {
                        ...day,
                        items: [{ ...detail, progress, completed }],
                    };
                }
            }));

            // 2. Update modal state
            setDetail(prev => prev ? ({ ...prev, progress, completed }) : prev);
            setLocalProgress(progress);
            setProgressSaved(true);
            setTimeout(() => setProgressSaved(false), 2000);

            // 3. Persisteer naar localStorage
            try {
                const raw = localStorage.getItem('schildersapp_projecten');
                const projects = raw ? JSON.parse(raw) : [];
                for (const p of projects) {
                    for (const t of (p.tasks || [])) {
                        if (String(t.id) === String(detail?.taskId)) {
                            t.progress = progress;
                            t.completed = completed;
                        }
                    }
                }
                localStorage.setItem('schildersapp_projecten', JSON.stringify(projects));
            } catch {}

            // 4. Sync naar server
            fetch('/api/projecten', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId: detail?.taskId, progress, completed }),
            }).catch(() => {});
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
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', borderRadius: '10px', padding: '2px 8px' }}>{badge}</span>
            )}
            <i className={`fa-solid fa-chevron-${poSectOpen[key] ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.92rem' }} />
        </div>
    );

    function openDetail(item, dateIso, tab = 'uren') {
        setDetail({ ...item, date: dateIso });
        setDetailTab(tab);
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
        setSelectedWerkbon(null);
        setShowWerkbonPicker(false);
        setShowNieuwWerkbon(false);
        setWerkbonSearch('');
        setWerkbonUren('');
        setWerkbonGeselecteerd(null);
        setWerkbonZoek('');
        setWerkbonSaved(false);
        setWerkbonKoppelingOpgeslagen(false);
        const localMat = loadLosMateriaal(item.taskId, dateIso);
        setLosMateriaalLijst(localMat);
        setLosMatNaam('');
        setLosMatHoeveelheid('1 stuk');
        setLosMatZoek([]);
        // Werkbonnen laden + daarna materialen DB sync
        if (user?.id) {
            fetch(`/api/werkbonnen?medewerker_id=${user.id}`)
                .then(r => r.json())
                .then(async data => {
                    if (Array.isArray(data)) {
                        setWerkbonnen(data);
                        // Pre-selecteer werkbon die net aangemaakt is
                        const pending = sessionStorage.getItem('pendingWerkbon');
                        if (pending) {
                            try {
                                const wb = JSON.parse(pending);
                                sessionStorage.removeItem('pendingWerkbon');
                                setWerkbonGeselecteerd(wb);
                                setUrenSection('werkbon');
                            } catch {}
                        }
                        // Zoek gekoppelde werkbon: eerst via DB (taskId + datum), dan fallback localStorage
                        let foundWb = null;
                        if (item.taskId) {
                            foundWb = data.find(w =>
                                String(w.taskId) === String(item.taskId) &&
                                w.datum && w.datum.slice(0, 10) === dateIso
                            );
                        }
                        if (!foundWb) {
                            // Fallback: zoek via localStorage
                            const raw = localStorage.getItem('schildersapp_uren_registraties');
                            const allUren = raw ? JSON.parse(raw) : [];
                            const wbEntry = allUren.find(e => e.type === 'werkbon' && String(e.taskId) === String(item.taskId) && e.date === dateIso);
                            let wbId = wbEntry?.werkbonId || null;
                            if (!wbId && wbEntry?.werkbonNaam) {
                                const match = data.find(w => w.naam === wbEntry.werkbonNaam);
                                if (match?.id) wbId = match.id;
                            }
                            if (wbId) foundWb = data.find(w => String(w.id) === String(wbId));
                        }
                        if (foundWb) setSelectedWerkbon(foundWb);
                        const wbId = foundWb?.id || null;
                        if (!wbId) return;
                        // Haal DB-materialen op
                        const matRes = await fetch(`/api/werkbonnen/${wbId}/materialen`).then(r => r.json()).catch(() => null);
                        const dbMat = (matRes?.ok && Array.isArray(matRes.materialen)) ? matRes.materialen : [];
                        const dbNamen = new Set(dbMat.map(m => m.naam));
                        // Sync lokale materialen zonder dbId naar DB
                        const localMatNu = loadLosMateriaal(item.taskId, dateIso);
                        const nognietInDb = localMatNu.filter(m => !m.dbId && !dbNamen.has(m.naam));
                        const syncedItems = [];
                        for (const m of nognietInDb) {
                            try {
                                const r = await fetch(`/api/werkbonnen/${wbId}/materialen`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ naam: m.naam, hoeveelheid: m.hoeveelheid }),
                                }).then(r => r.json());
                                if (r.ok && r.id) {
                                    syncedItems.push({ localId: m.id, dbId: r.id });
                                    // Sla dbId op in localStorage
                                    try {
                                        const dagRaw = localStorage.getItem('schildersapp_dag_materialen');
                                        const dagAll = dagRaw ? JSON.parse(dagRaw) : [];
                                        localStorage.setItem('schildersapp_dag_materialen', JSON.stringify(
                                            dagAll.map(e => e.id === m.id ? { ...e, dbId: r.id } : e)
                                        ));
                                    } catch {}
                                }
                            } catch {}
                        }
                        // Merge alles in state
                        setLosMateriaalLijst(prev => {
                            // Update dbId voor gesyncte items
                            let updated = prev.map(e => {
                                const synced = syncedItems.find(s => s.localId === e.id);
                                return synced ? { ...e, dbId: synced.dbId } : e;
                            });
                            // Voeg DB-items toe die nog niet lokaal staan
                            const lokaleNamen = new Set(updated.map(e => e.naam));
                            const nieuweDbItems = dbMat
                                .filter(m => !lokaleNamen.has(m.naam))
                                .map(m => ({
                                    id: m.id * -1,
                                    dbId: m.id,
                                    userId: user?.id,
                                    taskId: item.taskId,
                                    date: dateIso,
                                    naam: m.naam,
                                    hoeveelheid: m.hoeveelheid,
                                }));
                            return [...updated, ...nieuweDbItems];
                        });
                    }
                })
                .catch(() => {});
        }
        setZiekeNote('');
        setAndereOmschrijving('');
        setAndereUren('');
        setLocalProgress(item.completed ? 100 : (item.progress || 0));
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

    // ── Per-dag stats (uren, vol, ziek, vrij, vakantie) ───────────────────
    const DAG_AFR_MAP = {1:'Ma',2:'Di',3:'Wo',4:'Do',5:'Vr'};
    const dagStats = workDays.map(d => {
        const holiday = HOLIDAYS[d.iso];
        const isVac = vacDays.has(d.iso);
        const dagPlanningItems = planning.find(p => p.iso === d.iso)?.items || [];
        const duRaw = dagPlanningItems.length > 0
            ? dagPlanningItems.flatMap(item =>
                weekUren.filter(u => String(u.taskId) === String(item.taskId) && u.date === d.iso)
              )
            : weekUren.filter(u => u.date === d.iso && !u._fromUrv2 && !String(u.id).startsWith('urv2_'));
        const du = duRaw.filter((u, idx, arr) => arr.findIndex(x => String(x.id) === String(u.id)) === idx);
        const u = Math.round(du.filter(e => e.type !== 'ziek').reduce((s, e) => s + (e.hours || 0), 0) * 10) / 10;
        const ziek = du.some(e => e.type === 'ziek');
        const dagNr = new Date(d.iso + 'T00:00:00').getDay();
        return { iso: d.iso, u, ziek, holiday, isVac, vol: !holiday && !isVac && (ziek || u >= 7.5), label: DAG_AFR_MAP[dagNr] || '' };
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: '#f1f5f9', overflowY: 'auto' }}>

            {/* Oranje header */}
            <div style={{ background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', padding: '10px 20px', flexShrink: 0, boxShadow: '0 2px 12px rgba(245,133,10,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <i className="fa-solid fa-calendar-days" style={{ color: '#fff', fontSize: '1.1rem' }} />
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>Planning</div>
                </div>
            </div>

        <div style={{ padding: '10px 12px' }}>
            {/* Week navigatie — sticky */}
            <div style={{ position: 'sticky', top: 0, zIndex: 50, marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: '12px', padding: '6px', boxShadow: '0 2px 12px rgba(0,0,0,0.10)', border: '1px solid #f1f5f9' }}>
                <button onClick={prevWeek} style={{ background: '#f8fafc', border: 'none', borderRadius: '10px', padding: '9px 14px', cursor: 'pointer', fontSize: '0.9rem', color: '#475569' }}>
                    <i className="fa-solid fa-chevron-left" />
                </button>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>Week {week}</div>
                    <div style={{ fontSize: '0.87rem', color: '#94a3b8', marginTop: '1px' }}>{weekLabel}</div>
                </div>
                <button onClick={nextWeek} style={{ background: '#f8fafc', border: 'none', borderRadius: '10px', padding: '9px 14px', cursor: 'pointer', fontSize: '0.9rem', color: '#475569' }}>
                    <i className="fa-solid fa-chevron-right" />
                </button>
            </div>

            {/* ── Dag tabs ── */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                {workDays.map((d, i) => {
                    const isToday = d.iso === todayIso;
                    const isSelected = i === selectedDayIdx;
                    const stat = dagStats[i];
                    const dayName = DAY_NAMES[i];
                    const dayNum = new Date(d.iso + 'T00:00:00').getDate();
                    const borderColor = isSelected ? 'transparent'
                        : isToday ? '#F5850A'
                        : stat.vol ? '#86efac'
                        : 'transparent';
                    const bg = isSelected ? '#F5850A'
                        : stat.vol ? '#f0fdf4'
                        : isToday ? '#fff7ed'
                        : '#fff';
                    return (
                        <button key={i} onClick={() => setSelectedDayIdx(i)} style={{
                            flex: 1, padding: '8px 3px 8px', border: `1.5px solid ${borderColor}`,
                            borderRadius: '12px', background: bg, cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'space-between', gap: '4px', minHeight: '86px',
                            boxShadow: isSelected ? '0 2px 8px rgba(245,133,10,0.35)' : '0 1px 3px rgba(0,0,0,0.06)',
                        }}>
                            {/* Dagnaam */}
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1,
                                color: isSelected ? '#fff' : isToday ? '#F5850A' : '#64748b' }}>
                                {dayName}
                            </span>

                            {/* Dagnummer + optioneel icoon */}
                            <div style={{
                                width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                                background: isSelected ? 'rgba(255,255,255,0.22)'
                                    : stat.holiday ? '#fff7ed'
                                    : stat.isVac ? '#f0fdf4'
                                    : stat.ziek ? '#fef2f2'
                                    : stat.vol ? '#10b981'
                                    : '#f8fafc',
                                border: isSelected ? '1px solid rgba(255,255,255,0.3)'
                                    : stat.vol ? 'none'
                                    : '1px solid #e2e8f0',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px',
                            }}>
                                <span style={{ fontSize: '1rem', fontWeight: 900, lineHeight: 1,
                                    color: isSelected ? '#fff' : stat.vol ? '#fff' : stat.holiday ? '#fb923c' : stat.isVac ? '#10b981' : stat.ziek ? '#ef4444' : isToday ? '#F5850A' : '#94a3b8' }}>
                                    {dayNum}
                                </span>
                            </div>

                            {/* Uren / status */}
                            {stat.holiday ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <i className="fa-solid fa-star" style={{ fontSize: '0.6rem', color: isSelected ? 'rgba(255,255,255,0.85)' : '#fb923c' }} />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 600, lineHeight: 1, color: isSelected ? 'rgba(255,255,255,0.85)' : '#fb923c' }}>vrij</span>
                                </div>
                            ) : stat.isVac ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <i className="fa-solid fa-umbrella-beach" style={{ fontSize: '0.6rem', color: isSelected ? 'rgba(255,255,255,0.85)' : '#10b981' }} />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 600, lineHeight: 1, color: isSelected ? 'rgba(255,255,255,0.85)' : '#10b981' }}>vak.</span>
                                </div>
                            ) : stat.ziek ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <i className="fa-solid fa-bed-pulse" style={{ fontSize: '0.6rem', color: isSelected ? 'rgba(255,255,255,0.85)' : '#ef4444' }} />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 600, lineHeight: 1, color: isSelected ? 'rgba(255,255,255,0.85)' : '#ef4444' }}>ziek</span>
                                </div>
                            ) : stat.vol ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <i className="fa-solid fa-check" style={{ fontSize: '0.6rem',
                                        color: isSelected ? '#fff' : '#10b981' }} />
                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, lineHeight: 1,
                                        color: isSelected ? '#fff' : '#10b981' }}>{stat.u}u</span>
                                </div>
                            ) : stat.u > 0 ? (
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, lineHeight: 1,
                                    color: isSelected ? '#fff' : '#f97316' }}>{stat.u}u</span>
                            ) : (
                                <span style={{ fontSize: '0.65rem', lineHeight: 1,
                                    color: isSelected ? 'rgba(255,255,255,0.4)' : '#cbd5e1' }}>—</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Week uren tracker ── */}
            {(() => {
                const werkDagen = dagStats.filter(d => !d.holiday && !d.isVac);
                const weekTotaal = Math.round(werkDagen.reduce((s, d) => s + d.u, 0) * 10) / 10;
                const dagenVol   = werkDagen.filter(d => d.vol).length;
                const volledig   = werkDagen.length > 0 && dagenVol === werkDagen.length;
                return (
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '10px 14px', marginBottom: '10px', border: `1px solid ${volledig ? '#bbf7d0' : '#f1f5f9'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deze week</span>
                        <span style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>·</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: volledig ? '#10b981' : weekTotaal > 0 ? '#f97316' : '#cbd5e1' }}>{weekTotaal}<span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginLeft: '1px' }}>u</span></span>
                        <span style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>·</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: volledig ? '#10b981' : '#94a3b8' }}>
                            {volledig ? '✓ volledig' : `${dagenVol}/${werkDagen.length} dagen ingevuld`}
                        </span>
                    </div>
                );
            })()}

            {/* Swipe container — toont alleen de geselecteerde dag */}
            <div onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd}>
            {workDays.map((day, di) => {
                    if (di !== selectedDayIdx) return null;
                    const isToday = day.iso === todayIso;
                    const isPast = day.iso < todayIso;
                    const holiday = HOLIDAYS[day.iso];
                    const absEntry = myAbsences.find(a => day.iso >= a.startDate && day.iso <= a.endDate) || null;
                    const isVacation = vacDays.has(day.iso) || absEntry?.type === 'vakantie' || absEntry?.type === 'vrije_dag';
                    const isFree = holiday || isVacation;
                    const ziekEntry = weekUren.find(u => u.date === day.iso && u.type === 'ziek');
                    const vrijTaskId = `vrij-${day.iso}`;
                    // Lege dagen krijgen een synthetisch item → zelfde kaart-rendering als echte taken
                    // Als lege dag maar wel uren geregistreerd: toon projectnaam uit uren
                    const dagUrenVoorDisplay = weekUren.filter(u => u.date === day.iso && !String(u.taskId).startsWith('vrij-') && u.projectName && u.userId === user?.id);
                    const eersteUrenProject = dagUrenVoorDisplay[0];
                    const displayItems = day.items.length === 0
                        ? [eersteUrenProject
                            ? { taskId: eersteUrenProject.taskId || vrijTaskId, projectName: eersteUrenProject.projectName, taskName: eersteUrenProject.taskName || '', projectId: eersteUrenProject.projectId, progress: 0, completed: false, color: '#F5850A', notes: [], client: null }
                            : { taskId: vrijTaskId, projectName: 'Nog in te vullen project', taskName: '', projectId: null, progress: 0, completed: false, color: '#F5850A', notes: [], client: null }]
                        : day.items;

                    // Dag-level uren totaal — alleen uren die ook zichtbaar zijn in de uren tab
                    // Bij vrij-dag: alle uren voor die datum; bij echte taak: alleen uren die matchen met een van de taskIds
                    const dagTaskIds = new Set(day.items.map(t => String(t.taskId)));
                    const dagTotaalUren = Math.round(
                        displayItems.reduce((total, item) => {
                            const isVrijItem = String(item.taskId).startsWith('vrij-');
                            const uren = isVrijItem
                                ? weekUren.filter(u => u.date === day.iso && !u._fromUrv2 && !String(u.id).startsWith('urv2_') && u.type !== 'ziek')
                                : weekUren.filter(u => String(u.taskId) === String(item.taskId) && u.date === day.iso && u.type !== 'ziek');
                            const dedup = uren.filter((u, idx, arr) => arr.findIndex(x => String(x.id) === String(u.id)) === idx);
                            return total + dedup.reduce((s, u) => s + (u.hours || 0), 0);
                        }, 0) * 10
                    ) / 10;
                    const dagVol = !isFree && (ziekEntry || dagTotaalUren >= 7.5);
                    const dagDeels = !isFree && !dagVol && dagTotaalUren > 0;
                    const dagAccent = dagVol ? '#10b981' : dagDeels ? '#f97316' : isToday ? '#F5850A' : '#e2e8f0';
                    const datumKleur = isToday ? '#F5850A' : '#64748b';

                    const datumKolom = (
                        <div style={{ width: '52px', flexShrink: 0, alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', paddingRight: '8px', paddingTop: '8px', paddingBottom: '8px', gap: '2px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: datumKleur, lineHeight: 1, textTransform: 'uppercase', marginBottom: '1px' }}>{DAY_NAMES_FULL[di].substring(0, 2)}</span>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: dagVol ? '#10b981' : dagDeels ? '#fff7ed' : isToday ? '#fff8f0' : '#f8fafc',
                                    border: `2px solid ${dagAccent}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                                }}>
                                    {ziekEntry
                                        ? <i className="fa-solid fa-bed-pulse" style={{ color: '#ef4444', fontSize: '0.86rem' }} />
                                        : <span style={{ fontSize: '1rem', fontWeight: 900, lineHeight: 1, color: dagVol ? '#fff' : dagDeels ? '#f97316' : isToday ? '#F5850A' : '#94a3b8' }}>{new Date(day.iso + 'T00:00:00').getDate()}</span>
                                    }
                                </div>
                            </div>
                            {dagTotaalUren > 0 && !ziekEntry && (
                                <div style={{
                                    fontSize: '0.72rem', fontWeight: 800,
                                    color: dagVol ? '#10b981' : '#f97316',
                                    background: dagVol ? '#f0fdf4' : '#fff7ed',
                                    border: `1px solid ${dagVol ? '#bbf7d0' : '#fed7aa'}`,
                                    borderRadius: '6px', padding: '2px 5px',
                                    lineHeight: 1, textAlign: 'center', width: '100%',
                                }}>
                                    {dagTotaalUren}u
                                </div>
                            )}
                            {ziekEntry && (
                                <div style={{
                                    fontSize: '0.65rem', fontWeight: 700,
                                    color: '#ef4444', background: '#fef2f2',
                                    border: '1px solid #fca5a5',
                                    borderRadius: '6px', padding: '2px 4px',
                                    lineHeight: 1, textAlign: 'center', width: '100%',
                                }}>
                                    ziek
                                </div>
                            )}
                        </div>
                    );

                    return (
                        <div key={day.iso} style={{ marginBottom: '8px' }}>
                            {/* Dag header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', paddingLeft: '2px' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isToday ? '#F5850A' : '#475569' }}>
                                    {DAY_NAMES_FULL[di]} {new Date(day.iso + 'T00:00:00').getDate()} {['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'][new Date(day.iso + 'T00:00:00').getMonth()]}
                                </span>
                                {dagTotaalUren > 0 && !isFree && !ziekEntry && (
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: dagVol ? '#10b981' : '#f97316',
                                        background: dagVol ? '#f0fdf4' : '#fff7ed',
                                        border: `1px solid ${dagVol ? '#bbf7d0' : '#fed7aa'}`,
                                        borderRadius: '20px', padding: '2px 8px' }}>
                                        {dagVol && <i className="fa-solid fa-check" style={{ marginRight: '4px', fontSize: '0.65rem' }} />}
                                        {dagTotaalUren}u
                                    </span>
                                )}
                            </div>

                            {isFree ? (
                                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                                    {holiday ? `⭐ ${holiday}` : '☂ Vakantie'}
                                </div>
                            ) : absEntry && (absEntry.type === 'ziek' || absEntry.type === 'dokter') ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
                                    background: absEntry.type === 'ziek' ? '#fef2f2' : '#fefce8',
                                    borderRadius: '12px', border: `1px solid ${absEntry.type === 'ziek' ? '#fca5a5' : '#fde047'}` }}>
                                    <i className={`fa-solid ${absEntry.type === 'ziek' ? 'fa-face-thermometer' : 'fa-stethoscope'}`}
                                        style={{ color: absEntry.type === 'ziek' ? '#ef4444' : '#ca8a04', fontSize: '0.85rem', flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.85rem', color: absEntry.type === 'ziek' ? '#ef4444' : '#92400e', fontWeight: 700 }}>
                                        {absEntry.type === 'ziek' ? 'Ziek (geregistreerd door beheerder)' : 'Dokter / Tandarts'}
                                    </span>
                                </div>
                            ) : ziekEntry && day.items.length === 0 ? (
                                <div onClick={() => { setZiekEditEntry(ziekEntry); setZiekEditNote(ziekEntry.note || ''); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fca5a5', cursor: 'pointer' }}>
                                    <i className="fa-solid fa-bed-pulse" style={{ color: '#ef4444', fontSize: '0.85rem', flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 700, flex: 1 }}>{ziekEntry.note && ziekEntry.note !== 'Ziek gemeld' ? ziekEntry.note : 'Ziek gemeld'}</span>
                                    <i className="fa-solid fa-pen" style={{ color: '#fca5a5', fontSize: '0.86rem' }} />
                                </div>
                            ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {displayItems.map((item, ii) => {
                                const isVrijItem = String(item.taskId).startsWith('vrij-');
                                const dagUrenRaw = isVrijItem
                                    ? weekUren.filter(u => u.date === day.iso && !u._fromUrv2 && !String(u.id).startsWith('urv2_'))
                                    : weekUren.filter(u => String(u.taskId) === String(item.taskId) && u.date === day.iso);
                                // Dedup op id om dubbele entries te voorkomen
                                const dagUren = dagUrenRaw.filter((u, idx, arr) => arr.findIndex(x => String(x.id) === String(u.id)) === idx);
                                const dagMeerwerk = isVrijItem
                                    ? weekMeerwerk.filter(m => m.date === day.iso)
                                    : weekMeerwerk.filter(m => String(m.taskId) === String(item.taskId) && m.date === day.iso);
                                const werkbonEntry = dagUren.find(u => u.type === 'werkbon');
                                const totaalU = Math.round(dagUren.reduce((s, u) => s + (u.hours || 0), 0) * 10) / 10;
                                const urenIngevuld = totaalU > 0;
                                const isInline = inlineExpanded?.taskId === item.taskId && inlineExpanded?.dayIso === day.iso;
                                return (
                                <div key={ii} style={{ display: 'contents' }}>
                                <div onClick={() => {
                                    const same = inlineExpanded?.taskId === item.taskId && inlineExpanded?.dayIso === day.iso;
                                    if (same) { setInlineExpanded(null); return; }
                                    openDetail(item, day.iso);
                                    setShowDetailModal(false);
                                    setInlineExpanded({ taskId: item.taskId, dayIso: day.iso });
                                    setInlineUrenInput('');
                                    setInlineNote('');
                                    setInlineSaved(false);
                                    setInlineType('project');
                                }} style={{
                                    background: item.completed ? '#fafafa' : '#fff',
                                    borderRadius: '12px', display: 'flex', flexDirection: 'row', overflow: 'hidden',
                                    borderTop: `1.5px solid ${urenIngevuld ? '#bbf7d0' : item.color + '22'}`,
                                    borderRight: `1.5px solid ${urenIngevuld ? '#bbf7d0' : item.color + '22'}`,
                                    borderBottom: `1.5px solid ${urenIngevuld ? '#bbf7d0' : item.color + '22'}`,
                                    borderLeft: `4px solid ${urenIngevuld ? '#10b981' : item.color || '#F5850A'}`,
                                    cursor: 'pointer', opacity: item.completed ? 0.65 : 1,
                                }}>
                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ flex: 1, padding: '12px 12px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                {werkbonEntry ? (
                                                    <>
                                                        <div style={{ fontWeight: 700, fontSize: '0.87rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{werkbonEntry.werkbonNaam}</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                            <i className="fa-solid fa-file-pen" style={{ fontSize: '0.8rem', color: '#F5850A' }} />
                                                            <span style={{ fontSize: '0.87rem', color: '#F5850A', fontWeight: 600 }}>Werkbon</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                                                            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{item.projectName}</span>
                                                            {(
                                                                <button onClick={e => { e.stopPropagation(); openDetail(item, day.iso); setShowDetailModal(true); setDetailTab('wijzigen'); setInlineExpanded(null); }}
                                                                    style={{ flexShrink: 0, background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer', color: '#cbd5e1', lineHeight: 1 }}>
                                                                    <i className="fa-solid fa-pencil" style={{ fontSize: '0.7rem' }} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        {item.taskName && <div style={{ fontSize: '0.87rem', color: '#64748b', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.taskName}</div>}
                                                        {item.client && <div style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><i className="fa-solid fa-location-dot" style={{ marginRight: '3px', fontSize: '0.92rem' }} />{item.client}</div>}
                                                    </>
                                                )}
                                                {item.notes && item.notes.length > 0 && (
                                                    <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <i className="fa-solid fa-note-sticky" style={{ fontSize: '0.92rem', color: '#f59e0b' }} />
                                                        <span style={{ fontSize: '0.63rem', color: '#f59e0b', fontWeight: 600 }}>{item.notes.length} notitie{item.notes.length !== 1 ? 's' : ''}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Rechts: pijltje */}
                                            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <i className="fa-solid fa-chevron-right" style={{ color: '#d1d5db', fontSize: '0.9rem' }} />
                                            </div>
                                            {(() => {
                                                const dagLosMat = weekLosMateriaal.filter(e => String(e.taskId) === String(item.taskId) && e.date === day.iso);
                                                const matEntries = dagMeerwerk.filter(m => m.materiaal?.length > 0 && String(m.taskId) === String(item.taskId));
                                                if (matEntries.length === 0 && dagLosMat.length === 0) return null;
                                                const totaalItems = matEntries.reduce((s, m) => s + m.materiaal.length, 0) + dagLosMat.length;
                                                const popupOpen = materiaalPopup?.dayIso === day.iso && materiaalPopup?.taskId === item.taskId;
                                                return (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setMateriaalPopup(popupOpen ? null : { dayIso: day.iso, taskId: item.taskId }); }}
                                                        style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: popupOpen ? '#fff8f0' : '#fef3c7', border: `1.5px solid ${popupOpen ? '#F5850A' : '#fcd34d'}`, borderRadius: '8px', cursor: 'pointer' }}>
                                                        <i className="fa-solid fa-box-open" style={{ color: '#f59e0b', fontSize: '0.82rem' }} />
                                                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#b45309' }}>{totaalItems}</span>
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    {/* Materiaal popup */}
                                    {materiaalPopup?.dayIso === day.iso && materiaalPopup?.taskId === item.taskId && (() => {
                                        const matEntries = dagMeerwerk.filter(m => m.materiaal?.length > 0 && String(m.taskId) === String(item.taskId));
                                        const dagLosMat = weekLosMateriaal.filter(e => String(e.taskId) === String(item.taskId) && e.date === day.iso);
                                        if (matEntries.length === 0 && dagLosMat.length === 0) return null;
                                        return (
                                            <div style={{ padding: '10px 12px', background: '#fffbeb', borderTop: '1px solid #fcd34d' }}>
                                                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '7px' }}>
                                                    <i className="fa-solid fa-box-open" style={{ marginRight: '5px' }} />Gebruikte materialen
                                                </div>
                                                {dagLosMat.map((mat, i) => (
                                                    <div key={'los_' + i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0' }}>
                                                        <i className="fa-solid fa-circle" style={{ color: '#f59e0b', fontSize: '0.3rem', flexShrink: 0 }} />
                                                        <span style={{ fontSize: '0.92rem', color: '#1e293b', fontWeight: 600, flex: 1 }}>{mat.naam}</span>
                                                        {mat.hoeveelheid && <span style={{ fontSize: '0.87rem', color: '#b45309', fontWeight: 700 }}>{mat.hoeveelheid}</span>}
                                                    </div>
                                                ))}
                                                {dagLosMat.length > 0 && matEntries.length > 0 && <hr style={{ border: 'none', borderTop: '1px solid #fde68a', margin: '6px 0' }} />}
                                                {matEntries.map((m, mi) => (
                                                    <div key={mi}>
                                                        {matEntries.length > 1 && m.text && (
                                                            <div style={{ fontSize: '0.84rem', color: '#92400e', fontWeight: 600, marginBottom: '3px', marginTop: mi > 0 ? '6px' : 0 }}>{m.text}</div>
                                                        )}
                                                        {m.materiaal.map((mat, i) => (
                                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0' }}>
                                                                <i className="fa-solid fa-circle" style={{ color: '#f59e0b', fontSize: '0.3rem', flexShrink: 0 }} />
                                                                <span style={{ fontSize: '0.92rem', color: '#1e293b', fontWeight: 600, flex: 1 }}>{mat.naam}</span>
                                                                {mat.hoeveelheid && <span style={{ fontSize: '0.87rem', color: '#b45309', fontWeight: 700 }}>{mat.hoeveelheid}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                    {/* Uren balken onderaan content column */}
                                    {(() => {
                                        const STIJL = {
                                            ziek:     { bg: '#fef2f2', border: '#fca5a5', color: '#ef4444', icon: 'fa-bed-pulse' },
                                            andere:   { bg: '#f5f3ff', border: '#c4b5fd', color: '#7c3aed', icon: 'fa-circle-info' },
                                            meerwerk: { bg: '#fff8f0', border: '#fdba74', color: '#ea580c', icon: 'fa-triangle-exclamation' },
                                            werkbon:  { bg: '#fff8f0', border: '#fdba74', color: '#F5850A', icon: 'fa-file-pen' },
                                            default:  { bg: '#f0fdf4', border: '#86efac', color: '#10b981', icon: 'fa-clock' },
                                        };
                                        const rijen = [
                                            ...dagUren.filter(e => e.type !== 'werkbon').map(e => ({
                                                key: e.id,
                                                entry: e,
                                                stijl: (werkbonEntry && !e.type) ? STIJL.werkbon : (STIJL[e.type] || STIJL.default),
                                                label: e.type === 'ziek' ? (e.note || 'Ziek gemeld') : e.type === 'andere' ? (e.note || 'Andere uren') : (e.note || (werkbonEntry ? 'Werkbon uren' : 'Projecturen')),
                                                uren: e.hours || null,
                                            })),
                                            ...(dagMeerwerk.length > 0 ? [{
                                                key: 'mw_combined',
                                                entry: { ...dagMeerwerk[0], _type: 'meerwerk' },
                                                stijl: STIJL.meerwerk,
                                                label: 'Meerwerk',
                                                note: dagMeerwerk.length > 1 ? dagMeerwerk.filter(m => m.text).map(m => m.text).join(' · ') : (dagMeerwerk[0].text || null),
                                                uren: (() => { const t = Math.round(dagMeerwerk.reduce((s, m) => s + (m.hours || 0), 0) * 10) / 10; return t > 0 ? t : null; })(),
                                            }] : []),
                                            ...(ziekEntry && !dagUren.some(e => e.type === 'ziek') ? [{
                                                key: 'ziek-dag',
                                                entry: ziekEntry,
                                                stijl: STIJL.ziek,
                                                label: ziekEntry.note && ziekEntry.note !== 'Ziek gemeld' ? ziekEntry.note : 'Ziek gemeld',
                                                uren: null,
                                            }] : []),
                                        ];
                                        return rijen.map(r => (
                                            <div key={r.key}
                                                onClick={r.entry?.type === 'ziek' ? (e) => { e.stopPropagation(); setZiekEditEntry(r.entry); setZiekEditNote(r.entry.note || ''); } : r.entry?._type === 'meerwerk' ? (e) => { e.stopPropagation(); setMeerwerkEditEntry(r.entry); setMeerwerkText(r.entry.text || ''); setMeerwerkUren(r.entry.hours ? String(r.entry.hours) : ''); setMeerwerkImage(r.entry.image || null); setMeerwerkVideoUrl(r.entry.video || null); setMeerwerkVideoServerUrl(r.entry.video || null); openDetail(item, day.iso); setUrenSection('meerwerk'); } : undefined}
                                                style={{ borderTop: `1px solid ${r.stijl.border}`, background: r.stijl.bg, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px', cursor: (r.entry?.type === 'ziek' || r.entry?._type === 'meerwerk') ? 'pointer' : 'default' }}>
                                                <i className={`fa-solid ${r.stijl.icon}`} style={{ color: r.stijl.color, fontSize: '0.87rem', flexShrink: 0, alignSelf: 'flex-start', marginTop: '2px' }} />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: r.stijl.color }}>{r.label}</div>
                                                    {r.note && <div style={{ fontSize: '0.84rem', color: r.stijl.color, opacity: 0.7, marginTop: '1px' }}>{r.note}</div>}
                                                </div>
                                                {r.uren && <span style={{ fontSize: '0.9rem', fontWeight: 800, color: r.stijl.color }}>{r.uren}u</span>}
                                            </div>
                                        ));
                                    })()}
                                    </div>{/* einde content column */}
                                    {/* Voortgangsbalk rechts — verticaal */}
                                    <div style={{ width: '28px', background: item.completed ? '#d1fae5' : (item.color || '#F5850A') + '22', position: 'relative', flexShrink: 0, minHeight: '70px' }}>
                                        <div style={{ width: '100%', height: `${item.completed ? 100 : item.progress || 0}%`, background: item.completed ? 'linear-gradient(to top, #059669, #10b981)' : `linear-gradient(to top, ${item.color}cc, ${item.color})`, transition: 'height 0.3s', position: 'absolute', bottom: 0, left: 0, borderRadius: '0 0 2px 2px' }} />
                                        {/* Label bovenaan gevuld deel */}
                                        {item.completed ? (
                                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 }}>
                                                <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: '0.82rem' }} />
                                            </div>
                                        ) : item.progress > 0 ? (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: `${item.progress}%`,
                                                left: 0, right: 0,
                                                transform: 'translateY(50%)',
                                                zIndex: 1,
                                                display: 'flex', justifyContent: 'center',
                                            }}>
                                                <span style={{
                                                    background: item.color,
                                                    color: '#fff',
                                                    fontSize: '0.52rem',
                                                    fontWeight: 800,
                                                    borderRadius: '4px',
                                                    padding: '1px 3px',
                                                    lineHeight: 1.3,
                                                    whiteSpace: 'nowrap',
                                                }}>{item.progress}%</span>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                {/* ── Inline uren invoer ── */}
                                {isInline && (() => {
                                    const canSaveMw = (meerwerkText.trim() || meerwerkImage || meerwerkVideoServerUrl || meerwerkMateriaal.length > 0) && !videoUploading;
                                    return (
                                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', border: `1.5px solid ${item.color || '#F5850A'}22`, borderRadius: '14px', padding: '12px', marginTop: '4px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>

                                        {/* ── PROJECTUREN ── */}
                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: item.color || '#F5850A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <i className="fa-solid fa-clock" style={{ fontSize: '0.7rem' }} />Projecturen
                                            </div>
                                            {totaalU > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', padding: '6px 10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                                    <i className="fa-solid fa-check" style={{ color: '#10b981', fontSize: '0.75rem' }} />
                                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981' }}>{totaalU}u geregistreerd</span>
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 'auto' }}>Overschrijven?</span>
                                                </div>
                                            )}
                                            <input value={inlineNote} onChange={e => setInlineNote(e.target.value)}
                                                placeholder="Opmerking (optioneel)"
                                                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }} />
                                            <button onClick={() => saveUrenInline('7.5', inlineNote)}
                                                style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', background: inlineSaved ? '#10b981' : `linear-gradient(135deg, ${item.color || '#F5850A'} 0%, #D96800 100%)`, color: '#fff', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                {inlineSaved ? <><i className="fa-solid fa-check" />Opgeslagen</> : <><i className="fa-solid fa-clock" />7.5u registreren</>}
                                            </button>
                                        </div>

                                        {/* ── SCHEIDINGSLIJN ── */}
                                        <div style={{ borderTop: '1.5px solid #f1f5f9', marginBottom: '12px' }} />

                                        {/* ── MEERWERK ── */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <i className="fa-solid fa-circle-plus" style={{ fontSize: '0.7rem' }} />Meerwerk
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <label style={{ fontSize: '0.87rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Extra uren</label>
                                                <input type="number" min="0.5" max="24" step="0.5"
                                                    value={meerwerkUren} onChange={e => setMeerwerkUren(e.target.value)}
                                                    placeholder="bijv. 2"
                                                    style={{ width: '90px', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '0.92rem', fontFamily: 'inherit', outline: 'none', color: '#1e293b' }} />
                                            </div>
                                            <textarea value={meerwerkText} onChange={e => setMeerwerkText(e.target.value)}
                                                placeholder="Omschrijf het meerwerk... wat heb je extra gedaan en waarom?"
                                                rows={3}
                                                style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', fontSize: '0.87rem', resize: 'none', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#1e293b' }} />

                                            {/* Actieknoppen */}
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {!sttActive ? (
                                                    <button onClick={startSpeechToText} style={{ flex: '0 0 auto', padding: '8px 11px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '9px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <i className="fa-solid fa-microphone" />Inspreken
                                                    </button>
                                                ) : (
                                                    <button onClick={stopSpeechToText} style={{ flex: '0 0 auto', padding: '8px 11px', background: '#ef4444', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <i className="fa-solid fa-stop" />Stop
                                                    </button>
                                                )}
                                                {!meerwerkImage && (
                                                    <label style={{ flex: '0 0 auto', padding: '8px 11px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '9px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <i className="fa-solid fa-camera" />Foto
                                                        <input type="file" accept="image/*" capture="environment" onChange={handleMeerwerkImage} style={{ display: 'none' }} />
                                                    </label>
                                                )}
                                                {!meerwerkVideoUrl && !videoRecording && (
                                                    <button onClick={startVideoRecording} style={{ flex: '0 0 auto', padding: '8px 11px', background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: '9px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <i className="fa-solid fa-video" />Video
                                                    </button>
                                                )}
                                                <label style={{ flex: '0 0 auto', padding: '8px 11px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '9px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <i className="fa-solid fa-photo-film" />Gallerij
                                                    <input type="file" accept="image/*,video/*" onChange={e => { const f = e.target.files[0]; if (!f) return; if (f.type.startsWith('image/')) handleMeerwerkImage(e); else handleVideoFile(e); }} style={{ display: 'none' }} />
                                                </label>
                                            </div>

                                            {/* Materiaal — inklapbaar */}
                                            <div style={{ borderRadius: '10px', border: '1.5px solid #fde68a', overflow: 'hidden' }}>
                                                <button onClick={() => setInlineMatOpen(v => !v)}
                                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', background: inlineMatOpen ? '#fffbeb' : '#fefce8', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                                                    <i className="fa-solid fa-box" style={{ color: '#f59e0b', fontSize: '0.85rem' }} />
                                                    <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 700, color: '#92400e' }}>
                                                        Materiaal toevoegen
                                                        {meerwerkMateriaal.length > 0 && <span style={{ marginLeft: '6px', background: '#f59e0b', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '0.72rem', fontWeight: 800 }}>{meerwerkMateriaal.length}</span>}
                                                    </span>
                                                    <i className={`fa-solid fa-chevron-${inlineMatOpen ? 'up' : 'down'}`} style={{ color: '#d97706', fontSize: '0.8rem' }} />
                                                </button>
                                                {inlineMatOpen && <div style={{ padding: '10px 12px 12px', background: '#fff', borderTop: '1px solid #fde68a' }}>
                                                    <div style={{ position: 'relative', marginBottom: '6px' }}>
                                                        <input type="text" value={meerwerkMatNaam}
                                                            onChange={e => { const q = e.target.value; setMeerwerkMatNaam(q); if (q.length >= 2 && matRijen.length > 0 && matKolommen.naam) { const ql = q.toLowerCase(); setMatZoekResultaten(matRijen.filter(r => String(r[matKolommen.naam] ?? '').toLowerCase().includes(ql)).slice(0, 8)); } else { setMatZoekResultaten([]); } }}
                                                            onKeyDown={e => { if (e.key === 'Enter' && meerwerkMatNaam.trim()) { setMeerwerkMateriaal(prev => [...prev, { naam: meerwerkMatNaam.trim(), hoeveelheid: meerwerkMatHoeveelheid.trim() }]); setMeerwerkMatNaam(''); setMeerwerkMatHoeveelheid('1 stuk'); setMatZoekResultaten([]); } }}
                                                            placeholder="Zoek product..."
                                                            style={{ width: '100%', padding: '8px 34px 8px 10px', border: '1.5px solid #fde68a', borderRadius: '9px', fontSize: '0.87rem', fontFamily: 'inherit', outline: 'none', color: '#1e293b', boxSizing: 'border-box', background: '#fffbeb' }} />
                                                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#d97706', fontSize: '0.8rem', pointerEvents: 'none' }} />
                                                        {matZoekResultaten.length > 0 && (
                                                            <div style={{ position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #fde68a', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
                                                                {matZoekResultaten.map((r, i) => { const naam = String(r[matKolommen.naam] ?? ''); const eenheid = matKolommen.eenheid ? String(r[matKolommen.eenheid] ?? '') : ''; return (
                                                                    <button key={i} onClick={() => { setMeerwerkMateriaal(prev => [...prev, { naam, hoeveelheid: meerwerkMatHoeveelheid.trim() || eenheid }]); setMeerwerkMatNaam(''); setMeerwerkMatHoeveelheid('1 stuk'); setMatZoekResultaten([]); }}
                                                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', borderBottom: i < matZoekResultaten.length - 1 ? '1px solid #fef3c7' : 'none', cursor: 'pointer', textAlign: 'left' }}>
                                                                        <i className="fa-solid fa-box" style={{ color: '#f59e0b', fontSize: '0.83rem', flexShrink: 0 }} />
                                                                        <span style={{ flex: 1, fontSize: '0.83rem', color: '#1e293b', fontWeight: 600, whiteSpace: 'nowrap' }}>{naam}</span>
                                                                        {eenheid && <span style={{ fontSize: '0.8rem', color: '#94a3b8', flexShrink: 0 }}>{eenheid}</span>}
                                                                    </button>
                                                                ); })}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                                                        <input type="text" value={meerwerkMatHoeveelheid} onChange={e => setMeerwerkMatHoeveelheid(e.target.value)} placeholder="Hoeveelheid"
                                                            style={{ flex: 1, padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', color: '#1e293b' }} />
                                                        <button onClick={() => { if (!meerwerkMatNaam.trim()) return; setMeerwerkMateriaal(prev => [...prev, { naam: meerwerkMatNaam.trim(), hoeveelheid: meerwerkMatHoeveelheid.trim() }]); setMeerwerkMatNaam(''); setMeerwerkMatHoeveelheid('1 stuk'); setMatZoekResultaten([]); }}
                                                            style={{ padding: '0 14px', background: '#f59e0b', border: 'none', borderRadius: '9px', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>+</button>
                                                    </div>
                                                    {meerwerkMateriaal.length > 0 && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {meerwerkMateriaal.map((mat, i) => (
                                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                                                    <i className="fa-solid fa-box" style={{ color: '#f59e0b', fontSize: '0.82rem', flexShrink: 0 }} />
                                                                    <span style={{ flex: 1, fontSize: '0.83rem', color: '#1e293b', fontWeight: 600 }}>{mat.naam}</span>
                                                                    {mat.hoeveelheid && <span style={{ fontSize: '0.85rem', color: '#78716c' }}>{mat.hoeveelheid}</span>}
                                                                    <button onClick={() => setMeerwerkMateriaal(prev => prev.filter((_, j) => j !== i))}
                                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d97706', padding: '2px 4px', fontSize: '0.85rem' }}>
                                                                        <i className="fa-solid fa-xmark" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>}
                                            </div>

                                                {/* STT indicator */}
                                                {sttActive && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: '#fef2f2', borderRadius: '10px', border: '1.5px solid #fca5a5' }}>
                                                        <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 600 }}>Luisteren... spreek nu</div>
                                                            {sttInterim && <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '1px' }}>{sttInterim}</div>}
                                                        </div>
                                                        <button onClick={stopSpeechToText} style={{ padding: '5px 12px', background: '#ef4444', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0 }}>Stop</button>
                                                    </div>
                                                )}

                                                {/* Foto preview */}
                                                {meerwerkImage && (
                                                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                                                        <img src={meerwerkImage} alt="preview" style={{ maxWidth: '100%', maxHeight: '140px', borderRadius: '10px', border: '1.5px solid #e2e8f0', display: 'block' }} />
                                                        <button onClick={() => setMeerwerkImage(null)}
                                                            style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <i className="fa-solid fa-xmark" />
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Video preview */}
                                                {(meerwerkVideoUrl || videoUploading) && !videoRecording && (
                                                    <div style={{ position: 'relative', width: '100%' }}>
                                                        {meerwerkVideoUrl && <video src={meerwerkVideoUrl} controls playsInline style={{ width: '100%', maxHeight: '160px', borderRadius: '10px', border: '1.5px solid #e2e8f0', display: 'block', background: '#000' }} />}
                                                        {videoUploading && (
                                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                                <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#fff', fontSize: '1.8rem' }} />
                                                                <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>Uploaden... {uploadProgress}%</span>
                                                            </div>
                                                        )}
                                                        <button onClick={() => { setMeerwerkVideoServerUrl(null); setMeerwerkVideoUrl(null); setVideoUploading(false); setUploadProgress(0); }}
                                                            style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <i className="fa-solid fa-xmark" />
                                                        </button>
                                                    </div>
                                                )}

                                                <button onClick={saveMeerwerk} disabled={!canSaveMw}
                                                    style={{ width: '100%', padding: '11px', background: canSaveMw ? '#f59e0b' : '#f1f5f9', border: 'none', borderRadius: '11px', fontWeight: 700, fontSize: '0.9rem', cursor: canSaveMw ? 'pointer' : 'default', color: canSaveMw ? '#fff' : '#94a3b8' }}>
                                                    {videoUploading
                                                        ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '7px' }} />Video uploaden...</>
                                                        : <><i className="fa-solid fa-paper-plane" style={{ marginRight: '7px' }} />Meerwerk indienen</>
                                                    }
                                                </button>
                                            </div>
                                    </div>
                                    );
                                })()}
                                </div>
                                );
                            })}
                            </div>

                            )}

                        </div>
                    );
                })
            }


            {/* Detail modal */}
            {detail && showDetailModal && (
                <>
                    <div onClick={() => { setDetail(null); setShowDetailModal(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
                    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px 20px 0 0', zIndex: 310, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
                        {/* Header */}
                        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
                            <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 14px' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <div style={{ width: '6px', height: '44px', background: detail.color, borderRadius: '3px', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail.projectName}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail.taskName}</div>
                                </div>
                                <button onClick={() => { setDetailTab('wijzigen'); setShowWerkbonPicker(false); setChangeProject(null); setProjectSearch(''); }}
                                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '7px 10px', cursor: 'pointer', color: '#94a3b8', flexShrink: 0 }}>
                                    <i className="fa-solid fa-right-left" style={{ fontSize: '0.82rem' }} />
                                </button>
                            </div>


                        </div>

                        {/* Tabs */}
                        <div className="tab-nav" style={{ marginBottom: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
                            {[['uren','fa-clock','Uren'],['wijzigen','fa-right-left','Wijzigen'],['werkbon','fa-file-pen','Werkbon'],['materialen','fa-box-open','Materiaalbot']].map(([t, ic, l]) => (
                                <button key={t} onClick={() => setDetailTab(t)}
                                    className={`tab-btn${detailTab === t ? ' active' : ''}`}
                                    style={{ flexShrink: 0, position: 'relative' }}>
                                    <i className={`fa-solid ${ic}`} style={{ fontSize: '0.86rem' }} />
                                    {l}
                                    {(t === 'werkbon' || t === 'wijzigen') && selectedWerkbon && (
                                        <span style={{ position: 'absolute', top: '4px', right: '6px', width: '7px', height: '7px', borderRadius: '50%', background: '#F5850A' }} />
                                    )}
                                    {t === 'materialen' && wbMaterialen.length > 0 && (
                                        <span style={{ position: 'absolute', top: '4px', right: '6px', width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Tab inhoud — scrollbaar */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 32px' }}>

                            {false && (() => {
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
                                            {detail.address} <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.82rem' }} />
                                        </a>
                                    ))}


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
                                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '20px', background: nt.color, color: '#fff', fontSize: '0.82rem', fontWeight: 700 }}>
                                                                                    <i className={`fa-solid ${nt.icon}`} style={{ fontSize: '0.92rem' }} />
                                                                                    {nt.label}
                                                                                </span>
                                                                                <span style={{ fontSize: '0.84rem', color: '#94a3b8' }}>{note.author}</span>
                                                                                <span style={{ fontSize: '0.82rem', color: '#94a3b8', marginLeft: 'auto' }}>{note.date}</span>
                                                                                {isOwn && editingNoteId !== note.id && (
                                                                                    <button onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.text || ''); }}
                                                                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 2px', fontSize: '0.86rem' }}>
                                                                                        <i className="fa-solid fa-pencil" />
                                                                                    </button>
                                                                                )}
                                                                                {user?.role === 'Beheerder' && (
                                                                                    <button onClick={() => deleteInfoNote(note.id)}
                                                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 2px', fontSize: '0.86rem', opacity: 0.6 }}>
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
                                                                                            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#475569' }}>{r.author}</span>
                                                                                            <span style={{ fontSize: '0.84rem', color: '#94a3b8', marginLeft: '5px' }}>{r.created_at ? new Date(r.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                                                                            <div style={{ fontSize: '0.82rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{r.text}</div>
                                                                                        </div>
                                                                                    ))}
                                                                                    {replyingToNoteId === note.id && (
                                                                                        <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                                                                            <input autoFocus value={infoReplyText} onChange={e => setInfoReplyText(e.target.value)}
                                                                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInfoReply(note.id); } if (e.key === 'Escape') { setReplyingToNoteId(null); } }}
                                                                                                placeholder="Typ reactie… (Enter)"
                                                                                                style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: `1.5px solid ${nt.color}88`, fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none' }} />
                                                                                            <button onClick={() => addInfoReply(note.id)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: nt.color, color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>↵</button>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            {replyingToNoteId !== note.id && (
                                                                                <button onClick={() => { setReplyingToNoteId(note.id); setInfoReplyText(''); }}
                                                                                    style={{ marginTop: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.87rem', padding: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
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
                                                                        <button onClick={() => setPoNoteMedia(null)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', color: '#fff', cursor: 'pointer', fontSize: '0.92rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fa-solid fa-xmark" /></button>
                                                                    </div>
                                                                )}
                                                                <input ref={noteMediaInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleNoteMedia} />
                                                                <input ref={noteAddMediaInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleAddMediaToNote} />
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                                                                    {Object.entries(NOTE_TYPES_MW).map(([key, nt]) => (
                                                                        <button key={key} onClick={() => setPoNoteType(key)}
                                                                            style={{ padding: '3px 9px', borderRadius: '20px', border: `1.5px solid ${poNoteType === key ? nt.color : nt.color + '55'}`, background: poNoteType === key ? nt.bg : nt.color + '12', color: nt.color, fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', opacity: poNoteType === key ? 1 : 0.65 }}>
                                                                            {nt.label}
                                                                        </button>
                                                                    ))}
                                                                    <button type="button" onClick={() => noteMediaInputRef.current?.click()} disabled={poNoteMediaUploading}
                                                                        style={{ padding: '3px 9px', borderRadius: '20px', border: `1.5px solid ${poNoteMedia ? '#10b981' : '#e2e8f0'}`, background: poNoteMedia ? '#f0fdf4' : 'transparent', color: poNoteMedia ? '#10b981' : '#94a3b8', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        {poNoteMediaUploading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paperclip" />}
                                                                        {poNoteMedia ? '✓' : 'Bijlage'}
                                                                    </button>
                                                                    <button onClick={addNotitie} disabled={!poNoteText.trim() && !poNoteMedia}
                                                                        style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: '8px', border: 'none', background: (poNoteText.trim() || poNoteMedia) ? '#F5850A' : '#e2e8f0', color: (poNoteText.trim() || poNoteMedia) ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: '0.92rem', cursor: (poNoteText.trim() || poNoteMedia) ? 'pointer' : 'default' }}>
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
                                                                                    {b.label && b.name !== b.label && <div style={{ fontSize: '0.87rem', color: '#94a3b8' }}>{b.name}</div>}
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
                                                            {allFotos.length > 0 && <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', borderRadius: '10px', padding: '2px 8px' }}>{allFotos.length}</span>}
                                                            <i className={`fa-solid fa-chevron-${poSectOpen.fotos ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.92rem' }} />
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
                                                                                {foto.tijd && <div style={{ color: '#fff', fontSize: '0.92rem', fontWeight: 600 }}>{foto.tijd}</div>}
                                                                            </div>
                                                                            {!foto.isAdmin && (
                                                                                <button onClick={e => { e.stopPropagation(); if (window.confirm('Foto verwijderen?')) deleteFoto(foto.id); }}
                                                                                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', color: '#fff', cursor: 'pointer', fontSize: '0.86rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#F5850A' }}>{detail.projectName}</div>
                                            <div style={{ fontSize: '0.84rem', color: '#94a3b8' }}>Checklist — {done}/{checklist.length} voltooid</div>
                                        </div>
                                        {checklist.length > 0 && (
                                            <div style={{ fontSize: '0.87rem', fontWeight: 700, color: '#F5850A', background: '#fff3e0', borderRadius: '20px', padding: '3px 10px' }}>
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
                                const canSaveMeerwerk = (meerwerkText.trim() || meerwerkImage || meerwerkVideoServerUrl || meerwerkMateriaal.length > 0) && !videoUploading;
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
                                                            <div style={{ fontSize: '0.92rem', color: '#64748b', marginTop: '1px' }}>{detailMonth} {detailYear}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: heeftUren ? '#10b981' : '#cbd5e1', lineHeight: 1 }}>
                                                            {heeftUren ? `${Math.round(totalVandaag * 10) / 10}u` : '—'}
                                                        </div>
                                                        {heeftUren && <i className="fa-solid fa-check" style={{ fontSize: '0.92rem', color: '#10b981' }} />}
                                                    </div>
                                                    <button onClick={() => goToDay(nextWorkday(detail.date))}
                                                        style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer', color: '#475569', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <i className="fa-solid fa-chevron-right" />
                                                    </button>
                                                </div>
                                            );
                                        })()}

                                        {/* Notities van de taak */}
                                        {detail.notes && detail.notes.length > 0 && (
                                            <div style={{ marginBottom: '14px' }}>
                                                <div style={{ fontSize: '0.87rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '7px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <i className="fa-solid fa-note-sticky" style={{ color: '#f59e0b' }} />Notities
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {detail.notes.map((n, i) => (
                                                        <div key={n.id || i} style={{ padding: '9px 12px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '10px' }}>
                                                            {n.photo && (
                                                                <img src={n.photo} alt="" style={{ width: '100%', borderRadius: '8px', marginBottom: '7px', maxHeight: '160px', objectFit: 'cover' }} />
                                                            )}
                                                            <div style={{ fontSize: '0.83rem', color: '#1e293b', lineHeight: 1.4 }}>{n.text || n.content || ''}</div>
                                                            <div style={{ fontSize: '0.84rem', color: '#b45309', marginTop: '4px', display: 'flex', gap: '8px' }}>
                                                                {n.author && <span>{n.author}</span>}
                                                                {n.date && <span>{n.date}</span>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

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
                                                                    <label style={{ fontSize: '0.87rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Uren</label>
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
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: e.type === 'ziek' ? '#fef2f2' : '#f8fafc', cursor: e.type === 'ziek' ? 'default' : 'pointer' }}
                                                                onClick={() => { if (e.type === 'ziek') return; setUrenEditId(e.id); setUrenEditVal(String(e.hours)); setUrenEditNote(e.note || ''); }}>
                                                                <i className={`fa-solid ${e.type === 'ziek' ? 'fa-bed-pulse' : e.type === 'andere' ? 'fa-stethoscope' : 'fa-clock'}`}
                                                                    style={{ color: e.type === 'ziek' ? '#ef4444' : e.type === 'andere' ? '#6366f1' : '#10b981', fontSize: '0.8rem', flexShrink: 0 }} />
                                                                <span style={{ fontSize: '0.85rem', color: e.type === 'ziek' ? '#ef4444' : '#475569', fontWeight: e.type === 'ziek' ? 700 : 400, flex: 1 }}>
                                                                    {e.type === 'ziek' ? (e.note || 'Ziek gemeld') : e.type === 'andere' ? (e.note || 'Andere uren') : (e.note || (selectedWerkbon ? 'Werkbon uren' : 'Projecturen'))}
                                                                </span>
                                                                {e.hours ? <span style={{ fontWeight: 700, color: '#F5850A', fontSize: '0.95rem' }}>{e.hours}u</span> : null}
                                                                {e.type === 'ziek'
                                                                    ? <button onClick={ev => { ev.stopPropagation(); deleteUren(e.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px 4px', fontSize: '0.8rem' }}><i className="fa-solid fa-trash" /></button>
                                                                    : <i className="fa-solid fa-pen" style={{ color: '#cbd5e1', fontSize: '0.84rem' }} />
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            {(() => {
                                                const mwLijst = weekMeerwerk.filter(m => String(m.taskId) === String(detail.taskId) && m.date === detail.date);
                                                return mwLijst.map(m => (
                                                    <div key={m.id} style={{ marginBottom: '6px', border: '1.5px solid #fdba74', borderRadius: '10px', overflow: 'hidden' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: '#fff8f0' }}>
                                                            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ea580c', fontSize: '0.8rem', flexShrink: 0 }} />
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontSize: '0.85rem', color: '#ea580c', fontWeight: 700 }}>Meerwerk</div>
                                                                {m.text && <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '2px' }}>{m.text}</div>}
                                                            </div>
                                                            {m.hours && <span style={{ fontWeight: 700, color: '#ea580c', fontSize: '0.95rem' }}>{m.hours}u</span>}
                                                            <button onClick={() => { setMeerwerkEditEntry(m); setMeerwerkText(m.text || ''); setMeerwerkUren(m.hours ? String(m.hours) : ''); setMeerwerkImage(m.image || null); setMeerwerkVideoUrl(m.video || null); setMeerwerkVideoServerUrl(m.video || null); setMeerwerkMateriaal(Array.isArray(m.materiaal) ? m.materiaal : []); setMeerwerkMatNaam(''); setMeerwerkMatHoeveelheid('1 stuk'); setUrenSection('meerwerk'); }}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ea580c', padding: '2px 4px', fontSize: '0.8rem' }}>
                                                                <i className="fa-solid fa-pen" />
                                                            </button>
                                                            <button onClick={() => deleteMeerwerkEntry(m.id)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ea580c', padding: '2px 4px', fontSize: '0.8rem' }}>
                                                                <i className="fa-solid fa-trash" />
                                                            </button>
                                                        </div>
                                                        {m.materiaal && m.materiaal.length > 0 && (
                                                            <div style={{ padding: '7px 12px 8px', borderTop: '1px solid #fde8cc', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                {m.materiaal.map((mat, i) => (
                                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.92rem' }}>
                                                                        <i className="fa-solid fa-box" style={{ color: '#f59e0b', fontSize: '0.82rem', flexShrink: 0 }} />
                                                                        <span style={{ flex: 1, color: '#78716c', fontWeight: 600 }}>{mat.naam}</span>
                                                                        {mat.hoeveelheid && <span style={{ color: '#a8a29e' }}>{mat.hoeveelheid}</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ));
                                            })()}
                                        </div>

                                        {/* ── Accordion secties ── */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                                            {/* ── Projecturen ── */}
                                            <div style={{ borderRadius: '12px', border: `1.5px solid ${!urenSection ? '#F5850A' : '#e2e8f0'}`, overflow: 'hidden' }}>
                                                <button onClick={() => setUrenSection(null)}
                                                    style={{ width: '100%', padding: '13px 16px', background: !urenSection ? '#fff8f0' : '#f8fafc',
                                                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                                                    <i className="fa-solid fa-clock" style={{ color: '#F5850A', fontSize: '1rem' }} />
                                                    <span style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{selectedWerkbon ? 'Werkbon uren' : 'Projecturen'}</span>
                                                    <i className={`fa-solid fa-chevron-${!urenSection ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.9rem' }} />
                                                </button>
                                                {!urenSection && (
                                                    <div style={{ padding: '14px 16px 16px', background: '#fff', borderTop: '1.5px solid #fde8cc' }}>
                                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '10px' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <label style={{ fontSize: '0.87rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '5px' }}>Aantal uren</label>
                                                                <input type="number" min="0.5" max="24" step="0.5"
                                                                    value={urenAantal}
                                                                    onChange={e => setUrenAantal(e.target.value)}
                                                                    placeholder="Aantal uren"
                                                                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
                                                                        fontSize: '0.95rem', fontFamily: 'inherit', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
                                                            </div>
                                                            <button onClick={() => setUrenAantal('7.5')}
                                                                style={{ padding: '10px 14px', background: urenAantal === '7.5' ? '#F5850A' : '#fff8f0', border: '1.5px solid #F5850A', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: urenAantal === '7.5' ? '#fff' : '#F5850A', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                                7,5u
                                                            </button>
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
                                                                        <div style={{ fontSize: '0.92rem', color: '#1e3a8a', lineHeight: 1.45 }}>
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
                                                                color: canSaveUren ? '#fff' : '#94a3b8' }}>
                                                            <i className="fa-solid fa-floppy-disk" style={{ marginRight: '7px' }} />
                                                            {canSaveUren
                                                                ? parseFloat(urenAantal) > 7.5
                                                                    ? `Opslaan (7,5u normaal + ${Math.round((parseFloat(urenAantal)-7.5)*10)/10}u overwerk)`
                                                                    : `${urenAantal}u opslaan`
                                                                : 'Kies aantal uren'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── Meerwerk ── */}
                                            <div style={{ borderRadius: '12px', border: `1.5px solid ${urenSection === 'meerwerk' ? '#f59e0b' : '#e2e8f0'}`, overflow: 'hidden' }}>
                                                <button onClick={() => setUrenSection(s => s === 'meerwerk' ? null : 'meerwerk')}
                                                    style={{ width: '100%', padding: '13px 16px', background: urenSection === 'meerwerk' ? '#fffbeb' : '#f8fafc',
                                                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                                                    <i className="fa-solid fa-circle-plus" style={{ color: '#f59e0b', fontSize: '1rem' }} />
                                                    <span style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{meerwerkEditEntry ? 'Meerwerk uren' : 'Meerwerk uren melden'}</span>
                                                    <i className={`fa-solid fa-chevron-${urenSection === 'meerwerk' ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.9rem' }} />
                                                </button>
                                                {urenSection === 'meerwerk' && (
                                                    <div style={{ padding: '14px 16px 16px', background: '#fff', borderTop: '1.5px solid #fde68a' }}>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                                                            <label style={{ fontSize: '0.92rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Extra uren</label>
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

                                                        {/* ── Materiaal ── */}
                                                        <div style={{ marginBottom: '10px' }}>
                                                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#64748b', marginBottom: '7px' }}>
                                                                <i className="fa-solid fa-box" style={{ marginRight: '5px', color: '#f59e0b' }} />Materiaal toevoegen
                                                            </div>
                                                            {/* Zoekveld */}
                                                            <div style={{ position: 'relative', marginBottom: '6px' }}>
                                                                <input
                                                                    type="text"
                                                                    value={meerwerkMatNaam}
                                                                    onChange={e => {
                                                                        const q = e.target.value;
                                                                        setMeerwerkMatNaam(q);
                                                                        if (q.length >= 2 && matRijen.length > 0 && matKolommen.naam) {
                                                                            const ql = q.toLowerCase();
                                                                            setMatZoekResultaten(
                                                                                matRijen.filter(r => String(r[matKolommen.naam] ?? '').toLowerCase().includes(ql)).slice(0, 8)
                                                                            );
                                                                        } else {
                                                                            setMatZoekResultaten([]);
                                                                        }
                                                                    }}
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter' && meerwerkMatNaam.trim()) {
                                                                            setMeerwerkMateriaal(prev => [...prev, { naam: meerwerkMatNaam.trim(), hoeveelheid: meerwerkMatHoeveelheid.trim() }]);
                                                                            setMeerwerkMatNaam(''); setMeerwerkMatHoeveelheid('1 stuk'); setMatZoekResultaten([]);
                                                                        }
                                                                    }}
                                                                    placeholder="Zoek product..."
                                                                    style={{ width: '100%', padding: '9px 36px 9px 10px', border: '1.5px solid #fde68a', borderRadius: '9px', fontSize: '0.87rem', fontFamily: 'inherit', outline: 'none', color: '#1e293b', boxSizing: 'border-box', background: '#fffbeb' }}
                                                                />
                                                                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: '#d97706', fontSize: '0.8rem', pointerEvents: 'none' }} />
                                                                {/* Dropdown */}
                                                                {matZoekResultaten.length > 0 && (
                                                                    <div style={{ position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #fde68a', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: '220px', overflowY: 'auto', overflowX: 'auto' }}>
                                                                        {matZoekResultaten.map((r, i) => {
                                                                            const naam = String(r[matKolommen.naam] ?? '');
                                                                            const eenheid = matKolommen.eenheid ? String(r[matKolommen.eenheid] ?? '') : '';
                                                                            const code = matKolommen.code ? String(r[matKolommen.code] ?? '') : '';
                                                                            return (
                                                                                <button key={i}
                                                                                    onClick={() => {
                                                                                        setMeerwerkMateriaal(prev => [...prev, { naam, hoeveelheid: meerwerkMatHoeveelheid.trim() || eenheid }]);
                                                                                        setMeerwerkMatNaam(''); setMeerwerkMatHoeveelheid('1 stuk'); setMatZoekResultaten([]);
                                                                                    }}
                                                                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', background: 'none', border: 'none', borderBottom: i < matZoekResultaten.length - 1 ? '1px solid #fef3c7' : 'none', cursor: 'pointer', textAlign: 'left' }}
                                                                                    onMouseOver={e => e.currentTarget.style.background = '#fffbeb'}
                                                                                    onMouseOut={e => e.currentTarget.style.background = 'none'}
                                                                                >
                                                                                    <i className="fa-solid fa-box" style={{ color: '#f59e0b', fontSize: '0.86rem', flexShrink: 0 }} />
                                                                                    <span style={{ flex: 1, fontSize: '0.83rem', color: '#1e293b', fontWeight: 600, whiteSpace: 'nowrap' }}>{naam}</span>
                                                                                    {(eenheid || code) && <span style={{ fontSize: '0.87rem', color: '#94a3b8', flexShrink: 0 }}>{eenheid || code}</span>}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Hoeveelheid + toevoegen */}
                                                            <div style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
                                                                <input
                                                                    type="text"
                                                                    value={meerwerkMatHoeveelheid}
                                                                    onChange={e => setMeerwerkMatHoeveelheid(e.target.value)}
                                                                    placeholder="Hoeveelheid"
                                                                    style={{ flex: 1, padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', color: '#1e293b' }}
                                                                />
                                                                <button
                                                                    onClick={() => { if (!meerwerkMatNaam.trim()) return; setMeerwerkMateriaal(prev => [...prev, { naam: meerwerkMatNaam.trim(), hoeveelheid: meerwerkMatHoeveelheid.trim() }]); setMeerwerkMatNaam(''); setMeerwerkMatHoeveelheid('1 stuk'); setMatZoekResultaten([]); }}
                                                                    style={{ padding: '0 14px', background: '#f59e0b', border: 'none', borderRadius: '9px', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', flexShrink: 0 }}>
                                                                    +
                                                                </button>
                                                            </div>
                                                            {/* Toegevoegde items */}
                                                            {meerwerkMateriaal.length > 0 && (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                                    {meerwerkMateriaal.map((mat, i) => (
                                                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                                                            <i className="fa-solid fa-box" style={{ color: '#f59e0b', fontSize: '0.87rem', flexShrink: 0 }} />
                                                                            <span style={{ flex: 1, fontSize: '0.83rem', color: '#1e293b', fontWeight: 600 }}>{mat.naam}</span>
                                                                            {mat.hoeveelheid && <span style={{ fontSize: '0.92rem', color: '#78716c', fontWeight: 500 }}>{mat.hoeveelheid}</span>}
                                                                            <button onClick={() => setMeerwerkMateriaal(prev => prev.filter((_, j) => j !== i))}
                                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d97706', padding: '2px 4px', fontSize: '0.9rem' }}>
                                                                                <i className="fa-solid fa-xmark" />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Luisteren indicator */}
                                                        {sttActive && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#fef2f2', borderRadius: '10px', border: '1.5px solid #fca5a5', marginBottom: '10px' }}>
                                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 600 }}>Luisteren... spreek nu</div>
                                                                    {sttInterim && <div style={{ fontSize: '0.92rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sttInterim}</div>}
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
                                                                        width: '26px', height: '26px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                                                                    <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(16,185,129,0.9)', borderRadius: '8px', padding: '3px 8px', fontSize: '0.84rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <i className="fa-solid fa-check" />Opgeslagen op server
                                                                    </div>
                                                                )}
                                                                <button onClick={() => { setMeerwerkVideoServerUrl(null); setMeerwerkVideoUrl(null); setVideoUploading(false); setUploadProgress(0); }}
                                                                    style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                                                                        width: '26px', height: '26px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <i className="fa-solid fa-xmark" />
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Actieknoppen */}
                                                        <div style={{ display: 'flex', gap: '7px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                                            {!sttActive ? (
                                                                <button onClick={startSpeechToText}
                                                                    style={{ flex: '0 0 auto', padding: '9px 12px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '10px',
                                                                        fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                    <i className="fa-solid fa-microphone" />Inspreken
                                                                </button>
                                                            ) : (
                                                                <button onClick={stopSpeechToText}
                                                                    style={{ flex: '0 0 auto', padding: '9px 12px', background: '#ef4444', border: 'none', borderRadius: '10px',
                                                                        fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                    <i className="fa-solid fa-stop" />Stop
                                                                </button>
                                                            )}
                                                            {!meerwerkImage && (
                                                                <label style={{ flex: '0 0 auto', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: '10px',
                                                                    fontWeight: 600, fontSize: '0.92rem', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                    <i className="fa-solid fa-camera" />Foto
                                                                    <input type="file" accept="image/*" capture="environment" onChange={handleMeerwerkImage} style={{ display: 'none' }} />
                                                                </label>
                                                            )}
                                                            {!meerwerkVideoUrl && !videoRecording && (
                                                                <button onClick={startVideoRecording}
                                                                    style={{ flex: '0 0 auto', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: '10px',
                                                                        fontWeight: 600, fontSize: '0.92rem', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                    <i className="fa-solid fa-video" />Video
                                                                </button>
                                                            )}
                                                            <label style={{ flex: '0 0 auto', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: '10px',
                                                                fontWeight: 600, fontSize: '0.92rem', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                                                                : meerwerkEditEntry
                                                                    ? <><i className="fa-solid fa-floppy-disk" style={{ marginRight: '7px' }} />Wijzigingen opslaan</>
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
                                                    <i className={`fa-solid fa-chevron-${urenSection === 'ziek' ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.9rem' }} />
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
                                                    <span style={{ fontSize: '0.87rem', color: '#94a3b8', fontWeight: 500 }}>dokter · tandarts</span>
                                                    <i className={`fa-solid fa-chevron-${urenSection === 'andere' ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.9rem' }} />
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
                                                            <label style={{ fontSize: '0.92rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Aantal uren</label>
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


                                        {/* ── Urentotaal ── */}
                                        {(() => {
                                            return null;
                                        })()}
                                    </div>
                                );
                            })()}

                            {/* ===== WERKBON TAB ===== */}
                            {detailTab === 'werkbon' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                                    {/* Succes feedback */}
                                    {(werkbonSaved || werkbonKoppelingOpgeslagen) && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '10px 14px', color: '#16a34a', fontWeight: 700, fontSize: '0.85rem' }}>
                                            <i className="fa-solid fa-circle-check" />
                                            {werkbonSaved ? 'Werkbon aangemaakt!' : 'Werkbon gekoppeld!'}
                                        </div>
                                    )}

                                    {/* Gekoppelde werkbon: header + uren + materialen */}
                                    {selectedWerkbon && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                                            {/* Naam header */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff8f0', border: '1.5px solid #F5850A', borderRadius: '12px', padding: '12px 14px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <i className="fa-solid fa-file-pen" style={{ color: '#F5850A', fontSize: '0.85rem' }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedWerkbon.naam}</div>
                                                    <div style={{ fontSize: '0.87rem', color: '#94a3b8' }}>Werkbon gekoppeld aan deze dag</div>
                                                </div>
                                                <button onClick={() => setSelectedWerkbon(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', fontSize: '0.8rem' }}>
                                                    <i className="fa-solid fa-xmark" />
                                                </button>
                                            </div>

                                            {/* Uren */}
                                            <div style={{ background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: '12px', padding: '14px' }}>
                                                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Werkbon uren</div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <input type="number" min="0" step="0.5" value={wbDetailUren} onChange={e => setWbDetailUren(e.target.value)}
                                                        placeholder="0"
                                                        style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>uur</span>
                                                    <button onClick={saveWbDetailUren}
                                                        style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: wbDetailUrenSaved ? '#16a34a' : 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                        {wbDetailUrenSaved ? <><i className="fa-solid fa-check" /> Opgeslagen</> : 'Opslaan'}
                                                    </button>
                                                </div>
                                            </div>

                                        </div>
                                    )}

                                    {/* Geen werkbon: toon acties */}
                                    {!selectedWerkbon && !showNieuwWerkbon && !showWerkbonPicker && (
                                        <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fff8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                                                <i className="fa-solid fa-file-pen" style={{ color: '#F5850A', fontSize: '1.2rem' }} />
                                            </div>
                                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>Nog geen werkbon</div>
                                            <div style={{ fontSize: '0.92rem', color: '#94a3b8', marginBottom: '20px' }}>Maak een nieuwe aan of koppel een bestaande</div>
                                        </div>
                                    )}

                                    {/* Actieknoppen als geen bon gekoppeld en geen formulier open */}
                                    {!selectedWerkbon && !showNieuwWerkbon && !showWerkbonPicker && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <button onClick={() => { setShowNieuwWerkbon(true); setShowWerkbonPicker(false); }}
                                                style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', color: '#fff', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(245,133,10,0.35)' }}>
                                                <i className="fa-solid fa-plus" /> Nieuwe werkbon aanmaken
                                            </button>
                                            <button onClick={() => { setShowWerkbonPicker(true); setShowNieuwWerkbon(false); setWerkbonSearch(''); }}
                                                style={{ width: '100%', padding: '13px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <i className="fa-solid fa-link" /> Koppel bestaande werkbon
                                            </button>
                                        </div>
                                    )}

                                    {/* Formulier: nieuwe werkbon */}
                                    {showNieuwWerkbon && (
                                        <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', border: '1.5px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                                            <div style={{ marginBottom: '10px' }}>
                                                <input type="text" value={werkbonZoek} onChange={e => setWerkbonZoek(e.target.value)}
                                                    placeholder="Wat heb je gedaan?" autoFocus
                                                    style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                                                <input type="number" min="0" step="0.5" value={werkbonUren} onChange={e => setWerkbonUren(e.target.value)}
                                                    placeholder="Uur"
                                                    style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                                                <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                                                    {detail?.date ? new Date(detail.date + 'T00:00:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Vandaag'}
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                <button onClick={() => saveWerkbonUren()} disabled={!werkbonZoek.trim()}
                                                    style={{ padding: '11px', borderRadius: '10px', border: 'none', cursor: werkbonZoek.trim() ? 'pointer' : 'not-allowed', background: werkbonZoek.trim() ? 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)' : '#e2e8f0', color: werkbonZoek.trim() ? '#fff' : '#94a3b8', fontWeight: 800, fontSize: '0.88rem' }}>
                                                    Opslaan
                                                </button>
                                                <button onClick={() => { setShowNieuwWerkbon(false); setWerkbonZoek(''); setWerkbonUren(''); }}
                                                    style={{ padding: '11px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                                                    Annuleren
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Zoeklijst: bestaande werkbon koppelen */}
                                    {showWerkbonPicker && (
                                        <div style={{ background: '#fff', borderRadius: '14px', padding: '14px', border: '1.5px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                                            <input value={werkbonSearch} onChange={e => setWerkbonSearch(e.target.value)}
                                                placeholder="Zoek werkbon..." autoFocus
                                                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '0.87rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '200px', overflowY: 'auto' }}>
                                                {werkbonnen.filter(w => w.naam?.toLowerCase().includes(werkbonSearch.toLowerCase())).slice(0, 8).map(w => (
                                                    <div key={w.id} onClick={() => { setSelectedWerkbon(w); setShowWerkbonPicker(false); saveWerkbonKoppeling(w); }}
                                                        style={{ padding: '9px 12px', borderRadius: '9px', border: '1.5px solid #e2e8f0', cursor: 'pointer', background: '#fafafa' }}>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{w.naam}</div>
                                                        <div style={{ fontSize: '0.71rem', color: '#94a3b8' }}>{w.datum ? new Date(w.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : ''}</div>
                                                    </div>
                                                ))}
                                                {werkbonnen.filter(w => w.naam?.toLowerCase().includes(werkbonSearch.toLowerCase())).length === 0 && (
                                                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>Geen werkbonnen gevonden</div>
                                                )}
                                            </div>
                                            <button onClick={() => setShowWerkbonPicker(false)}
                                                style={{ width: '100%', marginTop: '10px', padding: '9px', borderRadius: '9px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                                                Annuleren
                                            </button>
                                        </div>
                                    )}

                                    {/* Onderaan: andere werkbon koppelen als er al een is */}
                                    {selectedWerkbon && !showNieuwWerkbon && !showWerkbonPicker && (
                                        <button onClick={() => { setSelectedWerkbon(null); setShowWerkbonPicker(false); setShowNieuwWerkbon(false); setWbMaterialen([]); setWbDetailUren(''); }}
                                            style={{ width: '100%', padding: '9px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#94a3b8', fontWeight: 600, fontSize: '0.92rem', cursor: 'pointer' }}>
                                            Andere werkbon kiezen
                                        </button>
                                    )}

                                </div>
                            )}

                            {/* ===== WIJZIGEN TAB ===== */}
                            {detailTab === 'wijzigen' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                    {/* ── Sectie: Project / taak ── */}
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                                            <i className="fa-solid fa-folder-tree" style={{ marginRight: '5px' }} />Project / taak
                                        </div>

                                        {/* Huidig project */}
                                        <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '6px', height: '38px', borderRadius: '3px', background: detail.color || '#F5850A', flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.87rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail.projectName}</div>
                                                {detail.taskName && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail.taskName}</div>}
                                            </div>
                                            <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: '#e2e8f0', borderRadius: '6px', padding: '3px 7px', fontWeight: 700, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>huidig</span>
                                        </div>

                                        {/* Project zoeken of taken kiezen */}
                                        {!changeProject ? (
                                            <>
                                                <input
                                                    value={projectSearch}
                                                    onChange={e => { setProjectSearch(e.target.value); }}
                                                    placeholder="Zoek ander project..."
                                                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.87rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }}
                                                />
                                                {(() => {
                                                    const allProjects = (() => { try { return JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]'); } catch { return []; } })();
                                                    const filtered = allProjects.filter(p => p.name?.toLowerCase().includes(projectSearch.toLowerCase()));
                                                    return filtered.slice(0, 7).map(p => (
                                                        <div key={p.id} onClick={() => setChangeProject(p)}
                                                            style={{ padding: '10px 12px', borderRadius: '10px', border: `1.5px solid ${p.id == detail.projectId ? '#F5850A' : '#e2e8f0'}`, marginBottom: '6px', cursor: 'pointer', background: p.id == detail.projectId ? '#fff8f0' : '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color || '#F5850A', flexShrink: 0, display: 'inline-block' }} />
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                                                {p.client && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1px' }}>{p.client}</div>}
                                                            </div>
                                                            {p.id == detail.projectId
                                                                ? <i className="fa-solid fa-check" style={{ color: '#F5850A', fontSize: '0.8rem', flexShrink: 0 }} />
                                                                : <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.8rem', flexShrink: 0 }} />
                                                            }
                                                        </div>
                                                    ));
                                                })()}
                                            </>
                                        ) : (
                                            <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                                                <button onClick={() => setChangeProject(null)}
                                                    style={{ background: 'none', border: 'none', color: '#F5850A', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', marginBottom: '12px', padding: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <i className="fa-solid fa-chevron-left" style={{ fontSize: '0.8rem' }} /> {changeProject.name}
                                                </button>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Kies taak</div>
                                                {(changeProject.tasks || []).filter(t => t.name).map(t => (
                                                    <div key={t.id}
                                                        onClick={() => { saveProjectChange(t, changeProject); setChangeProject(null); setProjectSearch(''); setShowDetailModal(false); }}
                                                        style={{ padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', marginBottom: '6px', cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{t.name}</div>
                                                            {(t.startDate || t.endDate) && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{t.startDate}{t.startDate && t.endDate ? ' – ' : ''}{t.endDate}</div>}
                                                        </div>
                                                        <div style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: '0.75rem' }} />
                                                        </div>
                                                    </div>
                                                ))}
                                                {(changeProject.tasks || []).filter(t => t.name).length === 0 && (
                                                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center', padding: '10px 0' }}>Geen taken gevonden voor dit project</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Divider */}
                                    <div style={{ height: '1px', background: '#f1f5f9' }} />

                                    {/* ── Sectie: Werkbon ── */}
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                                            <i className="fa-solid fa-file-pen" style={{ marginRight: '5px' }} />Werkbon
                                        </div>

                                        {/* Werkbon gekoppeld */}
                                        {selectedWerkbon && !showNieuwWerkbon && !showWerkbonPicker && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff8f0', border: '1.5px solid #F5850A', borderRadius: '12px', padding: '12px 14px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <i className="fa-solid fa-file-pen" style={{ color: '#F5850A', fontSize: '0.85rem' }} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedWerkbon.naam}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1px' }}>Gekoppeld aan deze dag</div>
                                                    </div>
                                                    <button onClick={() => { setSelectedWerkbon(null); setWbMaterialen([]); setWbDetailUren(''); }}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', fontSize: '0.8rem' }}>
                                                        <i className="fa-solid fa-xmark" />
                                                    </button>
                                                </div>
                                                <div style={{ background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: '12px', padding: '12px 14px' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Werkbon uren</div>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <input type="number" min="0" step="0.5" value={wbDetailUren} onChange={e => setWbDetailUren(e.target.value)}
                                                            placeholder="0"
                                                            style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>uur</span>
                                                        <button onClick={saveWbDetailUren}
                                                            style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: wbDetailUrenSaved ? '#16a34a' : 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                            {wbDetailUrenSaved ? <><i className="fa-solid fa-check" /> Opgeslagen</> : 'Opslaan'}
                                                        </button>
                                                    </div>
                                                </div>
                                                <button onClick={() => { setSelectedWerkbon(null); setShowWerkbonPicker(true); setWerkbonSearch(''); setWbMaterialen([]); setWbDetailUren(''); }}
                                                    style={{ width: '100%', padding: '9px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#94a3b8', fontWeight: 600, fontSize: '0.87rem', cursor: 'pointer' }}>
                                                    Andere werkbon kiezen
                                                </button>
                                            </div>
                                        )}

                                        {/* Geen werkbon — actieknoppen */}
                                        {!selectedWerkbon && !showNieuwWerkbon && !showWerkbonPicker && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <button onClick={() => { setShowNieuwWerkbon(true); setShowWerkbonPicker(false); }}
                                                    style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(245,133,10,0.3)' }}>
                                                    <i className="fa-solid fa-plus" /> Nieuwe werkbon aanmaken
                                                </button>
                                                <button onClick={() => { setShowWerkbonPicker(true); setShowNieuwWerkbon(false); setWerkbonSearch(''); }}
                                                    style={{ width: '100%', padding: '13px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                    <i className="fa-solid fa-link" /> Koppel bestaande werkbon
                                                </button>
                                            </div>
                                        )}

                                        {/* Formulier: nieuwe werkbon */}
                                        {showNieuwWerkbon && (
                                            <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', border: '1.5px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                                                <div style={{ marginBottom: '10px' }}>
                                                    <input type="text" value={werkbonZoek} onChange={e => setWerkbonZoek(e.target.value)}
                                                        placeholder="Wat heb je gedaan?" autoFocus
                                                        style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                                                    <input type="number" min="0" step="0.5" value={werkbonUren} onChange={e => setWerkbonUren(e.target.value)}
                                                        placeholder="Uur"
                                                        style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                                                    <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                                                        {detail?.date ? new Date(detail.date + 'T00:00:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Vandaag'}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                    <button onClick={() => saveWerkbonUren()} disabled={!werkbonZoek.trim()}
                                                        style={{ padding: '11px', borderRadius: '10px', border: 'none', cursor: werkbonZoek.trim() ? 'pointer' : 'not-allowed', background: werkbonZoek.trim() ? 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)' : '#e2e8f0', color: werkbonZoek.trim() ? '#fff' : '#94a3b8', fontWeight: 800, fontSize: '0.88rem' }}>
                                                        Opslaan
                                                    </button>
                                                    <button onClick={() => { setShowNieuwWerkbon(false); setWerkbonZoek(''); setWerkbonUren(''); }}
                                                        style={{ padding: '11px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                                                        Annuleren
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Zoeklijst: bestaande werkbon koppelen */}
                                        {showWerkbonPicker && (
                                            <div style={{ background: '#fff', borderRadius: '14px', padding: '14px', border: '1.5px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                                                <input value={werkbonSearch} onChange={e => setWerkbonSearch(e.target.value)}
                                                    placeholder="Zoek werkbon..." autoFocus
                                                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '0.87rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }} />
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '200px', overflowY: 'auto' }}>
                                                    {werkbonnen.filter(w => w.naam?.toLowerCase().includes(werkbonSearch.toLowerCase())).slice(0, 8).map(w => (
                                                        <div key={w.id} onClick={() => { setSelectedWerkbon(w); setShowWerkbonPicker(false); saveWerkbonKoppeling(w); setShowDetailModal(false); }}
                                                            style={{ padding: '9px 12px', borderRadius: '9px', border: '1.5px solid #e2e8f0', cursor: 'pointer', background: '#fafafa' }}>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{w.naam}</div>
                                                            <div style={{ fontSize: '0.71rem', color: '#94a3b8' }}>{w.datum ? new Date(w.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : ''}</div>
                                                        </div>
                                                    ))}
                                                    {werkbonnen.filter(w => w.naam?.toLowerCase().includes(werkbonSearch.toLowerCase())).length === 0 && (
                                                        <div style={{ fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>Geen werkbonnen gevonden</div>
                                                    )}
                                                </div>
                                                <button onClick={() => setShowWerkbonPicker(false)}
                                                    style={{ width: '100%', marginTop: '10px', padding: '9px', borderRadius: '9px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                                                    Annuleren
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Materialen TAB ── */}
                            {detailTab === 'materialen' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                                    {/* ── Datum navigator ── */}
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
                                            setLosMateriaalLijst(loadLosMateriaal(detail.taskId, iso));
                                        }
                                        const d = new Date(detail.date + 'T00:00:00');
                                        const dayName = DAY_NAMES_FULL[d.getDay() === 0 ? 6 : d.getDay() - 1];
                                        const dayNum = d.getDate();
                                        const monthName = MONTH_NAMES[d.getMonth()];
                                        const yr = d.getFullYear();
                                        const heeftUren = urenLijst.length > 0;
                                        const accentColor = heeftUren ? '#10b981' : '#F5850A';
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', height: '72px', boxSizing: 'border-box', background: heeftUren ? '#f0fdf4' : '#f8fafc', borderRadius: '14px', border: `1.5px solid ${heeftUren ? '#86efac' : '#e2e8f0'}`, transition: 'background 0.2s, border-color 0.2s' }}>
                                                <button onClick={() => goToDay(prevWorkday(detail.date))}
                                                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer', color: '#475569', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <i className="fa-solid fa-chevron-left" />
                                                </button>
                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: accentColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
                                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', lineHeight: 1 }}>{dayName.substring(0, 2)}</span>
                                                        <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{dayNum}</span>
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{dayName}</div>
                                                        <div style={{ fontSize: '0.92rem', color: '#64748b', marginTop: '1px' }}>{monthName} {yr}</div>
                                                    </div>
                                                </div>
                                                <button onClick={() => goToDay(nextWorkday(detail.date))}
                                                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer', color: '#475569', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <i className="fa-solid fa-chevron-right" />
                                                </button>
                                            </div>
                                        );
                                    })()}

                                    <div style={{ fontSize: '0.71rem', color: '#94a3b8', lineHeight: 1.4 }}>
                                        Vul hier alleen materialen in die je van de zaak hebt meegenomen naar de klus.
                                    </div>

                                    {/* Bestaande materialen */}
                                    {losMateriaalLijst.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {losMateriaalLijst.map(m => (
                                                <div key={m.id} style={{ padding: '10px 12px', background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: '10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                        <i className="fa-solid fa-box" style={{ color: '#10b981', fontSize: '0.92rem', flexShrink: 0, marginTop: '3px' }} />
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600 }}>{m.naam}</div>
                                                            <div style={{ display: 'flex', gap: '6px', marginTop: '2px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                                {m.code && <span style={{ fontSize: '0.67rem', color: '#94a3b8', background: '#f1f5f9', borderRadius: '4px', padding: '1px 5px' }}>{m.code}</span>}
                                                                <span style={{ fontSize: '0.87rem', color: '#64748b', background: '#f8fafc', borderRadius: '5px', padding: '1px 7px' }}>{m.hoeveelheid}</span>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => verwijderLosMateriaal(m.id)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '2px 4px', fontSize: '0.92rem', flexShrink: 0 }}>
                                                            <i className="fa-solid fa-xmark" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                                                <i className="fa-solid fa-box-open" style={{ color: '#10b981', fontSize: '1.2rem' }} />
                                            </div>
                                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>Nog geen materiaal</div>
                                            <div style={{ fontSize: '0.92rem', color: '#94a3b8' }}>Voeg materialen toe die je hebt gebruikt</div>
                                        </div>
                                    )}

                                    {/* Nieuw materiaal toevoegen */}
                                    <div style={{ background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: '12px', padding: '14px' }}>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Materiaal toevoegen</div>
                                        {/* Zoekbalk + autocomplete */}
                                        <div style={{ position: 'relative', marginBottom: '6px' }}>
                                            <input type="text" value={losMatNaam}
                                                onChange={e => {
                                                    const q = e.target.value;
                                                    setLosMatNaam(q);
                                                    setLosMatCode(''); setLosMatEenheid(''); setLosMatPrijs('');
                                                    if (q.length >= 2 && matRijen.length > 0 && matKolommen.naam) {
                                                        const ql = q.toLowerCase();
                                                        setLosMatZoek(matRijen.filter(r => String(r[matKolommen.naam] ?? '').toLowerCase().includes(ql)).slice(0, 8));
                                                    } else { setLosMatZoek([]); }
                                                }}
                                                onKeyDown={e => { if (e.key === 'Enter' && losMatNaam.trim()) { voegLosMateriaalToe(losMatNaam.trim(), losMatHoeveelheid.trim() || '1 stuk'); setLosMatZoek([]); } }}
                                                placeholder="Zoek of typ materiaal..."
                                                style={{ width: '100%', padding: '9px 36px 9px 10px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '0.87rem', fontFamily: 'inherit', outline: 'none', color: '#1e293b', boxSizing: 'border-box' }} />
                                            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem', pointerEvents: 'none' }} />
                                            {losMatZoek.length > 0 && (
                                                <div style={{ position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: '220px', overflowY: 'auto' }}>
                                                    {losMatZoek.map((r, i) => {
                                                        const naam = String(r[matKolommen.naam] ?? '');
                                                        const code = matKolommen.code ? String(r[matKolommen.code] ?? '') : '';
                                                        const eenheid = matKolommen.eenheid ? String(r[matKolommen.eenheid] ?? '') : '';
                                                        const cat = matKolommen.categorie ? String(r[matKolommen.categorie] ?? '') : '';
                                                        const prijs = matKolommen.prijs ? String(r[matKolommen.prijs] ?? '') : '';
                                                        return (
                                                            <button key={i} onClick={() => {
                                                                const rk = code || naam;
                                                                const behOpslag = matOpslagen[rk];
                                                                const behVerkoop = matVerkoop[rk];
                                                                setLosMatNaam(naam);
                                                                setLosMatHoeveelheid(eenheid || '1 stuk');
                                                                setLosMatCode(code);
                                                                setLosMatEenheid(eenheid);
                                                                setLosMatPrijs(prijs);
                                                                // Opslag en BTW uit Materiaalzoeker instellingen overnemen
                                                                if (behOpslag != null && behOpslag !== '') {
                                                                    setLosMatOpslag(String(parseFloat(behOpslag).toFixed(2)));
                                                                } else {
                                                                    setLosMatOpslag('');
                                                                }
                                                                setLosMatBtw('21');
                                                                setLosMatZoek([]);
                                                            }}
                                                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', background: 'none', border: 'none', borderBottom: i < losMatZoek.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', textAlign: 'left' }}>
                                                                <i className="fa-solid fa-box" style={{ color: '#10b981', fontSize: '0.86rem', flexShrink: 0 }} />
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontSize: '0.83rem', color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{naam}</div>
                                                                    <div style={{ display: 'flex', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                                                                        {code && <span style={{ fontSize: '0.67rem', color: '#94a3b8', background: '#f1f5f9', borderRadius: '4px', padding: '1px 5px' }}>{code}</span>}
                                                                        {cat && <span style={{ fontSize: '0.67rem', color: '#64748b' }}>{cat}</span>}
                                                                        {eenheid && <span style={{ fontSize: '0.67rem', color: '#64748b' }}>{eenheid}</span>}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        {/* Hoeveelheid */}
                                        <input type="text" value={losMatHoeveelheid} onChange={e => setLosMatHoeveelheid(e.target.value)}
                                            placeholder="Hoeveelheid (bijv. 2 liter)"
                                            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', color: '#1e293b', marginBottom: '6px', boxSizing: 'border-box' }} />
                                        {/* Toevoegen knop */}
                                        <button onClick={() => { if (losMatNaam.trim()) { voegLosMateriaalToe(losMatNaam.trim(), losMatHoeveelheid.trim() || '1 stuk'); setLosMatZoek([]); } }}
                                            style={{ width: '100%', padding: '10px', background: losMatNaam.trim() ? '#10b981' : '#e2e8f0', border: 'none', borderRadius: '9px', color: losMatNaam.trim() ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: '0.88rem', cursor: losMatNaam.trim() ? 'pointer' : 'not-allowed' }}>
                                            + Toevoegen
                                        </button>
                                    </div>

                                </div>
                            )}

                        </div>
                    </div>
                </>
            )}


            {/* ── Dag kiezer menu (lege dag) ── */}
            {dagKiezer && (() => {
                const dagLabel = (() => {
                    const d = new Date(dagKiezer.date + 'T00:00:00');
                    return `${DAY_NAMES_FULL[d.getDay() === 0 ? 6 : d.getDay() - 1]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
                })();
                const allProjects = (() => { try { return JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]'); } catch { return []; } })();

                return (
                    <>
                        <div onClick={() => setDagKiezer(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 400 }} />
                        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px 20px 0 0', zIndex: 410, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '16px 20px', flexShrink: 0 }}>
                                <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 14px' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {dagKiezer.step && (
                                        <button onClick={() => setDagKiezer(dk => ({ date: dk.date, step: dk.step === 'taak' ? 'project' : null }))}
                                            style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: '#475569', fontSize: '0.8rem' }}>
                                            <i className="fa-solid fa-chevron-left" />
                                        </button>
                                    )}
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                                            {!dagKiezer.step && 'Wat wil je toevoegen?'}
                                            {dagKiezer.step === 'project' && 'Kies een project'}
                                            {dagKiezer.step === 'taak' && dagKiezer.project?.name}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '1px' }}>{dagLabel}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ overflowY: 'auto', padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                                {/* ── Stap 1: hoofdmenu ── */}
                                {!dagKiezer.step && (<>
                                    <button onClick={() => {
                                        const vrijTaskId = `vrij-${dagKiezer.date}`;
                                        setDagKiezer(null);
                                        openDetail({ taskId: vrijTaskId, projectName: 'Nog in te vullen project', taskName: '', projectId: null, progress: 0, completed: false, color: '#F5850A', notes: [], client: null }, dagKiezer.date, 'wijzigen');
                                    }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '14px', cursor: 'pointer', textAlign: 'left' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <i className="fa-solid fa-file-pen" style={{ color: '#fff', fontSize: '1rem' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>Werkbon koppelen of aanmaken</div>
                                            <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '2px' }}>Koppel een bestaande werkbon of maak een nieuwe aan — handig voor losse klussen zonder vast project</div>
                                        </div>
                                        <i className="fa-solid fa-chevron-right" style={{ color: '#d1d5db', fontSize: '0.9rem' }} />
                                    </button>
                                    <button onClick={() => {
                                        const vrijTaskId = `vrij-${dagKiezer.date}`;
                                        setDagKiezer(null);
                                        openDetail({ taskId: vrijTaskId, projectName: 'Nog in te vullen project', taskName: '', projectId: null, progress: 0, completed: false, color: '#F5850A', notes: [], client: null }, dagKiezer.date, 'uren');
                                    }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '14px', cursor: 'pointer', textAlign: 'left' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <i className="fa-solid fa-clock" style={{ color: '#fff', fontSize: '1rem' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>Uren registreren</div>
                                            <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '2px' }}>Vul direct uren in voor deze dag</div>
                                        </div>
                                        <i className="fa-solid fa-chevron-right" style={{ color: '#d1d5db', fontSize: '0.9rem' }} />
                                    </button>
                                </>)}

                                {/* ── Stap 2: projecten kiezen ── */}
                                {dagKiezer.step === 'project' && (
                                    allProjects.length === 0
                                        ? <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '0.85rem' }}>Geen projecten gevonden</div>
                                        : allProjects.map(p => (
                                            <button key={p.id} onClick={() => setDagKiezer(dk => ({ ...dk, step: 'taak', project: p }))}
                                                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' }}>
                                                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: p.color || '#F5850A', flexShrink: 0, display: 'inline-block' }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                                    {p.client && <div style={{ fontSize: '0.87rem', color: '#94a3b8', marginTop: '1px' }}>{p.client}</div>}
                                                </div>
                                                <i className="fa-solid fa-chevron-right" style={{ color: '#d1d5db', fontSize: '0.86rem', flexShrink: 0 }} />
                                            </button>
                                        ))
                                )}

                                {/* ── Stap 3: taak kiezen ── */}
                                {dagKiezer.step === 'taak' && dagKiezer.project && (() => {
                                    const taken = (dagKiezer.project.tasks || []).filter(t => t.name);
                                    return taken.length === 0
                                        ? <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '0.85rem' }}>Geen taken gevonden voor dit project</div>
                                        : taken.map(t => (
                                            <button key={t.id} onClick={() => {
                                                setDagKiezer(null);
                                                openDetail({
                                                    taskId: t.id,
                                                    projectId: dagKiezer.project.id,
                                                    projectName: dagKiezer.project.name,
                                                    taskName: t.name,
                                                    color: dagKiezer.project.color || '#F5850A',
                                                    progress: t.progress || 0,
                                                    completed: t.completed || false,
                                                    notes: t.notes || [],
                                                    client: dagKiezer.project.client || null,
                                                }, dagKiezer.date, 'uren');
                                            }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#fff', border: `1.5px solid ${dagKiezer.project.color || '#F5850A'}22`, borderRadius: '12px', cursor: 'pointer', textAlign: 'left' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dagKiezer.project.color || '#F5850A', flexShrink: 0 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: t.completed ? '#94a3b8' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: t.completed ? 'line-through' : 'none' }}>{t.name}</div>
                                                    {(t.startDate || t.endDate) && <div style={{ fontSize: '0.87rem', color: '#94a3b8', marginTop: '1px' }}>{t.startDate} – {t.endDate}</div>}
                                                </div>
                                                {t.completed ? (
                                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '2px 7px', flexShrink: 0 }}>
                                                        <i className="fa-solid fa-check" style={{ marginRight: '3px' }} />Afgerond
                                                    </span>
                                                ) : (t.progress > 0) ? (
                                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: dagKiezer.project.color || '#F5850A', background: (dagKiezer.project.color || '#F5850A') + '18', border: `1px solid ${dagKiezer.project.color || '#F5850A'}44`, borderRadius: '6px', padding: '2px 7px', flexShrink: 0 }}>
                                                        {t.progress}%
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '2px 7px', flexShrink: 0 }}>
                                                        Nieuw
                                                    </span>
                                                )}
                                                <i className="fa-solid fa-chevron-right" style={{ color: '#d1d5db', fontSize: '0.86rem', flexShrink: 0 }} />
                                            </button>
                                        ));
                                })()}

                            </div>
                        </div>
                    </>
                );
            })()}
            </div>

            {/* Ziek bewerken modal */}
            {ziekEditEntry && (
                <>
                    <div onClick={() => setZiekEditEntry(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400 }} />
                    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 20px 32px', zIndex: 410 }}>
                        <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 18px' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <i className="fa-solid fa-bed-pulse" style={{ color: '#ef4444', fontSize: '1rem' }} />
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>Ziekmelding wijzigen</span>
                        </div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Reden</label>
                        <input
                            type="text"
                            value={ziekEditNote}
                            onChange={e => setZiekEditNote(e.target.value)}
                            placeholder="Bijv. griep, rugklachten..."
                            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '14px', outline: 'none' }}
                        />
                        <button onClick={saveZiekEdit} style={{ width: '100%', padding: '13px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', marginBottom: '10px' }}>
                            <i className="fa-solid fa-floppy-disk" style={{ marginRight: '8px' }} />Opslaan
                        </button>
                        <button onClick={deleteZiekEntry} style={{ width: '100%', padding: '13px', background: '#fff', color: '#ef4444', border: '1.5px solid #fca5a5', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
                            <i className="fa-solid fa-trash" style={{ marginRight: '8px' }} />Ziekmelding verwijderen
                        </button>
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
        </div>
    );
}
