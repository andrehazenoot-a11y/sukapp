'use client';

import { createContext, useContext, useState, useEffect } from 'react';

// == Pagina definities ==
export const ALL_PAGES = [
    { id: 'dashboard', name: 'Dashboard', path: '/', icon: 'fa-house' },
    {
        id: 'urenregistratie', name: 'Urenregistratie', path: '/urenregistratie', icon: 'fa-user-clock', subs: [
            { id: 'urenregistratie.mijn', name: 'Mijn Uren', icon: 'fa-pen-to-square' },
            { id: 'urenregistratie.team', name: 'Team Overzicht', icon: 'fa-users' },
        ]
    },

    {
        id: 'verlof', name: 'Verlof', path: '/uren?tab=verlof', icon: 'fa-umbrella-beach', subs: [
            { id: 'verlof.aanvragen', name: 'Verlof aanvragen', icon: 'fa-calendar-check' },
            { id: 'verlof.planner', name: 'Personeelsplanner', icon: 'fa-users' },
        ]
    },
    {
        id: 'profiel', name: 'Team', path: '/profiel', icon: 'fa-users', subs: [
            { id: 'profiel.werknemer', name: 'Werknemer profiel', icon: 'fa-user-tie' },
            { id: 'profiel.zzp', name: 'ZZP profiel', icon: 'fa-file-contract' },
        ]
    },
    {
        id: 'materiaal', name: 'Materiaalzoeker', path: '/materiaal', icon: 'fa-box-open', subs: []
    },
    {
        id: 'materieel', name: 'Materieel (3140)', path: '/materieel', icon: 'fa-toolbox', subs: [
            { id: 'materieel.overzicht', name: 'Overzicht', icon: 'fa-list' },
            { id: 'materieel.toevoegen', name: 'Toevoegen / Bewerken', icon: 'fa-plus' },
        ]
    },
    {
        id: 'verfvoorraad', name: 'Verfvoorraad', path: '/verfvoorraad', icon: 'fa-fill-drip', subs: [
            { id: 'verfvoorraad.voorraad', name: 'Voorraad', icon: 'fa-warehouse' },
            { id: 'verfvoorraad.scan', name: 'Scan & Herken', icon: 'fa-camera' },
        ]
    },

    {
        id: 'projecten', name: 'Projecten (Woub)', path: '/projecten', icon: 'fa-folder-tree', subs: [
            { id: 'projecten.overzicht', name: 'Overzicht', icon: 'fa-list-check' },
            { id: 'projecten.planning', name: 'Planning', icon: 'fa-calendar-days' },
        ]
    },
    {
        id: 'whatsapp', name: 'WhatsApp Business', path: '/whatsapp', icon: 'fa-brands fa-whatsapp', subs: [
            { id: 'whatsapp.uren', name: 'Urenregistratie', icon: 'fa-clock' },
            { id: 'whatsapp.contracten', name: 'Contracten', icon: 'fa-file-signature' },
            { id: 'whatsapp.termijnen', name: 'Termijnen', icon: 'fa-chart-bar' },
        ]
    },
    { id: 'toolbox', name: 'Toolbox Meeting', path: '/toolbox', icon: 'fa-screwdriver-wrench' },
    // { id: 'onboarding', name: 'Intake Generator', path: '/onboarding', icon: 'fa-wand-magic-sparkles' },
];

// == Fallback gebruikers — alleen voor offline gebruik, login gaat via /api/auth/validate ==
const USERS = [
    { id: 1, username: 'admin',    password: 'admin123',   name: 'Jan Modaal',    role: 'Beheerder', initials: 'JM', phone: '31612345678' },
    { id: 2, username: 'schilder', password: 'verf2025',   name: 'Piet Kwast',    role: 'Schilder',  initials: 'PK', phone: '31687654321' },
    { id: 3, username: 'zzp',      password: 'zzp2025',    name: 'Klaas Roller',  role: "ZZP'er",    initials: 'KR', phone: '31698765432' },
    { id: 4, username: 'voorman',  password: 'voorman123', name: 'Henk de Vries', role: 'Voorman',   initials: 'HV', phone: '31676543210' },
];

