'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

type Region = { id: string; code: string; name: string };
type Zone = { id: string; code: string; name: string; regionId: string };
type Subcity = { id: string; code: string; name: string; zoneId: string };
type District = { id: string; code: string; name: string; subcityId: string };
type Level = 'region' | 'zone' | 'subcity' | 'district';

export default function LocationsPage() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [subcities, setSubcities] = useState<Subcity[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [regionId, setRegionId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [subcityId, setSubcityId] = useState('');
  const [form, setForm] = useState({ code: '', name: '' });
  const [level, setLevel] = useState<Level>('region');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const token = () => localStorage.getItem('accessToken') || '';
  const authHeaders = () => ({ authorization: `Bearer ${token()}` });
  const jsonHeaders = () => ({ ...authHeaders(), 'content-type': 'application/json' });

  async function get<T>(path: string): Promise<T> {
    const response = await fetch(`${API}${path}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load location data');
    return data as T;
  }

  async function loadRegions() { setRegions(await get<Region[]>('/locations/regions')); }
  async function loadChildren(id: string) {
    setZones(id ? await get<Zone[]>(`/locations/zones?regionId=${encodeURIComponent(id)}`) : []);
    setSubcities([]); setDistricts([]);
  }
  async function loadSubcities(id: string) {
    setSubcities(id ? await get<Subcity[]>(`/locations/subcities?zoneId=${encodeURIComponent(id)}`) : []);
    setDistricts([]);
  }
  async function loadDistricts(id: string) {
    setDistricts(id ? await get<District[]>(`/locations/districts?parentId=${encodeURIComponent(id)}`) : []);
  }

  useEffect(() => { loadRegions().catch((e) => setError(e instanceof Error ? e.message : 'Unable to load regions')); }, []);

  const selectedParent = useMemo(() => level === 'region' ? undefined : level === 'zone' ? regionId : level === 'subcity' ? zoneId : subcityId, [level, regionId, zoneId, subcityId]);

  function resetForm() { setForm({ code: '', name: '' }); }

  async function createLocation(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    try {
      const path = level === 'region' ? '/locations/regions' : level === 'zone' ? '/locations/zones' : level === 'subcity' ? '/locations/subcities' : '/locations/districts';
      const body = level === 'region' ? form : level === 'zone' ? { ...form, regionId: selectedParent } : level === 'subcity' ? { ...form, zoneId: selectedParent } : { ...form, subcityId: selectedParent };
      const response = await fetch(`${API}${path}`, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to create location');
      setMessage(`${label(level)} created successfully.`); resetForm();
      await loadRegions();
      if (regionId) await loadChildren(regionId);
      if (zoneId) await loadSubcities(zoneId);
      if (subcityId) await loadDistricts(subcityId);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create location'); }
    finally { setBusy(false); }
  }

  async function downloadTemplate() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API}/locations/import-template`, { headers: authHeaders() });
      if (!response.ok) throw new Error((await response.json()).message || 'Unable to download template');
      const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'EIASC-location-master-template.xlsx'; anchor.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to download template'); }
    finally { setBusy(false); }
  }

  async function importExcel(event: FormEvent) {
    event.preventDefault(); if (!file) { setError('Select an .xlsx file first.'); return; }
    setBusy(true); setMessage(''); setError('');
    try {
      const data = new FormData(); data.append('file', file);
      const response = await fetch(`${API}/locations/import`, { method: 'POST', headers: authHeaders(), body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join('; ') : result.message || 'Import failed');
      setMessage(`Import completed: ${result.rows} rows processed; ${result.regionsCreated} regions, ${result.zonesCreated} zones/cities, ${result.subcitiesCreated} sub-cities/towns and ${result.districtsCreated} districts/woredas created.`);
      setFile(null); const input = document.getElementById('location-import-file') as HTMLInputElement | null; if (input) input.value = '';
      await loadRegions();
    } catch (e) { setError(e instanceof Error ? e.message : 'Import failed'); }
    finally { setBusy(false); }
  }

  return (
    <main className="shell" style={{ maxWidth: 1200 }}>
      <section className="hero">
        <p className="eyebrow">EIASC · MASTER DATA</p><h1>Geographic administration</h1>
        <p className="lead">Maintain the authoritative Region → Zone/City → Sub-city/Town → District/Woreda hierarchy used by registration, jurisdiction and reporting.</p>
        <div className="actions"><button className="button" type="button" onClick={downloadTemplate} disabled={busy}>Download Excel template</button></div>
      </section>
      {(error || message) && <section className="grid"><article><strong>{error ? 'Action required' : 'Completed'}</strong><p>{error || message}</p></article></section>}
      <section className="grid">
        <article>
          <h2>Import from Excel</h2><p>Use the official workbook for bulk setup. Each row represents one complete hierarchy path. Existing codes are validated against their parent and the import is atomic.</p>
          <form onSubmit={importExcel} style={{ display: 'grid', gap: 14 }}>
            <label htmlFor="location-import-file">Excel workbook (.xlsx, maximum 5 MB)</label>
            <input id="location-import-file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button className="button" type="submit" disabled={busy || !file}>{busy ? 'Processing…' : 'Import location hierarchy'}</button>
          </form>
          <div style={{ marginTop: 18, padding: 16, border: '1px solid var(--soft-green)', borderRadius: 12 }}><strong>Required Excel columns</strong><p style={{ marginBottom: 0 }}>Region Code · Region Name · Zone/City Code · Zone/City Name · Sub-city/Town Code · Sub-city/Town Name · District/Woreda Code · District/Woreda Name</p></div>
        </article>
        <article>
          <h2>Manual entry</h2><p>Create one level at a time when a bulk workbook is not available.</p>
          <form onSubmit={createLocation} style={{ display: 'grid', gap: 14 }}>
            <label>Location level<select value={level} onChange={(e) => { setLevel(e.target.value as Level); resetForm(); }}><option value="region">Region</option><option value="zone">Zone/City</option><option value="subcity">Sub-city/Town</option><option value="district">District/Woreda</option></select></label>
            {level === 'zone' && <label>Region<select required value={regionId} onChange={async (e) => { const id = e.target.value; setRegionId(id); setZoneId(''); setSubcityId(''); await loadChildren(id); }}><option value="">Select Region</option>{regions.map(r => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}</select></label>}
            {level === 'subcity' && <label>Zone/City<select required value={zoneId} onChange={async (e) => { const id = e.target.value; setZoneId(id); setSubcityId(''); await loadSubcities(id); }}><option value="">Select Zone/City</option>{zones.map(z => <option key={z.id} value={z.id}>{z.name} ({z.code})</option>)}</select></label>}
            {level === 'district' && <label>Sub-city/Town<select required value={subcityId} onChange={async (e) => { const id = e.target.value; setSubcityId(id); await loadDistricts(id); }}><option value="">Select Sub-city/Town</option>{subcities.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select></label>}
            {level === 'district' && <p style={{ margin: 0 }}>{districts.length} district/woreda records currently under the selected Sub-city/Town.</p>}
            <label>Official code<input required maxLength={50} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. AA-01-01-01" /></label>
            <label>Official name<input required maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Official administrative name" /></label>
            <button className="button" type="submit" disabled={busy || (level !== 'region' && !selectedParent)}>{busy ? 'Saving…' : `Create ${label(level)}`}</button>
          </form>
        </article>
      </section>
      <section className="grid">
        <article><h2>Current hierarchy</h2><p><strong>{regions.length}</strong> regions configured.</p>
          {regions.length > 0 && <div style={{ display: 'grid', gap: 8, maxHeight: 420, overflow: 'auto' }}>{regions.map(r => <div key={r.id} style={{ padding: 12, border: '1px solid var(--soft-green)', borderRadius: 10 }}><strong>{r.name}</strong> <span>({r.code})</span><div style={{ marginTop: 8 }}><button className="button" type="button" onClick={async () => { setRegionId(r.id); setLevel('zone'); await loadChildren(r.id); }}>Manage zones/cities</button></div></div>)}</div>}
        </article>
        <article><h2>Import policy</h2><ul><li>All eight columns are required.</li><li>Codes are unique stable identifiers.</li><li>A child cannot move to another parent through import.</li><li>Invalid/conflicting workbooks are rejected without partial database changes.</li><li>Successful imports are audited.</li></ul></article>
      </section>
    </main>
  );
}

function label(level: Level): string { return level === 'region' ? 'Region' : level === 'zone' ? 'Zone/City' : level === 'subcity' ? 'Sub-city/Town' : 'District/Woreda'; }
