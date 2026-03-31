$f = 'C:\Users\desch\.gemini\antigravity\scratch\backend-app\src\app\projecten\[id]\page.js'
$bytes = [System.IO.File]::ReadAllBytes($f)
$enc = [System.Text.Encoding]::UTF8
$c = $enc.GetString($bytes)

# 1. State toevoegen
$stateOld = "    const [teamsLijst, setTeamsLijst] = useState(null); // null=niet geladen, []= leeg, [{id,naam}]"
$stateNew = "    const [teamsLijst, setTeamsLijst] = useState(null); // null=niet geladen, []= leeg, [{id,naam}]`r`n" +
            "    const [kanaalBerichtenLaden, setKanaalBerichtenLaden] = useState(false);`r`n" +
            "    const [kanaalBerichtenData, setKanaalBerichtenData] = useState(null);"
if ($c.Contains($stateOld)) {
    $c = $c.Replace($stateOld, $stateNew)
} else {
    Write-Host "Kan state niet toevoegen - niet gevonden"
}

# 2. De UI Injecteren achter de "Koppeling verwijderen" button in line 5441
$uiOld = "                                                <button onClick={() => saveProject({ ...project, teamsKanaalId: null, teamsKanaalUrl: null })}`r`n" +
         "                                                    style={{ alignSelf: 'flex-start', padding: '5px 12px', borderRadius: 7, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>`r`n" +
         "                                                    <i className=""fa-solid fa-trash"" /> Koppeling verwijderen`r`n" +
         "                                                </button>"

$uiNew = $uiOld + "`r`n`r`n" +
"                                                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>`r`n" +
"                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>`r`n" +
"                                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>`r`n" +
"                                                            <i className=""fa-solid fa-envelope"" style={{ color: '#4f46e5', marginRight: 6 }} /> E-mails & Berichten (Live)`r`n" +
"                                                        </div>`r`n" +
"                                                        <button disabled={kanaalBerichtenLaden} onClick={async () => { setKanaalBerichtenLaden(true); try { const r = await fetch('/api/teams/kanaal-berichten?teamId='+teamsTeamId+'&kanaalId='+project.teamsKanaalId); const d = await r.json(); setKanaalBerichtenData(d); } catch(e){} finally { setKanaalBerichtenLaden(false); } }}`r`n" +
"                                                                style={{ padding: '6px 12px', background: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>`r`n" +
"                                                            <i className={`fa-solid ${kanaalBerichtenLaden ? 'fa-spinner fa-spin' : 'fa-rotate-right'}`} /> Vernieuwen`r`n" +
"                                                        </button>`r`n" +
"                                                    </div>`r`n" +
"                                                    {!kanaalBerichtenData && !kanaalBerichtenLaden && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Klik op vernieuwen om de laatste berichten van Teams op te halen.</div>}`r`n" +
"                                                    {kanaalBerichtenLaden && !kanaalBerichtenData && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Berichten laden...</div>}`r`n" +
"                                                    {kanaalBerichtenData && (`r`n" +
"                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>`r`n" +
"                                                            {kanaalBerichtenData.email && (`r`n" +
"                                                                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', gap: 10 }}>`r`n" +
"                                                                    <i className=""fa-solid fa-at"" style={{ color: '#94a3b8' }} />`r`n" +
"                                                                    <div>`r`n" +
"                                                                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Teams Kanaal E-mailadres:</div>`r`n" +
"                                                                        <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500 }}>{kanaalBerichtenData.email}</div>`r`n" +
"                                                                    </div>`r`n" +
"                                                                    <button onClick={() => { navigator.clipboard.writeText(kanaalBerichtenData.email); showToast('E-mailadres gekopieerd!', 'success'); }}`r`n" +
"                                                                        style={{ marginLeft: 'auto', background: '#fff', border: '1px solid #e2e8f0', padding: '5px 10px', borderRadius: 6, color: '#475569', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>`r`n" +
"                                                                        Kopiëren`r`n" +
"                                                                    </button>`r`n" +
"                                                                </div>`r`n" +
"                                                            )}`r`n" +
"                                                            {!kanaalBerichtenData.email && <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>E-mailadres is nog niet gegenereerd in MS Teams. (Klik op Kanaal openen en kies 'E-mailadres ophalen').</div>}`r`n" +
"                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>`r`n" +
"                                                                {kanaalBerichtenData.berichten?.length === 0 && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Er zijn nog geen berichten in dit kanaal.</div>}`r`n" +
"                                                                {kanaalBerichtenData.berichten?.map((msg, i) => (`r`n" +
"                                                                    <div key={i} style={{ padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>`r`n" +
"                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>`r`n" +
"                                                                            <b style={{ fontSize: '0.8rem', color: '#334155' }}>{msg.from}</b>`r`n" +
"                                                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(msg.tijd).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>`r`n" +
"                                                                        </div>`r`n" +
"                                                                        {msg.subject && <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{msg.subject}</div>}`r`n" +
"                                                                        <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4, wordBreak: 'break-word', maxHeight: 80, overflow: 'hidden', position: 'relative' }} dangerouslySetInnerHTML={{ __html: msg.body }} />`r`n" +
"                                                                        {msg.bijlagen > 0 && <div style={{ marginTop: 8, display: 'inline-flex', padding: '3px 8px', background: '#e2e8f0', borderRadius: 20, fontSize: '0.7rem', color: '#475569', gap: 5, alignItems: 'center' }}><i className=""fa-solid fa-paperclip"" /> {msg.bijlagen} bijlage(n) (Geopend in Teams)</div>}`r`n" +
"                                                                    </div>`r`n" +
"                                                                ))}`r`n" +
"                                                            </div>`r`n" +
"                                                        </div>`r`n" +
"                                                    )}`r`n" +
"                                                </div>"

if ($c.Contains($uiOld)) {
    $c = $c.Replace($uiOld, $uiNew)
    [System.IO.File]::WriteAllBytes($f, $enc.GetBytes($c))
    Write-Host "OK - UI element toegevoegd!"
} else {
    Write-Host "Kan UI anker niet vinden"
}
