import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

export async function PATCH(req, { params }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const pool = await getDbConnection();

        const fields = [];
        const values = [];

        if ('naam' in body)           { fields.push('naam = ?');            values.push(body.naam || null); }
        if ('projectId' in body)      { fields.push('project_id = ?');      values.push(body.projectId || null); }
        if ('projectNaam' in body)    { fields.push('project_naam = ?');    values.push(body.projectNaam || null); }
        if ('opdrachtgever' in body)  { fields.push('opdrachtgever = ?');   values.push(body.opdrachtgever || null); }
        if ('werkadres' in body)      { fields.push('werkadres = ?');       values.push(body.werkadres || null); }
        if ('telefoon' in body)       { fields.push('telefoon = ?');        values.push(body.telefoon || null); }
        if ('projectActief' in body)  { fields.push('project_actief = ?');  values.push(body.projectActief ? 1 : 0); }
        if ('uren' in body)           { fields.push('uren = ?');            values.push(body.uren || null); }
        if ('datum' in body)          { fields.push('datum = ?');           values.push(body.datum || null); }
        if ('uurloon' in body)        { fields.push('uurloon = ?');         values.push(body.uurloon ?? null); }
        if ('taskId' in body)         { fields.push('task_id = ?');         values.push(body.taskId || null); }
        if ('taskNaam' in body)       { fields.push('task_naam = ?');       values.push(body.taskNaam || null); }

        if (fields.length === 0) return NextResponse.json({ ok: true });

        values.push(id);
        await pool.query(`UPDATE schilders_werkbonnen SET ${fields.join(', ')} WHERE id = ?`, values);

        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;
        const pool = await getDbConnection();
        await pool.query(`DELETE FROM schilders_werkbonnen WHERE id = ?`, [id]);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
