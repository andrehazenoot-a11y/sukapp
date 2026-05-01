'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../components/AuthContext';
import { useLanguage } from '../components/LanguageContext';
import Link from 'next/link';
import TestDataGenerator from '../components/TestDataGenerator';

export default function Home() {
  const { user, getAllUsers } = useAuth();
  const { t } = useLanguage();
  const currentUser = user?.name || 'Jan Modaal';
  const [meldingen, setMeldingen] = useState([]);
  const [docs, setDocs]               = useState([]);
  const [docFilter, setDocFilter]     = useState('alle');
  const [docDatumFilter, setDocDatumFilter] = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const [docFout, setDocFout]         = useState(null);
  const [werkbonnen, setWerkbonnen]   = useState([]);
  const [werkbonOpen, setWerkbonOpen] = useState({});
  const [verjaardagen, setVerjaardagen] = useState([]);
  const [vjFormOpen, setVjFormOpen] = useState(false);
  const [vjNaam, setVjNaam] = useState('');
  const [vjDatum, setVjDatum] = useState('');
  const [vjNotitie, setVjNotitie] = useState('');
  const [vjSyncing, setVjSyncing] = useState(false);
  const [vjSyncResult, setVjSyncResult] = useState(null);
const docInputRef                   = useRef();

  // Live stats uit localStorage
  const [stats, setStats] = useState({
    contracten: [], medewerkers: [], urenLog: [], projecten: []
  });

  useEffect(() => {
    const load = () => {
      const data = JSON.parse(localStorage.getItem('schildersapp_meldingen') || '[]');
      setMeldingen(data);
      const contracten = JSON.parse(localStorage.getItem('wa_contracten') || '[]');
      const medewerkers = JSON.parse(localStorage.getItem('wa_medewerkers') || '[]');
      const urenLog = JSON.parse(localStorage.getItem('wa_uren_log') || '[]');
      const projecten = JSON.parse(localStorage.getItem('wa_projecten') || '[]');
      setStats({ contracten, medewerkers, urenLog, projecten });
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('/api/documenten?alle=1').then(r => r.json()).then(data => { if (Array.isArray(data)) setDocs(data); }).catch(() => {});
    fetch('/api/werkbonnen').then(r => r.json()).then(data => { if (Array.isArray(data)) setWerkbonnen(data); }).catch(() => {});
fetch('/api/verjaardagen').then(r => r.json()).then(data => { if (Array.isArray(data)) setVerjaardagen(data); }).catch(() => {});
  }, []);

  async function handleVjOpslaan() {
    if (!vjNaam.trim() || !vjDatum) return;
    // datum is full date (YYYY-MM-DD) → bewaar als MM-DD
    const mmdd = vjDatum.slice(5); // '2000-03-15' → '03-15'
    try {
      const res = await fetch('/api/verjaardagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naam: vjNaam, datum: mmdd, notitie: vjNotitie }),
      });
      const item = await res.json();
      setVerjaardagen(prev => [...prev, item].sort((a, b) => a.dagenTot - b.dagenTot));
      setVjNaam(''); setVjDatum(''); setVjNotitie(''); setVjFormOpen(false);
    } catch {}
  }

  async function handleVjVerwijder(id) {
    setVerjaardagen(prev => prev.filter(v => v.id !== id));
    await fetch(`/api/verjaardagen/${id}`, { method: 'DELETE' }).catch(() => {});
  }


  async function handleVjSync() {
    setVjSyncing(true); setVjSyncResult(null);
    try {
      const raw = localStorage.getItem('wa_medewerkers');
      const medewerkers = raw ? JSON.parse(raw) : [];
      const metDatum = medewerkers
        .filter(m => m.geboortedatum)
        .map(m => ({ naam: [m.voornaam, m.achternaam].filter(Boolean).join(' ') || m.naam || m.bedrijfsnaam || 'Onbekend', geboortedatum: m.geboortedatum }));
      const res = await fetch('/api/verjaardagen/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medewerkers: metDatum }),
      });
      const data = await res.json();
      setVjSyncResult(data.ingevoegd ?? 0);
      // Herlaad de lijst
      fetch('/api/verjaardagen').then(r => r.json()).then(d => { if (Array.isArray(d)) setVerjaardagen(d); }).catch(() => {});
    } catch { setVjSyncResult(-1); }
    setVjSyncing(false);
  }

  const mijnMeldingen = meldingen.filter(m => m.aan === currentUser);
  const ongelezen = mijnMeldingen.filter(m => !m.gelezen).length;

  const markeerGelezen = (id) => {
    const updated = meldingen.map(m => m.id === id ? { ...m, gelezen: true } : m);
    setMeldingen(updated);
    localStorage.setItem('schildersapp_meldingen', JSON.stringify(updated));
  };

  const verwijderMelding = (id) => {
    const updated = meldingen.filter(m => m.id !== id);
    setMeldingen(updated);
    localStorage.setItem('schildersapp_meldingen', JSON.stringify(updated));
  };

  const formatTijd = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return t('common.justNow');
    if (min < 60) return `${min} ${t('common.minutesAgo')}`;
    const uur = Math.floor(min / 60);
    if (uur < 24) return `${uur} ${t('common.hoursAgo')}`;
    return `${Math.floor(uur / 24)} ${t('common.daysAgo')}`;
  };

  function handleDocUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setDocFout(null);
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { setDocFout(`${file.name} is te groot (max 5 MB).`); return; }
      setDocUploading(true);
      const reader = new FileReader();
      reader.onload = async ev => {
        try {
          const res = await fetch('/api/documenten', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titel: file.name.replace(/\.[^.]+$/, ''), bestandsnaam: file.name, type: file.type, data: ev.target.result, geuploadDoor: user?.name || 'Beheerder', zichtbaarVanaf: null }),
          });
          const doc = await res.json();
          if (doc.error) { setDocFout(doc.error); } else {
            setDocs(prev => [{ ...doc, gelezen: [] }, ...prev]);
          }
        } catch { setDocFout('Upload mislukt.'); }
        setDocUploading(false);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  async function verwijderDoc(id) {
    await fetch(`/api/documenten/${id}`, { method: 'DELETE' }).catch(() => {});
    setDocs(prev => prev.filter(d => d.id !== id));
  }


  // Berekende statistieken
  const zzpers = stats.medewerkers.filter(m => m.type === 'zzp');
