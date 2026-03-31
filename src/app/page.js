'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { useLanguage } from '../components/LanguageContext';
import Link from 'next/link';
import TestDataGenerator from '../components/TestDataGenerator';

export default function Home() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const currentUser = user?.name || 'Jan Modaal';
  const [meldingen, setMeldingen] = useState([]);

  // Live stats uit localStorage
  const [stats, setStats] = useState({
    contracten: [], medewerkers: [], urenLog: [], projecten: []
  });

  useEffect(() => {
    const load = () => {
      const data = JSON.parse(localStorage.getItem('schildersapp_meldingen') || '[]');
      setMeldingen(data);

      // Load WhatsApp / contract data
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

  // Berekende statistieken
  const zzpers = stats.medewerkers.filter(m => m.type === 'zzp');
  const actiefContracten = stats.contracten.filter(c => c.status !== 'beeindigd' && c.kanbanStatus !== 'Afgeronde modelovereenkomsten');
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
    .slice(0, 5);

  return (
    <div className="content-area" id="view-dashboard">
      <div className="page-header">
        <h1>{t('dashboard.welcomeBack')}, {currentUser.split(' ')[0]}.
          <span style={{ fontSize: '0.5em', fontWeight: 400, color: '#94a3b8', marginLeft: '12px' }}>
            {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </h1>
        <p>{t('dashboard.overview')}</p>
      </div>

      <TestDataGenerator />

      {/* === STAT KAARTEN === */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(37,211,102,0.1)', color: '#25D366' }}>
            <i className="fa-solid fa-file-contract"></i>
          </div>
          <div className="stat-info">
            <h3>{stats.contracten.length}</h3>
            <p>Contracten totaal</p>
            {teOndertekenen.length > 0 && (
              <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700 }}>
                ⏳ {teOndertekenen.length} wacht op handtekening
              </span>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(250, 160, 82, 0.1)', color: 'var(--accent)' }}>
            <i className="fa-solid fa-person-digging"></i>
          </div>
          <div className="stat-info">
            <h3>{zzpers.length}</h3>
            <p>ZZP'ers actief</p>
            {verloopAlerts.length > 0 && (
              <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700 }}>
                ⚠️ {verloopAlerts.filter(a => a.verlopen).length} verlopen / {verloopAlerts.filter(a => !a.verlopen).length} bijna
              </span>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
            <i className="fa-solid fa-clock"></i>
          </div>
          <div className="stat-info">
            <h3>{totalUren.toFixed(0)}</h3>
            <p>Uren geregistreerd</p>
            <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
              {stats.urenLog.length} registraties
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
            <i className="fa-solid fa-euro-sign"></i>
          </div>
          <div className="stat-info">
            <h3>€ {totalContractWaarde > 0 ? (totalContractWaarde / 1000).toFixed(0) + 'k' : '—'}</h3>
            <p>Totale contractwaarde</p>
            {getekend.length > 0 && (
              <span style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 700 }}>
                ✅ {getekend.length} getekend
              </span>
            )}
          </div>
        </div>
      </div>

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

      <div className="dashboard-panels">

        {/* Contracten overzicht */}
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

        {/* Recente activiteit */}
        <div className="panel notifications">
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
            <ul className="activity-list">
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

      </div>

      {/* === SNELLE ACTIES === */}
      <div className="panel quick-actions" style={{ marginTop: '16px' }}>
        <div className="panel-header">
          <h2>{t('dashboard.quickActions')}</h2>
        </div>
        <div className="action-buttons" style={{ flexWrap: 'wrap' }}>
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
        </div>
      </div>
    </div>
  );
}
