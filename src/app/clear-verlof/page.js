'use client';
import { useEffect, useState } from 'react';

export default function ClearVerlof() {
    const [done, setDone] = useState(false);
    const [removed, setRemoved] = useState([]);

    function clearAlles() {
        const log = [];

        // Wis alle vakantie-sleutels van Jan Modaal
        Object.keys(localStorage)
            .filter(k => k.includes('Jan_Modaal') || k.includes('Jan Modaal') || k.match(/schildersapp_vakantie_\d{4}$/))
            .forEach(k => { localStorage.removeItem(k); log.push(k); });

        // Wis verloflijsten waar Jan Modaal in staat
        Object.keys(localStorage)
            .filter(k => k.startsWith('schildersapp_verlof_'))
            .forEach(k => {
                try {
                    const list = JSON.parse(localStorage.getItem(k) || '[]');
                    const schoon = list.filter(v => v.naam !== 'Jan Modaal');
                    localStorage.setItem(k, JSON.stringify(schoon));
                    if (schoon.length !== list.length) log.push('verlof: ' + k);
                } catch {}
            });

        // Wis uren_registraties entries voor Jan Modaal
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            if (raw) {
                const all = JSON.parse(raw);
                const schoon = all.filter(e => e.userName !== 'Jan Modaal' && String(e.userId) !== '1');
                localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(schoon));
                if (schoon.length !== all.length) log.push(`uren_registraties: ${all.length - schoon.length} entries gewist`);
            }
        } catch {}

        // Wis alle urv2-sleutels voor Jan Modaal (userId=1)
        Object.keys(localStorage)
            .filter(k => k.startsWith('schildersapp_urv2_u1_') || k.startsWith('schildersapp_uren_sync_1'))
            .forEach(k => { localStorage.removeItem(k); log.push('urv2: ' + k); });

        setRemoved(log);
        setDone(true);
    }

    return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
            <h2>Testdata Jan Modaal wissen</h2>
            {!done ? (
                <button onClick={clearAlles} style={{
                    padding: '12px 24px', background: '#ef4444', color: '#fff',
                    border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer'
                }}>
                    Alles wissen
                </button>
            ) : (
                <div>
                    <p style={{ color: '#16a34a', fontWeight: 700 }}>✓ Klaar! {removed.length} sleutels gewist.</p>
                    <ul>{removed.map((k, i) => <li key={i} style={{ fontSize: '0.85rem', color: '#64748b' }}>{k}</li>)}</ul>
                    <a href="/medewerker/mijn-suk" style={{ display: 'inline-block', marginTop: '16px', padding: '10px 20px', background: '#F5850A', color: '#fff', borderRadius: '8px', textDecoration: 'none' }}>
                        Terug naar Mijn Suk
                    </a>
                </div>
            )}
        </div>
    );
}
