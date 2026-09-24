'use client';

import { useRole } from '@/providers/RoleProvider';
import { useRouter } from 'next/navigation';
import { Shield, User, Building2, HeartHandshake, ChevronRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { motion, useReducedMotion } from 'framer-motion';

export default function RoleSelection() {
  const { setRole } = useRole();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const handleSelectRole = (role: 'user' | 'guardian' | 'ngo' | 'volunteer') => {
    if (role === 'user') {
      setRole('user');
      router.push('/home');
    } else if (role === 'guardian') {
      setRole('guardian');
      router.push('/guardian/register');
    } else if (role === 'ngo') {
      setRole('guardian'); // Setting to guardian for demo purposes for now
      router.push('/guardian/register?type=ngo');
    } else if (role === 'volunteer') {
      setRole('guardian');
      router.push('/guardian/register?type=independent');
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const roles = [
    {
      id: 'user',
      title: 'CITIZEN / USER',
      description: 'Find safer routes, report incidents and stay informed.',
      icon: User,
      color: 'bg-blue-500/10 text-blue-500 hover:border-blue-500/50 hover:shadow-blue-500/5',
      isComingSoon: false
    },
    {
      id: 'guardian',
      title: 'GUARDIAN',
      description: 'Monitor local safety reports, coordinate responses and support your community.',
      icon: Shield,
      color: 'bg-primary/10 text-primary hover:border-primary/50 hover:shadow-primary/5',
      isComingSoon: false
    },
    {
      id: 'ngo',
      title: 'NGO / ORGANIZATION',
      description: 'Coordinate community safety operations and manage cases.',
      icon: Building2,
      color: 'bg-sage/10 text-sage hover:border-sage/50 hover:shadow-sage/5',
      isComingSoon: false
    },
    {
      id: 'volunteer',
      title: 'INDEPENDENT VOLUNTEER',
      description: 'Support your local community without being affiliated with an NGO.',
      icon: HeartHandshake,
      color: 'bg-warning/10 text-warning hover:border-warning/50 hover:shadow-warning/5',
      isComingSoon: false
    }
  ];

  return (
    <main className="w-full flex-1 min-h-[100dvh] flex flex-col items-center justify-center bg-[--background] p-4 md:p-6 relative overflow-y-auto">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="absolute w-full h-full max-w-4xl max-h-4xl rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <motion.div 
        className="w-full max-w-5xl z-10 py-12 flex flex-col items-center"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-primary font-bold tracking-widest text-sm uppercase mb-3">CITYSAFE AI</h2>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">Welcome to CitySafe</h1>
          <p className="text-lg text-muted-fg font-medium">How are you using CitySafe?</p>
        </motion.div>

        <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6 w-full">
          {roles.map((r) => {
            const Icon = r.icon;
            // Extract just the dynamic classes that don't depend on group hover to avoid complicated tailwind setup
            const hoverBorder = r.color.match(/hover:border-[^\s]+/)?.[0] || 'hover:border-primary/50';
            const hoverShadow = r.color.match(/hover:shadow-[^\s]+/)?.[0] || 'hover:shadow-primary/5';
            
            return (
              <button 
                key={r.id}
                onClick={() => {
                  if (r.isComingSoon) {
                    alert('This feature is coming soon!');
                  } else {
                    handleSelectRole(r.id as any);
                  }
                }} 
                className={`text-left outline-none group h-full ${r.isComingSoon ? 'opacity-70' : ''}`}
              >
                <GlassCard className={`!p-6 h-full border border-[--glass-border] transition-all ${r.isComingSoon ? '' : 'group-focus-visible:ring-2 group-focus-visible:ring-primary hover:shadow-lg cursor-pointer'} relative overflow-hidden bg-[--glass-bg] flex flex-col ${r.isComingSoon ? '' : hoverBorder} ${r.isComingSoon ? '' : hoverShadow}`}>
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${r.color.split(' ').slice(0, 2).join(' ')}`}>
                      <Icon size={28} />
                    </div>
                    {r.isComingSoon ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-fg px-2 py-1 rounded-md">Coming Soon</span>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-fg group-hover:bg-primary group-hover:text-primary-fg group-hover:translate-x-1 transition-all duration-300">
                        <ChevronRight size={20} />
                      </div>
                    )}
                  </div>
                  <div className="relative z-10 flex-1 flex flex-col justify-end">
                    <h3 className={`text-base font-black text-foreground tracking-wider mb-2 transition-colors ${r.isComingSoon ? '' : 'group-hover:text-primary'}`}>{r.title}</h3>
                    <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                      {r.description}
                    </p>
                  </div>
                  {/* Subtle hover gradient */}
                  {!r.isComingSoon && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  )}
                </GlassCard>
              </button>
            );
          })}
        </motion.div>
      </motion.div>
    </main>
  );
}
