'use client';

import Link from 'next/link';

const rows = [
  ['SUPER_ADMIN','National platform control','All operational administration, users, master data and cross-jurisdiction oversight'],
  ['NATIONAL_ADMIN','National administration','All jurisdictions; manage operational users and national master data'],
  ['REGIONAL_ADMIN','Regional administration','Assigned region; manage regional operations and subordinate workflows'],
  ['ZONE_ADMIN','Zone / City administration','Assigned zone/city; manage subordinate operational workflows'],
  ['DISTRICT_ADMIN','District administration','Assigned district; manage district-level operational workflows'],
  ['REGISTRAR','Registration review','Review and decide registration workflows within assigned authorization'],
  ['INSPECTOR','Institution inspection','Inspect and review institution information within authorized scope'],
  ['FINANCE_OFFICER','Finance operations','Finance-related workflows when enabled; no licensing self-approval'],
  ['INSTITUTION_ADMIN','Institution administration','Own institution only; cannot issue or approve its own license'],
  ['MEMBER','Member portal','Own profile, membership and credentials'],
];

export default function AccessPage() {
  return <main className="shell" style={{maxWidth:1200}}><div className="hero"><p className="eyebrow">EIASC · GOVERNANCE</p><h1>Roles & privileges</h1><p className="lead">Operational access is governed by role, jurisdiction, resource ownership and workflow state. This matrix is the administrative reference; enforcement remains server-side.</p></div><section className="grid"><div><h2>Access model</h2><div className="principle-grid"><div><strong>Role</strong><p>Determines which operations a user may perform.</p></div><div><strong>Jurisdiction</strong><p>Limits access to the user's assigned geographic scope.</p></div><div><strong>Ownership</strong><p>Institution administrators are limited to their own institution.</p></div><div><strong>Workflow</strong><p>Actions are available only when the underlying record is in a permitted state.</p></div></div></div></section><section className="grid"><div><h2>Role matrix</h2><div className="table-wrap"><table style={{width:'100%'}}><thead><tr><th>Role</th><th>Administrative scope</th><th>Primary privilege</th></tr></thead><tbody>{rows.map(([role,scope,privilege])=><tr key={role}><td><strong>{role}</strong></td><td>{scope}</td><td>{privilege}</td></tr>)}</tbody></table></div></div></section><div className="actions"><Link className="button button-primary" href="/admin/users">Manage users</Link><Link className="button" href="/admin/locations">Manage master data</Link></div></main>;
}
