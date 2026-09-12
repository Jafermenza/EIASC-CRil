'use client';

import { useEffect, useState } from 'react';

const API='/api/v1';
type Type={id:string;code:string;name:string;description:string|null;active:boolean};

export default function InstitutionTypesPage(){
 const [items,setItems]=useState<Type[]>([]); const [form,setForm]=useState({code:'',name:'',description:'',active:true}); const [editing,setEditing]=useState<string|null>(null); const [error,setError]=useState(''); const [message,setMessage]=useState('');
 const headers=()=>({authorization:`Bearer ${localStorage.getItem('accessToken')||''}`,'content-type':'application/json'});
 async function load(){const r=await fetch(`${API}/admin/institution-types`,{headers:headers()});const d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to load institution types');setItems(d);}
 useEffect(()=>{load().catch(e=>setError(e instanceof Error?e.message:'Unable to load institution types'));},[]);
 function edit(item:Type){setEditing(item.id);setForm({code:item.code,name:item.name,description:item.description||'',active:item.active});setError('');setMessage('');}
 function reset(){setEditing(null);setForm({code:'',name:'',description:'',active:true});}
 async function save(e:React.FormEvent){e.preventDefault();setError('');setMessage('');try{const url=editing?`${API}/admin/institution-types/${editing}`:`${API}/admin/institution-types`;const r=await fetch(url,{method:editing?'PATCH':'POST',headers:headers(),body:JSON.stringify(form)});const d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to save institution type');setMessage(editing?'Institution type updated.':'Institution type created.');reset();await load();}catch(e){setError(e instanceof Error?e.message:'Unable to save institution type');}}
 return <main className="shell" style={{maxWidth:1100}}><div className="hero"><p className="eyebrow">EIASC · SUPER ADMIN · REFERENCE DATA</p><h1>Institution types</h1><p className="lead">These values are database-driven. Applicants see only active types; changing this list changes the registration form without a frontend code change.</p></div>{error&&<section className="error-reason" role="alert">{error}</section>}{message&&<section className="workflow-panel" role="status">{message}</section>}
 <section className="grid"><div><h2>{editing?'Edit institution type':'Add institution type'}</h2><form onSubmit={save} style={{display:'grid',gap:12}}><label>Code<input required value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="e.g. MOSQUE"/></label><label>Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Display name"/></label><label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Active and available to applicants</label><div className="action-row"><button className="button button-primary" type="submit">{editing?'Save changes':'Create type'}</button>{editing&&<button className="button button-secondary" type="button" onClick={reset}>Cancel</button>}</div></form></div></section>
 <section className="grid"><div><h2>Configured types</h2><table style={{width:'100%'}}><thead><tr><th>Code</th><th>Name</th><th>Status</th><th>Action</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td>{item.code}</td><td>{item.name}</td><td>{item.active?'ACTIVE':'INACTIVE'}</td><td><button className="button button-secondary" type="button" onClick={()=>edit(item)}>Edit</button></td></tr>)}</tbody></table></div></section>
 </main>;
}