// Standaard rechten per gebruiker (alle pagina-ids)
const DEFAULT_PERMISSIONS = {
    1: ['dashboard', 'urenregistratie', 'urenregistratie.mijn', 'urenregistratie.team', 'uren', 'uren.registratie', 'uren.verlof', 'materiaal', 'materieel', 'materieel.overzicht', 'materieel.toevoegen', 'verfvoorraad', 'verfvoorraad.voorraad', 'verfvoorraad.scan', 'zzp', 'zzp.facturen', 'zzp.documenten', 'projecten', 'projecten.overzicht', 'projecten.planning', 'whatsapp', 'whatsapp.uren', 'whatsapp.contracten', 'whatsapp.termijnen'],
    2: ['dashboard', 'urenregistratie', 'urenregistratie.mijn', 'uren', 'uren.registratie', 'uren.verlof', 'materieel', 'materieel.overzicht', 'verfvoorraad', 'verfvoorraad.voorraad', 'verfvoorraad.scan', 'profiel', 'profiel.werknemer', 'projecten', 'projecten.overzicht', 'projecten.planning'],
    3: ['dashboard', 'zzp', 'zzp.facturen', 'zzp.documenten'],
    4: ['dashboard', 'urenregistratie', 'urenregistratie.mijn', 'uren', 'uren.registratie', 'uren.verlof', 'materieel', 'materieel.overzicht', 'materieel.toevoegen', 'verfvoorraad', 'verfvoorraad.voorraad', 'verfvoorraad.scan', 'projecten', 'projecten.overzicht', 'projecten.planning'],
};

const AuthContext = createContext(null);

// Zet sessie-cookie synchronisch bij eerste client-render (vóór alle useEffects)
let _cookieInit = false;
function initSessionCookie() {
    if (typeof window === 'undefined' || _cookieInit) return;
    _cookieInit = true;
    try {
        if (document.cookie.includes('schildersapp_session=')) return;
        const stored = localStorage.getItem('schildersapp_user');
        if (!stored) return;
        const parsed = JSON.parse(stored);
        // Accepteer elke geserialiseerde user — validatie gebeurt server-side via API
        if (!parsed.id || !parsed.username) return;
        const validUser = parsed;
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `schildersapp_session=${btoa(JSON.stringify({ id: validUser.id, username: validUser.username, role: validUser.role }))}; path=/; expires=${expires}; SameSite=lax`;
    } catch {}
}

