'use client';

import { useEffect, useState } from 'react';

const API = '/api/v1';

type Type = { id: string; code: string; name: string };
type Template = { id: string; institutionTypeId: string; version: number; name: string; description: string | null; inspectionRequired: boolean; items: unknown[]; institutionType: Type };

export default function InspectionChecklistsPage() {
  const [items, setItems] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [required, setRequired] = useState(true);
  const [json, setJson] = useState('[]');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('accessToken') || '';
  async function call(path: string, options: RequestInit = {}) {
    const response = await fetch(API + path, { ...options, headers: { authorization: 'Bearer ' + token(), 'content-type': 'application/json', ...(options.headers || {}) }, cache: 'no-store' });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.message || 'Request failed');
    return body;
  }

  async function load() {
    try {
      setError('');
      const templates = await call('/admin/review/checklists');
      setItems(templates);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load checklists.'); }
  }

  function edit(template: Template) {
    setSelected(template);
    setName(template.name);
    setDescription(template.description || '');
    setRequired(template.inspectionRequired);
    setJson(JSON.stringify(template.items, null, 2));
    setMessage('');
  }

  async function save() {
    if (!selected) return;
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) throw new Error('Checklist items must be a JSON array.');
      const saved = await call('/admin/review/checklists/institution-type/' + selected.institutionTypeId, { method: 'PUT', body: JSON.stringify({ name, description, inspectionRequired: required, items: parsed }) });
      setMessage('Saved version ' + saved.version + ' for ' + selected.institutionType.name + '.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save checklist.'); }
  }

  useEffect(() => { void load(); }, []);

  return <main className="shell" style={{ maxWidth: 1200 }}>
    <div className="hero">
      <p className="eyebrow">EIASC · INSPECTION POLICY</p>
      <h1>Organization inspection checklists</h1>
      <p className="lead">Inspection is controlled by organization type. Each edit creates a new version so an inspection already assigned keeps the checklist snapshot that was issued to the inspector.</p>
    </div>
    {error && <section className="error-reason">{error}</section>}
    {message && <section className="workflow-panel" role="status">{message}</section>}
    <section className="grid">
      {items.map((template) => <button type="button" key={template.id} className="workflow-panel" style={{ textAlign: 'left' }} onClick={() => edit(template)}>
        <p className="eyebrow">{template.institutionType.code}</p>
        <h2>{template.institutionType.name}</h2>
        <p>{template.name} · v{template.version}</p>
        <p>{template.inspectionRequired ? 'Inspection required' : 'Inspection not required by default'}</p>
        <p>{template.items.length} checklist items</p>
      </button>)}
    </section>
    {selected && <section className="workflow-panel" style={{ marginTop: 24 }}>
      <p className="eyebrow">EDIT · {selected.institutionType.code}</p>
      <h2>{selected.institutionType.name}</h2>
      <div className="form-grid">
        <label>Checklist name<input value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Description<textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} /></label>
        <label><input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} /> Inspection required for this organization type</label>
      </div>
      <label style={{ display: 'block', marginTop: 18 }}>Checklist items (JSON)
        <textarea rows={18} value={json} onChange={e => setJson(e.target.value)} style={{ width: '100%', fontFamily: 'monospace' }} />
      </label>
      <p className="lead" style={{ fontSize: 13 }}>Each item should contain <code>code</code>, <code>label</code>, <code>required</code>, and <code>type</code>. Supported types: BOOLEAN, TEXT, NUMBER.</p>
      <div className="action-row"><button className="button button-primary" type="button" onClick={() => void save()}>Save new checklist version</button></div>
    </section>}
  </main>;
}
