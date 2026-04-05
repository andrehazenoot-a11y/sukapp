/**
 * OnderhoudNL Basisverf- en Glasbestek 2020
 * Gestructureerde data voor alle verfbestek categorieën
 *
 * Code structuur: [N/O][substraat][afwerking][nummer]
 *   N = Nieuwbouw, O = Onderhoud
 *   H = Hout, M = Metaal, S = Steenachtig, K = Kunststof
 *   D = Dekkend, T = Transparante beits, V = Vernis
 *   MS = Metaal Staal, MV = Metaal Verzinkt, MA = Metaal Aluminium
 *   SD = Steenachtig Dekkend, SV = Steenachtig Vloeren
 *   01-49 = buiten, 50-99 = binnen
 */

export const BESTEK = {

  // ─── ONDERHOUD HOUT DEKKEND (OHD) ───────────────────────────────────────────
  OHD: {
    buiten: {
      '01': {
        naam: 'Plaatselijk schrapen, 1x bijwerken grondverf, 1x bijwerken dekverf',
        stappen: [
          'Plaatselijk schrapen en schuren van los zittende verf',
          'Losse stopverf / kit verwijderen',
          'Reinigen en plaatselijk opschuren',
          'Grondverf plaatselijk aanbrengen',
          'Uitstoppen en afkitten',
          'Dekverf plaatselijk aanbrengen',
        ],
      },
      '02': {
        naam: 'Plaatselijk schrapen, 1x bijwerken grondverf, 1x geheel dekverf',
        stappen: [
          'Plaatselijk schrapen en schuren van los zittende verf',
          'Losse stopverf / kit verwijderen',
          'Reinigen en algeheel opschuren',
          'Grondverf plaatselijk aanbrengen',
          'Uitstoppen en afkitten',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '03': {
        naam: 'Plaatselijk verwijderen, 1x bijwerken grondverf, 1x geheel grondverf, 1x geheel dekverf',
        stappen: [
          'Plaatselijk verwijderen van los zittende verflagen',
          'Losse stopverf / kit verwijderen',
          'Reinigen en algeheel opschuren',
          'Grondverf plaatselijk aanbrengen op blanke plekken',
          'Uitstoppen en afkitten',
          'Grondverf geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '04': {
        naam: 'Geheel verwijderen tot blank, 1x grondverf, 1x dekverf',
        stappen: [
          'Geheel verwijderen van alle verflagen tot blank hout',
          'Reinigen en schuren',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen en afkitten',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '05': {
        naam: 'Geheel verwijderen tot blank, 2x grondverf, 1x dekverf',
        stappen: [
          'Geheel verwijderen van alle verflagen tot blank hout',
          'Reinigen en schuren',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen en afkitten (tussenbehandeling)',
          'Grondverf geheel aanbrengen (2x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '06': {
        naam: 'Geheel verwijderen tot blank, 1x grondverf, 1x tussenlaag, 1x dekverf',
        stappen: [
          'Geheel verwijderen van alle verflagen tot blank hout',
          'Reinigen en schuren',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen en afkitten',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '07': {
        naam: 'Geheel verwijderen tot blank, 2x grondverf, 1x tussenlaag, 1x dekverf',
        stappen: [
          'Geheel verwijderen van alle verflagen tot blank hout',
          'Reinigen en schuren',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen en afkitten',
          'Grondverf geheel aanbrengen (2x)',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '08': {
        naam: 'Geheel verwijderen tot blank, 1x grondverf, 2x tussenlaag, 1x dekverf',
        stappen: [
          'Geheel verwijderen van alle verflagen tot blank hout',
          'Reinigen en schuren',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen en afkitten',
          'Tussenlaag geheel aanbrengen (2x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '09': {
        naam: 'Geheel verwijderen tot blank, 1x grondverf, 2x tussenlaag, 2x dekverf',
        stappen: [
          'Geheel verwijderen van alle verflagen tot blank hout',
          'Reinigen en schuren',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen en afkitten',
          'Tussenlaag geheel aanbrengen (2x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (2x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Plaatselijk schrapen, 1x bijwerken grondverf, 1x bijwerken dekverf (binnen)',
        stappen: [
          'Plaatselijk schrapen en schuren van los zittende verf',
          'Reinigen',
          'Grondverf plaatselijk aanbrengen',
          'Uitstoppen',
          'Dekverf plaatselijk aanbrengen',
        ],
      },
      '51': {
        naam: 'Plaatselijk schrapen, 1x bijwerken grondverf, 1x geheel dekverf (binnen)',
        stappen: [
          'Plaatselijk schrapen en schuren van los zittende verf',
          'Reinigen en algeheel opschuren',
          'Grondverf plaatselijk aanbrengen',
          'Uitstoppen',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '52': {
        naam: 'Geheel verwijderen tot blank, 1x grondverf, 1x dekverf (binnen)',
        stappen: [
          'Geheel verwijderen van alle verflagen tot blank hout',
          'Reinigen en schuren',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '53': {
        naam: 'Geheel verwijderen tot blank, 1x grondverf, 1x tussenlaag, 1x dekverf (binnen)',
        stappen: [
          'Geheel verwijderen van alle verflagen tot blank hout',
          'Reinigen en schuren',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
  },

  // ─── ONDERHOUD HOUT TRANSPARANTE BEITS (OHT) ────────────────────────────────
  OHT: {
    buiten: {
      '01': {
        naam: 'Plaatselijk behandelen, 1x bijwerken transparante beits',
        stappen: [
          'Plaatselijk schuren van verweerde / loslaten beitslagen',
          'Reinigen',
          'Transparante beits plaatselijk aanbrengen (1x)',
        ],
      },
      '02': {
        naam: 'Algeheel opschuren, 1x geheel transparante beits',
        stappen: [
          'Algeheel opschuren van het oppervlak',
          'Reinigen',
          'Transparante beits geheel aanbrengen (1x)',
        ],
      },
      '03': {
        naam: 'Algeheel opschuren, 2x geheel transparante beits',
        stappen: [
          'Algeheel opschuren van het oppervlak',
          'Reinigen',
          'Transparante beits geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Transparante beits geheel aanbrengen (2x)',
        ],
      },
      '04': {
        naam: 'Geheel verwijderen tot blank, 1x grondbehandeling, 2x transparante beits',
        stappen: [
          'Geheel verwijderen van alle beitslagen tot blank hout',
          'Reinigen en schuren',
          'Grondbehandeling / primer aanbrengen (1x)',
          'Transparante beits geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Transparante beits geheel aanbrengen (2x)',
        ],
      },
      '05': {
        naam: 'Geheel verwijderen tot blank, 1x grondbehandeling, 3x transparante beits',
        stappen: [
          'Geheel verwijderen van alle beitslagen tot blank hout',
          'Reinigen en schuren',
          'Grondbehandeling / primer aanbrengen (1x)',
          'Transparante beits geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Transparante beits geheel aanbrengen (2x)',
          'Licht opschuren na droging',
          'Transparante beits geheel aanbrengen (3x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Algeheel opschuren, 1x geheel transparante beits (binnen)',
        stappen: [
          'Algeheel opschuren van het oppervlak',
          'Reinigen',
          'Transparante beits geheel aanbrengen (1x)',
        ],
      },
      '51': {
        naam: 'Geheel verwijderen tot blank, 1x grondbehandeling, 2x transparante beits (binnen)',
        stappen: [
          'Geheel verwijderen van alle beitslagen tot blank hout',
          'Reinigen en schuren',
          'Grondbehandeling / primer aanbrengen (1x)',
          'Transparante beits geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Transparante beits geheel aanbrengen (2x)',
        ],
      },
    },
  },

  // ─── ONDERHOUD HOUT VERNIS (OHV) ────────────────────────────────────────────
  OHV: {
    buiten: {
      '01': {
        naam: 'Plaatselijk schuren, 1x bijwerken vernis',
        stappen: [
          'Plaatselijk schuren van verweerde / gebarsten vernislagen',
          'Reinigen',
          'Vernis plaatselijk aanbrengen (1x)',
        ],
      },
      '02': {
        naam: 'Algeheel opschuren, 1x geheel vernis',
        stappen: [
          'Algeheel opschuren',
          'Reinigen',
          'Vernis geheel aanbrengen (1x)',
        ],
      },
      '03': {
        naam: 'Algeheel opschuren, 2x geheel vernis',
        stappen: [
          'Algeheel opschuren',
          'Reinigen',
          'Vernis geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Vernis geheel aanbrengen (2x)',
        ],
      },
      '04': {
        naam: 'Geheel verwijderen tot blank, 1x grondlaag vernis, 2x vernis',
        stappen: [
          'Geheel verwijderen van alle vernislagen tot blank hout',
          'Reinigen en schuren',
          'Grondlaag vernis aanbrengen (1x)',
          'Licht opschuren na droging',
          'Vernis geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Vernis geheel aanbrengen (2x)',
        ],
      },
      '05': {
        naam: 'Geheel verwijderen tot blank, 1x grondlaag vernis, 3x vernis',
        stappen: [
          'Geheel verwijderen van alle vernislagen tot blank hout',
          'Reinigen en schuren',
          'Grondlaag vernis aanbrengen (1x)',
          'Licht opschuren na droging',
          'Vernis geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Vernis geheel aanbrengen (2x)',
          'Licht opschuren na droging',
          'Vernis geheel aanbrengen (3x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Algeheel opschuren, 1x geheel vernis (binnen)',
        stappen: [
          'Algeheel opschuren',
          'Reinigen',
          'Vernis geheel aanbrengen (1x)',
        ],
      },
      '51': {
        naam: 'Geheel verwijderen tot blank, 1x grondlaag vernis, 2x vernis (binnen)',
        stappen: [
          'Geheel verwijderen van alle vernislagen tot blank hout',
          'Reinigen en schuren',
          'Grondlaag vernis aanbrengen (1x)',
          'Vernis geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Vernis geheel aanbrengen (2x)',
        ],
      },
    },
  },

  // ─── ONDERHOUD METAAL STAAL (OMS) ───────────────────────────────────────────
  OMS: {
    buiten: {
      '01': {
        naam: 'Plaatselijk ontroesten, 1x bijwerken menie/primer, 1x bijwerken dekverf',
        stappen: [
          'Plaatselijk ontroesten (schuren / beitsen)',
          'Reinigen en ontvetten',
          'Menie / corrosiewerende primer plaatselijk aanbrengen (1x)',
          'Dekverf plaatselijk aanbrengen (1x)',
        ],
      },
      '02': {
        naam: 'Plaatselijk ontroesten, 1x bijwerken menie/primer, 1x geheel dekverf',
        stappen: [
          'Plaatselijk ontroesten (schuren / beitsen)',
          'Reinigen, ontvetten en algeheel opschuren',
          'Menie / corrosiewerende primer plaatselijk aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '03': {
        naam: 'Geheel ontroesten, 1x menie/primer, 1x dekverf',
        stappen: [
          'Geheel ontroesten (stralen St 2½ of Sa 2½)',
          'Reinigen en ontvetten',
          'Menie / corrosiewerende primer geheel aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '04': {
        naam: 'Geheel ontroesten, 1x menie/primer, 1x tussenlaag, 1x dekverf',
        stappen: [
          'Geheel ontroesten (stralen Sa 2½)',
          'Reinigen en ontvetten',
          'Menie / corrosiewerende primer geheel aanbrengen (1x)',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '05': {
        naam: 'Geheel ontroesten, 2x menie/primer, 1x tussenlaag, 1x dekverf',
        stappen: [
          'Geheel ontroesten (stralen Sa 2½)',
          'Reinigen en ontvetten',
          'Menie / corrosiewerende primer geheel aanbrengen (1x)',
          'Menie / corrosiewerende primer geheel aanbrengen (2x)',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Plaatselijk ontroesten, 1x bijwerken primer, 1x bijwerken dekverf (binnen)',
        stappen: [
          'Plaatselijk ontroesten (schuren)',
          'Reinigen en ontvetten',
          'Corrosiewerende primer plaatselijk aanbrengen (1x)',
          'Dekverf plaatselijk aanbrengen (1x)',
        ],
      },
      '51': {
        naam: 'Geheel ontroesten, 1x primer, 1x dekverf (binnen)',
        stappen: [
          'Geheel ontroesten',
          'Reinigen en ontvetten',
          'Corrosiewerende primer geheel aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
  },

  // ─── ONDERHOUD METAAL VERZINKT (OMV) ────────────────────────────────────────
  OMV: {
    buiten: {
      '01': {
        naam: 'Reinigen, 1x bijwerken primer, 1x bijwerken dekverf (verzinkt)',
        stappen: [
          'Reinigen en ontvetten van het verzinkte oppervlak',
          'Licht opschuren / etsen',
          'Primer voor verzinkt staal plaatselijk aanbrengen (1x)',
          'Dekverf plaatselijk aanbrengen (1x)',
        ],
      },
      '02': {
        naam: 'Reinigen, 1x primer, 1x dekverf (verzinkt)',
        stappen: [
          'Reinigen en ontvetten van het verzinkte oppervlak',
          'Licht opschuren / etsen',
          'Primer voor verzinkt staal geheel aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '03': {
        naam: 'Reinigen, 1x primer, 1x tussenlaag, 1x dekverf (verzinkt)',
        stappen: [
          'Reinigen en ontvetten van het verzinkte oppervlak',
          'Licht opschuren / etsen',
          'Primer voor verzinkt staal geheel aanbrengen (1x)',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Reinigen, 1x primer, 1x dekverf (verzinkt, binnen)',
        stappen: [
          'Reinigen en ontvetten van het verzinkte oppervlak',
          'Licht opschuren',
          'Primer voor verzinkt staal geheel aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
  },

  // ─── ONDERHOUD METAAL ALUMINIUM (OMA) ───────────────────────────────────────
  OMA: {
    buiten: {
      '01': {
        naam: 'Reinigen, 1x bijwerken primer, 1x bijwerken dekverf (aluminium)',
        stappen: [
          'Reinigen en ontvetten van het aluminium oppervlak',
          'Licht opschuren / etsen',
          'Primer voor aluminium plaatselijk aanbrengen (1x)',
          'Dekverf plaatselijk aanbrengen (1x)',
        ],
      },
      '02': {
        naam: 'Reinigen, 1x primer, 1x dekverf (aluminium)',
        stappen: [
          'Reinigen en ontvetten van het aluminium oppervlak',
          'Licht opschuren / etsen',
          'Primer voor aluminium geheel aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '03': {
        naam: 'Reinigen, 1x primer, 1x tussenlaag, 1x dekverf (aluminium)',
        stappen: [
          'Reinigen en ontvetten van het aluminium oppervlak',
          'Licht opschuren / etsen',
          'Primer voor aluminium geheel aanbrengen (1x)',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Reinigen, 1x primer, 1x dekverf (aluminium, binnen)',
        stappen: [
          'Reinigen en ontvetten van het aluminium oppervlak',
          'Licht opschuren',
          'Primer voor aluminium geheel aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
  },

  // ─── ONDERHOUD STEENACHTIG DEKKEND (OSD) ────────────────────────────────────
  OSD: {
    buiten: {
      '01': {
        naam: 'Reinigen, 1x bijwerken gevelverf',
        stappen: [
          'Reiniging van het steenachtige oppervlak (hogedrukreinigen)',
          'Laten drogen',
          'Gevelverf / steenverf plaatselijk aanbrengen (1x)',
        ],
      },
      '02': {
        naam: 'Reinigen, 1x geheel gevelverf',
        stappen: [
          'Reiniging van het steenachtige oppervlak (hogedrukreinigen)',
          'Laten drogen',
          'Gevelverf / steenverf geheel aanbrengen (1x)',
        ],
      },
      '03': {
        naam: 'Reinigen, 1x hechtprimer, 1x gevelverf',
        stappen: [
          'Reiniging van het steenachtige oppervlak (hogedrukreinigen)',
          'Laten drogen',
          'Hechtprimer geheel aanbrengen (1x)',
          'Gevelverf / steenverf geheel aanbrengen (1x)',
        ],
      },
      '04': {
        naam: 'Reinigen, 1x hechtprimer, 2x gevelverf',
        stappen: [
          'Reiniging van het steenachtige oppervlak (hogedrukreinigen)',
          'Laten drogen',
          'Hechtprimer geheel aanbrengen (1x)',
          'Gevelverf / steenverf geheel aanbrengen (1x)',
          'Gevelverf / steenverf geheel aanbrengen (2x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Reinigen, 1x muurverf (binnen)',
        stappen: [
          'Reinigen van het oppervlak',
          'Repareren van scheuren en gaten',
          'Muurverf / latexverf geheel aanbrengen (1x)',
        ],
      },
      '51': {
        naam: 'Reinigen, 1x fixeer/primer, 1x muurverf (binnen)',
        stappen: [
          'Reinigen van het oppervlak',
          'Repareren van scheuren en gaten',
          'Fixeer / primer geheel aanbrengen (1x)',
          'Muurverf / latexverf geheel aanbrengen (1x)',
        ],
      },
      '52': {
        naam: 'Reinigen, 1x fixeer/primer, 2x muurverf (binnen)',
        stappen: [
          'Reinigen van het oppervlak',
          'Repareren van scheuren en gaten',
          'Fixeer / primer geheel aanbrengen (1x)',
          'Muurverf / latexverf geheel aanbrengen (1x)',
          'Muurverf / latexverf geheel aanbrengen (2x)',
        ],
      },
    },
  },

  // ─── ONDERHOUD STEENACHTIG VLOEREN (OSV) ────────────────────────────────────
  OSV: {
    buiten: {
      '01': {
        naam: 'Reinigen, 1x vloerenverf / coating',
        stappen: [
          'Reinigen en ontvetten van de vloer',
          'Laten drogen',
          'Vloerverf / coating geheel aanbrengen (1x)',
        ],
      },
      '02': {
        naam: 'Reinigen, 1x primer, 1x vloerenverf / coating',
        stappen: [
          'Reinigen en ontvetten van de vloer',
          'Laten drogen',
          'Primer / penetrerende primer geheel aanbrengen (1x)',
          'Vloerverf / coating geheel aanbrengen (1x)',
        ],
      },
      '03': {
        naam: 'Reinigen, 1x primer, 2x vloerenverf / coating',
        stappen: [
          'Reinigen en ontvetten van de vloer',
          'Laten drogen',
          'Primer / penetrerende primer geheel aanbrengen (1x)',
          'Vloerverf / coating geheel aanbrengen (1x)',
          'Vloerverf / coating geheel aanbrengen (2x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Reinigen, 1x primer, 1x vloerenverf / coating (binnen)',
        stappen: [
          'Reinigen en ontvetten van de vloer',
          'Laten drogen',
          'Primer geheel aanbrengen (1x)',
          'Vloerverf / coating geheel aanbrengen (1x)',
        ],
      },
      '51': {
        naam: 'Reinigen, 1x primer, 2x vloerenverf / coating (binnen)',
        stappen: [
          'Reinigen en ontvetten van de vloer',
          'Laten drogen',
          'Primer geheel aanbrengen (1x)',
          'Vloerverf / coating geheel aanbrengen (1x)',
          'Vloerverf / coating geheel aanbrengen (2x)',
        ],
      },
    },
  },

  // ─── ONDERHOUD KUNSTSTOF DEKKEND (OKD) ──────────────────────────────────────
  OKD: {
    buiten: {
      '01': {
        naam: 'Reinigen, 1x bijwerken primer, 1x bijwerken dekverf (kunststof)',
        stappen: [
          'Reinigen en ontvetten van het kunststof oppervlak',
          'Licht opschuren',
          'Kunststofprimer plaatselijk aanbrengen (1x)',
          'Dekverf plaatselijk aanbrengen (1x)',
        ],
      },
      '02': {
        naam: 'Reinigen, 1x kunststofprimer, 1x dekverf',
        stappen: [
          'Reinigen en ontvetten van het kunststof oppervlak',
          'Licht opschuren',
          'Kunststofprimer geheel aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '03': {
        naam: 'Reinigen, 1x kunststofprimer, 1x tussenlaag, 1x dekverf',
        stappen: [
          'Reinigen en ontvetten van het kunststof oppervlak',
          'Licht opschuren',
          'Kunststofprimer geheel aanbrengen (1x)',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Reinigen, 1x kunststofprimer, 1x dekverf (kunststof, binnen)',
        stappen: [
          'Reinigen en ontvetten van het kunststof oppervlak',
          'Licht opschuren',
          'Kunststofprimer geheel aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
  },

  // ─── NIEUWBOUW HOUT DEKKEND (NHD) ───────────────────────────────────────────
  NHD: {
    buiten: {
      '01': {
        naam: 'Nieuwhout: 1x grondverf, 1x dekverf',
        stappen: [
          'Controleren en schuren van nieuw hout',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen en afkitten',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '02': {
        naam: 'Nieuwhout: 2x grondverf, 1x dekverf',
        stappen: [
          'Controleren en schuren van nieuw hout',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen en afkitten',
          'Grondverf geheel aanbrengen (2x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '03': {
        naam: 'Nieuwhout: 1x grondverf, 1x tussenlaag, 1x dekverf',
        stappen: [
          'Controleren en schuren van nieuw hout',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen en afkitten',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '04': {
        naam: 'Nieuwhout: 2x grondverf, 1x tussenlaag, 1x dekverf',
        stappen: [
          'Controleren en schuren van nieuw hout',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen en afkitten',
          'Grondverf geheel aanbrengen (2x)',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '05': {
        naam: 'Nieuwhout: 1x grondverf, 2x tussenlaag, 1x dekverf',
        stappen: [
          'Controleren en schuren van nieuw hout',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen en afkitten',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Tussenlaag geheel aanbrengen (2x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '06': {
        naam: 'Nieuwhout: 1x grondverf, 2x tussenlaag, 2x dekverf',
        stappen: [
          'Controleren en schuren van nieuw hout',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen en afkitten',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Tussenlaag geheel aanbrengen (2x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (2x)',
        ],
      },
      '09': {
        naam: 'Nieuwhout: 2x grondverf, 2x tussenlaag, 2x dekverf (zwaar systeem)',
        stappen: [
          'Controleren en schuren van nieuw hout',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen en afkitten',
          'Grondverf geheel aanbrengen (2x)',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Tussenlaag geheel aanbrengen (2x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (2x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Nieuwhout: 1x grondverf, 1x dekverf (binnen)',
        stappen: [
          'Schuren van nieuw hout',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '51': {
        naam: 'Nieuwhout: 1x grondverf, 1x tussenlaag, 1x dekverf (binnen)',
        stappen: [
          'Schuren van nieuw hout',
          'Grondverf geheel aanbrengen (1x)',
          'Uitstoppen',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
  },

  // ─── NIEUWBOUW HOUT TRANSPARANTE BEITS (NHT) ────────────────────────────────
  NHT: {
    buiten: {
      '01': {
        naam: 'Nieuwhout: 1x grondbehandeling, 2x transparante beits',
        stappen: [
          'Schuren van nieuw hout',
          'Reinigen',
          'Grondbehandeling / primer aanbrengen (1x)',
          'Transparante beits geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Transparante beits geheel aanbrengen (2x)',
        ],
      },
      '02': {
        naam: 'Nieuwhout: 1x grondbehandeling, 3x transparante beits',
        stappen: [
          'Schuren van nieuw hout',
          'Reinigen',
          'Grondbehandeling / primer aanbrengen (1x)',
          'Transparante beits geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Transparante beits geheel aanbrengen (2x)',
          'Licht opschuren na droging',
          'Transparante beits geheel aanbrengen (3x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Nieuwhout: 1x grondbehandeling, 2x transparante beits (binnen)',
        stappen: [
          'Schuren van nieuw hout',
          'Grondbehandeling / primer aanbrengen (1x)',
          'Transparante beits geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Transparante beits geheel aanbrengen (2x)',
        ],
      },
    },
  },

  // ─── NIEUWBOUW HOUT VERNIS (NHV) ────────────────────────────────────────────
  NHV: {
    buiten: {
      '01': {
        naam: 'Nieuwhout: 1x grondlaag vernis, 2x vernis',
        stappen: [
          'Schuren van nieuw hout',
          'Reinigen',
          'Grondlaag vernis aanbrengen (1x)',
          'Licht opschuren na droging',
          'Vernis geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Vernis geheel aanbrengen (2x)',
        ],
      },
      '02': {
        naam: 'Nieuwhout: 1x grondlaag vernis, 3x vernis',
        stappen: [
          'Schuren van nieuw hout',
          'Reinigen',
          'Grondlaag vernis aanbrengen (1x)',
          'Licht opschuren na droging',
          'Vernis geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Vernis geheel aanbrengen (2x)',
          'Licht opschuren na droging',
          'Vernis geheel aanbrengen (3x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Nieuwhout: 1x grondlaag vernis, 2x vernis (binnen)',
        stappen: [
          'Schuren van nieuw hout',
          'Grondlaag vernis aanbrengen (1x)',
          'Vernis geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Vernis geheel aanbrengen (2x)',
        ],
      },
    },
  },

  // ─── NIEUWBOUW METAAL STAAL (NMS) ───────────────────────────────────────────
  NMS: {
    buiten: {
      '01': {
        naam: 'Nieuw staal: ontroesten, 1x primer, 1x dekverf',
        stappen: [
          'Ontroesten (stralen Sa 2½ of St 3)',
          'Reinigen en ontvetten',
          'Corrosiewerende primer geheel aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '02': {
        naam: 'Nieuw staal: ontroesten, 1x primer, 1x tussenlaag, 1x dekverf',
        stappen: [
          'Ontroesten (stralen Sa 2½)',
          'Reinigen en ontvetten',
          'Corrosiewerende primer geheel aanbrengen (1x)',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '03': {
        naam: 'Nieuw staal: ontroesten, 2x primer, 1x tussenlaag, 1x dekverf',
        stappen: [
          'Ontroesten (stralen Sa 2½)',
          'Reinigen en ontvetten',
          'Corrosiewerende primer geheel aanbrengen (1x)',
          'Corrosiewerende primer geheel aanbrengen (2x)',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Nieuw staal: ontroesten, 1x primer, 1x dekverf (binnen)',
        stappen: [
          'Ontroesten (schuren / stralen)',
          'Reinigen en ontvetten',
          'Corrosiewerende primer geheel aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
  },

  // ─── NIEUWBOUW METAAL VERZINKT (NMV) ────────────────────────────────────────
  NMV: {
    buiten: {
      '01': {
        naam: 'Nieuw verzinkt staal: reinigen, 1x primer, 1x dekverf',
        stappen: [
          'Reinigen en ontvetten van het verzinkte oppervlak',
          'Etsen / opschuren',
          'Primer voor verzinkt staal geheel aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '02': {
        naam: 'Nieuw verzinkt staal: reinigen, 1x primer, 1x tussenlaag, 1x dekverf',
        stappen: [
          'Reinigen en ontvetten van het verzinkte oppervlak',
          'Etsen / opschuren',
          'Primer voor verzinkt staal geheel aanbrengen (1x)',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Nieuw verzinkt staal: reinigen, 1x primer, 1x dekverf (binnen)',
        stappen: [
          'Reinigen en ontvetten van het verzinkte oppervlak',
          'Etsen',
          'Primer voor verzinkt staal geheel aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
  },

  // ─── NIEUWBOUW METAAL ALUMINIUM (NMA) ───────────────────────────────────────
  NMA: {
    buiten: {
      '01': {
        naam: 'Nieuw aluminium: reinigen, 1x primer, 1x dekverf',
        stappen: [
          'Reinigen en ontvetten van het aluminium oppervlak',
          'Etsen / opschuren',
          'Primer voor aluminium geheel aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '02': {
        naam: 'Nieuw aluminium: reinigen, 1x primer, 1x tussenlaag, 1x dekverf',
        stappen: [
          'Reinigen en ontvetten van het aluminium oppervlak',
          'Etsen / opschuren',
          'Primer voor aluminium geheel aanbrengen (1x)',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Nieuw aluminium: reinigen, 1x primer, 1x dekverf (binnen)',
        stappen: [
          'Reinigen en ontvetten van het aluminium oppervlak',
          'Etsen',
          'Primer voor aluminium geheel aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
  },

  // ─── NIEUWBOUW STEENACHTIG DEKKEND (NSD) ────────────────────────────────────
  NSD: {
    buiten: {
      '01': {
        naam: 'Nieuwe steenachtige ondergrond: 1x primer, 1x gevelverf',
        stappen: [
          'Schoonmaken en eventueel fixeren van het nieuwe oppervlak',
          'Penetrerende primer / fixeer geheel aanbrengen (1x)',
          'Gevelverf / steenverf geheel aanbrengen (1x)',
        ],
      },
      '02': {
        naam: 'Nieuwe steenachtige ondergrond: 1x primer, 2x gevelverf',
        stappen: [
          'Schoonmaken en fixeren van het nieuwe oppervlak',
          'Penetrerende primer / fixeer geheel aanbrengen (1x)',
          'Gevelverf / steenverf geheel aanbrengen (1x)',
          'Gevelverf / steenverf geheel aanbrengen (2x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Nieuwe steenachtige wand/plafond: 1x primer, 1x muurverf (binnen)',
        stappen: [
          'Reinigen en fixeren van het nieuwe oppervlak',
          'Primer / fixeer geheel aanbrengen (1x)',
          'Muurverf / latexverf geheel aanbrengen (1x)',
        ],
      },
      '51': {
        naam: 'Nieuwe steenachtige wand/plafond: 1x primer, 2x muurverf (binnen)',
        stappen: [
          'Reinigen en fixeren van het nieuwe oppervlak',
          'Primer / fixeer geheel aanbrengen (1x)',
          'Muurverf / latexverf geheel aanbrengen (1x)',
          'Muurverf / latexverf geheel aanbrengen (2x)',
        ],
      },
    },
  },

  // ─── NIEUWBOUW STEENACHTIG VLOEREN (NSV) ────────────────────────────────────
  NSV: {
    buiten: {
      '01': {
        naam: 'Nieuwe betonvloer: 1x primer, 1x vloercoating',
        stappen: [
          'Reinigen en ontvetten van de nieuwe betonvloer',
          'Laten drogen (min. 28 dagen voor beton)',
          'Penetrerende primer geheel aanbrengen (1x)',
          'Vloercoating geheel aanbrengen (1x)',
        ],
      },
      '02': {
        naam: 'Nieuwe betonvloer: 1x primer, 2x vloercoating',
        stappen: [
          'Reinigen en ontvetten van de nieuwe betonvloer',
          'Laten drogen (min. 28 dagen voor beton)',
          'Penetrerende primer geheel aanbrengen (1x)',
          'Vloercoating geheel aanbrengen (1x)',
          'Vloercoating geheel aanbrengen (2x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Nieuwe betonvloer: 1x primer, 1x vloercoating (binnen)',
        stappen: [
          'Reinigen en ontvetten van de nieuwe betonvloer',
          'Penetrerende primer geheel aanbrengen (1x)',
          'Vloercoating geheel aanbrengen (1x)',
        ],
      },
      '51': {
        naam: 'Nieuwe betonvloer: 1x primer, 2x vloercoating (binnen)',
        stappen: [
          'Reinigen en ontvetten van de nieuwe betonvloer',
          'Penetrerende primer geheel aanbrengen (1x)',
          'Vloercoating geheel aanbrengen (1x)',
          'Vloercoating geheel aanbrengen (2x)',
        ],
      },
    },
  },

  // ─── NIEUWBOUW KUNSTSTOF DEKKEND (NKD) ──────────────────────────────────────
  NKD: {
    buiten: {
      '01': {
        naam: 'Nieuw kunststof: reinigen, 1x primer, 1x dekverf',
        stappen: [
          'Reinigen en ontvetten van het nieuwe kunststof oppervlak',
          'Licht opschuren',
          'Kunststofprimer geheel aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
      '02': {
        naam: 'Nieuw kunststof: reinigen, 1x primer, 1x tussenlaag, 1x dekverf',
        stappen: [
          'Reinigen en ontvetten van het nieuwe kunststof oppervlak',
          'Licht opschuren',
          'Kunststofprimer geheel aanbrengen (1x)',
          'Tussenlaag geheel aanbrengen (1x)',
          'Licht opschuren na droging',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
    binnen: {
      '50': {
        naam: 'Nieuw kunststof: reinigen, 1x primer, 1x dekverf (binnen)',
        stappen: [
          'Reinigen en ontvetten van het nieuwe kunststof oppervlak',
          'Licht opschuren',
          'Kunststofprimer geheel aanbrengen (1x)',
          'Dekverf geheel aanbrengen (1x)',
        ],
      },
    },
  },
};

// ─── MAPPER: wizard context → bestek categorie + aanbevolen code ─────────────

/**
 * Vertaal wizard-antwoorden naar een bestek categorie en aanbevolen code
 *
 * @param {Object} ctx - wizard context
 * @param {string} ctx.aard        - 'Bestaande ondergrond' | 'Nieuwe ondergrond'
 * @param {string} ctx.situering   - 'Buiten' | 'Binnen'
 * @param {string} ctx.ondergrond  - wizard ondergrond waarde
 * @param {string} ctx.conditie    - '1.5 beurt' | '2.0 beurt' | '2.5 beurt' | '3.0 beurt'
 * @param {string} ctx.dekking     - 'Afwerking dekkend' | 'Afwerking transparant'
 * @param {string} ctx.opbouw      - opbouw/systeem keuze
 * @returns {{ categorie: string, situering: string, codes: string[], aanbevolen: string, code: string, naam: string, stappen: string[] } | null}
 */
export function getBestekOpties(ctx) {
  const { aard, situering, ondergrond, conditie, dekking } = ctx;

  // Prefix: O = Onderhoud, N = Nieuwbouw
  const prefix = (aard && aard.includes('Bestaande')) ? 'O' : 'N';

  // Situering sleutel in BESTEK object
  const sitKey = (situering === 'Buiten') ? 'buiten' : 'binnen';

  // Bepaal categorie suffix op basis van ondergrond + dekking/transparant
  let suffix = null;
  if (ondergrond === 'Hout') {
    if (dekking === 'Afwerking transparant') {
      suffix = 'HT'; // Transparante beits
    } else {
      suffix = 'HD'; // Dekkend
    }
  } else if (ondergrond === 'Kunststof') {
    suffix = 'KD';
  } else if (ondergrond === 'Staal') {
    suffix = 'MS';
  } else if (ondergrond === 'Metaal, non-ferro') {
    suffix = 'MA'; // Aluminium als representant non-ferro
  } else if (ondergrond === 'Staal, verzinkt') {
    suffix = 'MV';
  } else if (ondergrond === 'Steenachtig, vloeren') {
    suffix = 'SV';
  } else if (ondergrond === 'Steenachtig, wanden en plafonds') {
    suffix = 'SD';
  }

  if (!suffix) return null;

  const categorie = prefix + suffix;
  const cat = BESTEK[categorie];
  if (!cat) return null;

  const sit = cat[sitKey] || cat['buiten'];
  if (!sit) return null;

  // Beschikbare codes ophalen (sorteren numeriek)
  const allesCodes = Object.keys(sit).sort((a, b) => parseInt(a) - parseInt(b));
  if (!allesCodes.length) return null;

  // Bepaal aanbevolen code op basis van conditie (beurtwaarde)
  // Logica: hogere beurt = meer omvangrijke behandeling
  let aanbevolenCode = allesCodes[0];

  if (prefix === 'O') {
    // Onderhoud: conditie bepaalt intensiteit
    const beurt = parseFloat(conditie); // 1.5, 2.0, 2.5, 3.0
    if (!isNaN(beurt)) {
      if (beurt <= 1.5) {
        // Lichtste behandeling: code 01 / 50
        aanbevolenCode = allesCodes[0];
      } else if (beurt <= 2.0) {
        // Middelste behandeling: code 02 / 51 (tweede optie indien beschikbaar)
        aanbevolenCode = allesCodes[Math.min(1, allesCodes.length - 1)];
      } else if (beurt <= 2.5) {
        // Uitgebreidere behandeling: code 03 / 52
        aanbevolenCode = allesCodes[Math.min(2, allesCodes.length - 1)];
      } else {
        // Zwaarste: code 04+ of laatste beschikbare
        aanbevolenCode = allesCodes[Math.min(3, allesCodes.length - 1)];
      }
    }
  } else {
    // Nieuwbouw: conditie staat voor gewenste opbouw kwaliteit
    const beurt = parseFloat(conditie);
    if (!isNaN(beurt)) {
      if (beurt <= 1.5) {
        aanbevolenCode = allesCodes[0];
      } else if (beurt <= 2.0) {
        aanbevolenCode = allesCodes[Math.min(1, allesCodes.length - 1)];
      } else {
        aanbevolenCode = allesCodes[Math.min(2, allesCodes.length - 1)];
      }
    }
  }

  const geselecteerd = sit[aanbevolenCode];

  return {
    categorie,
    sitKey,
    codes: allesCodes,
    aanbevolen: aanbevolenCode,
    code: `${categorie} ${aanbevolenCode}`,    // bijv. "OHD 03"
    naam: geselecteerd.naam,
    stappen: geselecteerd.stappen,
  };
}
