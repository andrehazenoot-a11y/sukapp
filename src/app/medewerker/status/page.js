'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';

export default function StatusPage() {
    const { user } = useAuth();
    const [taken, setTaken] = useState([]);
    const [opgeslagen, setOpgeslagen] = useState(null);

    useEffect(() => {
        if (!user) return;
        fetch('/api/projecten')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    try { localStorage.setItem('schildersapp_projecten', JSON.stringify(data)); } catch {}
                }
                laadTaken();
            })
            .catch(() => laadTaken());
    }, [user]);

    function laadTaken() {
        try {
            const raw = localStorage.getItem('schildersapp_projecten');
            const projects = raw ? JSON.parse(raw) : [];
            const uid = Number(user.id);
            const result = [];
            for (const p of projects) {
                for (const t of (p.tasks || [])) {
                    const assignedTo = (t.assignedTo || [])
                        .map(x => typeof x === 'object' ? x.id : x)
                        .map(Number);
                    if (!assignedTo.includes(uid)) continue;
                    result.push({
                        taskId: t.id,
                        taskName: t.name,
                        projectName: p.name,
                        projectId: p.id,
                        startDate: t.startDate,
                        endDate: t.endDate,
                        progress: t.progress ?? 0,
                        completed: t.completed ?? false,
                    });
                }
            }
            result.sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0));
            setTaken(result);
        } catch (e) {
            console.error('Status laden fout:', e);
        }
    }

    function slaVoortgangOp(taskId, progress, markCompleted = false) {
        const completed = markCompleted ? true : progress === 100;
        try {
            const raw = localStorage.getItem('schildersapp_projecten');
            const projects = raw ? JSON.parse(raw) : [];
            for (const p of projects) {
                for (const t of (p.tasks || [])) {
                    if (String(t.id) === String(taskId)) {
                        t.progress = progress;
                        t.completed = completed;
                    }
                }
            }
            localStorage.setItem('schildersapp_projecten', JSON.stringify(projects));
            setTaken(prev => prev.map(t =>
                String(t.taskId) === String(taskId)
                    ? { ...t, progress, completed }
                    : t
            ));
            setOpgeslagen(taskId);
            setTimeout(() => setOpgeslagen(null), 2000);
            fetch('/api/projecten', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId, progress, completed }),
            }).catch(() => {});
        } catch (e) { console.error(e); }
    }

    // Groepeer per project
    const projecten = [];
    const projectMap = {};
    for (const t of taken) {
        const key = String(t.projectId);
        if (!projectMap[key]) {
            projectMap[key] = { projectId: t.projectId, projectName: t.projectName, taken: [] };
            projecten.push(projectMap[key]);
        }
        projectMap[key].taken.push(t);
    }
    // Sorteer: projecten met lopende taken eerst
    projecten.sort((a, b) => {
        const aLopend = a.taken.some(t => !t.completed) ? 0 : 1;
        const bLopend = b.taken.some(t => !t.completed) ? 0 : 1;
        return aLopend - bLopend;
    });

    const totaalLopend = taken.filter(t => !t.completed).length;
    const totaalAfgerond = taken.filter(t => t.completed).length;

    return (
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#F5850A,#D96800)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fa-solid fa-chart-line" style={{ color: '#fff', fontSize: '0.9rem' }} />
                </div>
                <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>Planning status</div>
                    <div style={{ fontSize: '0.87rem', color: '#94a3b8' }}>{totaalLopend} lopend · {totaalAfgerond} afgerond</div>
                </div>
            </div>

            {taken.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                    <i className="fa-solid fa-clipboard-check" style={{ fontSize: '2rem', marginBottom: '12px', display: 'block', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Geen taken gevonden</p>
                </div>
            )}

            {/* Per project */}
            {projecten.map(proj => (
                <ProjectGroep key={proj.projectId} proj={proj} opgeslagen={opgeslagen} onSave={slaVoortgangOp} />
            ))}
        </div>
    );
}

