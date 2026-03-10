'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../components/AuthContext';
import Tesseract from 'tesseract.js';

// == DEMO VERF DATA ==
const INITIAL_VERF = [
    { id: 'VF-0001', merk: 'Sigma', product: 'S2U Nova Satin', type: 'Watergedragen lakverf', kleur: 'RAL 9010', kleurNaam: 'Zuiver Wit', inhoud: '2.5L', hoeveelheid: 3, datum: '2025-02-15', locatie: 'Magazijn', categorie: 'Binnenlak' },
    { id: 'VF-0002', merk: 'Sikkens', product: 'Rubbol BL Satura', type: 'Watergedragen zijdeglans', kleur: 'RAL 7016', kleurNaam: 'Antracietgrijs', inhoud: '1L', hoeveelheid: 5, datum: '2025-02-20', locatie: 'Bus 1', categorie: 'Buitenlak' },
    { id: 'VF-0003', merk: 'Sigma', product: 'Multiprimer Aqua', type: 'Watergedragen grondverf', kleur: 'Wit', kleurNaam: 'Primer Wit', inhoud: '2.5L', hoeveelheid: 2, datum: '2025-03-01', locatie: 'Magazijn', categorie: 'Grondverf' },
    { id: 'VF-0004', merk: 'Sikkens', product: 'Cetol BL Unitop', type: 'Watergedragen beits', kleur: '006', kleurNaam: 'Eiken licht', inhoud: '1L', hoeveelheid: 4, datum: '2025-03-05', locatie: 'Bus 2', categorie: 'Beits' },
    { id: 'VF-0005', merk: 'Sigma', product: 'Muurverf Mat', type: 'Watergedragen muurverf', kleur: 'RAL 9001', kleurNaam: 'Crèmewit', inhoud: '10L', hoeveelheid: 1, datum: '2025-02-28', locatie: 'Magazijn', categorie: 'Muurverf' },
    { id: 'VF-0006', merk: 'De Beer', product: 'BeroXpert Grondlak', type: 'Grondverf oplosmiddel', kleur: 'Grijs', kleurNaam: 'Universeel Grijs', inhoud: '2.5L', hoeveelheid: 6, datum: '2025-01-10', locatie: 'Magazijn', categorie: 'Grondverf' },
];

const CATEGORIEEN = ['Alle', 'Binnen aflak', 'Binnen primer', 'Buiten primer', 'Buiten voorlak', 'Buiten aflak', 'Muurverf binnen', 'Muurverf buiten'];
const EMPTY_RESULT = { merk: '', product: '', type: '', kleur: '', kleurNaam: '', inhoud: '', categorie: '', collectie: '', datum: '', basis: '', winkel: '', werkelijkeInhoud: '' };

// Bekende merken en trefwoorden
const BEKENDE_MERKEN = ['Sigma', 'Sikkens', 'Flexa', 'Wijzonol', 'De Beer', 'Ralston', 'Boonstoppel', 'Koopmans', 'Trimetal', 'Tikkurila', 'PPG', 'AkzoNobel'];
const TYPE_KEYWORDS = {
    'grondverf': ['primer', 'grond', 'hechtprimer', 'multiprimer', 'grondlak', 'grondverf'],
    'lakverf': ['lak', 'satin', 'glans', 'zijdeglans', 'hoogglans', 'nova', 'rubbol', 'rezisto'],
    'muurverf': ['muur', 'muurverf', 'wand', 'plafond', 'schakelverf'],
    'beits': ['beits', 'cetol', 'unitop', 'houtbeits'],
};
const CATEGORIE_MAP = { 'grondverf': 'Binnen primer', 'lakverf': 'Binnen aflak', 'muurverf': 'Muurverf binnen', 'beits': 'Buiten aflak' };

// RAL kleuren → hex (veelgebruikte schilderskleuren)
const RAL_KLEUREN = {
    '1000': '#BEBD7F', '1001': '#C2B078', '1002': '#C6A961', '1003': '#E5BE01', '1004': '#CDA434',
    '1005': '#A98307', '1006': '#E4A010', '1007': '#DC9D00', '1011': '#8A6642', '1012': '#C7B446',
    '1013': '#EAE6CA', '1014': '#E1CC4F', '1015': '#E6D690', '1016': '#EDFF21', '1017': '#F5D033',
    '1018': '#F8F32B', '1019': '#9E9764', '1020': '#999950', '1021': '#F3DA0B', '1023': '#FAD201',
    '1024': '#AEA04B', '1026': '#FFFF00', '1027': '#9D9101', '1028': '#F4A900', '1032': '#D6AE01',
    '1033': '#F3A505', '1034': '#EFA94A', '1035': '#6A5D4D', '1036': '#705335', '1037': '#F39F18',
    '2000': '#ED760E', '2001': '#C93C20', '2002': '#CB2821', '2003': '#FF7514', '2004': '#F44611',
    '2005': '#FF2301', '2008': '#F75E25', '2009': '#F54021', '2010': '#D84B20', '2011': '#EC7C26',
    '2012': '#E55137', '2013': '#C35831',
    '3000': '#AF2B1E', '3001': '#A52019', '3002': '#A2231D', '3003': '#9B111E', '3004': '#75151E',
    '3005': '#5E2129', '3007': '#412227', '3009': '#642424', '3011': '#781F19', '3012': '#C1876B',
    '3013': '#A12312', '3014': '#D36E70', '3015': '#EA899A', '3016': '#B32821', '3017': '#E63244',
    '3018': '#D53032', '3020': '#CC0605', '3022': '#D95030', '3024': '#F80000', '3026': '#FE0000',
    '3027': '#C51D34', '3028': '#CB3234', '3031': '#B32428', '3032': '#721422', '3033': '#B44C43',
    '4001': '#6D3F5B', '4002': '#922B3E', '4003': '#DE4C8A', '4004': '#641C34', '4005': '#6C4675',
    '4006': '#A03472', '4007': '#4A192C', '4008': '#924E7D', '4009': '#A18594', '4010': '#CF3476',
    '4011': '#8673A1', '4012': '#6C6874',
    '5000': '#354D73', '5001': '#1F3438', '5002': '#20214F', '5003': '#1D1E33', '5004': '#18171C',
    '5005': '#1E2460', '5007': '#3E5F8A', '5008': '#26252D', '5009': '#025669', '5010': '#0E294B',
    '5011': '#231A24', '5012': '#3B83BD', '5013': '#1E213D', '5014': '#606E8C', '5015': '#2271B3',
    '5017': '#063971', '5018': '#3F888F', '5019': '#1B5583', '5020': '#1D334A', '5021': '#256D7B',
    '5022': '#252850', '5023': '#49678D', '5024': '#5D9B9B', '5025': '#2A6478', '5026': '#102C54',
    '6000': '#316650', '6001': '#287233', '6002': '#2D572C', '6003': '#424632', '6004': '#1F3A3D',
    '6005': '#2F4538', '6006': '#3E3B32', '6007': '#343B29', '6008': '#39352A', '6009': '#31372B',
    '6010': '#35682D', '6011': '#587246', '6012': '#343E40', '6013': '#6C7156', '6014': '#47402E',
    '6015': '#3B3C36', '6016': '#1E5945', '6017': '#4C9141', '6018': '#57A639', '6019': '#BDECB6',
    '6020': '#2E3A23', '6021': '#89AC76', '6022': '#25221B', '6024': '#308446', '6025': '#3D642D',
    '6026': '#015D52', '6027': '#84C3BE', '6028': '#2C5545', '6029': '#20603D', '6032': '#317F43',
    '6033': '#497E76', '6034': '#7FB5B5', '6035': '#1C542D', '6036': '#193737', '6037': '#008F39',
    '6038': '#00BB2D',
    '7000': '#78858B', '7001': '#8A9597', '7002': '#817F68', '7003': '#6C7059', '7004': '#969992',
    '7005': '#646B63', '7006': '#6D6552', '7008': '#6A5F31', '7009': '#4D5645', '7010': '#4C514A',
    '7011': '#434B4D', '7012': '#4E5754', '7013': '#464531', '7015': '#434750', '7016': '#293133',
    '7021': '#23282B', '7022': '#332F2C', '7023': '#686C5E', '7024': '#474A51', '7026': '#2F353B',
    '7030': '#8B8C7A', '7031': '#474B4E', '7032': '#B8B799', '7033': '#7D8471', '7034': '#8F8B66',
    '7035': '#D7D7D7', '7036': '#7F7679', '7037': '#7D7F7D', '7038': '#B5B8B1', '7039': '#6C6960',
    '7040': '#9DA1AA', '7042': '#8D948D', '7043': '#4E5452', '7044': '#CAC4B0', '7045': '#909090',
    '7046': '#82898F', '7047': '#D0D0D0', '7048': '#898176',
    '8000': '#826C34', '8001': '#955F20', '8002': '#6C3B2A', '8003': '#734222', '8004': '#8E402A',
    '8007': '#59351F', '8008': '#6F4F28', '8011': '#5B3A29', '8012': '#592321', '8014': '#382C1E',
    '8015': '#633A34', '8016': '#4C2F27', '8017': '#45322E', '8019': '#403A3A', '8022': '#212121',
    '8023': '#A65E2E', '8024': '#79553D', '8025': '#755C48', '8028': '#4E3B31', '8029': '#763C28',
    '9001': '#FDF4E3', '9002': '#E7EBDA', '9003': '#F4F4F4', '9004': '#282828', '9005': '#0A0A0A',
    '9006': '#A5A5A5', '9007': '#8F8F8F', '9010': '#FFFFFF', '9011': '#1C1C1C', '9016': '#F6F6F6',
    '9017': '#1E1E1E', '9018': '#D7D7D7',
};

