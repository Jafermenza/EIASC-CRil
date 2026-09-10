'use client';

import { FormEvent, useEffect, useState } from 'react';

type Location = { id: string; code: string; name: string };

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export default function IndividualRegistrationPage() {
  const [regions, setRegions] = useState<Location[]>([]);
  const [zones, setZones] = useState<Location[]>([]);
  const [subcities, setSubcities] = useState<Location[]>([]);
  const [districts, setDistricts] = useState<Location[]>([]);
  const [result, setResult] = useState<{ trackingCode: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ firstName:'', middleName:'', lastName:'', birthDate:'', gender:'', maritalStatus:'', phone:'', educationLevel:'', employmentStatus:'', regionId:'', zoneId:'', subcityId:'', districtId:'', currentAddress:'', nationalIdentity:'', institutionId:'', declarationAccepted:false });

  useEffect(() => { fetch(`${API}/locations/regions`).then((r) => r.json()).then(setRegions).catch(() => setError('Unable to load locations.')); }, []);
  useEffect(() => { setZones([]); setSubcities([]); setDistricts([]); setForm((f) => ({...f, zoneId:'', subcityId:'', districtId:''})); if (form.regionId) fetch(`${API}/locations/zones?regionId=${encodeURIComponent(form.regionId)}`).then((r)=>r.json()).then(setZones); }, [form.regionId]);
  useEffect(() => { setSubcities([]); setDistricts([]); setForm((f) => ({...f, subcityId:'', districtId:''})); if (form.zoneId) fetch(`${API}/locations/subcities?zoneId=${encodeURIComponent(form.zoneId)}`).then((r)=>r.json()).then(setSubcities); }, [form.zoneId]);
  useEffect(() => { setDistricts([]); setForm((f) => ({...f, districtId:''})); if (form.subcityId) fetch(`${API}/locations/districts?parentId=${encodeURIComponent(form.subcityId)}`).then((r)=>r.json()).then(setDistricts); }, [form.subcityId]);

  const set = (key: string, value: string | boolean) => setForm((f) => ({...f, [key]:value}));
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setResult(null); setLoading(true);
    try {
      const response = await fetch(`${API}/registrations/individual`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Registration could not be submitted.');
      setResult(data); window.scrollTo({top:0, behavior:'smooth'});
    } catch (e) { setError(e instanceof Error ? e.message : 'Registration could not be submitted.'); }
    finally { setLoading(false); }
  }

  if (result) return <main className="shell hero"><p className="eyebrow">EIASC</p><h1>Application submitted</h1><p className="lead">Keep your tracking code safe. You can use it to check the application status.</p><article className="grid"><div><h2>{result.trackingCode}</h2><p>Your application is now <strong>SUBMITTED</strong>.</p><a className="button" href={`/track?code=${encodeURIComponent(result.trackingCode)}`}>Track application</a></div></article></main>;

  return <main className="shell" style={{maxWidth:900}}><div className="hero"><p className="eyebrow">EIASC · INDIVIDUAL REGISTRATION</p><h1>Register as a member</h1><p className="lead">Provide the required information accurately. Your application will be reviewed before membership is activated.</p></div>{error && <article className="grid"><div><strong>Unable to submit</strong><p>{error}</p></div></article>}<form onSubmit={submit} className="grid"><section><h2>Identity</h2><p><input required placeholder="First name" value={form.firstName} onChange={(e)=>set('firstName',e.target.value)}/></p><p><input placeholder="Middle name" value={form.middleName} onChange={(e)=>set('middleName',e.target.value)}/></p><p><input required placeholder="Last name" value={form.lastName} onChange={(e)=>set('lastName',e.target.value)}/></p><p><input required type="date" aria-label="Birth date" value={form.birthDate} onChange={(e)=>set('birthDate',e.target.value)}/></p><p><select required value={form.gender} onChange={(e)=>set('gender',e.target.value)}><option value="">Gender</option><option>Female</option><option>Male</option></select></p><p><select required value={form.maritalStatus} onChange={(e)=>set('maritalStatus',e.target.value)}><option value="">Marital status</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option></select></p></section><section><h2>Contact & background</h2><p><input required placeholder="Phone number" value={form.phone} onChange={(e)=>set('phone',e.target.value)}/></p><p><input placeholder="National identity identifier" value={form.nationalIdentity} onChange={(e)=>set('nationalIdentity',e.target.value)}/></p><p><input placeholder="Education level" value={form.educationLevel} onChange={(e)=>set('educationLevel',e.target.value)}/></p><p><input placeholder="Employment status" value={form.employmentStatus} onChange={(e)=>set('employmentStatus',e.target.value)}/></p><p><input placeholder="Current address / street" value={form.currentAddress} onChange={(e)=>set('currentAddress',e.target.value)}/></p></section><section><h2>Location</h2><p><select required value={form.regionId} onChange={(e)=>set('regionId',e.target.value)}><option value="">Region</option>{regions.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></p><p><select required value={form.zoneId} onChange={(e)=>set('zoneId',e.target.value)} disabled={!zones.length}><option value="">Zone / City</option>{zones.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></p><p><select required value={form.subcityId} onChange={(e)=>set('subcityId',e.target.value)} disabled={!subcities.length}><option value="">Sub-city / Town</option>{subcities.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></p><p><select required value={form.districtId} onChange={(e)=>set('districtId',e.target.value)} disabled={!districts.length}><option value="">District / Woreda</option>{districts.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></p></section><section><h2>Declaration</h2><label><input required type="checkbox" checked={form.declarationAccepted} onChange={(e)=>set('declarationAccepted',e.target.checked)}/> I confirm that the information provided is accurate.</label><p><button className="button" disabled={loading}>{loading ? 'Submitting…' : 'Submit registration'}</button></p></section></form></main>;
}