function ProjectGroep({ proj, opgeslagen, onSave }) {
    const [open, setOpen] = useState(true);
    const lopend = proj.taken.filter(t => !t.completed).length;
    const afgerond = proj.taken.filter(t => t.completed).length;
    const totaal = proj.taken.length;
    const pct = totaal > 0 ? Math.round((afgerond / totaal) * 100) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Project header */}
            <button onClick={() => setOpen(o => !o)} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: '12px', padding: '10px 14px',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#0f172a,#1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fa-solid fa-folder" style={{ color: '#F5850A', fontSize: '0.92rem' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj.projectName}</div>
                    <div style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: '1px' }}>{lopend} lopend · {afgerond}/{totaal} afgerond</div>
                </div>
                {/* Mini voortgangsbalk */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <div style={{ width: 40, height: 5, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : '#F5850A', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: pct === 100 ? '#10b981' : '#F5850A', minWidth: '28px' }}>{pct}%</span>
                    <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: '0.92rem', color: '#94a3b8' }} />
                </div>
            </button>

            {/* Taken onder dit project */}
            {open && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingLeft: '8px' }}>
                    {proj.taken.map(t => (
                        <TaakKaart key={t.taskId} taak={t} opgeslagen={opgeslagen} onSave={onSave} />
                    ))}
                </div>
            )}
        </div>
    );
}

function TaakKaart({ taak, opgeslagen, onSave }) {
    const prog = taak.progress ?? 0;
    const isAfgerond = taak.completed;
    const accentColor = isAfgerond ? '#10b981' : '#F5850A';
    const isSaved = String(opgeslagen) === String(taak.taskId);

    return (
        <div style={{
            background: '#fff',
            borderRadius: '10px',
            padding: '9px 12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            border: isAfgerond ? '1px solid #d1fae5' : '1px solid #edf2f7',
        }}>
            {/* Naam + percentage op één rij */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{taak.taskName}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    {isSaved && <span style={{ fontSize: '0.92rem', color: '#10b981', fontWeight: 700 }}>✓</span>}
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: accentColor }}>{prog}%</span>
                </div>
            </div>

            {/* Progress balk */}
            <div style={{ height: '5px', borderRadius: '4px', background: '#f1f5f9', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', width: `${prog}%`, background: `linear-gradient(90deg,${accentColor},${isAfgerond ? '#059669' : '#D96800'})`, borderRadius: '4px', transition: 'width 0.3s ease' }} />
            </div>

            {/* Knoppen */}
            {isAfgerond ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <i className="fa-solid fa-circle-check" style={{ color: '#10b981', fontSize: '0.9rem' }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>Afgerond</span>
                    </div>
                    <button onClick={() => onSave(taak.taskId, 0, false)}
                        style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '3px 8px', fontSize: '0.84rem', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>
                        Ongedaan maken
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '4px' }}>
                    {[25, 50, 75, 100].map(v => {
                        const active = prog === v;
                        const col = v === 100 ? '#10b981' : '#F5850A';
                        return (
                            <button key={v} onClick={() => onSave(taak.taskId, v)}
                                style={{
                                    flex: 1, padding: '5px 0', borderRadius: '6px',
                                    border: `1.5px solid ${active ? col : '#e2e8f0'}`,
                                    background: active ? col : '#f8fafc',
                                    color: active ? '#fff' : '#94a3b8',
                                    fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer',
                                }}>
                                {v}%
                            </button>
                        );
                    })}
                    <button onClick={() => onSave(taak.taskId, 100, true)}
                        style={{
                            flex: 1, padding: '5px 0', borderRadius: '6px',
                            border: '1.5px solid #10b981',
                            background: 'linear-gradient(135deg,#10b981,#059669)',
                            color: '#fff', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer',
                        }}>
                        <i className="fa-solid fa-check" />
                    </button>
                </div>
            )}
        </div>
    );
}
