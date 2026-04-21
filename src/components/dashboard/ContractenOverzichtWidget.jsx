import React from 'react';
import Link from 'next/link';

export default function ContractenOverzichtWidget({ contracten, teOndertekenen, getekend }) {
  return (
    <>
      <style>{`
        .panel-premium {
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
        .panel-header-premium {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(0,0,0,0.04);
          padding-bottom: 16px;
        }
        .panel-header-premium h2 {
          font-family: 'Outfit', 'Inter', sans-serif;
          font-size: 1.25rem;
          color: #0f172a;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
        }
        .contract-list-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 18px;
          border-radius: 16px;
          margin-bottom: 10px;
          background: rgba(255, 255, 255, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 2px 10px rgba(0,0,0,0.015);
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          cursor: pointer;
        }
        .contract-list-item:hover {
          transform: translateX(6px) scale(1.01);
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 6px 20px rgba(0,0,0,0.04);
          border-color: rgba(255, 255, 255, 1);
        }
        .contract-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.95rem;
          flex-shrink: 0;
          box-shadow: 0 4px 8px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.7);
        }
      `}</style>

      <div className="panel-premium">
        <div className="panel-header-premium">
          <h2>
            <div className="contract-icon-box" style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)', color: '#fff', width: '34px', height: '34px', borderRadius: '10px' }}>
              <i className="fa-solid fa-file-signature"></i>
            </div>
            Contracten
          </h2>
          <Link href="/whatsapp?tab=overzicht_contract" style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(245, 133, 10, 0.08)', color: '#F5850A', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, transition: 'background 0.2s' }}>
            Toon alles <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px' }}></i>
          </Link>
        </div>
        
        {contracten.length === 0 ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            <i className="fa-solid fa-file-circle-plus" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px', color: '#cbd5e1', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.05))' }}></i>
            Geen documenten in afwachting.<br /><br />
            <Link href="/whatsapp?tab=nieuw_contract" style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #25D366, #1fad55)', color: 'white', borderRadius: '10px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(37,211,102,0.2)' }}>
              <i className="fa-solid fa-plus"></i> Nieuw Contract
            </Link>
          </div>
        ) : (
          <div style={{ paddingBottom: '4px' }}>
            {[
              { label: 'Te ondertekenen', count: teOndertekenen.length, color: '#f59e0b', bgStart: '#fcd34d', bgEnd: '#f59e0b', icon: 'fa-pen-nib' },
              { label: 'Lopend (actief)', count: contracten.filter(c => c.kanbanStatus === 'Lopende modelovereenkomsten').length, color: '#3b82f6', bgStart: '#93c5fd', bgEnd: '#3b82f6', icon: 'fa-spinner' },
              { label: 'Volledig ondertekend', count: getekend.length, color: '#22c55e', bgStart: '#86efac', bgEnd: '#22c55e', icon: 'fa-check-circle' },
              { label: 'Afgeronde dossiers', count: contracten.filter(c => c.kanbanStatus === 'Afgeronde modelovereenkomsten').length, color: '#64748b', bgStart: '#cbd5e1', bgEnd: '#94a3b8', icon: 'fa-archive' },
            ].map(s => (
              <div key={s.label} className="contract-list-item">
                <div className="contract-icon-box" style={{ background: `linear-gradient(135deg, ${s.bgStart}, ${s.bgEnd})`, color: 'white' }}>
                  <i className={`fa-solid ${s.icon}`}></i>
                </div>
                <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{s.label}</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: s.color, background: 'rgba(255,255,255,0.8)', padding: '2px 10px', borderRadius: '8px', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
                  {s.count}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
