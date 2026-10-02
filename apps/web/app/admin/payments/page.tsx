'use client';

import { useEffect, useState } from 'react';

const API = '/api/v1';

type Payment = {
  id:string; method:string; amount:number|string; currency:string; referenceNumber:string; providerReference?:string;
  status:string; submittedAt?:string; verifiedAt?:string; rejectionReason?:string;
  individualTrackingCode?:string; firstName?:string; lastName?:string; institutionTrackingCode?:string; institutionName?:string;
};
type Detail = {
  payment: Record<string, unknown>;
  application: Record<string, unknown> | null;
  attachments: Array<Record<string, unknown>>;
  history: Array<Record<string, unknown>>;
  auditHistory: Array<Record<string, unknown>>;
};

export default function AdminPaymentsPage(){
  const [items,setItems]=useState<Payment[]>([]);
  const [detail,setDetail]=useState<Detail|null>(null);
  const [status,setStatus]=useState('PENDING');
  const [method,setMethod]=useState('');
  const [search,setSearch]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [decisionReason,setDecisionReason]=useState('');
  const [selectedDecision,setSelectedDecision]=useState<'REJECT'|'CLARIFICATION'|null>(null);

  const token=()=>localStorage.getItem('accessToken')||'';
  async function load(){
    setLoading(true); setError('');
    try {
      const params=new URLSearchParams();
      if(status) params.set('status',status); if(method) params.set('method',method); if(search.trim()) params.set('search',search.trim());
      const r=await fetch(`${API}/payments/admin/queue?${params}`,{headers:{authorization:`Bearer ${token()}`},cache:'no-store'});
      const data=await r.json(); if(!r.ok) throw new Error(data.message??'Unable to load payment queue.'); setItems(data);
    } catch(e){setError(e instanceof Error?e.message:'Unable to load payment queue.');} finally{setLoading(false);}
  }
  async function openDetail(id:string){
    setError('');
    try {
      const r=await fetch(`${API}/payments/admin/detail?id=${encodeURIComponent(id)}`,{headers:{authorization:`Bearer ${token()}`},cache:'no-store'});
      const data=await r.json(); if(!r.ok) throw new Error(data.message??'Unable to load payment detail.'); setDetail(data); setSelectedDecision(null); setDecisionReason('');
    } catch(e){setError(e instanceof Error?e.message:'Unable to load payment detail.');}
  }
  async function review(id:string,decision:'VERIFY'|'REJECT'|'CLARIFICATION',reason?:string){
    setBusy(id); setError('');
    try {
      const r=await fetch(`${API}/payments/admin/review`,{method:'POST',headers:{authorization:`Bearer ${token()}`,'content-type':'application/json'},body:JSON.stringify({id,decision,reason})});
      const data=await r.json(); if(!r.ok) throw new Error(data.message??'Unable to record payment decision.');
      setDetail(data); setSelectedDecision(null); setDecisionReason(''); await load();
    } catch(e){setError(e instanceof Error?e.message:'Unable to record payment decision.');} finally{setBusy('');}
  }
  useEffect(()=>{void load();},[status,method]);

  const p=detail?.payment??{};
  const a=detail?.application??{};
  const canDecide=Boolean(detail && p.method!=='CHAPA' && ['PENDING','REJECTED'].includes(String(p.status)));
  const identity=String(a.trackingCode??'');
  return <main className="shell" style={{maxWidth:1400}}>
    <div className="hero">
      <p className="eyebrow">EIASC · FINANCE & REGISTRATION</p>
      <h1>Payment review workspace</h1>
      <p className="lead">Review payment evidence together with the original application, submitted documents, payment history and audit trail. Finance Officers and Registrars make the payment decision.</p>
    </div>
    {error&&<section className="error-reason" role="alert"><strong>Payment workflow error</strong><span>{error}</span></section>}
    <section className="workflow-panel" style={{marginBottom:18}}>
      <div className="action-row">
        <select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Payment status">
          <option value="">All statuses</option><option value="PENDING">Pending</option><option value="PAID">Verified</option><option value="REJECTED">Rejected</option><option value="FAILED">Failed</option>
        </select>
        <select value={method} onChange={e=>setMethod(e.target.value)} aria-label="Payment method">
          <option value="">All methods</option><option value="TELEBIRR">Telebirr</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CHAPA">Chapa</option>
        </select>
        <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void load();}} placeholder="Tracking, applicant or reference" aria-label="Search payments"/>
        <button className="button button-secondary" onClick={()=>void load()}>Search</button>
      </div>
    </section>
    <div className="grid" style={{gridTemplateColumns:'minmax(0,1fr) minmax(0,1.25fr)',alignItems:'start'}}>
      <section className="workflow-panel">
        <h2>Payment queue</h2>
        {loading?<p>Loading payment records…</p>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th align="left">Application</th><th align="left">Method</th><th align="left">Amount</th><th align="left">Reference</th><th align="left">Status</th></tr></thead><tbody>{items.map(item=><tr key={item.id} onClick={()=>void openDetail(item.id)} style={{borderTop:'1px solid rgba(0,0,0,.1)',cursor:'pointer'}}><td style={{padding:'12px 8px'}}>{item.individualTrackingCode??item.institutionTrackingCode??'—'}<br/><small>{item.institutionName??`${item.firstName??''} ${item.lastName??''}`}</small></td><td>{item.method}</td><td>{Number(item.amount).toFixed(2)} {item.currency}</td><td><strong>{item.referenceNumber}</strong></td><td>{item.status}</td></tr>)}</tbody></table>{!items.length&&<p>No payments match the current queue filters.</p>}</div>}
      </section>
      <section className="workflow-panel">
        {!detail?<><h2>Payment detail</h2><p>Select a payment from the queue. The reviewer will see the submitted application and attachments before deciding.</p></>:<>
          <div className="action-row"><div><p className="eyebrow">APPLICATION</p><h2>{identity||'Payment'}</h2></div><span className="status-badge">{String(p.status)}</span></div>
          <div className="grid detail-grid">
            <article><p className="eyebrow">PAYMENT</p><p><strong>{String(p.method)}</strong> · {String(p.referenceNumber)}</p><p>{String(p.amount)} {String(p.currency)}</p>{p.providerReference&&<p>Provider reference: {String(p.providerReference)}</p>}{p.receiptUrl&&<p>Receipt: <a href={String(p.receiptUrl)} target="_blank" rel="noreferrer">Open receipt</a></p>}</article>
            <article><p className="eyebrow">APPLICANT / APPLICATION</p>{Object.entries(a).filter(([k])=>!['createdAt','updatedAt'].includes(k)).slice(0,14).map(([k,v])=><p key={k}><strong>{k}:</strong> {String(v??'—')}</p>)}</article>
          </div>
          <h3>Submitted attachments</h3>
          {detail.attachments.length?<ul>{detail.attachments.map(x=><li key={String(x.id)}><strong>{String(x.fileName)}</strong> · {String(x.documentType)} · {String(x.mimeType)} · {String(x.size)} bytes {x.storageKey&&<>· <code>{String(x.storageKey)}</code></>}</li>)}</ul>:<p>No institution attachments are attached to this payment record.</p>}
          <h3>Payment history</h3>
          <div style={{overflowX:'auto'}}><table style={{width:'100%'}}><tbody>{detail.history.map((x,i)=><tr key={String(x.id??i)}><td>{String(x.method)}</td><td>{String(x.referenceNumber)}</td><td>{String(x.status)}</td><td>{String(x.createdAt??'')}</td><td>{x.rejectionReason?String(x.rejectionReason):''}</td></tr>)}</tbody></table></div>
          <h3>Audit history</h3>
          <ul>{detail.auditHistory.map((x,i)=><li key={String(x.id??i)}><strong>{String(x.action)}</strong> · {String(x.createdAt??'')} · {x.metadata?JSON.stringify(x.metadata):''}</li>)}</ul>
          {canDecide&&<section className="workflow-panel" style={{marginTop:18}}>
            <p className="eyebrow">DECISION</p>
            {selectedDecision?<><p>{selectedDecision==='REJECT'?'Reject the payment and explain why it cannot be verified.':'Request clarification and tell the applicant what evidence is missing or unclear.'}</p><textarea value={decisionReason} onChange={e=>setDecisionReason(e.target.value)} minLength={3} placeholder="Decision reason (required)" rows={4}/><div className="action-row"><button className="button button-secondary" onClick={()=>setSelectedDecision(null)}>Cancel</button><button className="button button-primary" disabled={busy===String(p.id)||decisionReason.trim().length<3} onClick={()=>void review(String(p.id),selectedDecision,decisionReason.trim())}>{busy===String(p.id)?'Saving…':'Record decision'}</button></div></>:<div className="action-row"><button className="button button-primary" disabled={busy===String(p.id)} onClick={()=>void review(String(p.id),'VERIFY')}>Verify payment</button><button className="button button-secondary" disabled={busy===String(p.id)} onClick={()=>setSelectedDecision('CLARIFICATION')}>Request clarification</button><button className="button button-secondary" disabled={busy===String(p.id)} onClick={()=>setSelectedDecision('REJECT')}>Reject payment</button></div>}
          </section>}
        </>}
      </section>
    </div>
  </main>;
}
