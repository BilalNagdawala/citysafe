'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { ChevronLeft, MapPin, Clock, ShieldAlert, CheckCircle2, User, Building, MessageSquare, AlertTriangle, Briefcase, Camera, Video, Mic, FileText, Loader2, X } from 'lucide-react';
import { useGuardianData } from '@/providers/GuardianDataProvider';

type Props = {
  params: Promise<{ id: string }>;
};

export default function ReportDetailsPage({ params }: Props) {
  const router = useRouter();
  const { reports, refreshData } = useGuardianData();
  const { id } = use(params);
  
  const report = reports.find(r => r.id === id) as any;

  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setIsSubmitting(true);
    setActiveAction(action);
    try {
      setErrorMessage(null);
      const payload = { action, note: note.trim() || undefined };
      const res = await fetch(`/api/guardian/reports/${id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const responseText = await res.text();

      if (!res.ok) {
        console.error("Guardian report action failed", {
          status: res.status,
          statusText: res.statusText,
          body: responseText,
          reportId: id,
          payload
        });

        let errorDetails = responseText;
        try {
            const parsed = JSON.parse(responseText);
            if (parsed.error) errorDetails = parsed.error;
        } catch (e) {}

        throw new Error(
          `Report action failed: ${res.status} ${res.statusText} — ${errorDetails}`
        );
      }
      
      // Update successful
      setNote('');
      await refreshData();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Action could not be saved due to a network error');
    } finally {
      setIsSubmitting(false);
      setActiveAction(null);
    }
  };

  if (!report) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pt-[calc(16px+env(safe-area-inset-top))] pb-24 text-center">
        <GlassCard className="!p-12 border border-[--glass-border] flex flex-col items-center gap-4">
            <AlertTriangle size={48} className="text-muted-fg opacity-50" />
            <h2 className="text-2xl font-black text-foreground">Report Not Found</h2>
            <p className="text-muted-fg max-w-md mx-auto">The report you are looking for does not exist or you do not have permission to view it.</p>
            <button onClick={() => router.push('/guardian/reports')} className="mt-4 px-6 py-3 bg-primary text-primary-fg font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                Back to Reports
            </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pt-[calc(16px+env(safe-area-inset-top))] pb-24">
      
      {/* Header Navigation */}
      <header className="flex items-center justify-between mb-4">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full flex items-center justify-center bg-card border border-[--border] text-foreground hover:bg-muted transition-colors shadow-sm">
          <ChevronLeft size={20} />
        </button>
        <div className="flex gap-2">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider ${
            report.status === 'New' ? 'bg-primary text-primary-fg' : 'bg-warning text-warning-fg'
          }`}>
            Status: {report.status}
          </span>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Left Column - Report Details */}
        <div className="md:col-span-2 space-y-6">
          <GlassCard className="!p-6 border border-[--glass-border] relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1 ${
                report.severity === 'CRITICAL' ? 'bg-danger' :
                report.severity === 'HIGH' ? 'bg-warning' :
                report.severity === 'MEDIUM' ? 'bg-blue-500' : 'bg-sage'
            }`} />
            
            <div className="flex justify-between items-start mb-4 pt-2">
              <div>
                <span className="text-xs font-bold font-mono text-muted-fg mb-1 block">REPORT ID: {report.id}</span>
                <h1 className="text-2xl font-black text-foreground">{report.type}</h1>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-muted-fg">
                  {report.time !== 'Just now' ? new Date(report.time).toLocaleString() : report.time}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={16} className="text-primary shrink-0" /> 
                <span className="text-foreground font-medium">{report.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ShieldAlert size={16} className="text-danger shrink-0" />
                <span className="font-bold text-danger">Severity Level: {report.severity}</span>
              </div>
            </div>

            <div className="bg-muted/30 border border-[--glass-border] rounded-xl p-4 mb-6">
              <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-2">Description</h3>
              <p className="text-foreground leading-relaxed">
                {report.description}
              </p>
            </div>

            {report.evidence && (
              <div>
                <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-3">Attached Evidence</h3>
                <div className="flex gap-3">
                  {report.imageUrl ? (
                    <div 
                      className="w-32 h-32 bg-card border border-[--border] rounded-xl overflow-hidden cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setPreviewImage(report.imageUrl)}
                    >
                      <img src={report.imageUrl} alt="Evidence" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 bg-card border border-[--border] rounded-xl flex flex-col items-center justify-center gap-2 text-muted-fg hover:text-primary hover:border-primary/50 transition-colors cursor-pointer">
                      <Camera size={24} />
                      <span className="text-xs font-bold">Photo</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </GlassCard>

          {/* Activity Timeline */}
          <GlassCard className="!p-6 border border-[--glass-border]">
            <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
              <Clock size={18} className="text-primary" /> Case Timeline
            </h3>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[--border] before:to-transparent">
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-primary bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 text-primary">
                  <FileText size={16} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card border border-[--border] p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-sm text-foreground">Report Submitted</h4>
                    <span className="text-xs text-muted-fg">
                      {report.createdAt ? new Date(report.createdAt).toLocaleString() : 'Initial'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-fg">Initial report logged by user.</p>
                </div>
              </div>
              
              {report.timeline?.map((item: any, idx: number) => (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-sage bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 text-sage">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card border border-[--border] p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-sm text-foreground">{item.action}</h4>
                      <span className="text-xs text-muted-fg">{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                    {item.note && <p className="text-xs text-muted-fg mt-2 p-2 bg-muted/50 rounded-lg border border-border">"{item.note}"</p>}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right Column - Actions & Meta */}
        <div className="space-y-6">
          <div className="bg-card border border-[--border] rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-foreground mb-4">Response Actions</h3>
            
            {errorMessage && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-2 text-danger">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p className="text-sm font-medium leading-tight">{errorMessage}</p>
              </div>
            )}
            
            <div className="space-y-3">
              <button 
                onClick={() => handleAction('VERIFY')}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-bold text-sm disabled:opacity-50">
                <div className="flex items-center gap-2">
                  {activeAction === 'VERIFY' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  Verify Manually
                </div>
              </button>
              <button 
                onClick={() => handleAction('ASSIGN')}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/50 text-foreground hover:bg-muted transition-colors font-bold text-sm disabled:opacity-50">
                <div className="flex items-center gap-2">
                  {activeAction === 'ASSIGN' ? <Loader2 size={18} className="animate-spin" /> : <Briefcase size={18} />}
                  Assign to Case
                </div>
              </button>
              <button 
                onClick={() => handleAction('CONTACT_NGO')}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/50 text-foreground hover:bg-muted transition-colors font-bold text-sm disabled:opacity-50">
                <div className="flex items-center gap-2">
                  {activeAction === 'CONTACT_NGO' ? <Loader2 size={18} className="animate-spin" /> : <Building size={18} />}
                  Contact Partner NGO
                </div>
              </button>
              <button 
                onClick={() => handleAction('RESOLVE')}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-sage/10 text-sage hover:bg-sage/20 transition-colors font-bold text-sm disabled:opacity-50 border border-sage/20">
                <div className="flex items-center gap-2">
                  {activeAction === 'RESOLVE' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  Resolve Issue
                </div>
              </button>
              <button 
                onClick={() => handleAction('ESCALATE')}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-danger/10 text-danger hover:bg-danger/20 transition-colors font-bold text-sm border border-danger/20 disabled:opacity-50">
                <div className="flex items-center gap-2">
                  {activeAction === 'ESCALATE' ? <Loader2 size={18} className="animate-spin" /> : <AlertTriangle size={18} />}
                  Escalate
                </div>
              </button>
            </div>
          </div>

          <div className="bg-card border border-[--border] rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-foreground mb-4">Internal Notes</h3>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-muted/30 border border-[--border] rounded-xl p-3 text-sm min-h-[100px] outline-none focus:ring-1 focus:ring-primary mb-3 text-foreground"
              placeholder="Add private note for guardians..."
            />
            <button 
              onClick={() => handleAction('NOTE')}
              disabled={isSubmitting || !note.trim()}
              className="w-full bg-foreground text-background font-bold text-sm py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {activeAction === 'NOTE' ? <Loader2 size={16} className="animate-spin" /> : null}
              Save Note
            </button>
          </div>

        </div>

      </div>

      {previewImage && (
        <div className="fixed inset-0 z-[6000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <button 
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X size={24} />
          </button>
          <img 
            src={previewImage} 
            alt="Evidence preview full size" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg" 
          />
        </div>
      )}
    </div>
  );
}
