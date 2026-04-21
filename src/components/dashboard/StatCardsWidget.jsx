import React from 'react';

export default function StatCardsWidget({
  contractenCount,
  teOndertekenenCount,
  zzpersCount,
  verloopAlerts,
  teamUrenData,
  totalContractWaarde,
  getekendCount
}) {
  return (
    <>
      <style>{`
        @keyframes wave {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60%, 100% { transform: rotate(0deg); }
        }
        .stats-grid-premium {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 36px;
        }
        .stat-card-premium {
          position: relative;
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 20px;
          padding: 26px;
          overflow: hidden;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 1);
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .stat-card-premium:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 50px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 1);
        }
        .stat-bg-decoration {
          position: absolute;
          top: -40%;
          right: -20%;
          width: 150px;
          height: 150px;
          border-radius: 50%;
          filter: blur(40px);
          opacity: 0.15;
          pointer-events: none;
          z-index: 0;
        }
        .stat-icon-premium {
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          flex-shrink: 0;
          z-index: 1;
          box-shadow: 0 8px 16px rgba(0,0,0,0.06), inset 0 1px 2px rgba(255,255,255,0.4);
        }
        .stat-info-premium {
          position: relative;
          z-index: 1;
          flex: 1;
          min-width: 0;
        }
        .stat-info-premium h3 {
          font-family: 'Outfit', 'Inter', sans-serif;
          font-size: 2.2rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.1;
          margin-bottom: 2px;
          letter-spacing: -0.03em;
        }
        .stat-info-premium p {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .stat-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
      `}</style>
      
      <div className="stats-grid-premium">
        
        {/* Contracten Card */}
        <div className="stat-card-premium">
          <div className="stat-bg-decoration" style={{ background: '#25D366' }} />
          <div className="stat-icon-premium" style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)', color: '#fff' }}>
            <i className="fa-solid fa-file-signature"></i>
          </div>
          <div className="stat-info-premium">
            <p>Contracten</p>
            <h3>{contractenCount}</h3>
            {teOndertekenenCount > 0 ? (
              <div className="stat-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
                <i className="fa-solid fa-hourglass-half"></i> {teOndertekenenCount} te tekenen
              </div>
            ) : (
              <div className="stat-badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }}>
                <i className="fa-solid fa-check"></i> Alles getekend
              </div>
            )}
          </div>
        </div>

        {/* ZZP'ers Card */}
        <div className="stat-card-premium">
          <div className="stat-bg-decoration" style={{ background: '#F5850A' }} />
          <div className="stat-icon-premium" style={{ background: 'linear-gradient(135deg, #fca5a5, #ef4444)', color: '#fff' }}>
            <i className="fa-solid fa-helmet-safety"></i>
          </div>
          <div className="stat-info-premium">
            <p>ZZP'ers Actief</p>
            <h3>{zzpersCount}</h3>
            {verloopAlerts.length > 0 ? (
              <div className="stat-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}>
                <i className="fa-solid fa-triangle-exclamation"></i> {verloopAlerts.length} waarschuwingen
              </div>
            ) : (
              <div className="stat-badge" style={{ background: 'rgba(100, 116, 139, 0.1)', color: '#64748b' }}>
                <i className="fa-solid fa-shield-halved"></i> Documenten OK
              </div>
            )}
          </div>
        </div>

        {/* Team Uren Card */}
        <div className="stat-card-premium">
          <div className="stat-bg-decoration" style={{ background: '#3b82f6' }} />
          <div className="stat-icon-premium" style={{ background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', color: '#fff' }}>
            <i className="fa-solid fa-stopwatch"></i>
          </div>
          <div className="stat-info-premium">
            <p>Team Uren (Week)</p>
            <h3>
              {teamUrenData.reduce((s, u) => s + (u.data || []).reduce((ps, p) => ps + Object.values(p.types || {}).reduce((ts, hrs) => ts + (Array.isArray(hrs) ? hrs.reduce((a, h) => a + (parseFloat(h) || 0), 0) : 0), 0), 0), 0).toFixed(0)}u
            </h3>
            <div className="stat-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
              <i className="fa-solid fa-users"></i> {teamUrenData.length} actief
            </div>
          </div>
        </div>

        {/* Contractwaarde Card */}
        <div className="stat-card-premium">
          <div className="stat-bg-decoration" style={{ background: '#8b5cf6' }} />
          <div className="stat-icon-premium" style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', color: '#fff' }}>
            <i className="fa-solid fa-chart-line"></i>
          </div>
          <div className="stat-info-premium">
            <p>Contr. Waarde</p>
            <h3>€{totalContractWaarde > 0 ? (totalContractWaarde / 1000).toFixed(0) + 'k' : '—'}</h3>
            {getekendCount > 0 ? (
              <div className="stat-badge" style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>
                 <i className="fa-solid fa-signature"></i> {getekendCount} getekend
              </div>
            ) : (
              <div className="stat-badge" style={{ background: 'rgba(100, 116, 139, 0.1)', color: '#64748b' }}>
                 —
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
