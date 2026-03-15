import nodemailer from 'nodemailer';

const BEDRIJF = 'De Schilders uit Katwijk';
const BEDRIJF_EMAIL = 'andre@deschildersuitkatwijk.nl';
const BEDRIJF_TELEFOON = '06-10 29 87 66';
const BEDRIJF_ADRES = 'Ambachtsweg 12, 2223 AM Katwijk';

export async function POST(request) {
    try {
        const body = await request.json();
        const { to, toName, contractNummer, projectNaam, contractUrl, contractHtml, isMeerwerk, meerwerkItem, akkoordUrl, persoonlijkBericht, onderwerp } = body;

        if (!to || !contractNummer) {
            return Response.json({ error: 'Ontbrekende velden: to, contractNummer' }, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            tls: { rejectUnauthorized: false },
        });

        const aanhef = toName?.trim() ? `Geachte ${toName.trim()}` : 'Geachte heer/mevrouw';
        const bedragFormatted = (n) =>
            Number(n).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // ── MEERWERK AKKOORD EMAIL ──────────────────────────────────────
        if (isMeerwerk && meerwerkItem) {
            const subject = onderwerp?.trim() || `Verzoek om akkoord meerwerk - ${projectNaam} (ref. ${contractNummer})`;
            const extraTekst = persoonlijkBericht?.trim() || '';

            const textBody =
`${aanhef},

${extraTekst ? extraTekst + '\n\n' : ''}Tijdens de uitvoering van project "${projectNaam}" is aanvullend werk naar voren gekomen. Wij verzoeken u hiervoor akkoord te verlenen voordat wij met de uitvoering starten.

MEERWERK SPECIFICATIE
---------------------
Omschrijving : ${meerwerkItem.omschrijving}${meerwerkItem.toelichting ? `\nToelichting  : ${meerwerkItem.toelichting}` : ''}${meerwerkItem.uren > 0 ? `\nExtra uren   : ${meerwerkItem.uren} uur` : ''}
Datum aanvraag: ${meerwerkItem.datum}
Referentie   : ${contractNummer}
Totaalbedrag : EUR ${bedragFormatted(meerwerkItem.bedrag)}

Dit meerwerk wordt uitsluitend uitgevoerd na uw schriftelijke of mondelinge akkoord.

U kunt uw akkoord geven door te reageren op dit bericht, of neem contact met ons op:
Telefoon : ${BEDRIJF_TELEFOON}
E-mail   : ${BEDRIJF_EMAIL}

Met vriendelijke groet,

${BEDRIJF}
${BEDRIJF_ADRES}
${BEDRIJF_EMAIL}
${BEDRIJF_TELEFOON}`;

            const htmlBody = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: Arial, Helvetica, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; color: #1a1a1a; }
  .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #d0d0d0; border-radius: 4px; }
  .header { background: #E07000; padding: 24px 32px; border-radius: 4px 4px 0 0; }
  .header h1 { margin: 0; color: #ffffff; font-size: 18px; font-weight: bold; font-family: Arial, sans-serif; }
  .header p { margin: 6px 0 0; color: #ffe0b2; font-size: 13px; }
  .body { padding: 28px 32px; }
  .body p { margin: 0 0 14px; line-height: 1.6; font-size: 14px; color: #1a1a1a; }
  table.spec { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
  table.spec th { background: #f0f0f0; text-align: left; padding: 8px 12px; border: 1px solid #d0d0d0; color: #444; font-weight: bold; }
  table.spec td { padding: 8px 12px; border: 1px solid #d0d0d0; color: #1a1a1a; }
  table.spec tr.total td { font-weight: bold; background: #fff8f0; color: #B45309; }
  .notice { background: #fff8f0; border-left: 4px solid #E07000; padding: 12px 16px; margin: 18px 0; font-size: 13px; color: #78350f; }
  .contact-block { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 4px; padding: 14px 18px; margin: 18px 0; font-size: 13px; }
  .footer { background: #1a1a1a; padding: 16px 32px; border-radius: 0 0 4px 4px; color: #aaaaaa; font-size: 11px; line-height: 1.6; }
  .footer a { color: #E07000; text-decoration: none; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>Verzoek om akkoord meerwerk</h1>
    <p>Project: ${projectNaam} &mdash; Referentie: ${contractNummer}</p>
  </div>
  <div class="body">
    <p>${aanhef},</p>
    ${extraTekst ? `<p style="background:#f8fafc;border-left:3px solid #E07000;padding:10px 14px;margin:0 0 14px;font-size:14px;color:#1a1a1a;line-height:1.6;white-space:pre-line;">${extraTekst}</p>` : ''}
    <p>Tijdens de uitvoering van project <strong>${projectNaam}</strong> is aanvullend werk naar voren gekomen. Wij verzoeken u hiervoor akkoord te verlenen voordat wij met de uitvoering starten.</p>

    <table class="spec">
      <tr><th colspan="2">Meerwerk specificatie</th></tr>
      <tr><td><strong>Omschrijving</strong></td><td>${meerwerkItem.omschrijving}</td></tr>
      ${meerwerkItem.toelichting ? `<tr><td><strong>Toelichting</strong></td><td>${meerwerkItem.toelichting}</td></tr>` : ''}
      ${meerwerkItem.uren > 0 ? `<tr><td><strong>Extra uren</strong></td><td>${meerwerkItem.uren} uur</td></tr>` : ''}
      <tr><td><strong>Datum aanvraag</strong></td><td>${meerwerkItem.datum}</td></tr>
      <tr><td><strong>Referentie</strong></td><td>${contractNummer}</td></tr>
      <tr class="total"><td><strong>Totaalbedrag</strong></td><td>EUR ${bedragFormatted(meerwerkItem.bedrag)}</td></tr>
    </table>

    <div class="notice">
      <strong>Belangrijk:</strong> Dit meerwerk wordt uitsluitend uitgevoerd na uw akkoord.
    </div>

    ${akkoordUrl ? `
    <p>Geef uw digitale akkoord via de knop hieronder. U wordt gevraagd uw naam in te vullen en een handtekening te plaatsen.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${akkoordUrl}"
         style="display:inline-block;padding:14px 32px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;font-family:Arial,sans-serif;letter-spacing:0.3px;">
        Akkoord geven en ondertekenen
      </a>
      <p style="font-size:11px;color:#888888;margin:10px 0 0;">Werkt de knop niet? Kopieer dan deze link:<br><span style="color:#E07000;word-break:break-all;">${akkoordUrl}</span></p>
    </div>
    <p>Of neem contact met ons op:</p>` : `<p>U kunt uw akkoord geven door te reageren op dit bericht, of neem direct contact met ons op:</p>`}

    <div class="contact-block">
      Telefoon: <strong>${BEDRIJF_TELEFOON}</strong><br>
      E-mail: <strong><a href="mailto:${BEDRIJF_EMAIL}">${BEDRIJF_EMAIL}</a></strong>
    </div>

    <p style="margin-top: 24px">Met vriendelijke groet,<br><strong>${BEDRIJF}</strong></p>
  </div>
  <div class="footer">
    <strong style="color:#ffffff">${BEDRIJF}</strong> &middot; ${BEDRIJF_ADRES} &middot; <a href="mailto:${BEDRIJF_EMAIL}">${BEDRIJF_EMAIL}</a><br>
    Dit bericht is verzonden via het projectbeheersysteem van ${BEDRIJF}.
    Heeft u dit bericht onterecht ontvangen? Neem dan contact met ons op.
  </div>
</div>
</body>
</html>`;

            await transporter.sendMail({
                from: `"${BEDRIJF}" <${process.env.SMTP_USER}>`,
                replyTo: `"${BEDRIJF}" <${BEDRIJF_EMAIL}>`,
                to: `"${toName}" <${to}>`,
                subject,
                text: textBody,
                html: htmlBody,
            });
            return Response.json({ success: true });
        }

        // ── CONTRACT EMAIL ──────────────────────────────────────────────
        const subject = `Modelovereenkomst ${contractNummer} - ${projectNaam}`;

        const textBody =
`${aanhef},

Bijgaand ontvangt u de modelovereenkomst voor project "${projectNaam}".
Wij verzoeken u het document door te lezen en digitaal te ondertekenen via de onderstaande link.

Ondertekeningslink:
${contractUrl}

Contractnummer : ${contractNummer}
Project        : ${projectNaam}
Aannemer       : ${BEDRIJF}

Heeft u vragen over de overeenkomst? Neem dan gerust contact met ons op.

Met vriendelijke groet,

${BEDRIJF}
${BEDRIJF_ADRES}
${BEDRIJF_EMAIL}
${BEDRIJF_TELEFOON}`;

        const htmlBody = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: Arial, Helvetica, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; color: #1a1a1a; }
  .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #d0d0d0; border-radius: 4px; }
  .header { background: #E07000; padding: 24px 32px; border-radius: 4px 4px 0 0; }
  .header h1 { margin: 0; color: #ffffff; font-size: 18px; font-weight: bold; font-family: Arial, sans-serif; }
  .header p { margin: 6px 0 0; color: #ffe0b2; font-size: 13px; }
  .body { padding: 28px 32px; }
  .body p { margin: 0 0 14px; line-height: 1.6; font-size: 14px; color: #1a1a1a; }
  .cta-btn { display: inline-block; margin: 18px 0; padding: 12px 24px; background: #E07000; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif; }
  .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  .info-table td { padding: 7px 10px; border: 1px solid #d0d0d0; }
  .info-table td:first-child { background: #f0f0f0; font-weight: bold; width: 40%; color: #444; }
  .footer { background: #1a1a1a; padding: 16px 32px; border-radius: 0 0 4px 4px; color: #aaaaaa; font-size: 11px; line-height: 1.6; }
  .footer a { color: #E07000; text-decoration: none; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>Modelovereenkomst ${contractNummer}</h1>
    <p>${BEDRIJF} &mdash; Overeenkomst voor ${projectNaam}</p>
  </div>
  <div class="body">
    <p>${aanhef},</p>
    <p>Bijgaand ontvangt u de modelovereenkomst voor project <strong>${projectNaam}</strong>. Wij verzoeken u het document door te lezen en digitaal te ondertekenen via onderstaande link.</p>

    <a href="${contractUrl}" class="cta-btn">Document bekijken en ondertekenen</a>

    <table class="info-table">
      <tr><td>Contractnummer</td><td>${contractNummer}</td></tr>
      <tr><td>Project</td><td>${projectNaam}</td></tr>
      <tr><td>Aannemer</td><td>${BEDRIJF}</td></tr>
    </table>

    <p>Heeft u vragen over de overeenkomst? Neem dan gerust contact met ons op via telefoon (${BEDRIJF_TELEFOON}) of e-mail (<a href="mailto:${BEDRIJF_EMAIL}">${BEDRIJF_EMAIL}</a>).</p>

    <p style="margin-top: 24px">Met vriendelijke groet,<br><strong>${BEDRIJF}</strong></p>

    ${contractHtml ? `
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e0e0e0;">
    <p style="font-size: 12px; color: #666; margin-bottom: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Voorblad overeenkomst</p>
    <div style="border: 1px solid #d0d0d0; border-radius: 4px; padding: 16px; font-size: 12px; color: #1a1a1a; max-height: 500px; overflow: hidden;">${contractHtml}</div>` : ''}
  </div>
  <div class="footer">
    <strong style="color:#ffffff">${BEDRIJF}</strong> &middot; ${BEDRIJF_ADRES} &middot; <a href="mailto:${BEDRIJF_EMAIL}">${BEDRIJF_EMAIL}</a><br>
    Dit bericht is verzonden via het projectbeheersysteem van ${BEDRIJF}.
    Heeft u dit bericht onterecht ontvangen? Neem dan contact met ons op.
  </div>
</div>
</body>
</html>`;

        await transporter.sendMail({
            from: `"${BEDRIJF}" <${process.env.SMTP_USER}>`,
            replyTo: `"${BEDRIJF}" <${BEDRIJF_EMAIL}>`,
            to: `"${toName}" <${to}>`,
            subject,
            text: textBody,
            html: htmlBody,
        });

        return Response.json({ success: true });

    } catch (err) {
        console.error('[send-email] fout:', err);
        return Response.json({ error: err.message || 'Onbekende fout' }, { status: 500 });
    }
}
