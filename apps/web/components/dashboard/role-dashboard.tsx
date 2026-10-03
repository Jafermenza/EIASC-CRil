'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  CreditCard,
  FileCheck2,
  Globe2,
  Landmark,
  MapPinned,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
} from 'lucide-react';

type Metrics = Record<string, number>;
type RoleDashboardProps = { roles: string[] };

const roleCopy: Record<string, { title: string; eyebrow: string; description: string; icon: typeof ShieldCheck }> = {
  SUPER_ADMIN: { title: 'System command center', eyebrow: 'SUPER ADMINISTRATION', description: 'Configure the platform, supervise every jurisdiction and keep the registration and licensing engine moving.', icon: ShieldCheck },
  NATIONAL_ADMIN: { title: 'National operations', eyebrow: 'NATIONAL ADMINISTRATION', description: 'See the national picture, monitor regional performance and act on work that needs central attention.', icon: Globe2 },
  REGIONAL_ADMIN: { title: 'Regional operations', eyebrow: 'REGIONAL ADMINISTRATION', description: 'Monitor your region, move applications forward and keep institutions and members progressing.', icon: MapPinned },
  ZONE_ADMIN: { title: 'Zone / city operations', eyebrow: 'ZONE / CITY ADMINISTRATION', description: 'Work the queue for your assigned zone or city with clear priorities and local context.', icon: MapPinned },
  DISTRICT_ADMIN: { title: 'District operations', eyebrow: 'DISTRICT REVIEW', description: 'Review local submissions, resolve corrections and keep district work moving.', icon: ClipboardCheck },
  REGISTRAR: { title: 'Registrar workspace', eyebrow: 'REGISTRAR', description: 'Coordinate registration decisions, payment clarification and institutional review from one place.', icon: FileCheck2 },
  FINANCE_OFFICER: { title: 'Finance workspace', eyebrow: 'FINANCE', description: 'Focus on payment evidence, verification and exceptions without unrelated administration noise.', icon: WalletCards },
  INSPECTOR: { title: 'Inspection workspace', eyebrow: 'INSPECTION', description: 'See assigned inspections, organization-type checklists and decisions that require field action.', icon: ClipboardCheck },
};

const metricCards = [
  ['members', 'Members', UsersRound, '/admin/directory/members'],
  ['activeMembers', 'Active members', CheckCircle2, '/admin/directory/members?status=ACTIVE'],
  ['institutions', 'Institutions', Building2, '/admin/directory/institutions'],
  ['activeInstitutions', 'Active institutions', Landmark, '/admin/directory/institutions?status=ACTIVE'],
  ['pendingApplications', 'Applications needing attention', Clock3, '/admin/registrations?status=SUBMITTED'],
  ['activeLicenses', 'Active licenses', FileCheck2, '/admin/licenses?status=ACTIVE'],
] as const;

function firstBusinessRole(roles: string[]) {
  return roles.find((role) => roleCopy[role]) || 'NATIONAL_ADMIN';
}