// Sikkens kleurcodes (veelgebruikt bij schilders)
const SIKKENS_KLEUREN = {
    // AN = Achromatic Natural
    'AN.02.77': '#C4C0BA', 'AN.02.82': '#D1CDC7',
    // BN = Brown Natural  
    'BN.02.82': '#D2CEC5',
    // CN = Cool Natural
    'CN.02.77': '#C3C1BD', 'CN.02.82': '#D0CEC9',
    // F = Geel/Yellow
    'F2.15.80': '#D5C8A0', 'F6.15.80': '#D4C9A2', 'F6.05.85': '#DBD6CC',
    // G = Groen/Green  
    'G0.05.85': '#DBD8CE', 'G4.05.85': '#D9D9CF', 'G8.05.85': '#D7D9D0',
    // H = Blauw/Blue
    'H2.12.70': '#A8B4B8', 'H8.07.79': '#C5C9C8',
    // Q = Rood/Red
    'Q0.05.85': '#DDD6D3',
};

// NCS kleur benaderen op basis van notatie (S BBCC-KLEUR)
function ncsToHex(ncsCode) {
    // NCS format: S 1050-Y90R  (S zwarte%-chromatische%-kleurhoek)
    const ncsMatch = ncsCode.match(/S?\s*(\d{2})(\d{2})-([BYRG])(\d{2})?([BYRG])?/i);
    if (!ncsMatch) return null;
    const blackness = parseInt(ncsMatch[1]) / 100;
    const chromaticness = parseInt(ncsMatch[2]) / 100;
    const hue1 = ncsMatch[3].toUpperCase();
    const huePercent = ncsMatch[4] ? parseInt(ncsMatch[4]) / 100 : 0;
    const hue2 = ncsMatch[5] ? ncsMatch[5].toUpperCase() : hue1;

    // Basis kleurtonen (hue angles)
    const hueAngles = { 'Y': 60, 'R': 0, 'B': 240, 'G': 120 };
    const angle1 = hueAngles[hue1] || 0;
    const angle2 = hueAngles[hue2] || angle1;
    let hue = angle1 + (angle2 - angle1) * huePercent;
    if (hue < 0) hue += 360;

    const lightness = Math.max(0, Math.min(100, (1 - blackness) * 100 - chromaticness * 20));
    const saturation = Math.min(100, chromaticness * 100);

    return `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`;
}

// Kleurstaal ophalen voor een kleurcode
function getKleurHex(kleurCode) {
    if (!kleurCode) return null;
    const code = kleurCode.trim();

    // RAL check
    const ralMatch = code.match(/(?:RAL\s*)?(\d{4})/i);
    if (ralMatch && RAL_KLEUREN[ralMatch[1]]) return RAL_KLEUREN[ralMatch[1]];

    // NCS check
    if (code.toUpperCase().includes('NCS') || code.match(/S?\s*\d{4}-[BYRG]/i)) {
        const hex = ncsToHex(code);
        if (hex) return hex;
    }

    // Sikkens check
    for (const [sikCode, hex] of Object.entries(SIKKENS_KLEUREN)) {
        if (code.includes(sikCode)) return hex;
    }

    // Generieke kleurnamen (NL + EN)
    const lower = code.toLowerCase();
    const kleurNamen = {
        // Wit-tinten
        'zuiver wit': '#FFFFFF', 'helder wit': '#FFFFFF', 'wit': '#FFFFFF', 'white': '#FFFFFF',
        'crème': '#FDF4E3', 'creme': '#FDF4E3', 'crèmewit': '#FDF4E3', 'cremewit': '#FDF4E3', 'cream': '#FDF4E3',
        'ivoor': '#FFFFF0', 'ivoorwit': '#FFFFF0', 'ivory': '#FFFFF0',
        'parelwit': '#EAE6CA', 'signaalwit': '#F4F4F4', 'verkeerswit': '#F6F6F6',
        // Grijs-tinten
        'lichtgrijs': '#D7D7D7', 'zilvergrijs': '#B5B8B1', 'grijs': '#909090', 'grey': '#909090', 'gray': '#909090',
        'antraciet': '#293133', 'antracietgrijs': '#293133', 'donkergrijs': '#4E5452', 'basaltgrijs': '#4E5452',
        'muisgrijs': '#646B63', 'betongrijs': '#686C5E', 'steengrijs': '#8B8C7A',
        // Zwart
        'zwart': '#1C1C1C', 'black': '#1C1C1C', 'gitzwart': '#0A0A0A', 'signaalzwart': '#282828',
        // Bruin-tinten
        'bruin': '#8B4513', 'brown': '#8B4513', 'chocoladebruin': '#5B3A29', 'notenbruin': '#79553D',
        'mahonie': '#6C3B2A', 'eiken': '#C6A961', 'eiken licht': '#C6A961', 'kastanje': '#6C3B2A',
        'nootbruin': '#79553D', 'beige': '#C2B078', 'terrabruin': '#A65E2E',
        // Rood-tinten
        'rood': '#CC0605', 'red': '#CC0605', 'wijnrood': '#75151E', 'robijnrood': '#9B111E',
        'signaalrood': '#A52019', 'karmijnrood': '#A2231D', 'tomaatrood': '#CB3234',
        // Blauw-tinten
        'blauw': '#2271B3', 'blue': '#2271B3', 'hemelsblauw': '#3B83BD', 'kobaltblauw': '#1E2460',
        'ultramarijn': '#20214F', 'duifblauw': '#606E8C', 'staalblauw': '#3E5F8A',
        // Groen-tinten
        'groen': '#287233', 'green': '#287233', 'mosgroen': '#2D572C', 'dennegroen': '#2F4538',
        'mintgroen': '#BDECB6', 'olijfgroen': '#424632', 'grasgroen': '#35682D',
        // Geel-tinten
        'geel': '#F3DA0B', 'yellow': '#F3DA0B', 'okergeel': '#C7B446', 'zonnegeel': '#F5D033',
        'signaal geel': '#FAD201', 'maisgeel': '#E5BE01', 'safraangeel': '#F39F18',
        // Oranje
        'oranje': '#ED760E', 'orange': '#ED760E', 'zuiver oranje': '#FF7514',
    };

    for (const [naam, hex] of Object.entries(kleurNamen)) {
        if (lower.includes(naam)) return hex;
    }

    return null;
}

// Database van bekende verfproducten (voor fuzzy matching)
const BEKENDE_PRODUCTEN = [
    { merk: 'Sikkens', product: 'Rubbol BL Satura', type: 'Watergedragen zijdeglans', categorie: 'Buitenlak' },
    { merk: 'Sikkens', product: 'Rubbol BL Uniprimer', type: 'Watergedragen grondverf', categorie: 'Grondverf' },
    { merk: 'Sikkens', product: 'Rubbol BL Rezisto Satin', type: 'Watergedragen lakverf', categorie: 'Binnenlak' },
    { merk: 'Sikkens', product: 'Cetol BL Unitop', type: 'Watergedragen beits', categorie: 'Beits' },
    { merk: 'Sikkens', product: 'Cetol BL Natural Mat', type: 'Watergedragen beits', categorie: 'Beits' },
    { merk: 'Sikkens', product: 'Cetol BL Opaque', type: 'Watergedragen dekkende beits', categorie: 'Beits' },
    { merk: 'Sikkens', product: 'Alpha Rezisto Mat', type: 'Watergedragen muurverf', categorie: 'Muurverf' },
    { merk: 'Sikkens', product: 'Alpha BL Primer', type: 'Watergedragen grondverf', categorie: 'Grondverf' },
    { merk: 'Sigma', product: 'AQUA Hechtprimer', type: 'Watergedragen grondverf', categorie: 'Grondverf' },
    { merk: 'Sigma', product: 'S2U Nova Satin', type: 'Watergedragen lakverf', categorie: 'Binnenlak' },
    { merk: 'Sigma', product: 'S2U Allure Gloss', type: 'Watergedragen hoogglans', categorie: 'Binnenlak' },
    { merk: 'Sigma', product: 'Multiprimer Aqua', type: 'Watergedragen grondverf', categorie: 'Grondverf' },
    { merk: 'Sigma', product: 'Muurverf Mat', type: 'Watergedragen muurverf', categorie: 'Muurverf' },
    { merk: 'Sigma', product: 'Schakelverf Aqua Matt', type: 'Watergedragen muurverf', categorie: 'Muurverf' },
    { merk: 'Sigma', product: 'Contour PU Satin', type: 'Watergedragen lakverf', categorie: 'Binnenlak' },
    { merk: 'Flexa', product: 'Strak in de Lak', type: 'Watergedragen lakverf', categorie: 'Binnenlak' },
    { merk: 'Flexa', product: 'Powerdek Muurverf', type: 'Watergedragen muurverf', categorie: 'Muurverf' },
    { merk: 'Wijzonol', product: 'Dekkende Beits', type: 'Watergedragen beits', categorie: 'Beits' },
    { merk: 'De Beer', product: 'BeroXpert Grondlak', type: 'Grondverf oplosmiddel', categorie: 'Grondverf' },
    { merk: 'Koopmans', product: 'Perkoleum', type: 'Dekkende beits', categorie: 'Beits' },
    { merk: 'Trimetal', product: 'Permacrylic Satin', type: 'Watergedragen lakverf', categorie: 'Binnenlak' },
    { merk: 'Ralston', product: 'Extra Tex Matt', type: 'Watergedragen muurverf', categorie: 'Muurverf' },
];

// Levenshtein afstand (fuzzy matching)
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i || j));
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0));
    return dp[m][n];
}

