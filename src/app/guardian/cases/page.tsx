'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { Briefcase, Search, Filter, ChevronRight, User, Building } from 'lucide-react';
import { useGuardianData } from '@/providers/GuardianDataProvider';

export default function CasesPage() {
  const { cases } = useGuardianData();
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Briefcase className="text-primary" /> Active Cases
          </h1>
          <p className="text-muted-fg font-medium mt-1">Manage assigned incidents and response coordination.</p>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-fg" />
          <input 
            type="text" 
            placeholder="Search cases by ID or location..."
            className="w-full bg-card border border-[--border] rounded-xl py-3 pl-10 pr-4 text-foreground focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm" 
          />
        </div>
        <button className="px-4 py-3 rounded-xl border border-[--border] bg-card text-foreground hover:bg-muted flex items-center gap-2 font-bold transition-all shadow-sm">
          <Filter size={18} /> Filters
        </button>
      </div>

      <div className="bg-card border border-[--border] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-fg font-bold uppercase tracking-wider border-b border-[--border]">
              <tr>
                <th className="p-4">Case ID</th>
                <th className="p-4">Incident</th>
                <th className="p-4">Location</th>
                <th className="p-4">Assigned To</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--border]">
              {cases.map(c => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-mono font-bold">{c.id}</td>
                  <td className="p-4 font-bold text-foreground">{c.incident}</td>
                  <td className="p-4 text-muted-fg">{c.location}</td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground flex items-center gap-1">
                        <User size={12} className="text-primary"/> {c.assignedGuardian}
                      </span>
                      <span className="text-xs text-muted-fg flex items-center gap-1">
                        <Building size={12} /> {c.partnerNgo}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      c.priority === 'High' ? 'bg-danger/10 text-danger' : 
                      c.priority === 'Medium' ? 'bg-warning/10 text-warning' : 
                      'bg-sage/10 text-sage'
                    }`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                      c.status === 'Resolved' ? 'bg-sage/10 text-sage' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-primary font-bold hover:underline flex items-center justify-end gap-1 w-full">
                      View <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
