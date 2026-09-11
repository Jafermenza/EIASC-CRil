'use client';

import { useEffect, useState } from 'react';

const API = '/api/v1';

type Location = { id: string; code: string; name: string };
type Preview = { valid: boolean; rows: number; errors: string[]; headers: string[] };

export default function GeographyPage() {
  const [regions, setRegions] = useState<Location[]>([]);
  const [zones, setZones] = useState<Location[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [fileBase64, setFileBase64] = useState('');
  const [sourceVersion, setSourceVersion] = useState('2026-09-08');
  const [form, setForm] = useState({ level: 'REGION', code: '', name: '', parentId: '' });

  const authHeaders = () => ({ authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` });

  async function load() {
    const headers = authHeaders();
    const [regionResponse, zoneResponse] = await Promise.all([
      fetch(`${API}/locations/regions`, { headers }),
      fetch(`${API}/locations/zones`, { headers }),
    ]);
    if (!regionResponse.ok || !zoneResponse.ok) throw new Error('Unable to load geography reference data');
    setRegions(await regionResponse.json());
    setZones(await zoneResponse.json());
  }

  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : 'Unable to load geography')); }, []);

  async function readFile(file: File) {
    setError(''); setMessage(''); setPreview(null);
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    setFileBase64(btoa(binary));
  }

  async function previewImport() {
    setError(''); setMessage('');
    try {
      const response = await fetch(`${API}/locations/admin/import/preview`, {
        method: 'POST', headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({ fileBase64 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to validate workbook');
      setPreview(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to validate workbook'); }
  }

  async function importData() {
    setError(''); setMessage('');
    try {
      const response = await fetch(`${API}/locations/admin/import`, {
        method: 'POST', headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({ fileBase64, sourceVersion }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Import failed');
      setMessage(`Import completed: ${data.regionCount} regions, ${data.zoneCount} zones, ${data.districtCount} districts.`);
      setPreview(null); setFileBase64(''); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Import failed'); }
  }

  async function createManual(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    const endpoint = form.level === 'REGION' ? 'regions' : form.level === 'ZONE' ? 'zones' : form.level === 'SUBCITY' ? 'subcities' : 'districts';
    const body = form.level === 'REGION'
      ? { code: form.code, name: form.name }
      : form.level === 'ZONE' || form.level === 'SUBCITY'
        ? { code: form.code, name: form.name, ...(form.level === 'ZONE' ? { regionId: form.parentId } : { zoneId: form.parentId }) }
        : { code: form.code, name: form.name, zoneId: form.parentId };
    try {
      const response = await fetch(`${API}/locations/admin/${endpoint}`, { method: 'POST', headers: { ...authHeaders(), 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to create location');
      setMessage(`${form.level} created successfully.`); setForm({ ...form, code: '', name: '' }); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create location'); }
  }

  return <main className="shell" style={{ maxWidth: 1200 }}>
    <div className="hero"><p className="eyebrow">EIASC · REFERENCE DATA</p><h1>Geographic administration</h1><p className="lead">Maintain the controlled administrative hierarchy used by registration, institutions and jurisdiction.</p></div>
    {error && <article className="grid"><div role="alert">{error}</div></article>}
    {message && <article className="grid"><div role="status">{message}</div></article>}

    <section className="grid">
      <div>
        <h2>Import geography</h2>
        <p>Use the approved Excel format. The workbook is validated before any database changes are committed.</p>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
        <input value={sourceVersion} onChange={(e) => setSourceVersion(e.target.value)} placeholder="Source version" aria-label="Source version" />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <button className="button" type="button" disabled={!fileBase64} onClick={previewImport}>Validate workbook</button>
          <button className="button" type="button" disabled={!fileBase64 || !preview?.valid} onClick={importData}>Import validated data</button>
        </div>
        {preview && <div style={{ marginTop: 16 }}><strong>{preview.valid ? 'Validation passed' : 'Validation failed'}</strong><p>{preview.rows} data rows detected.</p>{preview.errors.length > 0 && <ul>{preview.errors.slice(0, 20).map((item) => <li key={item}>{item}</li>)}</ul>}</div>}
      </div>
    </section>

    <section className="grid">
      <div>
        <h2>Manual entry</h2>
        <form onSubmit={createManual} style={{ display: 'grid', gap: 12, maxWidth: 760 }}>
          <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value, parentId: '' })} aria-label="Administrative level">
            <option value="REGION">Region</option><option value="ZONE">Zone / City</option><option value="SUBCITY">Sub-city / Town</option><option value="DISTRICT">District / Woreda</option>
          </select>
          <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Stable code" />
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Official name" />
          {form.level !== 'REGION' && <select required value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} aria-label="Parent location">
            <option value="">Select parent</option>{(form.level === 'ZONE' ? regions : zones).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
          </select>}
          <button className="button" type="submit">Create {form.level === 'REGION' ? 'region' : form.level === 'ZONE' ? 'zone/city' : form.level === 'SUBCITY' ? 'sub-city/town' : 'district/woreda'}</button>
        </form>
      </div>
    </section>
  </main>;
}