// Fuzzy match helper
function fuzzyMatch(input, candidates, maxDist = 3) {
    if (!input || input.length < 3) return null;
    const lower = input.toLowerCase();
    let best = null, bestDist = maxDist + 1;
    for (const c of candidates) {
        const target = c.toLowerCase();
        if (target.includes(lower) || lower.includes(target)) return c;
        const d = levenshtein(lower, target);
        if (d < bestDist) { bestDist = d; best = c; }
    }
    return bestDist <= maxDist ? best : null;
}

// Beeldvoorbewerking: genereert 3 versies voor multi-pass OCR
function preprocessImage(imageDataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const maxDim = 2000;
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
                const ratio = Math.min(maxDim / w, maxDim / h);
                w = Math.round(w * ratio); h = Math.round(h * ratio);
            }

            // Versie 1: Hoog contrast grayscale
            const c1 = document.createElement('canvas');
            c1.width = w; c1.height = h;
            const ctx1 = c1.getContext('2d');
            ctx1.drawImage(img, 0, 0, w, h);
            const d1 = ctx1.getImageData(0, 0, w, h);
            for (let i = 0; i < d1.data.length; i += 4) {
                const g = d1.data[i] * 0.299 + d1.data[i + 1] * 0.587 + d1.data[i + 2] * 0.114;
                const v = Math.max(0, Math.min(255, ((g / 255 - 0.5) * 2.0 + 0.5) * 255));
                d1.data[i] = d1.data[i + 1] = d1.data[i + 2] = v;
            }
            ctx1.putImageData(d1, 0, 0);

            // Versie 2: Binaire threshold (wit label isolatie — donkere tekst op licht)
            const c2 = document.createElement('canvas');
            c2.width = w; c2.height = h;
            const ctx2 = c2.getContext('2d');
            ctx2.drawImage(img, 0, 0, w, h);
            const d2 = ctx2.getImageData(0, 0, w, h);
            for (let i = 0; i < d2.data.length; i += 4) {
                const g = d2.data[i] * 0.299 + d2.data[i + 1] * 0.587 + d2.data[i + 2] * 0.114;
                const v = g < 120 ? 0 : 255; // Alles dat niet donkere tekst is → wit
                d2.data[i] = d2.data[i + 1] = d2.data[i + 2] = v;
            }
            ctx2.putImageData(d2, 0, 0);

            // Versie 3: Adaptieve threshold (per blok van 15x15 pixels)
            const c3 = document.createElement('canvas');
            c3.width = w; c3.height = h;
            const ctx3 = c3.getContext('2d');
            ctx3.drawImage(img, 0, 0, w, h);
            const d3 = ctx3.getImageData(0, 0, w, h);
            const blockSize = 15;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const idx = (y * w + x) * 4;
                    const g = d3.data[idx] * 0.299 + d3.data[idx + 1] * 0.587 + d3.data[idx + 2] * 0.114;
                    // Bereken lokaal gemiddelde
                    let sum = 0, count = 0;
                    for (let dy = -blockSize; dy <= blockSize; dy += 3) {
                        for (let dx = -blockSize; dx <= blockSize; dx += 3) {
                            const nx = x + dx, ny = y + dy;
                            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                                const ni = (ny * w + nx) * 4;
                                sum += d3.data[ni] * 0.299 + d3.data[ni + 1] * 0.587 + d3.data[ni + 2] * 0.114;
                                count++;
                            }
                        }
                    }
                    const localMean = sum / count;
                    const v = g < localMean - 15 ? 0 : 255;
                    d3.data[idx] = d3.data[idx + 1] = d3.data[idx + 2] = v;
                }
            }
            ctx3.putImageData(d3, 0, 0);

            resolve({
                highContrast: c1.toDataURL('image/jpeg', 0.95),
                binary: c2.toDataURL('image/jpeg', 0.95),
                adaptive: c3.toDataURL('image/jpeg', 0.95),
            });
        };
        img.src = imageDataUrl;
    });
}

// Extraheer verfinfo uit OCR-tekst — prioriteit: gestructureerde labels → bekende producten → fuzzy
function extractVerfInfo(text) {
    // BLACKLIST: waarschuwingsteksten op etiketten die geen nuttige info bevatten
    const NEGEER_TEKSTEN = [
        'testen voor gebruik', 'kleur testen voor gebruik', 'test voor gebruik',
        'omruilen niet mogelijk', 'niet omruilen', 'bewaren buiten bereik',
        'goed roeren voor gebruik', 'roeren voor gebruik', 'goed schudden',
        'extreme bescherming tegen krassen', 'bescherming tegen krassen',
        'robust', 'lak • laque • lack • smalto', 'laque', 'smalto',
        'trim paint', 'trim • lak', 'zie technisch informatieblad',
        'technisch informatieblad', 'veiligheidsinformatieblad',
    ];
    let cleaned = text;
    for (const neg of NEGEER_TEKSTEN) {
        cleaned = cleaned.replace(new RegExp(neg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
    }

    const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 1);
    const fullText = cleaned.toLowerCase();
    const result = { ...EMPTY_RESULT };

    // ============================================================
    // STAP 1: GESTRUCTUREERDE LABELS LEZEN (hoogste prioriteit)
    // Sikkens/Sigma etiketten hebben vaste labels als "Collectie:", "Kleurnaam:", etc.
    // ============================================================

    // Collectie: (bijv. "Collectie: Zoffany Paints")
    const collectieLabelMatch = text.match(/collectie[:\s]+([^\n,]+)/i)
        || text.match(/collection[:\s]+([^\n,]+)/i)
        || text.match(/serie[:\s]+([^\n,]+)/i);
    if (collectieLabelMatch && collectieLabelMatch[1].trim().length > 1 && collectieLabelMatch[1].trim().length < 40) {
        result.collectie = collectieLabelMatch[1].trim();
    }

    // Kleurnaam: (bijv. "Kleurnaam: White Clay")
    const kleurnaamLabelMatch = text.match(/kleurnaam[:\s]+([^\n,]+)/i)
        || text.match(/kleur\s*naam[:\s]+([^\n,]+)/i);
    if (kleurnaamLabelMatch && kleurnaamLabelMatch[1].trim().length > 1 && kleurnaamLabelMatch[1].trim().length < 40) {
        result.kleurNaam = kleurnaamLabelMatch[1].trim();
    }

    // Product: (bijv. "Product: Rubbol BL Rezisto Satin")
    const productLabelMatch = text.match(/product[:\s]+([^\n]+)/i);
    if (productLabelMatch) {
        const labelProduct = productLabelMatch[1].trim();
        // Probeer te matchen met bekende producten
        for (const bp of BEKENDE_PRODUCTEN) {
            if (labelProduct.toLowerCase().includes(bp.product.toLowerCase()) ||
                bp.product.toLowerCase().includes(labelProduct.toLowerCase())) {
                result.product = bp.product;
                result.type = bp.type;
                result.categorie = bp.categorie;
                result.merk = bp.merk;
                break;
            }
        }
        // Geen bekende match → gebruik de label-tekst rechtstreeks
        if (!result.product && labelProduct.length > 2 && labelProduct.length < 60) {
            result.product = labelProduct;
        }
    }

    // Basis: (bijv. "Basis: W05")
    const basisLabelMatch = text.match(/basis[:\s]+([^\n,]+)/i);
    if (basisLabelMatch) {
        result.basis = basisLabelMatch[1].trim();
    }
    if (!result.basis) {
        const wo5Match = text.match(/W[O0]\s?5/i);
        if (wo5Match) result.basis = 'W05';
    }

    // Inhoud: (bijv. "Inhoud: 1 L")
    const inhoudLabelMatch = text.match(/inhoud[:\s]+([\d]+[.,]?\d*\s*(?:L|Liter|lt|l))/i);
    if (inhoudLabelMatch) {
        result.inhoud = inhoudLabelMatch[1].replace(',', '.').replace(/\s+/g, '').toUpperCase();
        if (!result.inhoud.endsWith('L')) result.inhoud += 'L';
    }
    if (!result.inhoud) {
        const inhoudMatch = text.match(/(\d+[.,]?\d*)\s*(?:L|Liter|liter|lt)/i);
        if (inhoudMatch) result.inhoud = inhoudMatch[1].replace(',', '.') + 'L';
    }

    // Datum: (bijv. "Datum: 26/01/2026")
    const datumLabelMatch = text.match(/datum[:\s]+([\d]{1,2}[\-\/\.]\s*[\d]{1,2}[\-\/\.]\s*[\d]{2,4})/i)
        || text.match(/date[:\s]+([\d]{1,2}[\-\/\.]\s*[\d]{1,2}[\-\/\.]\s*[\d]{2,4})/i);
    if (datumLabelMatch) {
        result.datum = datumLabelMatch[1].replace(/\s+/g, '');
    }

    // ============================================================
    // STAP 2: MERK HERKENNEN (exact match eerst, dan voorzichtige fuzzy)
    // ============================================================
    for (const merk of BEKENDE_MERKEN) {
        if (fullText.includes(merk.toLowerCase())) { result.merk = merk; break; }
    }
    if (!result.merk) {
        for (const word of fullText.split(/[\s\n,;:]+/)) {
            if (word.length < 4) continue;
            for (const merk of BEKENDE_MERKEN) {
                const merkLower = merk.toLowerCase();
                if (Math.abs(word.length - merkLower.length) > 3) continue;
                // Korte merken (≤4 tekens): alleen exact match
                if (merkLower.length <= 4) {
                    if (word === merkLower) { result.merk = merk; break; }
                } else {
                    // Langere merken: fuzzy met max 1 fout per 5 tekens
                    const maxDist = Math.max(1, Math.floor(merkLower.length * 0.2));
                    if (levenshtein(word, merkLower) <= maxDist) { result.merk = merk; break; }
                }
            }
            if (result.merk) break;
        }
    }

    // ============================================================
    // STAP 3: PRODUCT MATCHEN (als niet via label gevonden)
    // ============================================================
    if (!result.product) {
        for (const bp of BEKENDE_PRODUCTEN) {
            if (fullText.includes(bp.product.toLowerCase())) {
                result.product = bp.product;
                if (!result.type) result.type = bp.type;
                if (!result.categorie) result.categorie = bp.categorie;
                if (!result.merk) result.merk = bp.merk;
                break;
            }
        }
    }
    if (!result.product) {
        for (const line of lines) {
            if (line.length < 4 || line.length > 80) continue;
            for (const bp of BEKENDE_PRODUCTEN) {
                const words = bp.product.toLowerCase().split(' ').filter(w => w.length >= 2);
                const lineWords = line.toLowerCase().split(/[\s]+/).filter(w => w.length >= 2);
                let matchCount = 0;
                for (const w of words) {
                    for (const lw of lineWords) {
                        if (lw.includes(w) || w.includes(lw) || levenshtein(lw, w) <= Math.max(1, Math.floor(w.length * 0.3))) {
                            matchCount++;
                            break;
                        }
                    }
                }
                if (matchCount >= Math.max(1, words.length - 1)) {
                    result.product = bp.product;
                    if (!result.type) result.type = bp.type;
                    if (!result.categorie) result.categorie = bp.categorie;
                    if (!result.merk) result.merk = bp.merk;
                    break;
                }
            }
            if (result.product) break;
        }
    }

    // ============================================================
    // STAP 4: OVERIGE VELDEN (alleen als niet via labels gevonden)
    // ============================================================

    // RAL/NCS kleurnummer
    if (!result.kleur) {
        const ralMatch = text.match(/(?:RAL|Ral|ral)\s*(\d{4})/i);
        const ncsMatch = text.match(/(?:NCS|ncs)\s*(S?\s*\d{4}[\s-]?[A-Za-z]\d{2}[A-Za-z]?)/i);
        if (ralMatch) result.kleur = `RAL ${ralMatch[1]}`;
        else if (ncsMatch) result.kleur = `NCS ${ncsMatch[1]}`;
    }

    // Type verf + categorie
    if (!result.type) {
        for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
            for (const kw of keywords) {
                if (fullText.includes(kw)) {
                    if (!result.categorie) result.categorie = CATEGORIE_MAP[type] || '';
                    const isWater = fullText.includes('aqua') || fullText.includes('water') || fullText.includes('bl ');
                    result.type = (isWater ? 'Watergedragen ' : '') + type;
                    break;
                }
            }
            if (result.type) break;
        }
    }

    // Kleurnaam (fallback via kleur: / colour: / color:)
    if (!result.kleurNaam) {
        const kleurPatterns = [/kleur[:\s]+([^\n,]+)/i, /colour[:\s]+([^\n,]+)/i, /color[:\s]+([^\n,]+)/i];
        for (const p of kleurPatterns) {
            const m = text.match(p);
            if (m && m[1].trim().length > 1 && m[1].trim().length < 40) {
                result.kleurNaam = m[1].trim();
                break;
            }
        }
    }

    // Collectie fallback: bekende Sikkens collecties
    if (!result.collectie) {
        const collecties = ['Alpha', 'Rubbol', 'Satura', 'Wapex', 'Cetol', 'Redox', 'Buitenlak'];
        for (const c of collecties) {
            if (fullText.includes(c.toLowerCase())) {
                result.collectie = c;
                break;
            }
        }
    }
    // Alfanumerieke collectie-codes (bijv. "AC 1234", "F6.05.80")
    if (!result.collectie) {
        const codeMatch = text.match(/([A-Z]{1,2}\s*\d{1,2}[.,]\d{2}[.,]\d{2})/i);
        if (codeMatch) result.collectie = codeMatch[1].trim();
    }

    // Datum fallback (als niet via label gevonden)
    if (!result.datum) {
        const datumPatterns = [
            /([\d]{1,2}[\-\/][\d]{1,2}[\-\/][\d]{4})/,
            /([\d]{2}[\-\/][\d]{2}[\-\/][\d]{2})/,
            /(\d{4}[\-\/]\d{2}[\-\/]\d{2})/,
        ];
        for (const p of datumPatterns) {
            const m = text.match(p);
            if (m) {
                result.datum = m[1] || m[0];
                break;
            }
        }
    }
    if (!result.datum) {
        const prodMatch = text.match(/(?:prod|productie|exp|houdbaar|mfg)[.:\s]*([\d]{1,2}[\-\/\.][\d]{1,2}[\-\/\.][\d]{2,4})/i);
        if (prodMatch) result.datum = prodMatch[1];
    }

    return result;
}

