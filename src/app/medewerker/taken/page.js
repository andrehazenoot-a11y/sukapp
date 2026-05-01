'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';

const MONTH_NAMES_SHORT = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]}`;
}

function isOverdue(iso) {
    if (!iso) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    return new Date(iso + 'T00:00:00') < today;
}

function getMyTasks(userId) {
    try {
        const raw = localStorage.getItem('schildersapp_projecten');
        const projects = raw ? JSON.parse(raw) : [];
        const result = [];
        for (const p of projects) {
            if (!p.tasks) continue;
            for (const t of p.tasks) {
                const assigned = (t.assignedTo || []).map(x => typeof x === 'object' ? x.id : x).map(Number);
                if (!assigned.includes(Number(userId))) continue;
                result.push({
                    projectId: p.id,
                    projectName: p.name,
                    color: p.color || '#F5850A',
                    taskId: t.id,
                    taskName: t.name,
                    startDate: t.startDate,
                    endDate: t.endDate,
                    completed: t.completed || false,
                });
            }
        }
        return result.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return (a.endDate || '9999') > (b.endDate || '9999') ? 1 : -1;
        });
    } catch { return []; }
}

function toggleTask(userId, projectId, taskId, completed) {
    try {
        const raw = localStorage.getItem('schildersapp_projecten');
        const projects = raw ? JSON.parse(raw) : [];
        const updated = projects.map(p => {
            if (String(p.id) !== String(projectId)) return p;
            return {
                ...p,
                tasks: (p.tasks || []).map(t =>
                    String(t.id) === String(taskId) ? { ...t, completed } : t
                )
            };
        });
        localStorage.setItem('schildersapp_projecten', JSON.stringify(updated));
    } catch {}
}

export default function MedewerkerTaken() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [filter, setFilter] = useState('open');

    useEffect(() => {
        if (!user) return;
        setTasks(getMyTasks(user.id));
    }, [user]);

    function handleToggle(task) {
        const newCompleted = !task.completed;
        toggleTask(user.id, task.projectId, task.taskId, newCompleted);
        setTasks(prev => prev.map(t =>
            t.projectId === task.projectId && t.taskId === task.taskId
                ? { ...t, completed: newCompleted }
                : t
        ).sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return (a.endDate || '9999') > (b.endDate || '9999') ? 1 : -1;
        }));
    }

    const filtered = tasks.filter(t => {
        if (filter === 'open') return !t.completed;
        if (filter === 'voltooid') return t.completed;
        return true;
    });

    const openCount = tasks.filter(t => !t.completed).length;
    const doneCount = tasks.filter(t => t.completed).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
            {/* Oranje header */}
            <div style={{ background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', padding: '14px 20px', flexShrink: 0, boxShadow: '0 2px 12px rgba(245,133,10,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fa-solid fa-list-check" style={{ color: '#fff', fontSize: '1.1rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>Mijn Taken</div>
                        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem' }}>Beheer je openstaande taken</div>
                    </div>
                </div>
            </div>
        <div style={{ padding: '16px' }}>
            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: '7px', marginBottom: '18px' }}>
                {[
                    { id: 'open',     label: 'Open',     count: openCount },
                    { id: 'voltooid', label: 'Voltooid', count: doneCount },
                    { id: 'alles',    label: 'Alles',    count: tasks.length },
                ].map(f => (
                    <button key={f.id} onClick={() => setFilter(f.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '7px 13px', borderRadius: '999px',
                        border: `2px solid ${filter === f.id ? '#F5850A' : '#e2e8f0'}`,
                        background: filter === f.id ? '#F5850A' : '#fff',
                        color: filter === f.id ? '#fff' : '#94a3b8',
                        fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                        transition: 'all 0.15s',
                    }}>
                        {f.label}
                        <span style={{ background: filter === f.id ? 'rgba(255,255,255,0.25)' : '#f1f5f9', color: filter === f.id ? '#fff' : '#64748b', borderRadius: '999px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>{f.count}</span>
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', color: '#94a3b8', border: '1.5px dashed #e2e8f0' }}>
                    <i className={`fa-solid ${filter === 'voltooid' ? 'fa-circle-check' : 'fa-list-check'}`}
                        style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block', color: filter === 'voltooid' ? '#10b981' : '#cbd5e1' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#64748b', marginBottom: '4px' }}>
                        {filter === 'open' ? 'Geen openstaande taken' : filter === 'voltooid' ? 'Nog niets voltooid' : 'Geen taken gevonden'}
                    </div>
                    <div style={{ fontSize: '0.82rem' }}>
                        {filter === 'open' ? 'Goed bezig, alles is afgerond!' : 'Taken die je afvinkt verschijnen hier.'}
                    </div>
                </div>
            ) : filtered.map((task) => {
                const overdue = !task.completed && isOverdue(task.endDate);
                return (
                    <div key={`${task.projectId}-${task.taskId}`} style={{
                        background: task.completed ? '#fafafa' : '#fff',
                        borderRadius: '14px', padding: '0', marginBottom: '9px',
                        display: 'flex', alignItems: 'stretch', overflow: 'hidden',
                        boxShadow: task.completed ? 'none' : '0 2px 10px rgba(0,0,0,0.07)',
                        border: `1px solid ${task.completed ? '#f1f5f9' : '#f1f5f9'}`,
                        opacity: task.completed ? 0.6 : 1,
                        transition: 'opacity 0.2s',
                    }}>
                        <div style={{ width: '5px', background: task.completed ? '#e2e8f0' : task.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Checkbox */}
                            <button onClick={() => handleToggle(task)} style={{
                                width: '24px', height: '24px', borderRadius: '8px', flexShrink: 0,
                                border: `2px solid ${task.completed ? '#10b981' : '#d1d5db'}`,
                                background: task.completed ? '#10b981' : 'transparent',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s',
                            }}>
                                {task.completed && <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: '0.62rem' }} />}
                            </button>

                            {/* Inhoud */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: task.completed ? '#94a3b8' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: task.completed ? 'line-through' : 'none' }}>
                                    {task.taskName}
                                </div>
                                <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {task.projectName}
                                </div>
                            </div>

                            {/* Datum */}
                            {task.endDate && (
                                <div style={{ flexShrink: 0, fontSize: '0.71rem', fontWeight: 700, color: overdue ? '#ef4444' : '#94a3b8', background: overdue ? '#fef2f2' : '#f8fafc', padding: '3px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    {overdue && <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '0.65rem' }} />}
                                    {formatDate(task.endDate)}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {filter === 'open' && openCount > 0 && (
                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                    {openCount} taak{openCount !== 1 ? 'en' : ''} open
                </div>
            )}
        </div>
        </div>
    );
}
