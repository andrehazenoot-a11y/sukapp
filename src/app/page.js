'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { useLanguage } from '../components/LanguageContext';

export default function Home() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const currentUser = user?.name || 'Jan Modaal';
  const [meldingen, setMeldingen] = useState([]);

  useEffect(() => {
    const load = () => {
      const data = JSON.parse(localStorage.getItem('schildersapp_meldingen') || '[]');
      setMeldingen(data);
    };
    load();
    const interval = setInterval(load, 3000); // refresh elke 3 sec
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

  return (
    <div className="content-area" id="view-dashboard">
      <div className="page-header">
        <h1>{t('dashboard.welcomeBack')}, {currentUser.split(' ')[0]}.</h1>
        <p>{t('dashboard.overview')}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(250, 160, 82, 0.1)', color: 'var(--accent)' }}>
            <i className="fa-solid fa-person-digging"></i>
          </div>
          <div className="stat-info">
            <h3>14</h3>
            <p>{t('dashboard.menOnJob')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(50, 55, 60, 0.1)', color: 'var(--dark)' }}>
            <i className="fa-solid fa-screwdriver-wrench"></i>
          </div>
          <div className="stat-info">
            <h3>2</h3>
            <p>{t('dashboard.inspectionsExpired')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 114, 0, 0.1)', color: 'var(--accent-deep)' }}>
            <i className="fa-solid fa-file-signature"></i>
          </div>
          <div className="stat-info">
            <h3>1</h3>
            <p>{t('dashboard.newZzpContract')}</p>
          </div>
        </div>
      </div>

      {/* Gereedschap Aanvragen Meldingen */}
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
        <div className="panel quick-actions">
          <div className="panel-header">
            <h2>{t('dashboard.quickActions')}</h2>
          </div>
          <div className="action-buttons">
            <button className="btn btn-primary"><i className="fa-solid fa-plus"></i> {t('dashboard.registerHours')}</button>
            <button className="btn btn-secondary"><i className="fa-solid fa-camera"></i> {t('dashboard.projectPhoto')}</button>
          </div>
        </div>

        <div className="panel notifications">
          <div className="panel-header">
            <h2>{t('dashboard.recentActivity')}</h2>
          </div>
          <ul className="activity-list">
            <li className="activity-item unread">
              <div className="activity-icon"><i className="fa-solid fa-comment-dots"></i></div>
              <div className="activity-details">
                <p><strong>Piet</strong> plaatste een foto in <em>Project: Nieuwbouw Villa Wassenaar</em></p>
                <span>10 min geleden</span>
              </div>
            </li>
            <li className="activity-item">
              <div className="activity-icon warning"><i className="fa-solid fa-triangle-exclamation"></i></div>
              <div className="activity-details">
                <p><strong>Festool Stofzuiger (ID: #312)</strong> keuring is verlopen.</p>
                <span>2 uur geleden</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
