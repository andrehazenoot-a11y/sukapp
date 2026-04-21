import React from 'react';
import Link from 'next/link';

export default function VerloopAlertsWidget({ verloopAlerts }) {
  if (!verloopAlerts || verloopAlerts.length === 0) return null;

  return (
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
  );
}
