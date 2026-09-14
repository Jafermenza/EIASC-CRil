'use client';

import { useEffect, useState } from 'react';

type Loc = { id: string; name: string };
type GeographyMap = { regions: Map<string, string>; zones: Map<string, string>; subcities: Map<string, string>; districts: Map<string, string>; ready: boolean };

const API = '/api/v1';

/** Loads the full geography hierarchy once and exposes id -> name lookups for admin lists. */
export function useGeographyMap(): GeographyMap {
  const [state, setState] = useState<GeographyMap>({ regions: new Map(), zones: new Map(), subcities: new Map(), districts: new Map(), ready: false });
  useEffect(() => {
    let active = true;
    const token = typeof window === 'undefined' ? '' : localStorage.getItem('accessToken') || '';
    const headers = token ? { authorization: `Bearer ${token}` } : undefined;
    Promise.all([
      fetch(`${API}/locations/regions`, { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API}/locations/zones`, { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API}/locations/subcities`, { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API}/locations/districts`, { headers }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([regions, zones, subcities, districts]: Loc[][]) => {
      if (!active) return;
      setState({
        regions: new Map(regions.map((x) => [x.id, x.name])),
        zones: new Map(zones.map((x) => [x.id, x.name])),
        subcities: new Map(subcities.map((x) => [x.id, x.name])),
        districts: new Map(districts.map((x) => [x.id, x.name])),
        ready: true,
      });
    }).catch(() => { if (active) setState((s) => ({ ...s, ready: true })); });
    return () => { active = false; };
  }, []);
  return state;
}

/** Formats a "Region / Zone / Subcity / District" label from raw location IDs. */
export function formatLocation(map: GeographyMap, ids: { regionId?: string | null; zoneId?: string | null; subcityId?: string | null; districtId?: string | null }): string {
  const parts = [
    ids.regionId ? map.regions.get(ids.regionId) || (map.ready ? ids.regionId : '…') : null,
    ids.zoneId ? map.zones.get(ids.zoneId) || (map.ready ? ids.zoneId : '…') : null,
    ids.subcityId ? map.subcities.get(ids.subcityId) || (map.ready ? ids.subcityId : '…') : null,
    ids.districtId ? map.districts.get(ids.districtId) || (map.ready ? ids.districtId : '…') : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' / ') : '—';
}
