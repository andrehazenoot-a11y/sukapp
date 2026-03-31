const fs = require('fs');
const file = 'src/app/projecten/[id]/page.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    "phone: project.phone || '', email: project.email || '',",
    "clientType: project.clientType || 'zakelijk', phone: project.phone || '', email: project.email || '',"
);

// Wrap display mode in grid + add filter
content = content.replace(
    /\]\.map\(\(row, i\) => \(\r?\n\s*<div key=\{i\} style=\{\{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px', paddingBottom: '10px', borderBottom: i !== 12 \? '1px solid #f8fafc' : 'none' \}\}/,
    "].filter(f => project.clientType !== 'particulier' || !['Bedrijfsnaam', 'Contactpersoon', 'KVK Nummer', 'BTW Nummer'].includes(f.label)).map((row, i, arr) => (\n                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px', paddingBottom: '10px', borderBottom: i !== arr.length - 1 ? '1px solid #f8fafc' : 'none' }}"
);
content = content.replace(
    "{!editingClient && (\n                            [",
    "{!editingClient && (\n                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>\n                            ["
);

content = content.replace(
    /(<div style=\{\{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 500 \}\}>\{row.value\}<\/div>\r?\n\s*<\/div>\r?\n\s*<\/div>\r?\n\s*\)\)\r?\n\s*)\)}/,
    "$1</div>\n                        )}"
);

// Edit form map wrapper and buttons
content = content.replace(
    "{editingClient && (\n                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>\n                                {[",
    "{editingClient && (\n                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>\n                                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>\n                                    <button onClick={() => setEditForm(p => ({ ...p, clientType: 'particulier' }))}\n                                        style={{ flex: 1, padding: '7px', border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', background: editForm.clientType === 'particulier' ? '#fff' : 'transparent', color: editForm.clientType === 'particulier' ? '#F5850A' : '#64748b', boxShadow: editForm.clientType === 'particulier' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>\n                                        <i className=\"fa-solid fa-user\" style={{ marginRight: '6px' }} /> Particulier\n                                    </button>\n                                    <button onClick={() => setEditForm(p => ({ ...p, clientType: 'zakelijk' }))}\n                                        style={{ flex: 1, padding: '7px', border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', background: editForm.clientType !== 'particulier' ? '#fff' : 'transparent', color: editForm.clientType !== 'particulier' ? '#F5850A' : '#64748b', boxShadow: editForm.clientType !== 'particulier' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>\n                                        <i className=\"fa-solid fa-building\" style={{ marginRight: '6px' }} /> Zakelijk\n                                    </button>\n                                </div>\n                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>\n                                {["
);

content = content.replace(
    /\]\.map\(\(\{ field, label, icon, type \}\) => \(\r?\n\s*<div key=\{field\} style=\{\{ display: 'flex', alignItems: 'center', gap: '10px' \}\}/,
    "].filter(f => editForm.clientType !== 'particulier' || !['bedrijfsnaam', 'contactpersoon', 'kvk', 'btw'].includes(f.field)).map(({ field, label, icon, type }) => (\n                                    <div key={field} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}"
);

content = content.replace(
    /(<input type=\{type\} value=\{editForm\[field\] \|\| ''\}\r?\n[\s\S]*?onBlur=\{e => e.target.style.borderColor = '#e2e8f0'\}\r?\n\s*\/>\r?\n\s*<\/div>\r?\n\s*<\/div>\r?\n\s*\)\)}\r?\n\s*)<\/div>/,
    "$1</div>\n                            </div>"
);

fs.writeFileSync(file, content);
