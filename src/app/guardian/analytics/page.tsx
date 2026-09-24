'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { BarChart2, PieChart, Activity, TrendingUp, Download } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <BarChart2 className="text-primary" /> Performance Analytics
          </h1>
          <p className="text-muted-fg font-medium mt-1">Review your response metrics and community impact.</p>
        </div>
        <button className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-muted/80 transition-colors">
          <Download size={16} /> Export CSV
        </button>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Response Time', value: '4m 12s', trend: '-15%', positive: true },
          { label: 'Resolution Rate', value: '92%', trend: '+4%', positive: true },
          { label: 'Cases Escalated', value: '18', trend: '+2%', positive: false },
          { label: 'Citizens Assisted', value: '143', trend: '+12%', positive: true }
        ].map((kpi, i) => (
          <GlassCard key={i} className="!p-5 border border-[--glass-border]">
            <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-2">{kpi.label}</h3>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-black text-foreground">{kpi.value}</span>
              <span className={`text-xs font-bold flex items-center gap-1 ${
                kpi.positive ? 'text-sage' : 'text-danger'
              }`}>
                {kpi.trend} <TrendingUp size={12} className={kpi.positive ? '' : 'rotate-180'} />
              </span>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 pt-4">
        {/* Mock Bar Chart */}
        <GlassCard className="!p-6 border border-[--glass-border]">
          <h3 className="font-bold text-foreground flex items-center gap-2 mb-6">
            <Activity size={18} className="text-primary" /> Reports by Category
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Suspicious Activity', count: 45, width: '85%', color: 'bg-primary' },
              { label: 'Harassment', count: 32, width: '60%', color: 'bg-warning' },
              { label: 'Theft', count: 21, width: '40%', color: 'bg-danger' },
              { label: 'Infrastructure', count: 18, width: '35%', color: 'bg-sage' },
              { label: 'Medical', count: 12, width: '25%', color: 'bg-blue-500' }
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-muted-fg">{item.label}</span>
                  <span className="text-foreground">{item.count}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className={`${item.color} h-2 rounded-full`} style={{ width: item.width }}></div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Mock Line Chart (using bars to represent time series) */}
        <GlassCard className="!p-6 border border-[--glass-border]">
          <h3 className="font-bold text-foreground flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-primary" /> Incident Frequency (Last 7 Days)
          </h3>
          <div className="h-48 flex items-end justify-between gap-2 pt-4">
            {[40, 65, 45, 80, 50, 95, 60].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-primary/20 hover:bg-primary transition-colors rounded-t-sm" 
                  style={{ height: `${height}%` }}
                />
                <span className="text-[10px] font-bold text-muted-fg uppercase">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
