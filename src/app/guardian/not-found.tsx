import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function GuardianNotFound() {
  return (
    <div className="flex-1 h-full w-full flex flex-col items-center justify-center p-6 text-center bg-[--background]">
      <div className="w-24 h-24 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-6">
        <ShieldAlert size={48} />
      </div>
      <h1 className="text-3xl font-black text-foreground mb-2">404 - Area Not Found</h1>
      <p className="text-muted-fg font-medium max-w-md mb-8">
        The Guardian operational view you are looking for does not exist or you do not have permission to access it.
      </p>
      
      <Link href="/guardian" className="px-6 py-3 bg-primary text-primary-fg rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors">
        <ArrowLeft size={20} />
        Return to Command Center
      </Link>
    </div>
  );
}
