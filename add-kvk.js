const fs = require('fs');
const file = 'src/app/whatsapp/page.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add scanning overlay
content = content.replace(
    '<div className="content-area">',
    '<div className="content-area">\n            {isScanningKvk && (\n                <div style={{ position: \'fixed\', inset: 0, background: \'rgba(0,0,0,0.8)\', zIndex: 9999, display: \'flex\', flexDirection: \'column\', alignItems: \'center\', justifyContent: \'center\', color: \'#fff\' }}>\n                    <div className="spinner" style={{ width: \'50px\', height: \'50px\', border: \'4px solid rgba(255,255,255,0.3)\', borderTopColor: \'#25D366\', borderRadius: \'50%\', animation: \'spin 1s linear infinite\', marginBottom: \'20px\' }}></div>\n                    <h2 style={{ margin: 0, fontSize: \'1.2rem\', fontWeight: 700 }}>AI OCR Scanner actief...</h2>\n                    <p style={{ color: \'#cbd5e1\', fontSize: \'0.85rem\', marginTop: \'8px\' }}>We scannen het KVK-uittreksel op een afgiftedatum.</p>\n                    <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>\n                </div>\n            )}'
);

// 2. Add to newMw
content = content.replace(
    '                                                <div><label style={labelS}>CAV verloopdatum</label><input style={inputS} type="date" value={newMw.cavVerloopdatum} onChange={e => setNewMw({ ...newMw, cavVerloopdatum: e.target.value })} /></div>\n                                            </div>',
    `                                                <div><label style={labelS}>CAV verloopdatum</label><input style={inputS} type="date" value={newMw.cavVerloopdatum} onChange={e => setNewMw({ ...newMw, cavVerloopdatum: e.target.value })} /></div>
                                            </div>
                                            <div style={{ marginBottom: '8px' }}>
                                                <label style={labelS}>KVK Uittreksel (&lt; 3 mnd)</label>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <input style={{...inputS, flex: 1}} type="date" value={newMw.kvkVerloopdatum || ''} onChange={e => setNewMw({ ...newMw, kvkVerloopdatum: e.target.value })} />
                                                    <button onClick={() => triggerKvkScan(setNewMw, newMw)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s' }}>
                                                        <i className="fa-solid fa-camera"></i> Scan (AI)
                                                    </button>
                                                </div>
                                            </div>`
);

// 3. Add to editMwData
content = content.replace(
    '                                        <div><label style={labelS}>CAV verloopdatum</label><input style={inputS} type="date" value={editMwData.cavVerloopdatum || \'\'} onChange={e => setEditMwData({ ...editMwData, cavVerloopdatum: e.target.value })} /></div>\n                                    </div>',
    `                                        <div><label style={labelS}>CAV verloopdatum</label><input style={inputS} type="date" value={editMwData.cavVerloopdatum || ''} onChange={e => setEditMwData({ ...editMwData, cavVerloopdatum: e.target.value })} /></div>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={labelS}>KVK Uittreksel (&lt; 3 mnd)</label>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <input style={{...inputS, flex: 1}} type="date" value={editMwData.kvkVerloopdatum || ''} onChange={e => setEditMwData({ ...editMwData, kvkVerloopdatum: e.target.value })} />
                                            <button onClick={() => triggerKvkScan(setEditMwData, editMwData)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s' }}>
                                                <i className="fa-solid fa-camera"></i> Scan (AI)
                                            </button>
                                        </div>
                                    </div>`
);

// 4. Add to alerts array
content = content.replace(
    "{ label: 'CAV verzekering', st: expiryCheck(mw.cavVerloopdatum), datum: mw.cavVerloopdatum, days: daysRemaining(mw.cavVerloopdatum) },",
    "{ label: 'CAV verzekering', st: expiryCheck(mw.cavVerloopdatum), datum: mw.cavVerloopdatum, days: daysRemaining(mw.cavVerloopdatum) },\n                                        { label: 'KVK Uittreksel (< 3mnd)', st: expiryCheck(mw.kvkVerloopdatum), datum: mw.kvkVerloopdatum, days: daysRemaining(mw.kvkVerloopdatum) },"
);

fs.writeFileSync(file, content);
