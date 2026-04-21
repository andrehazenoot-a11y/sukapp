import React from 'react';

export default function WerkbonAlertsWidget({ openWerkbonAlert }) {
  if (!openWerkbonAlert || openWerkbonAlert.length === 0) return null;

  return (
    <div style={{ marginBottom: '16px', borderRadius: '12px', border: '2px solid #fca5a5', background: '#fff1f2', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', background: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <i className="fa-solid fa-file-circle-exclamation"></i>
        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Werkbonnen zonder uren (&gt; 7 dagen oud)</span>
        <span style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.15)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem' }}>
          {openWerkbonAlert.length} werkbon{openWerkbonAlert.length !== 1 ? 'nen' : ''}
        </span>
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {openWerkbonAlert.slice(0, 5).map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid #fca5a5' }}>
            <i className="fa-solid fa-file-pen" style={{ color: '#ef4444', fontSize: '0.75rem' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#b91c1c' }}>
              {b.naam || b.medewerkerNaam || 'Onbekend'} — {b.projectNaam || ''}
            </span>
          </div>
        ))}
        <a href="/werkbonnen" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', background: '#ef4444', color: '#fff', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none' }}>
          Bekijk werkbonnen →
        </a>
      </div>
    </div>
  );
}
