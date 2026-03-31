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

// == Demo gebruikers — in productie vervangen door database ==
const USERS = [
    { id: 1, username: 'admin',    password: 'admin123',   name: 'Jan Modaal',    role: 'Beheerder', initials: 'JM', phone: '31612345678', bsn: '123456782' },
    { id: 2, username: 'schilder', password: 'verf2025',   name: 'Piet Kwast',    role: 'Schilder',  initials: 'PK', phone: '31687654321', bsn: '211320894' },
    { id: 3, username: 'zzp',      password: 'zzp2025',    name: 'Klaas Roller',  role: "ZZP'er",    initials: 'KR', phone: '31698765432', bsn: '987654321' },
    { id: 4, username: 'voorman',  password: 'voorman123', name: 'Henk de Vries', role: 'Voorman',   initials: 'HV', phone: '31676543210', bsn: '345678901' },
];

// Standaard rechten per gebruiker (alle pagina-ids)
const DEFAULT_PERMISSIONS = {
    1: ['dashboard', 'urenregistratie', 'urenregistratie.mijn', 'urenregistratie.team', 'uren', 'uren.registratie', 'uren.verlof', 'materieel', 'materieel.overzicht', 'materieel.toevoegen', 'verfvoorraad', 'verfvoorraad.voorraad', 'verfvoorraad.scan', 'zzp', 'zzp.facturen', 'zzp.documenten', 'projecten', 'projecten.overzicht', 'projecten.planning', 'whatsapp', 'whatsapp.uren', 'whatsapp.contracten', 'whatsapp.termijnen'],
    2: ['dashboard', 'urenregistratie', 'urenregistratie.mijn', 'uren', 'uren.registratie', 'uren.verlof', 'materieel', 'materieel.overzicht', 'verfvoorraad', 'verfvoorraad.voorraad', 'verfvoorraad.scan', 'profiel', 'profiel.werknemer', 'projecten', 'projecten.overzicht', 'projecten.planning'],
    3: ['dashboard', 'zzp', 'zzp.facturen', 'zzp.documenten'],
    4: ['dashboard', 'urenregistratie', 'urenregistratie.mijn', 'uren', 'uren.registratie', 'uren.verlof', 'materieel', 'materieel.overzicht', 'materieel.toevoegen', 'verfvoorraad', 'verfvoorraad.voorraad', 'verfvoorraad.scan', 'projecten', 'projecten.overzicht', 'projecten.planning'],
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
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
                const validUser = USERS.find(u => u.id === parsed.id && u.username === parsed.username);
                if (validUser) {
                    setUser({ id: validUser.id, username: validUser.username, name: validUser.name, role: validUser.role, initials: validUser.initials });
                } else {
                    localStorage.removeItem('schildersapp_user');
                }
            }
        } catch {
            localStorage.removeItem('schildersapp_user');
        }
        setLoading(false);
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

    const login = (username, password) => {
        const found = USERS.find(u => u.username === username && u.password === password);
        if (found) {
            const userData = { id: found.id, username: found.username, name: found.name, role: found.role, initials: found.initials };
            setUser(userData);
            localStorage.setItem('schildersapp_user', JSON.stringify(userData));
            return { success: true };
        }
        return { success: false, error: 'Ongeldige gebruikersnaam of wachtwoord' };
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('schildersapp_user');
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
        // Verwijder ook hun rechten
        const updated = { ...permissions };
        delete updated[userId];
        setPermissions(updated);
        localStorage.setItem('schildersapp_permissions', JSON.stringify(updated));
    };

    // Nieuwe gebruiker toevoegen
    const addUser = ({ name, username, password, role }) => {
        // Check of username al bestaat
        if (userList.some(u => u.username === username)) {
            return { success: false, error: 'Gebruikersnaam bestaat al' };
        }
        const nameParts = name.trim().split(' ');
        const initials = nameParts.length >= 2
            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();
        const newUser = {
            id: 'user_' + Date.now(),
            username,
            password,
            name,
            role: role || 'Medewerker',
            initials
        };
        setUserList(prev => [...prev, newUser]);
        // Standaard rechten: alleen dashboard
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
            // Herbereken initialen als naam veranderd is
            if (updates.name) {
                const parts = updates.name.trim().split(' ');
                updated.initials = parts.length >= 2
                    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                    : updates.name.substring(0, 2).toUpperCase();
            }
            return updated;
        }));
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
