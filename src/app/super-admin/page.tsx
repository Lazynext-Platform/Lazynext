import React from 'react';
import { StatCard } from '@/components/admin/StatCard';

export default function SuperAdminDashboard() {
  return (
    <div className="min-h-screen bg-[--bg-main] text-[--text-primary] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex items-center justify-between pb-6 border-b border-red-500/20">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-red-500">Super Admin Portal</h1>
            <p className="text-[--text-secondary] mt-1">Root-level access. Exercise caution.</p>
          </div>
          <div className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 font-medium text-sm uppercase tracking-wide">
            Root Access Granted
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Tenants" value="42" />
          <StatCard title="API Keys Provisioned" value="891" />
          <StatCard title="Monthly Cost Estimate" value="$14,240" trend="+12% MoM" />
          <StatCard title="Platform Flags" value="0 Alerts" />
        </div>

        <div className="bg-[--bg-card] border border-[--border-primary] rounded-xl p-6">
          <h3 className="font-semibold text-lg mb-4">Tenant Management</h3>
          <div className="text-sm text-[--text-secondary] p-4 bg-[--bg-main] rounded-lg border border-[--border-primary] text-center">
            Tenant configuration overrides are currently locked for this session.
          </div>
        </div>

      </div>
    </div>
  );
}