export function AuthProvider({ children }) {
    initSessionCookie(); // synchronisch — vóór enige useEffect in children
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState({});
    const [userList, setUserList] = useState(USERS);

    // ── Centrale profieldata (naam, kvk, btw, adres, etc.) per userId ──
    const [profiles, setProfiles] = useState({});

    // Laad user + rechten + profielen bij opstarten
    useEffect(() => {
        try {
            const stored = localStorage.getItem('schildersapp_user');
            const storedPerms = localStorage.getItem('schildersapp_permissions');
            const storedProfiles = localStorage.getItem('schildersapp_profiles');

            if (storedPerms) {
                setPermissions(JSON.parse(storedPerms));
            } else {
                setPermissions({ ...DEFAULT_PERMISSIONS });
                localStorage.setItem('schildersapp_permissions', JSON.stringify(DEFAULT_PERMISSIONS));
            }

            if (storedProfiles) {
                setProfiles(JSON.parse(storedProfiles));
            }

            if (stored) {
                const parsed = JSON.parse(stored);
                // Accepteer zowel hardcoded als dynamisch aangemaakte gebruikers
                // parsed.id én parsed.username moeten beide aanwezig zijn
                const hasValidFields = parsed.id && parsed.username && parsed.name && parsed.role;
                if (hasValidFields) {
                    setUser({ id: parsed.id, username: parsed.username, name: parsed.name, role: parsed.role, initials: parsed.initials || '' });
                } else {
                    localStorage.removeItem('schildersapp_user');
                }
            }
        } catch {
            localStorage.removeItem('schildersapp_user');
        }
        setLoading(false);

        // Laad gebruikerslijst van API op de achtergrond
        fetch('/api/gebruikers')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) return;
                setUserList(data);
            })
            .catch(() => {});

        // Laad rechten van API op de achtergrond en overschrijf localStorage
        fetch('/api/toegang')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) return;
                setPermissions(prev => {
                    const updated = { ...prev };
                    data.forEach(row => {
                        if (Array.isArray(row.permissions) && row.permissions.length > 0) {
                            updated[row.userId] = row.permissions;
                        }
                    });
                    localStorage.setItem('schildersapp_permissions', JSON.stringify(updated));
                    return updated;
                });
            })
            .catch(() => {});
    }, []);

    // ── Profiel ophalen voor een userId ──
    const getProfile = (userId) => {
        const u = userList.find(u => u.id === userId);
        return {
            naam: u?.name || '',
            telefoon: u?.phone ? '0' + String(u.phone).replace(/^31/, '') : '',
            type: u?.role === "ZZP'er" ? 'zzp' : 'medewerker',
            kvk: '',
            btwNummer: '',
            adres: '',
            postcode: '',
            uurtarief: 0,
            ...(profiles[userId] || {}),    // ← overschrijft met opgeslagen profiel
            naam: profiles[userId]?.naam || u?.name || '',  // naam altijd sync
        };
    };

    // ── Profiel bijwerken — schrijft weg naar localStorage en synct naam naar userList ──
    const updateProfile = (userId, changes) => {
        const updated = { ...(profiles[userId] || {}), ...changes };
        const newProfiles = { ...profiles, [userId]: updated };
        setProfiles(newProfiles);
        localStorage.setItem('schildersapp_profiles', JSON.stringify(newProfiles));

        // Sync naam terug naar userList als naam veranderd is
        if (changes.naam) {
            setUserList(prev => prev.map(u => {
                if (u.id !== userId) return u;
                const parts = changes.naam.trim().split(' ');
                const initials = parts.length >= 2
                    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                    : changes.naam.substring(0, 2).toUpperCase();
                return { ...u, name: changes.naam, initials };
            }));
            // Ook user bijwerken als dit de ingelogde gebruiker is
            setUser(prev => prev?.id === userId ? { ...prev, name: changes.naam } : prev);
        }
        return { success: true };
    };

    const login = async (username, password) => {
        // Probeer eerst via API (ondersteunt ook dynamisch aangemaakte gebruikers)
        try {
            const res = await fetch('/api/auth/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            if (res.ok) {
                const found = await res.json();
                const userData = { id: found.id, username: found.username, name: found.name, role: found.role, initials: found.initials || '' };
                const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
                document.cookie = `schildersapp_session=${btoa(JSON.stringify({ id: found.id, username: found.username, role: found.role }))}; path=/; expires=${expires}; SameSite=lax`;
                setUser(userData);
                localStorage.setItem('schildersapp_user', JSON.stringify(userData));
                // Herlaad userList na inloggen
                fetch('/api/gebruikers').then(r => r.ok ? r.json() : null).then(data => { if (Array.isArray(data)) setUserList(data); }).catch(() => {});
                return { success: true };
            }
            if (res.status === 401) {
                return { success: false, error: 'Ongeldige gebruikersnaam of wachtwoord' };
            }
        } catch {}
        // Fallback: hardcoded USERS (werkt ook offline)
        const found = USERS.find(u => u.username === username && u.password === password);
        if (found) {
            const userData = { id: found.id, username: found.username, name: found.name, role: found.role, initials: found.initials };
            const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
            document.cookie = `schildersapp_session=${btoa(JSON.stringify({ id: found.id, username: found.username, role: found.role }))}; path=/; expires=${expires}; SameSite=lax`;
            setUser(userData);
            localStorage.setItem('schildersapp_user', JSON.stringify(userData));
            return { success: true };
        }
        return { success: false, error: 'Ongeldige gebruikersnaam of wachtwoord' };
    };

    const logout = async () => {
        setUser(null);
        localStorage.removeItem('schildersapp_user');
        document.cookie = 'schildersapp_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    };

    // Rechten voor een specifieke gebruiker ophalen
    const getUserPermissions = (userId) => {
        return permissions[userId] || DEFAULT_PERMISSIONS[userId] || ['dashboard'];
    };

    // Rechten voor een gebruiker updaten (alleen beheerder)
    const updateUserPermissions = (userId, newPerms) => {
        const updated = { ...permissions, [userId]: newPerms };
        setPermissions(updated);
        localStorage.setItem('schildersapp_permissions', JSON.stringify(updated));
    };

    // Check of huidige gebruiker toegang heeft tot een pagina
    const hasAccess = (pageId) => {
        if (!user) return false;
        if (user.role === 'Beheerder') return true; // Beheerder heeft altijd overal toegang
        const userPerms = getUserPermissions(user.id);
        return userPerms.includes(pageId);
    };

    // Alle gebruikers ophalen (voor beheer)
    const getAllUsers = () => userList.map(u => ({
        id: u.id, username: u.username, password: u.password, name: u.name, role: u.role, initials: u.initials, phone: u.phone || ''
    }));

    // Gebruiker verwijderen
    const removeUser = (userId) => {
        setUserList(prev => prev.filter(u => u.id !== userId));
        const updated = { ...permissions };
        delete updated[userId];
        setPermissions(updated);
        localStorage.setItem('schildersapp_permissions', JSON.stringify(updated));
        fetch(`/api/gebruikers?id=${userId}`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
    };

    // Nieuwe gebruiker toevoegen
    const addUser = async ({ name, username, password, role }) => {
        if (userList.some(u => u.username === username)) {
            return { success: false, error: 'Gebruikersnaam bestaat al' };
        }
        const nameParts = name.trim().split(' ');
        const initials = nameParts.length >= 2
            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();
        const tempId = 'user_' + Date.now();
        const newUser = { id: tempId, username, password, name, role: role || 'Medewerker', initials };
        try {
            const res = await fetch('/api/gebruikers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser),
                credentials: 'include',
            });
            if (!res.ok) {
                const err = await res.json();
                return { success: false, error: err.error || 'Opslaan mislukt' };
            }
            const data = await res.json();
            if (data.id) newUser.id = data.id;
        } catch {}
        setUserList(prev => [...prev, newUser]);
        const updated = { ...permissions, [newUser.id]: ['dashboard'] };
        setPermissions(updated);
        localStorage.setItem('schildersapp_permissions', JSON.stringify(updated));
        return { success: true, user: newUser };
    };

    // Gebruiker bewerken
    const updateUser = (userId, updates) => {
        setUserList(prev => prev.map(u => {
            if (u.id !== userId) return u;
            const updated = { ...u, ...updates };
            if (updates.name) {
                const parts = updates.name.trim().split(' ');
                updated.initials = parts.length >= 2
                    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                    : updates.name.substring(0, 2).toUpperCase();
            }
            return updated;
        }));
        fetch('/api/gebruikers', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId, ...updates }),
            credentials: 'include',
        }).catch(() => {});
        return { success: true };
    };

    return (
        <AuthContext.Provider value={{
            user, login, logout, loading, isAuthenticated: !!user,
            hasAccess, getUserPermissions, updateUserPermissions, getAllUsers, removeUser, addUser, updateUser, allPages: ALL_PAGES,
            // ── Profiel sync ──
            profiles, getProfile, updateProfile,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth moet binnen AuthProvider gebruikt worden');
    }
    return context;
}
