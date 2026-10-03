'use client';

import { useEffect, useState } from 'react';
import RoleDashboard from '../../../components/dashboard/role-dashboard';

export default function DashboardPage() {
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('authUser') || '{}') as { roles?: string[] };
      setRoles(parsed.roles || []);
    } catch {
      setRoles([]);
    }
  }, []);

  return <RoleDashboard roles={roles} />;
}