export default function RoleDashboard({ roles }: RoleDashboardProps) {
  const role = firstBusinessRole(roles);
  const copy = roleCopy[role];
  const Icon = copy.icon;
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('accessToken') || '';
    const headers = { authorization: `Bearer ${token}` };
    const load = async () => {
      try {
        const metricResponse = await fetch('/api/v1/reports/dashboard', { headers, cache: 'no-store' });
        const metricBody = await metricResponse.json();
        if (!metricResponse.ok) throw new Error(metricBody?.message || 'Unable to load dashboard metrics.');
        let actionCount = Number(metricBody.pendingApplications || 0);
        if (['FINANCE_OFFICER', 'REGISTRAR'].includes(role)) {
          const response = await fetch('/api/v1/payments/admin/queue', { headers, cache: 'no-store' });
          const body = await response.json();
          if (response.ok && Array.isArray(body)) actionCount = body.length;
        } else if (['DISTRICT_ADMIN', 'REGIONAL_ADMIN', 'NATIONAL_ADMIN', 'SUPER_ADMIN', 'REGISTRAR'].includes(role)) {
          const response = await fetch('/api/v1/admin/review/workspace', { headers, cache: 'no-store' });
          const body = await response.json();
          if (response.ok && Array.isArray(body)) actionCount = body.length;
        }
        if (active) { setMetrics(metricBody); setQueueCount(actionCount); }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load your dashboard.');
      }
    };
    void load();
    return () => { active = false; };
  }, [role]);

  const visibleMetricCards = useMemo(() => {
    if (role === 'FINANCE_OFFICER') return metricCards.filter(([key]) => ['members', 'institutions', 'pendingApplications'].includes(key));
    if (role === 'INSPECTOR') return metricCards.filter(([key]) => ['institutions', 'activeInstitutions', 'activeLicenses'].includes(key));
    return metricCards;
  }, [role]);

  const action = useMemo(() => {
    if (role === 'FINANCE_OFFICER') return { label: 'Review payment queue', href: '/admin/payments', icon: CreditCard, text: queueCount === null ? 'Checking payment evidence…' : `${queueCount} payment record${queueCount === 1 ? '' : 's'} need attention` };
    if (role === 'INSPECTOR') return { label: 'Open inspections', href: '/admin/review', icon: ClipboardCheck, text: 'Review your assigned organization-type inspections.' };
    if (role === 'INSTITUTION_ADMIN') return { label: 'Open institution', href: '/institution', icon: Building2, text: 'Manage members, documents and institutional activity.' };
    return { label: 'Open review workspace', href: '/admin/review', icon: FileCheck2, text: queueCount === null ? 'Checking the review queue…' : `${queueCount} application${queueCount === 1 ? '' : 's'} in the review workspace` };
  }, [role, queueCount]);

  return (
    <main className="shell role-dashboard">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <div className="dashboard-kicker"><span className="dashboard-icon-orb"><Icon size={20} /></span><span>{copy.eyebrow}</span></div>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
          <div className="dashboard-role-pills">{roles.map((item) => <span className="status-badge" key={item}>{item.replaceAll('_', ' ')}</span>)}</div>
        </div>
        <div className="dashboard-hero-glow" aria-hidden="true"><Sparkles size={28} /><span>Role-aware workspace</span></div>
      </section>

      {error && <section className="error-reason" role="alert"><AlertCircle size={18} /><strong>Some dashboard data could not be loaded.</strong><span>{error}</span></section>}

      <section className="needs-action-panel">
        <div className="needs-action-icon"><Clock3 size={22} /></div>
        <div><p className="eyebrow">NEEDS ACTION</p><h2>{action.text}</h2><p>Start with the work that can move an application, payment or inspection to its next stage.</p></div>
        <Link className="button button-primary" href={action.href}>{action.label}<ArrowRight size={17} /></Link>
      </section>

      <section className="dashboard-section">
        <div className="section-heading compact"><div><p className="eyebrow">AT A GLANCE</p><h2>Your operational picture</h2></div><span className="dashboard-live"><span />Live from authorized records</span></div>
        <div className="dashboard-stat-grid">
          {visibleMetricCards.map(([key, label, MetricIcon, href]) => (
            <Link href={href} className="dashboard-stat-card" key={key}>
              <span className="dashboard-card-icon"><MetricIcon size={19} /></span>
              <span className="dashboard-stat-label">{label}</span>
              <strong>{metrics?.[key] ?? '—'}</strong>
              <span className="dashboard-stat-link">Open <ArrowRight size={15} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading compact"><div><p className="eyebrow">QUICK WORKFLOWS</p><h2>Plain-language shortcuts</h2></div></div>
        <div className="dashboard-quick-grid">
          {role === 'FINANCE_OFFICER' ? <Link className="dashboard-quick-card" href="/admin/payments"><CreditCard size={20} /><div><strong>Review payments</strong><span>Verify payment evidence, reject exceptions or request clarification.</span></div><ArrowRight size={17} /></Link> : role === 'INSPECTOR' ? <Link className="dashboard-quick-card" href="/admin/review"><ClipboardCheck size={20} /><div><strong>Open inspections</strong><span>Work only on inspections assigned to your authorized scope.</span></div><ArrowRight size={17} /></Link> : <Link className="dashboard-quick-card" href="/admin/review"><ClipboardCheck size={20} /><div><strong>Review applications</strong><span>Open submitted records, corrections, documents and decisions.</span></div><ArrowRight size={17} /></Link>}
          <Link className="dashboard-quick-card" href="/admin/reports"><Globe2 size={20} /><div><strong>See reports & trends</strong><span>Understand activity inside the jurisdiction you are authorized to see.</span></div><ArrowRight size={17} /></Link>
          <Link className="dashboard-quick-card" href="/notifications"><Bell size={20} /><div><strong>Check notifications</strong><span>See new messages and workflow updates.</span></div><ArrowRight size={17} /></Link>
        </div>
      </section>
    </main>
  );
}