const teOndertekenen = stats.contracten.filter(c => !c.getekend && (c.kanbanStatus === 'Nog te ondertekenen' || !c.kanbanStatus));
  const getekend = stats.contracten.filter(c => c.getekend);
  const totalUren = stats.urenLog.reduce((s, u) => s + (u.uren || 0), 0);

  // Documenten die bijna verlopen (< 90 dagen)
  const verloopAlerts = stats.medewerkers.flatMap(m => {
    if (m.type !== 'zzp') return [];
    const checkDate = (datum, label) => {
      if (!datum) return null;
      const d = Math.ceil((new Date(datum) - new Date()) / (1000 * 60 * 60 * 24));
      if (d < 90) return { naam: m.naam, label, dagen: d, verlopen: d < 0 };
      return null;
    };
    return [
      m.kvkTrackingActive !== false ? checkDate(m.kvkVerloopdatum, 'KVK') : null,
      m.vogTrackingActive !== false ? checkDate(m.vogVerloopdatum, 'VOG') : null,
      checkDate(m.vcaVerloopdatum, 'VCA'),
      checkDate(m.avbVerloopdatum, 'AVB'),
      checkDate(m.cavVerloopdatum, 'CAV'),
      ...(m.afspraken || [])
        .filter(a => a.herinneringActief !== false)
        .filter(a => {
          if (a.waarschuwWie === 'mijzelf' && m.naam !== currentUser) return false;
          return true;
        })
        .map(a => {
        if (!a.datum) return null;
        let cDate = new Date(a.datum);
        const today = new Date();
        // Today at midnight for accurate while loop computation
        today.setHours(0,0,0,0);
        cDate.setHours(0,0,0,0);
        
        const type = a.herhaalType || 'geen';
        const num = Math.max(1, a.herhaalAantal || 1);
        
        if (type !== 'geen' && cDate < today) {
          while (cDate <= today) {
            if (type === 'dagen') cDate.setDate(cDate.getDate() + num);
            if (type === 'weken') cDate.setDate(cDate.getDate() + num * 7);
            if (type === 'maanden') cDate.setMonth(cDate.getMonth() + num);
            if (type === 'jaren') cDate.setFullYear(cDate.getFullYear() + num);
          }
        }
        return checkDate(cDate.toISOString().split('T')[0], `Herinnering: ${a.onderwerp || 'Zonder titel'}`);
      })
    ].filter(Boolean);
  });

  const totalContractWaarde = stats.contracten.reduce((s, c) => s + (c.totaalBedrag || c.totaalOvereenkomst || 0), 0);

  // Recente activiteit
  const recenteRegistraties = [...stats.urenLog]
    .sort((a, b) => b.id - a.id)
    .slice(0, 8);

  return (
    <div className="content-area" id="view-dashboard" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* === TOPBALK: titel + stat kaarten === */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
            {t('dashboard.welcomeBack')}, {currentUser.split(' ')[0]}.
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.75rem' }}>
            {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
          {[
            { icon: 'fa-file-contract', color: '#25D366', bg: '#f0fdf4', border: '#86efac', value: stats.contracten.length, label: 'Contracten', sub: teOndertekenen.length > 0 ? `${teOndertekenen.length} wacht` : null, subColor: '#f59e0b' },
            { icon: 'fa-person-digging', color: '#F5850A', bg: '#fff8f0', border: '#fbd8a8', value: zzpers.length, label: "ZZP'ers", sub: verloopAlerts.length > 0 ? `${verloopAlerts.filter(a => a.verlopen).length} verlopen` : null, subColor: '#ef4444' },
            { icon: 'fa-clock', color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd', value: totalUren.toFixed(0), label: 'Uren', sub: `${stats.urenLog.length} reg.`, subColor: '#64748b' },
            { icon: 'fa-euro-sign', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', value: totalContractWaarde > 0 ? `€${(totalContractWaarde / 1000).toFixed(0)}k` : '€—', label: 'Contractwaarde', sub: getekend.length > 0 ? `${getekend.length} getekend` : null, subColor: '#16a34a' },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: '10px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '120px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: '0.85rem' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>{s.label}</div>
                {s.sub && <div style={{ fontSize: '0.62rem', color: s.subColor, fontWeight: 700 }}>{s.sub}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <TestDataGenerator />

      {/* === VERLOOP WAARSCHUWINGEN === */}
      {verloopAlerts.length > 0 && (
        <div style={{ marginBottom: '16px', borderRadius: '12px', border: '2px solid #fbbf24', background: '#fffbeb', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Documenten vereisen aandacht</span>
            <span style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.15)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem' }}>
              {verloopAlerts.length} melding(en)
            </span>
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {verloopAlerts.slice(0, 4).map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '8px',
                background: a.verlopen ? '#fef2f2' : '#fffbeb',
                border: `1px solid ${a.verlopen ? '#fca5a5' : '#fde68a'}`
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: a.verlopen ? '#b91c1c' : '#92400e' }}>
                  {a.verlopen ? '⛔' : '🟡'} {a.naam} — {a.label}:{' '}
                  {a.verlopen ? `${Math.abs(a.dagen)} dgn geleden verlopen` : `nog ${a.dagen} dgn`}
                </span>
              </div>
            ))}
            <Link href="/whatsapp" style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 12px', borderRadius: '8px',
              background: '#F5850A', color: '#fff',
              fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none'
            }}>
              <i className="fa-brands fa-whatsapp"></i> Stuur melding →
            </Link>
          </div>
        </div>
      )}

      {/* === GEREEDSCHAP AANVRAGEN MELDINGEN === */}
      {mijnMeldingen.length > 0 && (
        <div className="panel" style={{ marginBottom: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-bell" style={{ color: '#f59e0b' }}></i> {t('dashboard.toolRequests')}
              {ongelezen > 0 && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#f59e0b', color: '#fff', fontWeight: 700 }}>{ongelezen} {t('common.new')}</span>}
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px 16px' }}>
            {mijnMeldingen.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px',
                background: m.gelezen ? 'rgba(0,0,0,0.015)' : 'rgba(245,158,11,0.06)',
                border: m.gelezen ? '1px solid var(--border-color)' : '1px solid rgba(245,158,11,0.2)',
                transition: 'all 0.2s'
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: m.gelezen ? 'rgba(0,0,0,0.05)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: m.gelezen ? '#94a3b8' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0
                }}>
                  <i className="fa-solid fa-hand-holding"></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: m.gelezen ? 400 : 600 }}>
                    <strong>{m.van}</strong> {t('dashboard.wantsToUse')} <strong style={{ color: 'var(--accent)' }}>{m.itemNaam}</strong> ({m.itemId}) {t('dashboard.use')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{formatTijd(m.datum)}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {!m.gelezen && (
                    <button onClick={() => markeerGelezen(m.id)} style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(14,165,233,0.3)', background: 'rgba(14,165,233,0.06)', color: '#0ea5e9', cursor: 'pointer', fontWeight: 600 }}>
                      <i className="fa-solid fa-check" style={{ marginRight: '3px' }}></i>{t('common.seen')}
                    </button>
                  )}
                  <button onClick={() => verwijderMelding(m.id)} style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>

        {/* Recente activiteit */}
        <div className="panel notifications" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>{t('dashboard.recentActivity')}</h2>
            <Link href="/whatsapp?tab=uren" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              Alle uren →
            </Link>
          </div>
          {recenteRegistraties.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
              <i className="fa-solid fa-clock" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px', color: '#cbd5e1' }}></i>
              Nog geen urenregistraties.
            </div>
          ) : (
            <ul className="activity-list" style={{ flex: 1, overflowY: 'scroll', minHeight: 0 }}>
              {recenteRegistraties.map(u => (
                <li key={u.id} className="activity-item">
                  <div className="activity-icon" style={{ background: 'rgba(37,211,102,0.1)', color: '#25D366' }}>
                    <i className="fa-solid fa-clock"></i>
                  </div>
                  <div className="activity-details">
                    <p>
                      <strong>{u.medewerkerNaam}</strong> — {u.uren} uur op <em>{u.projectNaam}</em>
                      {u.preContract && <span style={{ marginLeft: '6px', fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700 }}>⚠️ pre-contract</span>}
                    </p>
                    <span>{u.datum} {u.tijdstempel && `• ${u.tijdstempel}`}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Middelste kolom: Contracten + Verjaardagen gestapeld */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', minHeight: 0 }}>
        <div className="panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2><i className="fa-solid fa-file-signature" style={{ color: '#25D366', marginRight: '8px' }}></i>Contracten</h2>
            <Link href="/whatsapp?tab=overzicht_contract" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              Alle contracten →
            </Link>
          </div>
          {stats.contracten.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
              <i className="fa-solid fa-file-circle-plus" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px', color: '#cbd5e1' }}></i>
              Nog geen contracten<br />
              <Link href="/whatsapp?tab=nieuw_contract" style={{ color: '#25D366', fontWeight: 600, textDecoration: 'none' }}>→ Maak het eerste contract</Link>
            </div>
          ) : (
            <div>
              {[
                { label: 'Te ondertekenen', count: teOndertekenen.length, color: '#f59e0b', bg: '#fffbeb', icon: 'fa-pen-nib' },
                { label: 'Lopend', count: stats.contracten.filter(c => c.kanbanStatus === 'Lopende modelovereenkomsten').length, color: '#3b82f6', bg: '#eff6ff', icon: 'fa-spinner' },
                { label: 'Ondertekend', count: getekend.length, color: '#22c55e', bg: '#f0fdf4', icon: 'fa-check-circle' },
                { label: 'Afgerond', count: stats.contracten.filter(c => c.kanbanStatus === 'Afgeronde modelovereenkomsten').length, color: '#94a3b8', bg: '#f8fafc', icon: 'fa-archive' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: '0.8rem' }}>
                    <i className={`fa-solid ${s.icon}`}></i>
                  </div>
                  <div style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500 }}>{s.label}</div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: s.color }}>{s.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Uren per project */}
        {werkbonnen.length > 0 && (() => {
          const perProject = {};
          for (const bon of werkbonnen) {
            if (!perProject[bon.projectNaam]) perProject[bon.projectNaam] = { bonnen: [], totaal: 0 };
            perProject[bon.projectNaam].bonnen.push(bon);
            perProject[bon.projectNaam].totaal += bon.uren;
          }
          const projecten = Object.entries(perProject).sort((a, b) => {
            const latestA = Math.max(...a[1].bonnen.map(b => new Date(b.aangemaakt)));
            const latestB = Math.max(...b[1].bonnen.map(b => new Date(b.aangemaakt)));
            return latestB - latestA;
          });
          return (
            <div className="panel">
              <div className="panel-header">
                <h2><i className="fa-solid fa-clock" style={{ color: '#F5850A', marginRight: '8px' }} />Uren per project</h2>
              </div>
              {projecten.map(([naam, { bonnen: bons, totaal }]) => {
                const isOpen = werkbonOpen[naam];
                return (
                  <div key={naam} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <button onClick={() => setWerkbonOpen(prev => ({ ...prev, [naam]: !prev[naam] }))}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fa-solid fa-folder-tree" style={{ color: '#F5850A', fontSize: '0.9rem' }} />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{naam}</span>
                        <span style={{ fontSize: '0.75rem', background: '#fff8f0', color: '#ea580c', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>{totaal}u totaal</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{bons.length} registratie{bons.length !== 1 ? 's' : ''}</span>
                        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.75rem' }} />
                      </div>
                    </button>
                    {isOpen && (
                      <div style={{ padding: '0 16px 12px' }}>
                        {bons.map(bon => (
                          <div key={bon.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0', borderTop: '1px solid #f8fafc' }}>
                            <div style={{ minWidth: '36px', textAlign: 'center', background: '#f0f9ff', borderRadius: '8px', padding: '4px 6px', fontSize: '0.78rem', fontWeight: 700, color: '#0891b2' }}>{bon.uren}u</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{bon.naam || bon.medewerkerNaam}</div>
                              {bon.medewerkerNaam && bon.naam && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>{bon.medewerkerNaam}</div>}
                              {bon.omschrijving && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{bon.omschrijving}</div>}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', flexShrink: 0 }}>
                              {new Date(bon.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                            </div>
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Werkbon "${bon.naam || bon.medewerkerNaam}" verwijderen?`)) return;
                                await fetch(`/api/werkbonnen/${bon.id}`, { method: 'DELETE' });
                                setWerkbonnen(prev => prev.filter(b => b.id !== bon.id));
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', padding: '2px 4px', flexShrink: 0 }}
                              title="Verwijderen"
                            >
                              <i className="fa-solid fa-trash" style={{ fontSize: '0.75rem' }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Snelle acties */}
        <div className="panel quick-actions">
          <div className="panel-header">
            <h2>{t('dashboard.quickActions')}</h2>
          </div>
          <div className="action-buttons">
            <Link href="/whatsapp?tab=uren" className="btn btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-clock"></i> Uren registreren
            </Link>
            <Link href="/whatsapp?tab=nieuw_contract" className="btn btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-file-signature"></i> Nieuw contract
            </Link>
            <Link href="/whatsapp?tab=termijnen" className="btn btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-chart-bar"></i> Termijnen bekijken
            </Link>
            <Link href="/projecten" className="btn btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-folder-tree"></i> Projecten
            </Link>
            <Link href="/werkbonnen" className="btn btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-file-pen"></i> Werkbonnen
            </Link>
          </div>
        </div>
        </div>{/* einde middelste kolom flex */}

        {/* Rechterkolom: Toolboxmeeting + Verjaardagen gestapeld */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', minHeight: 0 }}>
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h2><i className="fa-solid fa-file-pdf" style={{ color: '#e11d48', marginRight: '8px' }} />Toolboxmeeting Bestanden</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {['alle', 'actief', 'gepland'].map(f => (
                <button key={f} onClick={() => { setDocFilter(f); setDocDatumFilter(''); }}
                  style={{ padding: '5px 12px', borderRadius: '7px', border: '1.5px solid', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                    borderColor: docFilter === f && !docDatumFilter ? '#e11d48' : '#e2e8f0',
                    background: docFilter === f && !docDatumFilter ? '#fff1f2' : '#f8fafc',
                    color: docFilter === f && !docDatumFilter ? '#e11d48' : '#64748b' }}>
                  {f === 'alle' ? 'Alle' : f === 'actief' ? 'Actief' : 'Gepland'}
                </button>
              ))}
              <input type="date" value={docDatumFilter} onChange={e => { setDocDatumFilter(e.target.value); setDocFilter('alle'); }}
                title="Filter op datum"
                style={{ fontSize: '0.75rem', border: `1.5px solid ${docDatumFilter ? '#e11d48' : '#e2e8f0'}`, borderRadius: '7px', padding: '5px 8px', color: docDatumFilter ? '#e11d48' : '#64748b', background: docDatumFilter ? '#fff1f2' : '#f8fafc', fontWeight: 600 }} />
              {docDatumFilter && (
                <button onClick={() => setDocDatumFilter('')} title="Filter wissen"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem', padding: '2px' }}>✕</button>
              )}
              {docFout && <span style={{ fontSize: '0.72rem', color: '#ef4444' }}>{docFout}</span>}
              <input ref={docInputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleDocUpload} style={{ display: 'none' }} />
              <button onClick={() => docInputRef.current?.click()} disabled={docUploading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#e11d48', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                {docUploading ? <><i className="fa-solid fa-circle-notch fa-spin" />Uploaden…</> : <><i className="fa-solid fa-upload" />Uploaden</>}
              </button>
            </div>
          </div>
          <div style={{ overflowY: 'scroll', flex: 1, minHeight: 0 }}>
          {docs.length === 0 ? (
            <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
              <i className="fa-solid fa-file-pdf" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px', color: '#cbd5e1' }} />
              Nog geen documenten geüpload
            </div>
          ) : (
            <div>
              {[...docs].sort((a, b) => {
                const da = a.zichtbaarVanaf ? new Date(a.zichtbaarVanaf) : new Date(a.datum);
                const db = b.zichtbaarVanaf ? new Date(b.zichtbaarVanaf) : new Date(b.datum);
                return da - db;
              }).filter(doc => {
                if (docDatumFilter) {
                  const gekozen = new Date(docDatumFilter);
                  const vanaf = doc.zichtbaarVanaf ? new Date(doc.zichtbaarVanaf) : null;
                  return !vanaf || vanaf <= gekozen;
                }
                const isGepland = doc.zichtbaarVanaf && new Date(doc.zichtbaarVanaf) > new Date();
                if (docFilter === 'actief') return !isGepland;
                if (docFilter === 'gepland') return isGepland;
                return true;
              }).map((doc, i, arr) => {
                const alleGebruikers = getAllUsers();
                const gelezenEntries = doc.gelezen || [];
                const isPdf = doc.type === 'application/pdf';
                const isGepland = doc.zichtbaarVanaf && new Date(doc.zichtbaarVanaf) > new Date();
                return (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none', opacity: isGepland ? 0.6 : 1 }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: isPdf ? '#fff1f2' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`fa-solid ${isPdf ? 'fa-file-pdf' : 'fa-file-lines'}`} style={{ color: isPdf ? '#e11d48' : '#3b82f6', fontSize: '0.95rem' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.titel}</div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {new Date(doc.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })} · {doc.bestandsnaam}
                        {isGepland ? (
                          <span style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: '4px', padding: '1px 6px', fontWeight: 700, fontSize: '0.63rem' }}>
                            Gepland: {new Date(doc.zichtbaarVanaf).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                          </span>
                        ) : doc.categorie ? (
                          <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: '4px', padding: '1px 6px', fontWeight: 700, fontSize: '0.63rem' }}>
                            {doc.categorie}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '90px' }}>
                      {isGepland ? (
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>Nog niet zichtbaar</div>
                      ) : (
                        <>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: gelezenEntries.length === alleGebruikers.length ? '#10b981' : '#f59e0b' }}>
                            {gelezenEntries.length}/{alleGebruikers.length} gelezen
                          </div>
                          {gelezenEntries.map((e, ei) => (
                            <div key={ei} style={{ fontSize: '0.63rem', color: '#94a3b8', marginTop: '2px', lineHeight: 1.4 }}>
                              <span style={{ fontWeight: 600, color: '#64748b' }}>{e.naam.split(' ')[0]}</span>
                              {e.timestamp && <> · {new Date(e.timestamp).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} {new Date(e.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</>}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                    <input type="date" value={doc.zichtbaarVanaf ? doc.zichtbaarVanaf.split('T')[0] : ''} title="Zichtbaar vanaf"
                      onChange={async e => {
                        const val = e.target.value || null;
                        await fetch(`/api/documenten/${doc.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zichtbaarVanaf: val }) }).catch(() => {});
                        setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, zichtbaarVanaf: val } : d));
                      }}
                      style={{ fontSize: '0.72rem', border: '1px solid #e2e8f0', borderRadius: '7px', padding: '4px 6px', color: '#475569', background: '#f8fafc', flexShrink: 0 }}
                    />
                    <button onClick={() => verwijderDoc(doc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', fontSize: '0.85rem', padding: '4px', flexShrink: 0 }}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          </div>{/* einde scroll wrapper toolboxmeeting */}
        </div>

        {/* Verjaardagen */}
        <div className="panel">
          <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-cake-candles" style={{ color: '#F5850A' }} /> Verjaardagen
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={handleVjSync} disabled={vjSyncing}
                style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '8px', cursor: 'pointer', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <i className={`fa-solid ${vjSyncing ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
                {vjSyncing ? '...' : 'Sync'}
              </button>
              <button onClick={() => setVjFormOpen(v => !v)}
                style={{ background: vjFormOpen ? '#f1f5f9' : '#fff8f0', border: `1.5px solid ${vjFormOpen ? '#e2e8f0' : '#fde8cc'}`, borderRadius: '8px', cursor: 'pointer', color: vjFormOpen ? '#64748b' : '#F5850A', fontSize: '0.75rem', fontWeight: 700, padding: '5px 10px' }}>
                {vjFormOpen ? '✕' : '+ Toev.'}
              </button>
            </div>
          </div>
          {vjSyncResult !== null && (
            <div style={{ padding: '4px 16px', fontSize: '0.72rem', color: vjSyncResult >= 0 ? '#16a34a' : '#ef4444', fontWeight: 600 }}>
              {vjSyncResult >= 0 ? `${vjSyncResult} gesynchroniseerd` : 'Sync mislukt'}
            </div>
          )}
          {vjFormOpen && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input type="text" placeholder="Naam medewerker..." value={vjNaam} onChange={e => setVjNaam(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              <input type="date" value={vjDatum} onChange={e => setVjDatum(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              <input type="text" placeholder="Notitie (optioneel)" value={vjNotitie} onChange={e => setVjNotitie(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              <button onClick={handleVjOpslaan} disabled={!vjNaam.trim() || !vjDatum}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: vjNaam.trim() && vjDatum ? 'linear-gradient(135deg,#F5850A,#D96800)' : '#e2e8f0', color: vjNaam.trim() && vjDatum ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: '0.85rem', cursor: vjNaam.trim() && vjDatum ? 'pointer' : 'default' }}>
                Opslaan
              </button>
            </div>
          )}
          <div style={{ padding: '0 16px' }}>
            {verjaardagen.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                <i className="fa-solid fa-cake-candles" style={{ fontSize: '1.3rem', display: 'block', marginBottom: '6px', opacity: 0.3 }} />
                Nog geen verjaardagen
              </div>
            ) : verjaardagen.map(v => {
              const vandaag = v.dagenTot === 0;
              const binnenkort = v.dagenTot <= 7;
              return (
                <div key={v.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: vandaag ? '#fff8f0' : binnenkort ? '#fffbeb' : '#f8fafc', border: `2px solid ${vandaag ? '#F5850A' : binnenkort ? '#fde68a' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fa-solid fa-cake-candles" style={{ color: vandaag ? '#F5850A' : binnenkort ? '#d97706' : '#94a3b8', fontSize: '0.82rem' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.naam}</div>
                    <div style={{ fontSize: '0.72rem', color: vandaag ? '#F5850A' : '#64748b', fontWeight: vandaag ? 700 : 400 }}>
                      {vandaag ? '🎉 Vandaag!' : `over ${v.dagenTot} dag${v.dagenTot === 1 ? '' : 'en'}`}
                      {v.notitie ? ` — ${v.notitie}` : ''}
                    </div>
                  </div>
                  <button onClick={() => handleVjVerwijder(v.id)} title="Verwijderen"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '4px', fontSize: '0.82rem', flexShrink: 0 }}>
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        </div>{/* einde rechterkolom flex */}

      </div>{/* einde 3-kolom grid */}

    </div>
  );
}