// Categorie → label prefix mapping
const CATEGORIE_PREFIX = {
    'Binnen aflak': 'BA',
    'Binnen primer': 'BP',
    'Buiten primer': 'BUP',
    'Buiten voorlak': 'VL',
    'Buiten aflak': 'BUA',
    'Muurverf binnen': 'MB',
    'Muurverf buiten': 'MBU',
};

// Bepaal kleurgroep: 0=wit(licht) → 9=zwart(donker)
function getKleurGroep(kleurCode) {
    if (!kleurCode) return '0';
    const kleurLower = kleurCode.toLowerCase();
    // RAL nummer herkennen (bijv. "RAL 6018" → groep 6)
    const ralMatch = kleurLower.match(/ral\s*(\d)/);
    if (ralMatch) {
        const ralGroep = ralMatch[1];
        // RAL 9xxx: wit (9010 etc) → 0, zwart (9005 etc) → 9
        if (ralGroep === '9') {
            const ralNum = kleurLower.match(/ral\s*(\d{4})/);
            if (ralNum && ['9004', '9005', '9011', '9017'].includes(ralNum[1])) return '9';
            return '0'; // wit/crème
        }
        return ralGroep; // 1=geel, 2=oranje, 3=rood, 4=paars, 5=blauw, 6=groen, 7=grijs, 8=bruin
    }
    // Kleurnamen → RAL groep
    if (/wit|white|cr[eè]me|cream|ivoor|ivory/i.test(kleurLower)) return '0';
    if (/geel|yellow|gold/i.test(kleurLower)) return '1';
    if (/oranje|orange/i.test(kleurLower)) return '2';
    if (/rood|red|rose|roze|vermilion/i.test(kleurLower)) return '3';
    if (/paars|violet|purple|lila|magenta/i.test(kleurLower)) return '4';
    if (/blauw|blue/i.test(kleurLower)) return '5';
    if (/groen|green/i.test(kleurLower)) return '6';
    if (/grijs|grey|gray/i.test(kleurLower)) return '7';
    if (/bruin|brown|terra|umber|sienna/i.test(kleurLower)) return '8';
    if (/zwart|black|antraciet|anthracite/i.test(kleurLower)) return '9';
    return '0';
}

function generateId(items, categorie, kleur) {
    const prefix = CATEGORIE_PREFIX[categorie] || 'VF';
    const kleurGroep = getKleurGroep(kleur);
    const idPrefix = `${prefix}-${kleurGroep}-`;
    // Zoek het hoogste volgnummer met dezelfde prefix
    const maxNum = items.reduce((max, item) => {
        if (item.id && item.id.startsWith(idPrefix)) {
            const num = parseInt(item.id.replace(idPrefix, ''));
            return num > max ? num : max;
        }
        return max;
    }, 0);
    return `${idPrefix}${String(maxNum + 1).padStart(4, '0')}`;
}

