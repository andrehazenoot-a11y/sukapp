import React from 'react';
import Link from 'next/link';

export default function RecenteActiviteitWidget({ recenteUren, t }) {
  return (
    <>
      <style>{`
        .panel-premium-alt {
          background: rgba(255, 255, 255, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 20px;
          padding: 24px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 1);
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .panel-header-premium-alt {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(0,0,0,0.04);
          padding-bottom: 16px;
        }
        .panel-header-premium-alt h2 {
          font-family: 'Outfit', 'Inter', sans-serif;
          font-size: 1.25rem;
          color: #0f172a;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
        }
        .activity-list-premium {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .activity-item-premium {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 18px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 2px 10px rgba(0,0,0,0.015);
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .activity-item-premium:hover {
          transform: translateY(-2px) scale(1.01);
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 6px 20px rgba(0,0,0,0.04);
          border-color: rgba(255, 255, 255, 1);
        }
        .activity-icon-premium {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 8px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.7);
        }
        .activity-details-premium {
          flex: 1;
        }
        .activity-details-premium p {
          margin: 0 0 2px 0;
          font-size: 0.9rem;
          color: #1e293b;
        }
        .activity-details-premium span.time {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 500;
        }
        .status-badge {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 8px;
          border-radius: 6px;
          margin-left: 8px;
        }
      `}</style>
      <div className="panel-premium-alt notifications">
        <div className="panel-header-premium-alt">
          <h2>
            <div style={{ background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', color: '#fff', width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.04)' }}>
              <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '0.95rem' }}></i>
            </div>
            {t('dashboard.recentActivity')}
          </h2>
          <Link href="/urenregistratie" style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, transition: 'background 0.2s' }}>
            Alle uren <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px' }}></i>
          </Link>
        </div>
        {recenteUren.length === 0 ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            <i className="fa-solid fa-business-time" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px', color: '#cbd5e1', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.05))' }}></i>
            Nog geen urenregistraties.
          </div>
        ) : (
          <div className="activity-list-premium">
            {recenteUren.map(u => {
              const totaal = (u.data || []).reduce((s, p) => s + Object.values(p.types || {}).reduce((ts, hrs) => ts + (Array.isArray(hrs) ? hrs.reduce((a, h) => a + (parseFloat(h) || 0), 0) : 0), 0), 0);
              const isApproved = u.status === 'goedgekeurd';
              const isSubmitted = u.status === 'ingediend';
              const statusColor = isApproved ? '#16a34a' : isSubmitted ? '#3b82f6' : '#f59e0b';
              const statusBg = isApproved ? '#dcfce7' : isSubmitted ? '#dbeafe' : '#fef3c7';
              const diff = Math.floor((Date.now() - new Date(u.bijgewerkt_op)) / 60000);
              const tijdGeleden = diff < 1 ? 'zojuist' : diff < 60 ? `${diff} min geleden` : diff < 1440 ? `${Math.floor(diff/60)} uur geleden` : `${Math.floor(diff/1440)} dagen geleden`;
              
              return (
                <div key={`${u.medewerker_id}-${u.week}`} className="activity-item-premium">
                  <div className="activity-icon-premium" style={{ background: `linear-gradient(135deg, ${statusBg}, #ffffff)` }}>
                    <i className="fa-solid fa-user-clock" style={{ fontSize: '1.1rem', color: statusColor }}></i>
                  </div>
                  <div className="activity-details-premium">
                    <p>
                      <strong style={{ color: '#0f172a', fontWeight: 700 }}>{u.medewerker_naam}</strong>
                      <span style={{ color: '#64748b', margin: '0 6px' }}>—</span>
                      <strong style={{ color: statusColor }}>{totaal}u</strong> in week {u.week}
                      <span className="status-badge" style={{ background: statusBg, color: statusColor }}>{u.status}</span>
                    </p>
                    <span className="time"><i className="fa-regular fa-clock" style={{ marginRight: '4px' }}></i>{tijdGeleden}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
