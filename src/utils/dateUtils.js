export function parseDate(str) { return new Date(str + 'T00:00:00'); }

export function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

export function diffDays(a, b) { return Math.round((b - a) / 86400000); }

export function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

export function isWeekend(d) { const day = d.getDay(); return day === 0 || day === 6; }

export function getMonday(d) {
    const r = new Date(d);
    const day = r.getDay();
    const diff = r.getDate() - day + (day === 0 ? -6 : 1);
    r.setDate(diff);
    return r;
}

export const MONTHS_FULL = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
export const DAYS_NL = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

// Berekent Paaszondag voor een gegeven jaar (algoritme van Butcher)
export function getEasterSunday(year) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

// Genereert Nederlandse feestdagen dynamisch voor een gegeven jaar
export function getDutchHolidays(year) {
    const easter = getEasterSunday(year);
    const fmt = (d) => formatDate(d);
    const add = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
    return {
        [fmt(new Date(year, 0, 1))]:   'Nieuwjaarsdag',
        [fmt(add(easter, -2))]:        'Goede Vrijdag',
        [fmt(easter)]:                 'Eerste Paasdag',
        [fmt(add(easter, 1))]:         'Tweede Paasdag',
        [fmt(new Date(year, 3, 27))]:  'Koningsdag',
        [fmt(new Date(year, 4, 5))]:   'Bevrijdingsdag',
        [fmt(add(easter, 39))]:        'Hemelvaartsdag',
        [fmt(add(easter, 49))]:        'Eerste Pinksterdag',
        [fmt(add(easter, 50))]:        'Tweede Pinksterdag',
        [fmt(new Date(year, 11, 25))]: 'Eerste Kerstdag',
        [fmt(new Date(year, 11, 26))]: 'Tweede Kerstdag',
    };
}

const _holidayCache = {};
export function getHolidays(year) {
    if (!_holidayCache[year]) _holidayCache[year] = getDutchHolidays(year);
    return _holidayCache[year];
}

// Uniforme isHoliday inclusief enabled check
export function isHoliday(d, enabledHolidays = {}) {
    if (!d) return false;
    const s = formatDate(d);
    const hol = getHolidays(d.getFullYear())[s];
    if (hol) {
        if (Object.keys(enabledHolidays).length === 0) return hol;
        return enabledHolidays[s] !== false ? hol : false;
    }
    return false;
}

export function snapToWorkday(d, enabledHolidays = {}) {
    const r = new Date(d);
    while (r.getDay() === 0 || r.getDay() === 6 || isHoliday(r, enabledHolidays)) r.setDate(r.getDate() + 1);
    return r;
}

export function snapToWorkdayBack(d, enabledHolidays = {}) {
    const r = new Date(d);
    while (r.getDay() === 0 || r.getDay() === 6 || isHoliday(r, enabledHolidays)) r.setDate(r.getDate() - 1);
    return r;
}

export function diffWorkdays(a, b, enabledHolidays = {}) {
    let count = 0;
    const cur = new Date(a);
    while (cur <= b) {
        const d = cur.getDay();
        if (d !== 0 && d !== 6 && !isHoliday(cur, enabledHolidays)) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}
