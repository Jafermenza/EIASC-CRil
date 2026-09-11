'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ThemeControls } from '../ui/theme-provider';

const links = [['Home','/'],['Services','/#services'],['Register','/register'],['Track','/track'],['Verify','/verify'],['About','/#about']] as const;
export default function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname=usePathname();const [open,setOpen]=useState(false);const hidden=pathname.startsWith('/admin')||pathname.startsWith('/institution')||pathname==='/login';if(hidden)return children;
  return <><header className="site-header"><div className="site-header-inner"><Link className="brand" href="/" aria-label="EIASC CRil home" onClick={()=>setOpen(false)}><span className="brand-symbol">E</span><span><strong>EIASC</strong><small>CRil Platform</small></span></Link><button className="mobile-menu-button" type="button" aria-expanded={open} aria-controls="public-mobile-menu" onClick={()=>setOpen(v=>!v)}>{open?'×':'☰'}<span className="sr-only">Menu</span></button><nav className="site-nav" aria-label="Primary navigation">{links.map(([label,href])=><Link href={href} key={href}>{label}</Link>)}<ThemeControls/><Link className="button button-primary" href="/login">Platform sign in</Link></nav></div>{open&&<nav id="public-mobile-menu" className="mobile-public-menu" aria-label="Mobile navigation">{links.map(([label,href])=><Link href={href} key={href} onClick={()=>setOpen(false)}>{label}</Link>)}<div><span>Appearance</span><ThemeControls/></div><Link className="button button-primary" href="/login" onClick={()=>setOpen(false)}>Platform sign in</Link></nav>}</header>{children}</>;
}
