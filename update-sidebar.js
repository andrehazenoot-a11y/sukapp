const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.jsx', 'utf8');

// 1. Add state variables for notifications
content = content.replace(
    "const [ongelezen, setOngelezen] = useState(0);",
    "const [ongelezen, setOngelezen] = useState(0);\n    const [notifOpen, setNotifOpen] = useState(false);\n    const [alleMeldingen, setAlleMeldingen] = useState([]);\n    const notifRef = useRef(null);"
);

// 2. Add handleClickOutside for notifRef
content = content.replace(
    "if (langRef.current && !langRef.current.contains(event.target)) setTopLangOpen(false);",
    "if (langRef.current && !langRef.current.contains(event.target)) setTopLangOpen(false);\n            if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);"
);

// 3. Replace useEffect logic for polling and KVK generating
content = content.replace(
    `    useEffect(() => {
        const laadOngelezen = () => {
            try {
                const meldingen = JSON.parse(localStorage.getItem('schildersapp_meldingen') || '[]');
                const naam = user?.name || '';
                const count = meldingen.filter(m => m.aan === naam && !m.gelezen).length;
                setOngelezen(count);
            } catch {}
        };
        laadOngelezen();
        const interval = setInterval(laadOngelezen, 5000);
        return () => clearInterval(interval);
    }, [user?.name]);`,
    `    useEffect(() => {
        const checkKvkExpirations = () => {
            if (user?.role !== 'Beheerder') return;
            try {
                const mws = JSON.parse(localStorage.getItem('wa_medewerkers') || '[]');
                let meldingen = JSON.parse(localStorage.getItem('schildersapp_meldingen') || '[]');
                let changed = false;
                
                mws.filter(m => m.type === 'zzp' && m.kvkVerloopdatum).forEach(mw => {
                    const d = Math.ceil((new Date(mw.kvkVerloopdatum) - new Date()) / (1000 * 60 * 60 * 24));
                    if (d < 90) {
                        const statusTekst = d < 0 ? 'is verlopen!' : \`verloopt over \${d} dagen.\`;
                        const msg = \`⚠️ KVK Uittreksel van ZZP'er \${mw.naam} \${statusTekst}\`;
                        
                        const alreadyAlerted = meldingen.some(m => m.tekst === msg && m.aan === user.name);
                        if (!alreadyAlerted) {
                            meldingen.push({ 
                                id: String(Date.now() + Math.random()), 
                                aan: user.name, 
                                tekst: msg, 
                                datum: new Date().toISOString(), 
                                type: 'waarschuwing', 
                                gelezen: false 
                            });
                            changed = true;
                        }
                    }
                });
                if (changed) {
                    localStorage.setItem('schildersapp_meldingen', JSON.stringify(meldingen));
                }
            } catch (e) { console.error(e) }
        };

        const laadOngelezen = () => {
            checkKvkExpirations();
            try {
                const meldingen = JSON.parse(localStorage.getItem('schildersapp_meldingen') || '[]');
                const naam = user?.name || '';
                const myMeldingen = meldingen.filter(m => m.aan === naam);
                const count = myMeldingen.filter(m => !m.gelezen).length;
                setOngelezen(count);
                setAlleMeldingen(myMeldingen.sort((a,b) => new Date(b.datum) - new Date(a.datum)));
            } catch {}
        };
        laadOngelezen();
        const interval = setInterval(laadOngelezen, 5000);
        return () => clearInterval(interval);
    }, [user?.name, user?.role]);`
);

// 4. Update the notification bell UI to click and show a dropdown
const oldBellObj = `<button style={{
                    background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem',
                    cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '36px', height: '36px', borderRadius: '8px'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                    <i className="fa-regular fa-bell"></i>
                    {ongelezen > 0 && (
                        <span style={{
                            position: 'absolute', top: '2px', right: '2px', background: '#EF4444', color: '#fff',
                            fontSize: '0.55rem', fontWeight: 800, width: '16px', height: '16px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #F5850A'
                        }}>{ongelezen > 9 ? '9+' : ongelezen}</span>
                    )}
                </button>`;

const newBellObj = `<div ref={notifRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <button style={{
                        background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem',
                        cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '36px', height: '36px', borderRadius: '8px'
                    }}
                    onClick={() => setNotifOpen(!notifOpen)}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <i className="fa-regular fa-bell"></i>
                        {ongelezen > 0 && (
                            <span style={{
                                position: 'absolute', top: '2px', right: '2px', background: '#EF4444', color: '#fff',
                                fontSize: '0.55rem', fontWeight: 800, width: '16px', height: '16px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #F5850A'
                            }}>{ongelezen > 9 ? '9+' : ongelezen}</span>
                        )}
                    </button>
                    {notifOpen && (
                        <div style={{
                            position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                            background: '#fff', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: '12px',
                            zIndex: 102, minWidth: '320px', maxWidth: '350px', maxHeight: '400px', overflowY: 'auto'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>Meldingen</h3>
                                {ongelezen > 0 && (
                                    <button onClick={() => {
                                        let m = JSON.parse(localStorage.getItem('schildersapp_meldingen') || '[]');
                                        m = m.map(x => x.aan === user?.name ? { ...x, gelezen: true } : x);
                                        localStorage.setItem('schildersapp_meldingen', JSON.stringify(m));
                                    }} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Markeer alles gelezen</button>
                                )}
                            </div>
                            {alleMeldingen.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                    <i className="fa-regular fa-circle-check" style={{ fontSize: '1.5rem', marginBottom: '8px', opacity: 0.5, display: 'block' }}></i>
                                    Geen nieuwe meldingen
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {alleMeldingen.map(notif => (
                                        <div key={notif.id} style={{
                                            padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem',
                                            background: notif.gelezen ? '#f8fafc' : 'rgba(245,133,10,0.08)',
                                            borderLeft: notif.gelezen ? '3px solid transparent' : '3px solid #F5850A',
                                            color: '#334155', display: 'flex', gap: '8px', alignItems: 'flex-start'
                                        }}>
                                            <div style={{ flex: 1 }}>{notif.tekst}</div>
                                            {!notif.gelezen && (
                                                <button onClick={() => {
                                                    let m = JSON.parse(localStorage.getItem('schildersapp_meldingen') || '[]');
                                                    m = m.map(x => x.id === notif.id ? { ...x, gelezen: true } : x);
                                                    localStorage.setItem('schildersapp_meldingen', JSON.stringify(m));
                                                }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }} title="Markeer als gelezen">
                                                    <i className="fa-solid fa-check"></i>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>`;

content = content.replace(oldBellObj, newBellObj);
fs.writeFileSync('src/components/Sidebar.jsx', content);
