'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';

export default function ToegangPage() {
    const { user, getAllUsers, getUserPermissions, updateUserPermissions, removeUser, addUser, updateUser, allPages } = useAuth();
    const router = useRouter();
    const [selectedUser, setSelectedUser] = useState(null);
    const [localPerms, setLocalPerms] = useState([]);
    const [saved, setSaved] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('Medewerker');
    const [newPhone, setNewPhone] = useState('');
    const [addError, setAddError] = useState('');
    const [editUserId, setEditUserId] = useState(null);
    const [editFields, setEditFields] = useState({ name: '', username: '', password: '', role: '', phone: '' });
    const [waSent, setWaSent] = useState(new Set());

    const allUsers = getAllUsers();

    // Redirect als niet beheerder
    useEffect(() => {
        if (user && user.role !== 'Beheerder') {
            router.push('/');
        }
    }, [user, router]);

    // Laad rechten als gebruiker geselecteerd wordt
    useEffect(() => {
        if (selectedUser) {
            setLocalPerms([...getUserPermissions(selectedUser.id)]);
            setSaved(false);
        }
    }, [selectedUser]);

    // Profiel subs die mutueel exclusief zijn (of werknemer of zzp)
    const EXCLUSIVE_PROFIEL_SUBS = ['profiel.werknemer', 'profiel.zzp'];

    const togglePerm = (pageId) => {
        // Dashboard mag niet uitgeschakeld worden
        if (pageId === 'dashboard') return;
        setLocalPerms(prev => {
            // Profiel subs: mutueel exclusief (radio-button gedrag)
            if (EXCLUSIVE_PROFIEL_SUBS.includes(pageId)) {
                const otherSub = EXCLUSIVE_PROFIEL_SUBS.find(s => s !== pageId);
                // Altijd deze aan, de andere uit
                let next = prev.filter(p => p !== otherSub);
                if (!next.includes(pageId)) next = [...next, pageId];
                // Zorg dat parent 'profiel' ook aan staat
                if (!next.includes('profiel')) next = [...next, 'profiel'];
                return next;
            }

            if (prev.includes(pageId)) {
                // Als we een parent uitschakelen, ook children uitschakelen
                const page = allPages.find(p => p.id === pageId);
                const subIds = page?.subs?.map(s => s.id) || [];
                return prev.filter(p => p !== pageId && !subIds.includes(p));
            } else {
                // Als we een parent inschakelen, ook children inschakelen
                const page = allPages.find(p => p.id === pageId);
                const subIds = page?.subs?.map(s => s.id) || [];
                // Voor profiel: standaard alleen werknemer aan
                const profielDefaults = pageId === 'profiel' ? ['profiel.werknemer'] : subIds;
                // Als we een sub inschakelen, check of parent al aan staat
                const parentPage = allPages.find(p => p.subs?.some(s => s.id === pageId));
                const extras = parentPage && !prev.includes(parentPage.id) ? [parentPage.id] : [];
                return [...new Set([...prev, pageId, ...profielDefaults, ...extras])];
            }
        });
        setSaved(false);
    };

    const savePerms = () => {
        if (selectedUser) {
            updateUserPermissions(selectedUser.id, localPerms);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
    };

    const selectAll = () => {
        const allIds = allPages.flatMap(p => [p.id, ...(p.subs?.map(s => s.id) || [])]);
        setLocalPerms(allIds);
        setSaved(false);
    };

    const deselectAll = () => {
        setLocalPerms(['dashboard']); // Dashboard altijd aan
        setSaved(false);
    };

    if (!user || user.role !== 'Beheerder') return null;

    return (
        <div className="content-area">
            <div className="page-header">
                <h1><i className="fa-solid fa-shield-halved" style={{ color: 'var(--accent)', marginRight: '10px' }}></i>Toegangsbeheer</h1>
                <p>Beheer welke pagina&apos;s zichtbaar zijn per gebruiker.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>

                {/* Gebruikers lijst */}
                <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{
                        padding: '14px 18px', borderBottom: '1px solid var(--border-color)',
                        background: 'rgba(0,0,0,0.015)', fontWeight: 700, fontSize: '0.88rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <span>
                            <i className="fa-solid fa-users" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
                            Gebruikers
                        </span>
                        <button
                            onClick={() => { setShowAddForm(!showAddForm); setAddError(''); }}
                            style={{
                                background: 'var(--accent)', border: 'none', borderRadius: '6px',
                                padding: '5px 12px', cursor: 'pointer', color: '#fff',
                                fontSize: '0.75rem', fontWeight: 600, display: 'flex',
                                alignItems: 'center', gap: '4px'
                            }}
                        >
                            <i className={`fa-solid ${showAddForm ? 'fa-xmark' : 'fa-plus'}`}></i>
                            {showAddForm ? 'Annuleer' : 'Nieuw'}
                        </button>
                    </div>
                    {showAddForm && (
                        <div style={{ padding: '14px 18px', borderBottom: '2px solid var(--accent)', background: 'rgba(250,160,82,0.04)' }}>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                <div>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '3px', display: 'block' }}>Volledige naam</label>
                                    <input type="text" placeholder="bijv. Jan de Vries" value={newName} onChange={e => setNewName(e.target.value)}
                                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '3px', display: 'block' }}>Inlognaam (zonder spaties)</label>
                                    <input type="text" placeholder="bijv. jdevries" value={newUsername} onChange={e => setNewUsername(e.target.value)}
                                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '3px', display: 'block' }}>Wachtwoord</label>
                                    <input type="password" placeholder="Kies een sterk wachtwoord" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '3px', display: 'block' }}>Rol binnen het bedrijf</label>
                                    <select value={newRole} onChange={e => setNewRole(e.target.value)}
                                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}>
                                        <option value="Medewerker">Medewerker</option>
                                        <option value="Voorman">Voorman</option>
                                        <option value="Beheerder">Beheerder</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '3px', display: 'block' }}>Telefoonnummer <span style={{ fontWeight: 400, color: '#94a3b8' }}>(voor WhatsApp)</span></label>
                                    <input type="tel" placeholder="bijv. 0612345678" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                                </div>
                                {addError && <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: 0 }}>{addError}</p>}
                                <button
                                    onClick={() => {
                                        if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
                                            setAddError('Vul alle velden in'); return;
                                        }
                                        const result = addUser({ name: newName.trim(), username: newUsername.trim(), password: newPassword, role: newRole, phone: newPhone.trim() });
                                        if (result.success) {
                                            setShowAddForm(false); setNewName(''); setNewUsername(''); setNewPassword(''); setNewRole('Medewerker'); setNewPhone(''); setAddError('');
                                        } else {
                                            setAddError(result.error);
                                        }
                                    }}
                                    style={{
                                        background: 'var(--accent)', border: 'none', borderRadius: '8px',
                                        padding: '8px', cursor: 'pointer', color: '#fff',
                                        fontSize: '0.82rem', fontWeight: 600
                                    }}
                                >
                                    <i className="fa-solid fa-user-plus" style={{ marginRight: '6px' }}></i>
                                    Toevoegen
                                </button>
                            </div>
                        </div>
                    )}
                    {allUsers.map(u => (
                        <div key={u.id}>
                            <div
                                onClick={() => setSelectedUser(u)}
                                style={{
                                    padding: '12px 18px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    borderBottom: editUserId === u.id ? 'none' : '1px solid var(--border-color)',
                                    background: selectedUser?.id === u.id ? 'rgba(250,160,82,0.08)' : 'transparent',
                                    borderLeft: selectedUser?.id === u.id ? '3px solid var(--accent)' : '3px solid transparent',
                                    transition: 'all 0.15s'
                                }}
                                onMouseOver={e => { if (selectedUser?.id !== u.id) e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
                                onMouseOut={e => { if (selectedUser?.id !== u.id) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: 'linear-gradient(135deg, var(--accent) 0%, #e2880a 100%)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontWeight: 700, fontSize: '0.75rem'
                                }}>
                                    {u.initials}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>{u.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        {u.role} — <span style={{ color: '#94a3b8' }}>@{u.username}</span>
                                    </div>
                                </div>
                                {u.role === 'Beheerder' ? (
                                    <span style={{
                                        fontSize: '0.65rem', padding: '2px 8px',
                                        background: 'rgba(250,160,82,0.12)', color: 'var(--accent)',
                                        borderRadius: '20px', fontWeight: 600
                                    }}>
                                        Admin
                                    </span>
                                ) : (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditUserId(editUserId === u.id ? null : u.id);
                                                setEditFields({ name: u.name, username: u.username, password: '', role: u.role, phone: u.phone || '' });
                                            }}
                                            title="Bewerken"
                                            style={{
                                                background: 'rgba(59,130,246,0.08)', border: 'none', borderRadius: '8px',
                                                width: '30px', height: '30px', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
                                            onMouseOut={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
                                        >
                                            <i className="fa-solid fa-pen" style={{ color: '#3b82f6', fontSize: '0.65rem' }}></i>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`${u.name} verwijderen uit het systeem?`)) {
                                                    removeUser(u.id);
                                                    if (selectedUser?.id === u.id) setSelectedUser(null);
                                                    if (editUserId === u.id) setEditUserId(null);
                                                }
                                            }}
                                            title="Verwijderen"
                                            style={{
                                                background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: '8px',
                                                width: '30px', height: '30px', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                                            onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                                        >
                                            <i className="fa-solid fa-trash-can" style={{ color: '#ef4444', fontSize: '0.7rem' }}></i>
                                        </button>
                                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <button
                                                onClick={() => {
                                                    const appUrl = window.location.origin;
                                                    const phone = (u.phone || '').replace(/[^0-9]/g, '');
                                                    const msg = `Hoi ${u.name}! 👋\n\n` +
                                                        `Hier zijn je inloggegevens voor de SchildersApp:\n\n` +
                                                        `🔗 App: ${appUrl}\n` +
                                                        `👤 Inlognaam: ${u.username}\n` +
                                                        `🔑 Wachtwoord: ${u.password}\n\n` +
                                                        `📱 Tip: Voeg de link toe aan je startscherm voor snelle toegang!\n\n` +
                                                        `🎥 Bekijk hier een korte video-uitleg voor ZZP'ers:\n` +
                                                        `https://youtu.be/JOUW_VIDEO_ID\n\n` +
                                                        `Vragen? Stuur gerust een berichtje! 💬`;
                                                    const waUrl = phone
                                                        ? `https://wa.me/31${phone.startsWith('0') ? phone.substring(1) : phone}?text=${encodeURIComponent(msg)}`
                                                        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                                                    window.open(waUrl, '_blank');
                                                    setWaSent(prev => new Set([...prev, u.id]));
                                                }}
                                                title="Stuur via WhatsApp"
                                                style={{
                                                    background: '#25d366', border: 'none', borderRadius: '8px',
                                                    width: '30px', height: '30px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(37,211,102,0.3)'
                                                }}
                                                onMouseOver={e => e.currentTarget.style.background = '#1fb855'}
                                                onMouseOut={e => e.currentTarget.style.background = '#25d366'}
                                            >
                                                <i className="fa-brands fa-whatsapp" style={{ color: '#fff', fontSize: '0.9rem' }}></i>
                                            </button>
                                            <div
                                                onClick={() => setWaSent(prev => {
                                                    const next = new Set(prev);
                                                    next.has(u.id) ? next.delete(u.id) : next.add(u.id);
                                                    return next;
                                                })}
                                                title={waSent.has(u.id) ? 'Verstuurd ✓' : 'Nog niet verstuurd'}
                                                style={{
                                                    width: '34px', height: '18px', borderRadius: '9px', cursor: 'pointer',
                                                    background: waSent.has(u.id) ? '#25d366' : '#d1d5db',
                                                    transition: 'background 0.2s', position: 'relative', flexShrink: 0
                                                }}
                                            >
                                                <div style={{
                                                    width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
                                                    position: 'absolute', top: '2px',
                                                    left: waSent.has(u.id) ? '18px' : '2px',
                                                    transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                                                }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Inline bewerkformulier */}
                            {editUserId === u.id && (
                                <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-color)', background: 'rgba(59,130,246,0.03)', borderLeft: '3px solid #3b82f6' }}>
                                    <div style={{ display: 'grid', gap: '6px' }}>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: '2px', display: 'block' }}>Volledige naam</label>
                                            <input type="text" placeholder="bijv. Jan de Vries" value={editFields.name} onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))}
                                                style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: '2px', display: 'block' }}>Inlognaam</label>
                                            <input type="text" placeholder="bijv. jdevries" value={editFields.username} onChange={e => setEditFields(f => ({ ...f, username: e.target.value }))}
                                                style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: '2px', display: 'block' }}>Nieuw wachtwoord <span style={{ fontWeight: 400, color: '#94a3b8' }}>(leeg = niet wijzigen)</span></label>
                                            <input type="password" placeholder="Laat leeg om te behouden" value={editFields.password} onChange={e => setEditFields(f => ({ ...f, password: e.target.value }))}
                                                style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: '2px', display: 'block' }}>Rol</label>
                                            <select value={editFields.role} onChange={e => setEditFields(f => ({ ...f, role: e.target.value }))}
                                                style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}>
                                                <option value="Medewerker">Medewerker</option>
                                                <option value="Voorman">Voorman</option>
                                                <option value="Beheerder">Beheerder</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: '2px', display: 'block' }}>Telefoonnummer <span style={{ fontWeight: 400, color: '#94a3b8' }}>(voor WhatsApp)</span></label>
                                            <input type="tel" placeholder="bijv. 0612345678" value={editFields.phone} onChange={e => setEditFields(f => ({ ...f, phone: e.target.value }))}
                                                style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={() => {
                                                    const updates = { name: editFields.name, username: editFields.username, role: editFields.role, phone: editFields.phone };
                                                    if (editFields.password) updates.password = editFields.password;
                                                    updateUser(u.id, updates);
                                                    setEditUserId(null);
                                                }}
                                                style={{
                                                    flex: 1, background: '#3b82f6', border: 'none', borderRadius: '6px',
                                                    padding: '7px', cursor: 'pointer', color: '#fff',
                                                    fontSize: '0.78rem', fontWeight: 600
                                                }}
                                            >
                                                <i className="fa-solid fa-check" style={{ marginRight: '4px' }}></i> Opslaan
                                            </button>
                                            <button
                                                onClick={() => setEditUserId(null)}
                                                style={{
                                                    background: '#f1f5f9', border: 'none', borderRadius: '6px',
                                                    padding: '7px 14px', cursor: 'pointer', color: '#64748b',
                                                    fontSize: '0.78rem', fontWeight: 600
                                                }}
                                            >
                                                Annuleer
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Rechten paneel */}
                <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                    {!selectedUser ? (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', height: '300px', color: '#94a3b8'
                        }}>
                            <i className="fa-solid fa-arrow-left" style={{ fontSize: '2rem', marginBottom: '12px', opacity: 0.3 }}></i>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>Selecteer een gebruiker om rechten te beheren</p>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div style={{
                                padding: '16px 20px', borderBottom: '1px solid var(--border-color)',
                                background: 'rgba(0,0,0,0.015)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '10px',
                                        background: 'linear-gradient(135deg, var(--accent) 0%, #e2880a 100%)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontWeight: 700, fontSize: '0.85rem'
                                    }}>
                                        {selectedUser.initials}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Rechten voor {selectedUser.name}</h3>
                                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>{selectedUser.role}</p>
                                    </div>
                                </div>
                                {selectedUser.role === 'Beheerder' && (
                                    <div style={{
                                        background: 'rgba(250,160,82,0.08)', border: '1px solid rgba(250,160,82,0.2)',
                                        borderRadius: '8px', padding: '6px 12px', fontSize: '0.75rem',
                                        color: 'var(--accent)', fontWeight: 500
                                    }}>
                                        <i className="fa-solid fa-info-circle" style={{ marginRight: '4px' }}></i>
                                        Beheerder heeft altijd volledige toegang
                                    </div>
                                )}
                            </div>

                            {/* Pagina toggles */}
                            <div style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                    <button onClick={selectAll} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                                        <i className="fa-solid fa-check-double" style={{ marginRight: '4px' }}></i> Alles aan
                                    </button>
                                    <button onClick={deselectAll} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                                        <i className="fa-solid fa-xmark" style={{ marginRight: '4px' }}></i> Alles uit
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {allPages.map(page => {
                                        const isOn = localPerms.includes(page.id);
                                        const isDashboard = page.id === 'dashboard';
                                        const isAdmin = selectedUser.role === 'Beheerder';

                                        return (
                                            <div key={page.id}>
                                                <div
                                                    onClick={() => !isDashboard && !isAdmin && togglePerm(page.id)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center',
                                                        padding: '14px 18px', borderRadius: '10px',
                                                        border: isOn ? '1px solid rgba(34,197,94,0.2)' : '1px solid var(--border-color)',
                                                        background: isOn ? 'rgba(34,197,94,0.04)' : '#fff',
                                                        cursor: isDashboard || isAdmin ? 'not-allowed' : 'pointer',
                                                        opacity: isDashboard || isAdmin ? 0.6 : 1,
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    {/* Icon */}
                                                    <div style={{
                                                        width: '38px', height: '38px', borderRadius: '10px',
                                                        background: isOn ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.04)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        marginRight: '14px'
                                                    }}>
                                                        <i className={`fa-solid ${page.icon}`} style={{
                                                            fontSize: '0.9rem', color: isOn ? '#22c55e' : '#94a3b8'
                                                        }}></i>
                                                    </div>

                                                    {/* Label */}
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>{page.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{page.path}</div>
                                                    </div>

                                                    {/* Toggle */}
                                                    <div style={{
                                                        width: '48px', height: '26px', borderRadius: '13px',
                                                        background: isOn ? '#22c55e' : '#e2e8f0',
                                                        display: 'flex', alignItems: 'center',
                                                        padding: '2px', transition: 'all 0.2s', cursor: 'inherit'
                                                    }}>
                                                        <div style={{
                                                            width: '22px', height: '22px', borderRadius: '50%',
                                                            background: '#fff',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                                                            transform: isOn ? 'translateX(22px)' : 'translateX(0)',
                                                            transition: 'all 0.2s'
                                                        }}></div>
                                                    </div>

                                                    {isDashboard && (
                                                        <span style={{
                                                            marginLeft: '8px', fontSize: '0.65rem', color: '#94a3b8', fontStyle: 'italic'
                                                        }}>Verplicht</span>
                                                    )}
                                                </div>

                                                {/* Sub-features */}
                                                {page.subs && isOn && (
                                                    <div style={{ marginLeft: '52px', marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {page.subs.map(sub => {
                                                            const subOn = localPerms.includes(sub.id);
                                                            const isExclusive = EXCLUSIVE_PROFIEL_SUBS.includes(sub.id);
                                                            return (
                                                                <div
                                                                    key={sub.id}
                                                                    onClick={() => !isAdmin && togglePerm(sub.id)}
                                                                    style={{
                                                                        display: 'flex', alignItems: 'center',
                                                                        padding: '10px 20px', borderRadius: '8px', minWidth: '200px',
                                                                        border: subOn ? '1px solid rgba(34,197,94,0.15)' : '1px solid var(--border-color)',
                                                                        background: subOn ? 'rgba(34,197,94,0.03)' : '#fafafa',
                                                                        cursor: isAdmin ? 'not-allowed' : 'pointer',
                                                                        opacity: isAdmin ? 0.6 : 1,
                                                                        transition: 'all 0.15s'
                                                                    }}
                                                                >
                                                                    <div style={{
                                                                        width: '30px', height: '30px', borderRadius: '8px',
                                                                        background: subOn ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.03)',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        marginRight: '10px'
                                                                    }}>
                                                                        <i className={`fa-solid ${sub.icon}`} style={{
                                                                            fontSize: '0.75rem', color: subOn ? '#22c55e' : '#b0b8c4'
                                                                        }}></i>
                                                                    </div>
                                                                    <div style={{ flex: 1, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>{sub.name}</div>
                                                                    {isExclusive ? (
                                                                        /* Radio-button stijl voor exclusieve profiel opties */
                                                                        <div style={{
                                                                            width: '22px', height: '22px', borderRadius: '50%',
                                                                            border: `2px solid ${subOn ? '#22c55e' : '#cbd5e1'}`,
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            transition: 'all 0.2s'
                                                                        }}>
                                                                            {subOn && <div style={{
                                                                                width: '12px', height: '12px', borderRadius: '50%',
                                                                                background: '#22c55e', transition: 'all 0.2s'
                                                                            }} />}
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{
                                                                            width: '40px', height: '22px', borderRadius: '11px',
                                                                            background: subOn ? '#22c55e' : '#e2e8f0',
                                                                            display: 'flex', alignItems: 'center',
                                                                            padding: '2px', transition: 'all 0.2s', cursor: 'inherit'
                                                                        }}>
                                                                            <div style={{
                                                                                width: '18px', height: '18px', borderRadius: '50%',
                                                                                background: '#fff',
                                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                                                                                transform: subOn ? 'translateX(18px)' : 'translateX(0)',
                                                                                transition: 'all 0.2s'
                                                                            }}></div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Opslaan knop */}
                                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <button
                                        onClick={savePerms}
                                        className="btn btn-primary"
                                        disabled={selectedUser.role === 'Beheerder'}
                                        style={{
                                            padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '6px',
                                            opacity: selectedUser.role === 'Beheerder' ? 0.5 : 1
                                        }}
                                    >
                                        <i className="fa-solid fa-floppy-disk"></i>
                                        Rechten Opslaan
                                    </button>

                                    {saved && (
                                        <span style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            color: '#22c55e', fontSize: '0.85rem', fontWeight: 600,
                                            animation: 'fadeIn 0.3s'
                                        }}>
                                            <i className="fa-solid fa-circle-check"></i>
                                            Opgeslagen!
                                        </span>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
