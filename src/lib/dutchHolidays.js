/**
 * Nederlandse feestdagen + werkvrijstelling helpers
 */

// Pasen berekenen via Meeus/Jones/Butcher algoritme
function easterDate(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-based
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function toYMD(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Geeft alle Nederlandse officiële feestdagen als YYYY-MM-DD strings terug voor het opgegeven jaar.
 */
export function getDutchPublicHolidays(year) {
    const easter = easterDate(year);

    // Koningsdag: 27 april, maar als het een zondag is → 26 april
    const koningsDag = new Date(year, 3, 27);
    if (koningsDag.getDay() === 0) koningsDag.setDate(26);

    const days = [
        new Date(year, 0, 1),            // Nieuwjaarsdag
        addDays(easter, -2),              // Goede Vrijdag
        easter,                            // Eerste Paasdag
        addDays(easter, 1),               // Tweede Paasdag
        koningsDag,                        // Koningsdag
        new Date(year, 4, 5),             // Bevrijdingsdag
        addDays(easter, 39),              // Hemelvaartsdag
        addDays(easter, 49),              // Eerste Pinksterdag
        addDays(easter, 50),              // Tweede Pinksterdag
        new Date(year, 11, 25),           // Eerste Kerstdag
        new Date(year, 11, 26),           // Tweede Kerstdag
    ];

    return days.map(toYMD);
}

/**
 * Controleert of een datum een Nederlandse feestdag is.
 */
export function isPublicHoliday(date) {
    const holidays = getDutchPublicHolidays(date.getFullYear());
    return holidays.includes(toYMD(date));
}

/**
 * Controleert of een datum een werkdag is (ma-vr, geen feestdag).
 */
export function isWorkday(date) {
    const day = date.getDay();
    return day >= 1 && day <= 5 && !isPublicHoliday(date);
}

/**
 * Geeft de laatste werkdag op of vóór de gegeven datum terug.
 * Slaat weekenden en feestdagen over.
 */
export function lastWorkdayOnOrBefore(date) {
    const d = new Date(date);
    while (!isWorkday(d)) {
        d.setDate(d.getDate() - 1);
    }
    return d;
}

/**
 * Geeft de werkdagen (ma-vr) van een ISO-weeknummer terug als Date objecten,
 * exclusief feestdagen.
 */
export function getWorkdaysInWeek(week, year) {
    // Maandag van die week
    const jan4 = new Date(year, 0, 4);
    const dow = jan4.getDay() || 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);

    const days = [];
    for (let i = 0; i < 5; i++) {
        const d = addDays(monday, i);
        if (!isPublicHoliday(d)) days.push(d);
    }
    return days;
}

/**
 * Controleert of een medewerker volledig vrij is in een week.
 * `projects` = array van project-objecten uit de uren API.
 * `week` + `year` = de week waarvan de werkdagen berekend worden.
 *
 * Een medewerker is "volledig vrij" als alle werkdagen in die week
 * afgedekt zijn door 'vrij' of 'ziek' type uren.
 */
export function isEmployeeFullyOff(projects, week, year) {
    const werkdagen = getWorkdaysInWeek(week, year); // max 5, min minder bij feestdagen
    if (werkdagen.length === 0) return true; // hele week feestdagen

    // Verzamel voor welke dag-indices (0=ma..4=vr) de medewerker vrij/ziek heeft
    const vrijDagen = new Set();
    if (!projects || projects.length === 0) return false;

    projects.forEach(proj => {
        Object.entries(proj.types || {}).forEach(([tid, hrs]) => {
            if (tid !== 'vrij' && tid !== 'ziek') return;
            (hrs || []).forEach((h, i) => {
                if (i < 5 && (h === true || h === 1 || parseFloat(String(h).replace(',', '.')) > 0 || h === 'vrij' || h === 'ziek')) {
                    vrijDagen.add(i);
                }
            });
        });
    });

    // Controleer voor elke werkdag of die gedekt is door vrij/ziek
    // werkdagen[0] = maandag van die week, werkdagen[1] = dinsdag, etc.
    // Maar we moeten ook rekening houden met feestdagen (die hoef je niet in te vullen)
    const jan4 = new Date(year, 0, 4);
    const dow = jan4.getDay() || 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);

    for (let i = 0; i < 5; i++) {
        const d = addDays(monday, i);
        if (isPublicHoliday(d)) continue; // feestdag hoeft niet
        if (!vrijDagen.has(i)) return false; // werkdag maar niet vrij/ziek → niet volledig vrij
    }

    return true;
}
