'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { Shield, Filter, MapPin, Search, ChevronRight, AlertTriangle, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { useGuardianData } from '@/providers/GuardianDataProvider';

export default function ReportsFeed() {
  const [filterActive, setFilterActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Basic filter state
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const { reports, isLoading } = useGuardianData();
  
  const filteredReports = reports.filter(r => {
    if (severityFilter !== 'ALL' && r.severity !== severityFilter) return false;
    if (searchTerm && !r.type.toLowerCase().includes(searchTerm.toLowerCase()) && !r.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pt-[calc(16px+env(safe-area-inset-top))]">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <FileText className="text-primary" /> Reports Near You
          </h1>
          <p className="text-muted-fg font-medium mt-1">Reviewing active incidents in your assigned zone.</p>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-fg" />
          <input 
            type="text" 
            placeholder="Search reports..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-[--border] rounded-xl py-3 pl-10 pr-4 text-foreground focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm" 
          />
        </div>
        
        <button 
          onClick={() => setFilterActive(!filterActive)}
          className={`px-4 py-3 rounded-xl border flex items-center gap-2 font-bold transition-all shadow-sm ${
            filterActive ? 'bg-primary border-primary text-primary-fg' : 'bg-card border-[--border] text-foreground hover:bg-muted'
          }`}
        >
          <Filter size={18} /> Filters
        </button>
      </div>

      {filterActive && (
        <GlassCard className="!p-5 border border-[--glass-border] mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-2 block">Severity</label>
              <select 
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className="w-full bg-muted/50 border border-[--glass-border] rounded-lg p-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="ALL">All Levels</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-2 block">Status</label>
              <select className="w-full bg-muted/50 border border-[--glass-border] rounded-lg p-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none">
                <option>All Statuses</option>
                <option>New</option>
                <option>Under Review</option>
                <option>Assigned</option>
                <option>Resolved</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-2 block">Distance</label>
              <select className="w-full bg-muted/50 border border-[--glass-border] rounded-lg p-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none">
                <option>Within 2 km</option>
                <option>Within 5 km</option>
                <option>Entire Zone</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-2 block">Category</label>
              <select className="w-full bg-muted/50 border border-[--glass-border] rounded-lg p-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none">
                <option>All Categories</option>
                <option>Harassment</option>
                <option>Theft</option>
                <option>Infrastructure</option>
                <option>Suspicious Activity</option>
              </select>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Reports Feed */}
      <div className="space-y-4">
        {filteredReports.map(report => (
          <Link href={`/guardian/reports/${report.id}`} key={report.id} className="block group">
            <GlassCard className="!p-0 border border-[--glass-border] overflow-hidden hover:border-primary/40 transition-colors shadow-sm">
              <div className="flex flex-col md:flex-row">
                
                {/* Left severity indicator */}
                <div className={`w-full md:w-2 ${
                  report.severity === 'CRITICAL' ? 'bg-danger' :
                  report.severity === 'HIGH' ? 'bg-warning' :
                  report.severity === 'MEDIUM' ? 'bg-blue-500' :
                  'bg-sage'
                } h-1 md:h-auto`} />
                
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-muted-fg">{report.id}</span>
                      <h3 className="font-bold text-foreground text-lg">{report.type}</h3>
                      {report.verificationStatus === 'Verified' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-sage/10 text-sage px-2 py-0.5 rounded uppercase tracking-wider">
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-muted-fg">{report.time}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-fg mb-3">
                    <MapPin size={14} className="text-primary" /> {report.location}
                  </div>
                  
                  <p className="text-sm text-foreground/80 mb-4 line-clamp-2">
                    {report.description}
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[--glass-border]">
                    <div className="flex gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                        report.status === 'New' ? 'bg-primary/10 text-primary' :
                        report.status === 'Assigned' ? 'bg-warning/10 text-warning' :
                        'bg-muted text-muted-fg'
                      }`}>
                        {report.status}
                      </span>
                      {report.evidence && (
                        <span className="text-xs font-bold bg-muted/50 text-foreground px-2 py-1 rounded-md flex items-center gap-1">
                          Evidence Attached
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 text-sm font-bold text-primary group-hover:translate-x-1 transition-transform">
                      Review Case <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </Link>
        ))}
        
        {isLoading && reports.length === 0 && (
          <div className="text-center py-16 text-muted-fg flex flex-col items-center gap-3">
            <Loader2 size={36} className="text-primary animate-spin" />
            <p className="font-bold text-sm">Retrieving safety reports from registry...</p>
          </div>
        )}

        {!isLoading && filteredReports.length === 0 && (
          <div className="text-center py-12 text-muted-fg">
            <Shield size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold">No reports found matching filters.</p>
          </div>
        )}
      </div>

    </div>
  );
}