export default function VerfvoorraadPage() {
    const { user, hasAccess } = useAuth();
    const [verfItems, setVerfItems] = useState(INITIAL_VERF);
    const [stap, setStap] = useState('overzicht');
    const [zoek, setZoek] = useState('');
    const [filterCat, setFilterCat] = useState('Alle');
    const [hoeveelheid, setHoeveelheid] = useState(1);
    const [fotoPreview, setFotoPreview] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzeProgress, setAnalyzeProgress] = useState(0);
    const [analyzeMethod, setAnalyzeMethod] = useState(''); // 'claude' of 'tesseract'
    const [ocrText, setOcrText] = useState('');
    const [nieuwItem, setNieuwItem] = useState(null);
    const [editResult, setEditResult] = useState(null);
    const fileRef = useRef(null);
    const printRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [cameraStatus, setCameraStatus] = useState('');
    const [liveText, setLiveText] = useState('');
    const [liveVerfInfo, setLiveVerfInfo] = useState(null);
    const liveOcrRef = useRef(null);
    const ocrBusyRef = useRef(false);

    // Callback ref: koppelt stream automatisch zodra video element mount
    const videoCallbackRef = useCallback((node) => {
        videoRef.current = node;
        if (node && streamRef.current) {
            node.srcObject = streamRef.current;
            node.setAttribute('playsinline', '');
            node.setAttribute('webkit-playsinline', '');
            node.muted = true;
            const playPromise = node.play();
            if (playPromise) {
                playPromise.then(() => setCameraStatus('Camera actief!')).catch(e => setCameraStatus('Play fout: ' + e.message));
            }
        }
    }, []);

    // — Live OCR: scan MIDDEN van het beeld, met preprocessing —
    const scanFrame = useCallback(async () => {
        if (ocrBusyRef.current) return;
        const video = videoRef.current;
        if (!video || !video.videoWidth || video.paused) return;
        ocrBusyRef.current = true;
        try {
            const vw = video.videoWidth, vh = video.videoHeight;
            // CROP: brede strook in het midden — 85% breedte × 35% hoogte (rond etiket)
            const cropW = Math.round(vw * 0.85);
            const cropH = Math.round(vh * 0.35);
            const cropX = Math.round((vw - cropW) / 2);
            const cropY = Math.round((vh - cropH) / 2);

            const canvas = document.createElement('canvas');
            const scale = Math.min(1, 1000 / cropW);
            canvas.width = Math.round(cropW * scale);
            canvas.height = Math.round(cropH * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

            // WIT-LABEL FILTER: alleen donkere tekst op wit label behouden
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imageData.data;
            for (let i = 0; i < d.length; i += 4) {
                const gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
                // Donkere tekst (<100) → zwart, al het andere → wit (inclusief gekleurd blik)
                if (gray < 100) {
                    d[i] = d[i + 1] = d[i + 2] = 0;
                } else {
                    d[i] = d[i + 1] = d[i + 2] = 255;
                }
            }
            ctx.putImageData(imageData, 0, 0);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            const result = await Tesseract.recognize(dataUrl, 'nld+eng');
            const text = result.data.text.trim();

            // KWALITEITSCHECK: alleen accepteren als de tekst echte label-patronen bevat
            const lower = text.toLowerCase();
            const hasLabelPattern = /collectie|kleurnaam|product|basis|inhoud|datum|sikkens|sigma|flexa|rubbol|cetol|alpha|satura|rezisto|hechtprimer|muurverf|grondverf|beits|liter|watergedragen/i.test(text);
            const hasStructuredField = /[a-z]+\s*:\s*[a-z]/i.test(text); // "Label: waarde" patroon
            const hasEnoughText = text.length > 15;

            if (hasEnoughText && (hasLabelPattern || hasStructuredField)) {
                setLiveText(prev => prev ? prev + '\n' + text : text);
                const newInfo = extractVerfInfo(text);
                // Alleen mergen als er echte info in zit (niet alleen ruis)
                const hasRealInfo = Object.values(newInfo).filter(v => v && v.length > 0).length >= 2;
                if (hasRealInfo) {
                    setLiveVerfInfo(prev => {
                        if (!prev) return newInfo;
                        const merged = { ...prev };
                        for (const key of Object.keys(newInfo)) {
                            if (newInfo[key] && !merged[key]) {
                                merged[key] = newInfo[key];
                            }
                        }
                        return merged;
                    });
                }
            }
        } catch (e) {
            // Stille fout bij live scan
        }
        ocrBusyRef.current = false;
    }, []);

    // Start/stop live OCR interval (elke 3 sec voor betere kwaliteit)
    useEffect(() => {
        if (stap === 'scan' && streamRef.current && !analyzing) {
            liveOcrRef.current = setInterval(scanFrame, 3000);
            return () => clearInterval(liveOcrRef.current);
        } else {
            if (liveOcrRef.current) clearInterval(liveOcrRef.current);
        }
    }, [stap, analyzing, scanFrame]);

    // — Camera starten (getUserMedia EERST voor iOS user gesture) —
    const startCamera = useCallback(async () => {
        setCameraStatus('Camera starten...');
        setLiveText('');
        setLiveVerfInfo(null);
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setCameraStatus('getUserMedia niet beschikbaar op dit apparaat');
                return;
            }
            // getUserMedia MOET het eerste async call zijn vanuit user gesture!
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            streamRef.current = stream;
            setCameraStatus('Camera actief! Tekst wordt automatisch herkend...');
            // PAS NA getUserMedia de UI updaten
            setStap('scan');
        } catch (err) {
            setCameraStatus('Fout: ' + err.name + ' - ' + err.message);
            // Bij fout: toch scan-scherm tonen zodat gebruiker het ziet
            setStap('scan');
        }
    }, []);

    // — Camera stoppen —
    const stopCamera = useCallback(() => {
        if (liveOcrRef.current) clearInterval(liveOcrRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);

    // — Frame vastleggen — altijd Claude gebruiken voor beste resultaat —
    const captureFrame = useCallback(() => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        stopCamera();
        setFotoPreview(dataUrl);
        // Altijd Claude gebruiken voor maximale nauwkeurigheid
        processImage(dataUrl);
    }, [stopCamera]);

    // Camera cleanup bij stap-wisseling
    useEffect(() => {
        if (stap !== 'scan') stopCamera();
    }, [stap, stopCamera]);

    // Cleanup bij unmount
    useEffect(() => {
        return () => {
            if (liveOcrRef.current) clearInterval(liveOcrRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        };
    }, []);


    // — Afbeelding comprimeren voor snellere API-calls —
    const compressImage = (imageDataUrl, maxDim = 1200) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                let w = img.width, h = img.height;
                if (w > maxDim || h > maxDim) {
                    const ratio = Math.min(maxDim / w, maxDim / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = imageDataUrl;
        });
    };

    // — OCR verwerking: Claude Vision API (primair) + Tesseract fallback —
    const processImage = async (imageDataUrl) => {
        setAnalyzing(true);
        setAnalyzeProgress(0);
        setAnalyzeMethod('claude');

        // ========== METHODE 1: Claude Vision API ==========
        try {
            setAnalyzeProgress(15);
            setOcrText('🤖 Claude AI analyseert het label...');

            // Comprimeer afbeelding voor snellere upload
            const compressed = await compressImage(imageDataUrl);
            setAnalyzeProgress(25);

            const response = await fetch('/api/scan-verf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: compressed }),
            });

            setAnalyzeProgress(85);

            if (!response.ok) {
                throw new Error(`API fout: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.result) {
                setAnalyzeProgress(100);
                setOcrText('✅ Claude AI analyse voltooid\n\n' + (data.rawResponse || ''));
                // Combineer kleurnaam en kleurnummer in één veld
                const r = data.result;
                const kleurParts = [r.kleurNaam, r.kleur].filter(Boolean);
                const kleurCombined = kleurParts.join(' · ');
                setEditResult({ ...r, kleurCombined });
                setAnalyzing(false);
                setStap('bevestig');
                return; // Klaar! Claude was succesvol
            } else {
                throw new Error(data.error || 'Geen resultaat');
            }
        } catch (claudeErr) {
            console.warn('Claude API niet beschikbaar, terugvallen op Tesseract:', claudeErr.message);
            setAnalyzeMethod('tesseract');
            setOcrText('⚠️ Claude niet bereikbaar, Tesseract wordt gebruikt...');
        }

        // ========== METHODE 2: Tesseract Fallback (4 passes) ==========
        try {
            setAnalyzeProgress(5);
            const versions = await preprocessImage(imageDataUrl);

            const ocr1 = await Tesseract.recognize(imageDataUrl, 'nld+eng', {
                logger: (m) => { if (m.status === 'recognizing text') setAnalyzeProgress(5 + Math.round(m.progress * 22)); }
            });
            const t1 = ocr1.data.text;

            const ocr2 = await Tesseract.recognize(versions.highContrast, 'nld+eng', {
                logger: (m) => { if (m.status === 'recognizing text') setAnalyzeProgress(27 + Math.round(m.progress * 22)); }
            });
            const t2 = ocr2.data.text;

            const ocr3 = await Tesseract.recognize(versions.binary, 'nld+eng', {
                logger: (m) => { if (m.status === 'recognizing text') setAnalyzeProgress(49 + Math.round(m.progress * 22)); }
            });
            const t3 = ocr3.data.text;

            const ocr4 = await Tesseract.recognize(versions.adaptive, 'nld+eng', {
                logger: (m) => { if (m.status === 'recognizing text') setAnalyzeProgress(71 + Math.round(m.progress * 22)); }
            });
            const t4 = ocr4.data.text;

            setAnalyzeProgress(93);
            setOcrText(
                '⚠️ Tesseract fallback gebruikt\n\n=== Origineel ===\n' + t1 +
                '\n=== Hoog Contrast ===\n' + t2 +
                '\n=== Binair (wit label) ===\n' + t3 +
                '\n=== Adaptief ===\n' + t4
            );

            const allTexts = [t1, t2, t3, t4];
            const combined = allTexts.join('\n---\n');
            const results = allTexts.map(t => extractVerfInfo(t));
            const rcombined = extractVerfInfo(combined);
            results.push(rcombined);

            const score = (r) => Object.values(r).filter(v => v && v.length > 0).length;
            let best = results.reduce((a, b) => score(a) >= score(b) ? a : b);

            for (const key of Object.keys(EMPTY_RESULT)) {
                if (!best[key]) {
                    for (const r of results) {
                        if (r[key]) { best[key] = r[key]; break; }
                    }
                }
            }

            setAnalyzeProgress(100);
            setEditResult({ ...best });
        } catch (err) {
            console.error('OCR error:', err);
            setEditResult({ ...EMPTY_RESULT });
            setOcrText('Fout bij tekstherkenning. Vul handmatig in.');
        }
        setAnalyzing(false);
        setStap('bevestig');
    };

    // — Zoeken & filteren —
    const filtered = verfItems.filter(item => {
        const matchZoek = zoek === '' ||
            item.product.toLowerCase().includes(zoek.toLowerCase()) ||
            item.merk.toLowerCase().includes(zoek.toLowerCase()) ||
            item.kleur.toLowerCase().includes(zoek.toLowerCase()) ||
            item.kleurNaam.toLowerCase().includes(zoek.toLowerCase()) ||
            item.id.toLowerCase().includes(zoek.toLowerCase());
        const matchCat = filterCat === 'Alle' || item.categorie === filterCat;
        return matchZoek && matchCat;
    });

    // — Handmatig invoeren —
    const handleHandmatig = () => {
        setFotoPreview(null);
        setEditResult({ ...EMPTY_RESULT });
        setOcrText('');
        setStap('bevestig');
    };

    // — Foto uploaden & verwerken —
    const handleFoto = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            setFotoPreview(ev.target.result);
            setStap('scan');
            processImage(ev.target.result);
        };
        reader.readAsDataURL(file);
    };

    // — Bevestigen & opslaan —
    const handleOpslaan = () => {
        const newId = generateId(verfItems, editResult.categorie, editResult.kleurCombined || editResult.kleur);
        const newItem = {
            id: newId,
            merk: editResult.merk,
            product: editResult.product,
            type: editResult.type,
            basis: editResult.basis,
            kleur: editResult.kleur,
            kleurNaam: editResult.kleurNaam,
            kleurCombined: editResult.kleurCombined,
            inhoud: editResult.inhoud,
            categorie: editResult.categorie,
            foto: fotoPreview || null,
            hoeveelheid,
            datum: new Date().toISOString().split('T')[0],
            locatie: 'Magazijn',
        };
        setVerfItems([newItem, ...verfItems]);
        setNieuwItem(newItem);
        setStap('label');
    };

    // — Label printen —
    const handlePrint = () => {
        if (!nieuwItem) return;
        const kleurGroepNamen = {
            '0': 'Lichte kleuren', '1': 'Geel tinten', '2': 'Oranje tinten',
            '3': 'Rode tinten', '4': 'Paarse tinten', '5': 'Blauwe tinten',
            '6': 'Groene tinten', '7': 'Grijze tinten', '8': 'Bruine tinten', '9': 'Donkere kleuren'
        };
        const parts = nieuwItem.id.split('-');
        const groep = parts.length >= 2 ? parts[1] : '0';
        const kleurTekst = kleurGroepNamen[groep] || '';
        const categorieTekst = nieuwItem.categorie || '';

        const win = window.open('', '_blank');
        win.document.write(`<html><head><title>Label ${nieuwItem.id}</title>
            <style>
                @page { size: 70mm 24mm; margin: 0; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: Arial, Helvetica, sans-serif;
                    width: 70mm; height: 24mm;
                    display: flex; align-items: center; justify-content: center;
                    padding: 1mm 3mm;
                    -webkit-print-color-adjust: exact;
                }
                .label {
                    width: 100%; text-align: center;
                    line-height: 1.15;
                }
                .label-id {
                    font-size: 16pt; font-weight: 900;
                    letter-spacing: 0.5px;
                    margin-bottom: 0.5px;
                }
                .label-cat {
                    font-size: 8pt; font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .label-kleur {
                    font-size: 7pt; font-weight: 400;
                    color: #333;
                }
                @media print {
                    body { margin: 0; padding: 1mm 2mm; }
                }
            </style></head><body>
            <div class="label">
                <div class="label-id">${nieuwItem.id}</div>
                <div class="label-cat">${categorieTekst}</div>
                <div class="label-kleur">${kleurTekst}</div>
            </div>
        </body></html>`);
        win.document.close();
        setTimeout(() => win.print(), 300);
    };

    // — Reset —
    const resetScan = () => {
        setStap('overzicht');
        setEditResult(null);
        setFotoPreview(null);
        setHoeveelheid(1);
        setNieuwItem(null);
        setOcrText('');
    };

    // ===== RENDER =====
    const cardStyle = { background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '24px' };

    return (
        <div className="content-area">
            {/* File input altijd in DOM (voor camera fallback op mobiel) */}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} style={{ display: 'none' }} />
            <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h1 style={{ margin: 0 }}><i className="fa-solid fa-fill-drip" style={{ color: 'var(--accent)', marginRight: '10px' }}></i>Verfvoorraad</h1>
                    {stap !== 'overzicht' && stap !== 'scan' && (
                        <button onClick={() => { if (window.confirm('Weet je zeker dat je terug wilt? Niet-opgeslagen gegevens gaan verloren.')) resetScan(); }} style={{
                            background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px',
                            padding: '10px 20px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            <i className="fa-solid fa-arrow-left"></i> Terug
                        </button>
                    )}
                </div>
                {/* Tab navigatie */}
                <div style={{
                    display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '12px', padding: '4px',
                    marginBottom: '0'
                }}>
                    {hasAccess('verfvoorraad.voorraad') && (
                        <button onClick={() => resetScan()} style={{
                            flex: 1, padding: '12px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s ease',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            background: stap !== 'scan' ? '#fff' : 'transparent',
                            color: stap !== 'scan' ? 'var(--accent)' : '#6B7280',
                            boxShadow: stap !== 'scan' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                        }}>
                            <i className="fa-solid fa-warehouse"></i> Voorraad
                        </button>
                    )}
                    {hasAccess('verfvoorraad.scan') && (
                        <button onClick={() => startCamera()} style={{
                            flex: 1, padding: '12px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s ease',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            background: stap === 'scan' ? '#fff' : 'transparent',
                            color: stap === 'scan' ? 'var(--accent)' : '#6B7280',
                            boxShadow: stap === 'scan' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                        }}>
                            <i className="fa-solid fa-camera"></i> Scan & Herken
                        </button>
                    )}
                </div>
            </div>

            {/* ========== OVERZICHT ========== */}
            {stap === 'overzicht' && (
                <div style={cardStyle}>
                    <style>{`
                        @media (max-width: 768px) {
                            .verf-desktop-table { display: none !important; }
                            .verf-mobile-cards { display: block !important; }
                            .verf-filter-row { display: none !important; }
                            .verf-search-row { flex-direction: column !important; }
                            .verf-search-row > div:first-child { min-width: 100% !important; }
                        }
                        @media (min-width: 769px) {
                            .verf-mobile-cards { display: none !important; }
                        }
                    `}</style>

                    <div className="verf-search-row" style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}></i>
                            <input type="text" placeholder="Zoek op product, merk, kleurnummer of ID..." value={zoek}
                                onChange={(e) => setZoek(e.target.value)}
                                style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div className="verf-filter-row" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {CATEGORIEEN.map(cat => (
                                <button key={cat} onClick={() => setFilterCat(cat)} style={{
                                    padding: '8px 0', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    fontSize: '0.82rem', fontWeight: 600, textAlign: 'center',
                                    minWidth: '110px', flex: '1 1 110px',
                                    background: filterCat === cat ? 'var(--accent)' : '#f1f5f9',
                                    color: filterCat === cat ? '#fff' : '#475569'
                                }}>{cat}</button>
                            ))}
                        </div>
                    </div>

                    {/* Desktop tabel */}
                    <div className="verf-desktop-table" style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                                <tr><th style={{ width: '50px' }}>Foto</th><th>ID</th><th>Merk</th><th>Product</th><th>Type</th><th>Kleur</th><th>Inhoud</th><th>Resterend</th><th>Datum</th></tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Geen resultaten gevonden</td></tr>
                                ) : filtered.map(item => (
                                    <tr key={item.id} onClick={() => { setEditResult({ ...item }); setFotoPreview(item.foto || null); setStap('bevestig'); }} style={{ cursor: 'pointer' }} title="Klik voor details">
                                        <td>
                                            {item.foto ? (
                                                <img src={item.foto} alt={item.product} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                                            ) : (
                                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <i className="fa-solid fa-fill-drip" style={{ color: '#9CA3AF', fontSize: '0.85rem' }}></i>
                                                </div>
                                            )}
                                        </td>
                                        <td><span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)' }}>{item.id}</span></td>
                                        <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.merk}</td>
                                        <td style={{ fontSize: '0.85rem', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product}</td>
                                        <td><span style={{
                                            padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                                            background: item.type.includes('grond') ? 'rgba(139,92,246,0.1)' : item.type.includes('beits') ? 'rgba(234,179,8,0.1)' : 'rgba(59,130,246,0.1)',
                                            color: item.type.includes('grond') ? '#7c3aed' : item.type.includes('beits') ? '#b45309' : '#2563eb'
                                        }}>{item.type}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{
                                                    width: '20px', height: '20px', borderRadius: '5px',
                                                    background: getKleurHex(item.kleur) || '#e2e8f0',
                                                    border: '2px solid #e2e8f0', flexShrink: 0
                                                }}></div>
                                                <div style={{ lineHeight: 1.2 }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{item.kleur}</span>
                                                    {item.kleurNaam && <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>{item.kleurNaam}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '0.85rem' }}>{item.inhoud}</td>
                                        <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.werkelijkeInhoud || item.inhoud || '—'}</td>
                                        <td style={{ fontSize: '0.8rem', color: '#6B7280' }}>{item.datum}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobiele kaarten */}
                    <div className="verf-mobile-cards">
                        {filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Geen resultaten gevonden</div>
                        ) : filtered.map(item => (
                            <div key={item.id} onClick={() => { setEditResult({ ...item }); setFotoPreview(item.foto || null); setStap('bevestig'); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                                    borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                                    transition: 'background 0.15s'
                                }}
                            >
                                {/* Photo / color swatch */}
                                <div style={{ flexShrink: 0 }}>
                                    {item.foto ? (
                                        <img src={item.foto} alt={item.product} style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                                    ) : (
                                        <div style={{
                                            width: '48px', height: '48px', borderRadius: '10px',
                                            background: getKleurHex(item.kleur) || '#f1f5f9',
                                            border: '2px solid #e2e8f0',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <i className="fa-solid fa-fill-drip" style={{ color: '#fff', fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}></i>
                                        </div>
                                    )}
                                </div>
                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)' }}>{item.id}</span>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>{item.merk}</span>
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: getKleurHex(item.kleur) || '#e2e8f0', border: '1px solid #d1d5db', flexShrink: 0 }}></div>
                                        <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>{item.kleurNaam || item.kleur}</span>
                                        <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>•</span>
                                        <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>{item.werkelijkeInhoud || item.inhoud}</span>
                                    </div>
                                </div>
                                {/* Actions */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`${item.product} (${item.id}) verwijderen?`)) {
                                                setVerfItems(prev => prev.filter(v => v.id !== item.id));
                                            }
                                        }}
                                        style={{
                                            background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: '8px',
                                            width: '32px', height: '32px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        <i className="fa-solid fa-trash-can" style={{ color: '#ef4444', fontSize: '0.75rem' }}></i>
                                    </button>
                                    <i className="fa-solid fa-chevron-right" style={{ color: '#d1d5db', fontSize: '0.65rem' }}></i>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ========== SCAN (LIVE CAMERA) ========== */}
            {stap === 'scan' && (
                <div style={{ ...cardStyle, textAlign: 'center', maxWidth: '600px', margin: '0 auto', padding: '8px', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100dvh - 80px)', overflow: 'hidden' }}>
                    <style>{`
                        @media (max-width: 600px) {
                            .scan-card { padding: 6px !important; }
                            .scan-camera-status { display: none !important; }
                            .scan-camera-feed { min-height: 180px !important; max-height: 40vh !important; }
                            .scan-buttons { gap: 8px !important; }
                            .scan-buttons button { padding: 8px 12px !important; font-size: 0.8rem !important; }
                            .scan-capture-btn { width: 52px !important; height: 52px !important; }
                            .scan-label-grid { grid-template-columns: 1fr !important; gap: 2px !important; }
                            .scan-label-header { padding: 6px 12px !important; font-size: 0.85rem !important; }
                            .scan-label-body { padding: 8px 12px !important; }
                            .scan-status-bar { margin-bottom: 4px !important; }
                            .bevestig-grid { grid-template-columns: 1fr !important; }
                            .bevestig-layout { flex-direction: column !important; gap: 12px !important; }
                            .bevestig-foto { width: 100% !important; height: 140px !important; }
                            .bevestig-content { min-width: 0 !important; }
                        }
                    `}</style>

                    {/* Camera status — verborgen op mobiel */}
                    {cameraStatus && (
                        <div className="scan-camera-status" style={{ marginBottom: '8px', padding: '6px 12px', background: cameraStatus.includes('actief') ? '#dcfce7' : cameraStatus.includes('Fout') ? '#fee2e2' : '#fef3c7', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#333' }}>
                            📋 {cameraStatus}
                        </div>
                    )}

                    {/* Live camera feed */}
                    {!analyzing && !fotoPreview && (
                        <>
                            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000', marginBottom: '8px', flex: '0 0 auto' }}>
                                <video
                                    ref={videoCallbackRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    onLoadedMetadata={(e) => e.target.play().catch(() => { })}
                                    className="scan-camera-feed"
                                    style={{ width: '100%', minHeight: '200px', maxHeight: '280px', objectFit: 'cover', display: 'block' }}
                                />
                                {/* Groene laser scanner overlay */}
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {/* Scanner frame met groene hoeken */}
                                    <div style={{
                                        width: '85%', height: '45%',
                                        position: 'relative'
                                    }}>
                                        {/* Hoek linksboven */}
                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '30px', height: '30px', borderTop: '3px solid #00ff41', borderLeft: '3px solid #00ff41', borderRadius: '4px 0 0 0', boxShadow: '-2px -2px 8px rgba(0,255,65,0.5)' }}></div>
                                        {/* Hoek rechtsboven */}
                                        <div style={{ position: 'absolute', top: 0, right: 0, width: '30px', height: '30px', borderTop: '3px solid #00ff41', borderRight: '3px solid #00ff41', borderRadius: '0 4px 0 0', boxShadow: '2px -2px 8px rgba(0,255,65,0.5)' }}></div>
                                        {/* Hoek linksonder */}
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '30px', height: '30px', borderBottom: '3px solid #00ff41', borderLeft: '3px solid #00ff41', borderRadius: '0 0 0 4px', boxShadow: '-2px 2px 8px rgba(0,255,65,0.5)' }}></div>
                                        {/* Hoek rechtsonder */}
                                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '30px', height: '30px', borderBottom: '3px solid #00ff41', borderRight: '3px solid #00ff41', borderRadius: '0 0 4px 0', boxShadow: '2px 2px 8px rgba(0,255,65,0.5)' }}></div>

                                        {/* Laser lijn 1 — horizontaal scannend */}
                                        <div style={{
                                            position: 'absolute', left: '5%', right: '5%', height: '2px',
                                            background: 'linear-gradient(90deg, transparent, #00ff41, rgba(0,255,65,0.8), #00ff41, transparent)',
                                            boxShadow: '0 0 12px rgba(0,255,65,0.8), 0 0 30px rgba(0,255,65,0.4)',
                                            animation: 'laserScan 2.5s ease-in-out infinite',
                                            top: '50%'
                                        }} />

                                        {/* Laser lijn 2 — langzamer, subtiel */}
                                        <div style={{
                                            position: 'absolute', left: '10%', right: '10%', height: '1px',
                                            background: 'linear-gradient(90deg, transparent, rgba(0,255,65,0.5), transparent)',
                                            boxShadow: '0 0 6px rgba(0,255,65,0.4)',
                                            animation: 'laserScan2 3.5s ease-in-out infinite',
                                            top: '50%'
                                        }} />

                                        {/* Groene gloed rand */}
                                        <div style={{
                                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                            border: '1px solid rgba(0,255,65,0.15)',
                                            borderRadius: '4px',
                                            boxShadow: 'inset 0 0 30px rgba(0,255,65,0.05)'
                                        }}></div>
                                    </div>
                                </div>
                                <div style={{
                                    position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
                                    background: 'rgba(0,20,0,0.7)', color: '#00ff41', padding: '6px 16px',
                                    borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                                    border: '1px solid rgba(0,255,65,0.3)',
                                    textShadow: '0 0 8px rgba(0,255,65,0.5)'
                                }}>📷 Richt op het label</div>
                            </div>
                            <style>{`
                                @keyframes laserScan { 0%, 100% { top: 10%; opacity: 0.6; } 50% { top: 85%; opacity: 1; } }
                                @keyframes laserScan2 { 0%, 100% { top: 80%; opacity: 0.3; } 50% { top: 15%; opacity: 0.7; } }
                            `}</style>
                            <div className="scan-buttons" style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', flex: '0 0 auto' }}>
                                <button onClick={() => fileRef.current?.click()} style={{
                                    background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px',
                                    padding: '10px 18px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}>
                                    <i className="fa-solid fa-image"></i> Foto kiezen
                                </button>
                                <button onClick={captureFrame} style={{
                                    background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '50%',
                                    width: '64px', height: '64px', cursor: 'pointer', fontSize: '1.5rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 20px rgba(245,133,10,0.4)'
                                }}>
                                    <i className="fa-solid fa-camera"></i>
                                </button>
                                <button onClick={handleHandmatig} style={{
                                    background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px',
                                    padding: '10px 18px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}>
                                    <i className="fa-solid fa-pen"></i> Handmatig
                                </button>
                            </div>
                        </>
                    )}

                    {/* Analyse voortgang */}
                    {(analyzing || fotoPreview) && (
                        <div>
                            {fotoPreview && (
                                <img src={fotoPreview} alt="Wordt geanalyseerd" style={{
                                    maxWidth: '100%', maxHeight: '250px', borderRadius: '12px',
                                    objectFit: 'cover', border: '2px solid #e2e8f0', marginBottom: '16px',
                                    opacity: analyzing ? 0.7 : 1
                                }} />
                            )}
                            {analyzing && (
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                                    background: analyzeMethod === 'claude'
                                        ? 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(245,133,10,0.08))'
                                        : 'rgba(245,133,10,0.08)',
                                    padding: '28px 36px', borderRadius: '16px',
                                    border: analyzeMethod === 'claude' ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(245,133,10,0.15)'
                                }}>
                                    {analyzeMethod === 'claude' ? (
                                        <div style={{
                                            width: '48px', height: '48px', borderRadius: '14px',
                                            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            animation: 'claudePulse 2s ease-in-out infinite',
                                            boxShadow: '0 4px 20px rgba(139,92,246,0.3)'
                                        }}>
                                            <span style={{ fontSize: '1.4rem' }}>🤖</span>
                                        </div>
                                    ) : (
                                        <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--accent)', fontSize: '1.8rem' }}></i>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>
                                            {analyzeMethod === 'claude' ? 'Claude AI analyseert...' : 'Tesseract verwerkt...'}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                                            {analyzeMethod === 'claude'
                                                ? (analyzeProgress < 25 ? 'Afbeelding comprimeren...' : analyzeProgress < 85 ? 'Label wordt gelezen door AI...' : 'Bijna klaar...')
                                                : `Pass ${Math.ceil(analyzeProgress / 25)} van 4`
                                            }
                                        </span>
                                    </div>
                                    <div style={{ width: '240px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${analyzeProgress}%`, height: '100%',
                                            backgroundImage: analyzeMethod === 'claude'
                                                ? 'linear-gradient(90deg, #8b5cf6, #6d28d9, #8b5cf6)'
                                                : 'none',
                                            backgroundColor: analyzeMethod === 'claude' ? undefined : 'var(--accent)',
                                            backgroundSize: '200% 100%',
                                            animation: analyzeMethod === 'claude' ? 'shimmer 1.5s ease-in-out infinite' : 'none',
                                            borderRadius: '3px', transition: 'width 0.4s ease'
                                        }}></div>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: analyzeMethod === 'claude' ? '#7c3aed' : 'var(--accent)' }}>
                                        {analyzeProgress}%
                                    </span>
                                </div>
                            )}
                            <style>{`
                                @keyframes claudePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
                                @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
                            `}</style>
                        </div>
                    )}
                </div>
            )}

            {/* ========== BEVESTIG ========== */}
            {stap === 'bevestig' && editResult && (
                <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 8px' }}>
                    <div style={{ ...cardStyle, marginBottom: '20px', padding: '16px' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            background: ocrText ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)',
                            color: ocrText ? '#16a34a' : '#2563eb',
                            padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '12px'
                        }}>
                            <i className={`fa-solid ${ocrText ? 'fa-check-circle' : 'fa-pen'}`}></i>
                            {ocrText ? 'Tekstherkenning voltooid — controleer de gegevens' : 'Handmatig invoeren'}
                        </div>
                        <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem' }}>Gegevens bevestigen</h3>

                        {/* Velden als label - waarde rijen */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                { label: 'Merk', key: 'merk', placeholder: 'bijv. Sikkens', bold: true },
                                { label: 'Product', key: 'product', placeholder: 'bijv. Rubbol BL Rezisto Satin', bold: true },
                                { label: 'Kleur', key: 'kleurCombined', placeholder: 'bijv. White Clay / F6.05.80', bold: true },
                                { label: 'Collectie', key: 'collectie', placeholder: 'bijv. Zoffany Paints' },
                                { label: 'Datum', key: 'datum', placeholder: 'bijv. 26/01/2026' },
                                { label: 'Inhoud', key: 'inhoud', placeholder: 'bijv. 1L, 2.5L' },
                                { label: 'Basis', key: 'basis', placeholder: 'bijv. W05' },
                                { label: 'Winkel', key: 'winkel', placeholder: 'bijv. Sikkens Noordwijk 1', bold: true },
                                { label: 'Type', key: 'type', placeholder: 'bijv. Watergedragen lakverf' },
                            ].map(field => (
                                <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label style={{
                                        fontSize: '0.8rem', fontWeight: 600, color: '#6B7280',
                                        minWidth: '70px', flexShrink: 0
                                    }}>{field.label}</label>
                                    <input type="text" value={editResult[field.key]} placeholder={field.placeholder}
                                        onChange={(e) => setEditResult({ ...editResult, [field.key]: e.target.value })}
                                        style={{
                                            flex: 1, padding: '8px 12px', borderRadius: '8px',
                                            border: editResult[field.key] ? '1px solid #22c55e' : '1px solid #fbbf24',
                                            fontSize: '0.9rem', boxSizing: 'border-box',
                                            background: editResult[field.key] ? '#f0fdf4' : '#fffbeb',
                                            fontWeight: field.bold ? 700 : 400
                                        }}
                                    />
                                </div>
                            ))}

                            {/* Categorie dropdown */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{
                                    fontSize: '0.8rem', fontWeight: 600, color: '#6B7280',
                                    minWidth: '70px', flexShrink: 0
                                }}>Categorie</label>
                                <select value={editResult.categorie}
                                    onChange={(e) => setEditResult({ ...editResult, categorie: e.target.value })}
                                    style={{
                                        flex: 1, padding: '8px 12px', borderRadius: '8px',
                                        border: editResult.categorie ? '1px solid #22c55e' : '1px solid #fbbf24',
                                        fontSize: '0.9rem', boxSizing: 'border-box',
                                        background: editResult.categorie ? '#f0fdf4' : '#fffbeb',
                                        cursor: 'pointer', appearance: 'auto'
                                    }}
                                >
                                    <option value="">Kies categorie...</option>
                                    <option value="Binnen aflak">Binnen aflak</option>
                                    <option value="Binnen primer">Binnen primer</option>
                                    <option value="Buiten primer">Buiten primer</option>
                                    <option value="Buiten voorlak">Buiten voorlak</option>
                                    <option value="Buiten aflak">Buiten aflak</option>
                                    <option value="Muurverf binnen">Muurverf binnen</option>
                                    <option value="Muurverf buiten">Muurverf buiten</option>
                                </select>
                            </div>
                        </div>

                        {/* Bijlage foto */}
                        {fotoPreview && (
                            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '8px' }}>
                                    <i className="fa-solid fa-paperclip" style={{ marginRight: '6px' }}></i>Bijlage foto
                                </label>
                                <img src={fotoPreview} alt="Scan" style={{
                                    width: '100%', maxHeight: '200px', borderRadius: '10px',
                                    objectFit: 'cover', border: '1px solid #e2e8f0'
                                }} />
                            </div>
                        )}

                        {/* OCR-tekst tonen */}
                        {ocrText && (
                            <details style={{ marginTop: '16px' }}>
                                <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#6B7280' }}>
                                    <i className="fa-solid fa-file-lines" style={{ marginRight: '6px' }}></i>
                                    Herkende tekst van foto bekijken
                                </summary>
                                <pre style={{
                                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                                    padding: '12px', fontSize: '0.8rem', color: '#475569', whiteSpace: 'pre-wrap',
                                    marginTop: '8px', maxHeight: '200px', overflow: 'auto'
                                }}>{ocrText}</pre>
                            </details>
                        )}
                    </div>

                    {/* Overgebleven inhoud — selectie knoppen */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '8px' }}>
                            <i className="fa-solid fa-fill-drip" style={{ color: 'var(--accent)', marginRight: '6px' }}></i>
                            Overgebleven inhoud verf
                        </label>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {['0.25L', '0.5L', '0.75L', '1L', '1.5L', '2L', '2.5L', '5L', '7.5L', '10L'].map(size => (
                                <button key={size} onClick={() => setEditResult({ ...editResult, werkelijkeInhoud: size })} style={{
                                    padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                    fontSize: '0.9rem', fontWeight: 700,
                                    background: editResult.werkelijkeInhoud === size ? 'var(--accent)' : '#f1f5f9',
                                    color: editResult.werkelijkeInhoud === size ? '#fff' : '#475569',
                                    boxShadow: editResult.werkelijkeInhoud === size ? '0 2px 8px rgba(245,133,10,0.3)' : 'none',
                                    transition: 'all 0.15s ease'
                                }}>{size}</button>
                            ))}
                        </div>
                    </div>

                    {editResult.id ? (
                        /* Bestaand item uit database — wijzigingen opslaan + label bekijken */
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button onClick={() => {
                                setVerfItems(prev => prev.map(v => v.id === editResult.id ? { ...editResult } : v));
                                alert('✅ Wijzigingen opgeslagen!');
                            }} style={{
                                flex: 1, background: 'var(--accent)', color: '#fff', border: 'none',
                                borderRadius: '12px', padding: '16px', fontWeight: 700, fontSize: '1rem',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}>
                                <i className="fa-solid fa-check"></i> Wijzigingen opslaan
                            </button>
                            <button onClick={() => { setNieuwItem(editResult); setStap('label'); }} style={{
                                flex: 1, background: '#22c55e', color: '#fff', border: 'none',
                                borderRadius: '12px', padding: '16px', fontWeight: 700, fontSize: '1rem',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}>
                                <i className="fa-solid fa-tag"></i> Label weergeven
                            </button>
                        </div>
                    ) : (
                        /* Nieuw item — opslaan & label genereren */
                        <button onClick={handleOpslaan} style={{
                            width: '100%', background: 'var(--accent)', color: '#fff', border: 'none',
                            borderRadius: '12px', padding: '16px', fontWeight: 700, fontSize: '1.05rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                        }}>
                            <i className="fa-solid fa-check"></i> Opslaan & Label genereren
                        </button>
                    )}
                </div>
            )}

            {/* ========== LABEL ========== */}
            {stap === 'label' && nieuwItem && (
                <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ ...cardStyle, marginBottom: '20px' }}>
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '50%',
                            background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            <i className="fa-solid fa-check" style={{ fontSize: '1.5rem', color: '#22c55e' }}></i>
                        </div>
                        <h2 style={{ margin: '0 0 8px' }}>Verf geregistreerd!</h2>
                        <p style={{ color: '#6B7280', marginBottom: '24px' }}>
                            {nieuwItem.hoeveelheid}x {nieuwItem.merk} {nieuwItem.product} toegevoegd aan de voorraad.
                        </p>

                        <div ref={printRef}>
                            <div style={{
                                border: '3px dashed #F5850A', borderRadius: '16px', padding: '24px',
                                maxWidth: '320px', margin: '0 auto', background: '#fff', textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#F5850A' }}>{nieuwItem.id}</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginTop: '6px' }}>
                                    {nieuwItem.categorie}
                                </div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#6B7280', marginTop: '2px' }}>
                                    {(() => {
                                        const kleurGroepNamen = {
                                            '0': 'Lichte kleuren', '1': 'Geel tinten', '2': 'Oranje tinten',
                                            '3': 'Rode tinten', '4': 'Paarse tinten', '5': 'Blauwe tinten',
                                            '6': 'Groene tinten', '7': 'Grijze tinten', '8': 'Bruine tinten', '9': 'Donkere kleuren'
                                        };
                                        const parts = nieuwItem.id.split('-');
                                        const groep = parts.length >= 2 ? parts[1] : '0';
                                        return kleurGroepNamen[groep] || '';
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
                            <button onClick={handlePrint} style={{
                                background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '12px',
                                padding: '12px 28px', fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                                <i className="fa-solid fa-print"></i> Label Printen
                            </button>
                            <button onClick={() => alert('✅ Label opgeslagen in database!')} style={{
                                background: '#22c55e', color: '#fff', border: 'none', borderRadius: '12px',
                                padding: '12px 28px', fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                                <i className="fa-solid fa-database"></i> Opslaan in database
                            </button>
                            <button onClick={() => { setStap('scan'); setFotoPreview(null); setOcrText(''); }} style={{
                                background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px',
                                padding: '12px 28px', fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                                <i className="fa-solid fa-camera"></i> Nog een scannen
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}
