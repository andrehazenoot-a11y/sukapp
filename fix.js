const fs = require('fs');
const file = 'src/app/projecten/[id]/page.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    "{ field: 'client', label: 'Naam opdrachtgever'",
    "{ field: 'projectnummer', label: 'Projectnummer', icon: 'fa-hashtag', type: 'text' },\n                                    { field: 'client', label: 'Opdrachtgever (Naam)'"
);

content = content.replace(
    "{ field: 'address', label: 'Adres',",
    "{ field: 'bedrijfsnaam', label: 'Bedrijfsnaam', icon: 'fa-building', type: 'text' },\n                                    { field: 'contactpersoon', label: 'Contactpersoon', icon: 'fa-address-card', type: 'text' },\n                                    { field: 'werkAdres', label: 'Werkadres', icon: 'fa-location-dot', type: 'text' },\n                                    { field: 'kvk', label: 'KVK Nummer', icon: 'fa-id-card', type: 'text' },\n                                    { field: 'btw', label: 'BTW Nummer', icon: 'fa-file-invoice-dollar', type: 'text' },\n                                    { field: 'address', label: 'Factuuradres',"
);

// Nu ook het overzicht (2668-2680)
// rename Klantgegevens naar Klant- & Bedrijfsgegevens
content = content.replace(
    "<i className=\"fa-solid fa-user-tie\" style={{ color: '#F5850A' }} /> Klantgegevens",
    "<i className=\"fa-solid fa-user-tie\" style={{ color: '#F5850A' }} /> Klant- & Bedrijfsgegevens"
);

// Map of non-editing display variables
content = content.replace(
    "{ icon: 'fa-user', label: 'Naam', value: project.client },",
    "{ icon: 'fa-hashtag', label: 'Projectnummer', value: project.projectnummer || '—' },\n                                { icon: 'fa-user', label: 'Opdrachtgever', value: project.client },\n                                { icon: 'fa-building', label: 'Bedrijfsnaam', value: project.bedrijfsnaam || '—' },\n                                { icon: 'fa-address-card', label: 'Contactpersoon', value: project.contactpersoon || '—' },"
);

content = content.replace(
    "{ icon: 'fa-location-dot', label: 'Adres', value: project.address },",
    "{ icon: 'fa-map-location-dot', label: 'Factuuradres', value: project.address || '—' },\n                                { icon: 'fa-location-dot', label: 'Werkadres', value: project.werkAdres || '—' },\n                                { icon: 'fa-id-card', label: 'KVK Nummer', value: project.kvk || '—' },\n                                { icon: 'fa-file-invoice-dollar', label: 'BTW Nummer', value: project.btw || '—' },"
);

// In editForm, ensure the initial state contains the new keys
content = content.replace(
    "phone: project.phone || '', email: project.email || '',",
    "phone: project.phone || '', email: project.email || '', projectnummer: project.projectnummer || '', bedrijfsnaam: project.bedrijfsnaam || '', contactpersoon: project.contactpersoon || '', werkAdres: project.werkAdres || '', kvk: project.kvk || '', btw: project.btw || '',"
);

fs.writeFileSync(file, content);
