import nodemailer from 'nodemailer';

export async function POST(request) {
    try {
        const body = await request.json();
        const { to, toName, contractNummer, projectNaam, contractUrl, contractHtml, isMeerwerk, meerwerkItem } = body;

        if (!to || !contractNummer) {
            return Response.json({ error: 'Ontbrekende velden: to, contractNummer' }, { status: 400 });
        }

        // ── SMTP transporter ──
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com', port: 587, secure: false,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            tls: { rejectUnauthorized: false },
        });
        const voornaam = toName?.split(' ')[0] || 'beste';

        // ── Meerwerk akkoord email ──
        if (isMeerwerk && meerwerkItem) {
            const mwHtml = `
<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8">
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:24px;color:#1e293b}
  .wrapper{max-width:620px;margin:0 auto}
  .header{background:linear-gradient(135deg,#F5850A,#e06b00);border-radius:12px 12px 0 0;padding:28px 32px}
  .header h1{margin:0;color:#fff;font-size:1.3rem;font-weight:800}
  .header p{margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:0.88rem}
  .body{background:#fff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0}
  .body p{margin:0 0 14px;line-height:1.6;font-size:0.93rem}
  .mw-box{background:#fff7ed;border:2px solid #fed7aa;border-radius:12px;padding:20px 24px;margin:20px 0}
  .mw-box h3{margin:0 0 12px;color:#c2410c;font-size:1rem;display:flex;align-items:center;gap:8px}
  .mw-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #fed7aa;font-size:0.88rem}
  .mw-row:last-child{border:none;font-weight:700;font-size:1rem;color:#c2410c}
  .mw-label{color:#78350f;font-weight:600}
  .note{background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:14px 18px;margin:16px 0;font-size:0.85rem;color:#713f12}
  .footer{background:#1e293b;border-radius:0 0 12px 12px;padding:18px 32px;color:rgba(255,255,255,0.6);font-size:0.78rem}
  .footer strong{color:#F5850A}
</style></head><body>
<div class="wrapper">
  <div class="header">
    <h1>📋 Meerwerk akkoordverzoek</h1>
    <p>Project: ${projectNaam} — Ref: ${contractNummer}</p>
  </div>
  <div class="body">
    <p>Beste ${voornaam},</p>
    <p>Tijdens de uitvoering van project <strong>${projectNaam}</strong> is er aanvullend werk naar voren gekomen waarvoor wij graag uw akkoord ontvangen voordat wij dit uitvoeren.</p>

    <div class="mw-box">
      <h3>📄 Meerwerk specificatie</h3>
      <div class="mw-row"><span class="mw-label">Omschrijving</span><span>${meerwerkItem.omschrijving}</span></div>
      ${meerwerkItem.toelichting ? `<div class="mw-row"><span class="mw-label">Toelichting</span><span>${meerwerkItem.toelichting}</span></div>` : ''}
      ${meerwerkItem.uren > 0 ? `<div class="mw-row"><span class="mw-label">Extra uren</span><span>${meerwerkItem.uren} uur</span></div>` : ''}
      <div class="mw-row"><span class="mw-label">Datum aanvraag</span><span>${meerwerkItem.datum}</span></div>
      <div class="mw-row"><span class="mw-label">Meerwerknummer</span><span>${contractNummer}</span></div>
      <div class="mw-row"><span class="mw-label">Totaalbedrag meerwerk</span><span>€ ${meerwerkItem.bedrag.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span></div>
    </div>

    <div class="note">
      ⚠️ <strong>Let op:</strong> Dit meerwerk wordt alleen uitgevoerd na uw akkoord. Geef dit aan ons door via e-mail, WhatsApp of telefoon.
    </div>

    <p>U kunt uw akkoord geven door te reageren op deze e-mail, of neem direct contact met ons op:</p>
    <p>📱 WhatsApp / telefoon: <strong>06-10298766</strong><br>📧 E-mail: <strong>info@deschildersuitkatwijk.nl</strong></p>
    <p style="margin-top:24px">Met vriendelijke groet,<br><strong>De Schilders uit Katwijk</strong></p>
  </div>
  <div class="footer">
    <strong>De Schilders uit Katwijk</strong> &middot; Ambachtsweg 12, 2223 AM Katwijk &middot; info@deschildersuitkatwijk.nl<br>
    Dit bericht is automatisch gegenereerd via SchildersApp.
  </div>
</div></body></html>`;

            await transporter.sendMail({
                from: `"De Schilders Katwijk" <${process.env.SMTP_USER}>`,
                to: `"${toName}" <${to}>`,
                subject: `📋 Meerwerk akkoord nodig – ${projectNaam} (${contractNummer})`,
                html: mwHtml,
            });
            return Response.json({ success: true });
        }

        // Contract email (fallthrough van meerwerk-blok hierboven)

        // Maak mooie HTML-email met het contract erin
        const emailHtml = `
<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
  .wrapper { max-width: 680px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #F5850A 0%, #e06b00 100%); border-radius: 12px 12px 0 0; padding: 28px 32px; }
  .header h1 { margin: 0; color: #fff; font-size: 1.4rem; font-weight: 800; }
  .header p { margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 0.9rem; }
  .body { background: #fff; padding: 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
  .body p { margin: 0 0 16px; line-height: 1.6; font-size: 0.95rem; }
  .cta-btn { display: inline-block; margin: 20px 0; padding: 14px 28px; background: linear-gradient(135deg, #F5850A, #e06b00); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 1rem; }
  .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 16px 0; }
  .info-box p { margin: 4px 0; font-size: 0.85rem; color: #475569; }
  .info-box strong { color: #1e293b; }
  .contract-preview { margin-top: 24px; border: 2px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .contract-preview-header { background: #f1f5f9; padding: 10px 16px; font-size: 0.78rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
  .contract-inner { padding: 20px; font-family: 'Carlito', 'Calibri', Arial, sans-serif; font-size: 0.78rem; color: #1e293b; max-height: 600px; overflow: hidden; }
  .footer { background: #1e293b; border-radius: 0 0 12px 12px; padding: 20px 32px; color: rgba(255,255,255,0.6); font-size: 0.78rem; }
  .footer strong { color: #F5850A; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>📄 Modelovereenkomst ${contractNummer}</h1>
    <p>De Schilders uit Katwijk — Overeenkomst voor ${projectNaam}</p>
  </div>
  <div class="body">
    <p>Beste ${voornaam},</p>
    <p>Bijgaand ontvang je de modelovereenkomst van onderaanneming voor project <strong>${projectNaam}</strong>. Lees het document rustig door en onderteken het digitaal via de knop hieronder.</p>

    <a href="${contractUrl}" class="cta-btn">👉 Bekijken &amp; Digitaal Ondertekenen</a>

    <div class="info-box">
      <p>📋 <strong>Contractnummer:</strong> ${contractNummer}</p>
      <p>📍 <strong>Project:</strong> ${projectNaam}</p>
      <p>🏢 <strong>Aannemer:</strong> De Schilders uit Katwijk</p>
    </div>

    <p>Heb je vragen over het contract? Neem dan gerust contact op via WhatsApp of e-mail.</p>
    <p>Na ondertekening ontvangen wij automatisch een bevestiging en kun je meteen aan de slag.</p>
    <p style="margin-top: 24px">Met vriendelijke groet,<br><strong>De Schilders uit Katwijk</strong></p>

    ${contractHtml ? `
    <div class="contract-preview">
      <div class="contract-preview-header">📋 Voorblad overeenkomst</div>
      <div class="contract-inner">${contractHtml}</div>
    </div>` : ''}
  </div>
  <div class="footer">
    <strong>De Schilders uit Katwijk</strong> &middot; Ambachtsweg 12, 2223 AM Katwijk &middot; info@deschildersuitkatwijk.nl<br>
    Dit bericht is automatisch gegenereerd via SchildersApp.
  </div>
</div>
</body>
</html>`;

        await transporter.sendMail({
            from: `"De Schilders Katwijk" <${process.env.SMTP_USER}>`,
            to: `"${toName}" <${to}>`,
            subject: `📄 Contract ${contractNummer} — ${projectNaam} (ter ondertekening)`,
            html: emailHtml,
        });

        return Response.json({ success: true });

    } catch (err) {
        console.error('[send-email] fout:', err);
        return Response.json({ error: err.message || 'Onbekende fout' }, { status: 500 });
    }
}
