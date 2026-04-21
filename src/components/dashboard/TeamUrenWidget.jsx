import React from 'react';
import Link from 'next/link';

export default function TeamUrenWidget({ teamUrenData, week }) {
  if (!teamUrenData || teamUrenData.length === 0) return null;

  return (
    <>
      <style>{`
        .panel-premium-team {
          background: rgba(255, 255, 255, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 20px;
          padding: 24px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 1);
          margin-bottom: 24px;
        }
        .team-row-premium {
          padding: 14px 18px;
          margin-bottom: 10px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 2px 8px rgba(0,0,0,0.015);
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .team-row-premium:hover {
          transform: translateY(-2px) scale(1.01);
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 6px 16px rgba(0,0,0,0.04);
          border-color: rgba(255, 255, 255, 1);
        }
      `}</style>
      <div className="panel-premium-team" style={{ marginBottom: '16px' }}>
        <div className="panel-header-premium-alt" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '16px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', fontFamily: "'Outfit', 'Inter', sans-serif", color: '#0f172a', fontWeight: 700 }}>
            <div style={{ background: 'linear-gradient(135deg, #fcd34d, #f59e0b)', color: '#fff', width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.04)' }}>
              <i className="fa-solid fa-users" style={{ fontSize: '0.95rem' }} /> 
            </div>
            Team uren — week {week}
          </h2>
          <Link href="/urenregistratie?tab=team" style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(245, 133, 10, 0.08)', color: '#F5850A', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, transition: 'background 0.2s' }}>
            Team Overzicht <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px' }}></i>
          </Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {teamUrenData.map(u => {
            const totaal = (u.data || []).reduce((s, p) => s + Object.values(p.types || {}).reduce((ts, hrs) => ts + (Array.isArray(hrs) ? hrs.reduce((a, h) => a + (parseFloat(h) || 0), 0) : 0), 0), 0);
            const pct = Math.min((totaal / 37.5) * 100, 100);
            const barColor = pct >= 100 ? '#22c55e' : pct >= 60 ? '#F5850A' : '#ef4444';
            const statusCfg = { concept: { label: 'Concept', color: '#f59e0b' }, ingediend: { label: 'Ingediend', color: '#3b82f6' }, goedgekeurd: { label: 'Goedgekeurd', color: '#22c55e' } };
            const sc = statusCfg[u.status] || statusCfg.concept;
            return (
              <div key={u.medewerker_id} className="team-row-premium">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{u.medewerker_naam}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: barColor }}>{totaal}u</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: sc.color, background: `${sc.color}18`, padding: '2px 8px', borderRadius: '6px' }}>{sc.label}</span>
                  </div>
                </div>
                <div style={{ height: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: '99px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '99px', transition: 'width 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
