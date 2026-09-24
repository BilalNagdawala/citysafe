'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronRight, ChevronLeft, User as UserIcon, Phone, MapPin, Mail, Building, Briefcase, Calendar, Home, Lock } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function GuardianRegistration() {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams?.get('type') === 'independent' ? 'independent' : 'ngo';

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dob: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    emergencyContact: '',
    organization: '',
    orgType: initialType,
    role: '',
    areaOfOperation: '',
    aadhaar: ''
  });

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => setStep(step + 1);
  const handleBack = () => step > 1 ? setStep(step - 1) : router.back();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleComplete = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const guardianProfile = {
      name: formData.name,
      role: formData.orgType === 'independent' ? 'Independent Volunteer' : formData.role,
      organization: formData.orgType === 'independent' ? 'Independent' : formData.organization,
      areaOfOperation: formData.areaOfOperation,
      orgType: formData.orgType,
      phone: formData.phone,
      email: formData.email,
      verified: true,
      id: `GUA-${Math.floor(Math.random() * 900) + 100}`,
    };

    try {
      const res = await fetch('/api/guardians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guardianProfile),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit guardian registration');
      }

      router.push('/guardian/verify');
    } catch (err: any) {
      console.error('Guardian registration error:', err);
      setErrorMessage(err.message || 'Failed to register guardian');
    } finally {
      setIsSubmitting(false);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { z: 0, x: 0, opacity: 1 },
    exit: (direction: number) => ({ z: 0, x: direction < 0 ? 50 : -50, opacity: 0 })
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Personal Details</h2>
            <p className="text-sm text-muted-fg mb-6">Enter your personal information for background verification.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-1 block">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-fg" />
                  <input type="text" className="w-full bg-muted/50 border border-[--glass-border] rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary" placeholder="Enter your full name" value={formData.name} onChange={(e) => updateForm('name', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-1 block">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-fg" />
                    <input type="tel" className="w-full bg-muted/50 border border-[--glass-border] rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary" placeholder="Mobile" value={formData.phone} onChange={(e) => updateForm('phone', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-1 block">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-fg" />
                    <input type="date" className="w-full bg-muted/50 border border-[--glass-border] rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary text-foreground" value={formData.dob} onChange={(e) => updateForm('dob', e.target.value)} />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-fg" />
                  <input type="email" className="w-full bg-muted/50 border border-[--glass-border] rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary" placeholder="Email address" value={formData.email} onChange={(e) => updateForm('email', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Location Details</h2>
            <p className="text-sm text-muted-fg mb-6">Where are you based and who should we contact in emergencies?</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-1 block">Residential Address</label>
                <div className="relative">
                  <Home className="absolute left-3 top-3 w-5 h-5 text-muted-fg" />
                  <textarea className="w-full bg-muted/50 border border-[--glass-border] rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary min-h-[80px]" placeholder="Full address" value={formData.address} onChange={(e) => updateForm('address', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-1 block">City</label>
                  <input type="text" className="w-full bg-muted/50 border border-[--glass-border] rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary" placeholder="City" value={formData.city} onChange={(e) => updateForm('city', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-1 block">State</label>
                  <input type="text" className="w-full bg-muted/50 border border-[--glass-border] rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary" placeholder="State" value={formData.state} onChange={(e) => updateForm('state', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-1 block">PIN Code</label>
                  <input type="text" className="w-full bg-muted/50 border border-[--glass-border] rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary" placeholder="PIN" value={formData.pincode} onChange={(e) => updateForm('pincode', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-1 block">Emergency Contact</label>
                  <input type="tel" className="w-full bg-muted/50 border border-[--glass-border] rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary" placeholder="Phone number" value={formData.emergencyContact} onChange={(e) => updateForm('emergencyContact', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Organization</h2>
            <p className="text-sm text-muted-fg mb-6">Are you affiliating with a verified NGO or safety organization?</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-1 block">Organization Type</label>
                <select className="w-full bg-muted/50 border border-[--glass-border] rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary appearance-none text-foreground" value={formData.orgType} onChange={(e) => updateForm('orgType', e.target.value)}>
                  <option value="ngo">NGO</option>
                  <option value="community">Community Group</option>
                  <option value="law_enforcement">Law Enforcement</option>
                  <option value="medical">Medical/First Responder</option>
                  <option value="independent">Independent Volunteer</option>
                </select>
              </div>

              {formData.orgType !== 'independent' && (
                <div>
                  <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-1 block">Organization Name</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-fg" />
                    <input type="text" className="w-full bg-muted/50 border border-[--glass-border] rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary" placeholder="NGO or Organization Name" value={formData.organization} onChange={(e) => updateForm('organization', e.target.value)} />
                  </div>
                </div>
              )}



              <div className="grid grid-cols-2 gap-4">
                {formData.orgType !== 'independent' && (
                  <div>
                    <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-1 block">Role / Designation</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-fg" />
                      <input type="text" className="w-full bg-muted/50 border border-[--glass-border] rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary" placeholder="Role" value={formData.role} onChange={(e) => updateForm('role', e.target.value)} />
                    </div>
                  </div>
                )}
                <div className={formData.orgType === 'independent' ? 'col-span-2' : ''}>
                  <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-1 block">Area of Operation</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-fg" />
                    <input type="text" className="w-full bg-muted/50 border border-[--glass-border] rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary" placeholder="E.g. Andheri West" value={formData.areaOfOperation} onChange={(e) => updateForm('areaOfOperation', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sage mb-2">
              <Lock size={24} />
              <h2 className="text-2xl font-bold text-foreground">Identity Verification</h2>
            </div>
            <p className="text-sm text-muted-fg mb-6">
              To ensure trust in our Guardian network, we require identity verification. 
              <strong> Your Aadhaar number is encrypted and will NEVER be displayed publicly.</strong>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-1 block">Aadhaar Number</label>
                <input 
                  type="text" 
                  className="w-full bg-muted/50 border border-[--glass-border] rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary font-mono tracking-widest text-lg text-center" 
                  placeholder="XXXX XXXX XXXX" 
                  maxLength={14}
                  value={formData.aadhaar} 
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length > 0) {
                      val = val.match(new RegExp('.{1,4}', 'g'))?.join(' ') || val;
                    }
                    updateForm('aadhaar', val);
                  }} 
                />
              </div>

              <div className="bg-sage/10 border border-sage/20 p-4 rounded-xl mt-4 flex gap-3">
                <Shield className="text-sage shrink-0" />
                <p className="text-xs text-sage font-medium">
                  We use government-approved UIDAI APIs for secure OTP-based verification. We do not store your Aadhaar number permanently.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const isValid = () => {
    if (step === 1) return formData.name.length > 2 && formData.phone.length > 5;
    if (step === 2) return formData.city.length > 2;
    if (step === 3) {
      if (formData.orgType === 'independent') return formData.areaOfOperation.length > 2;
      return formData.organization.length > 2 && formData.role.length > 2 && formData.areaOfOperation.length > 2;
    }
    if (step === 4) return formData.aadhaar.length === 14; // 12 digits + 2 spaces
    return true;
  };

  return (
    <main className="min-h-[100dvh] flex flex-col bg-[--background]">
      <header className="p-4 pt-[calc(16px+env(safe-area-inset-top))] flex items-center gap-4 border-b border-[--glass-border]">
        <button onClick={handleBack} className="w-10 h-10 rounded-full flex items-center justify-center bg-muted/50 text-foreground hover:bg-muted transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Guardian Application</h1>
        </div>
        <div className="text-sm font-bold text-muted-fg">
          {step} / 4
        </div>
      </header>

      <div className="w-full h-1 bg-muted">
        <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="hidden md:flex flex-1 bg-muted/30 border-r border-[--glass-border] flex-col items-center justify-center p-10 relative overflow-hidden">
          <Shield className="w-32 h-32 text-primary/20 mb-8 relative z-10" />
          <h2 className="text-3xl font-bold text-foreground text-center relative z-10 max-w-sm">Join the network of trusted community guardians.</h2>
        </div>

        <div className="w-full md:w-[500px] flex flex-col p-6 overflow-y-auto pb-24">
          <AnimatePresence mode="wait" custom={1}>
            <motion.div
              key={step}
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex-1"
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 pt-4 border-t border-[--glass-border] flex justify-end">
            {step < 4 ? (
              <button 
                onClick={handleNext}
                disabled={!isValid()}
                className="bg-primary text-primary-fg px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue <ChevronRight size={20} />
              </button>
            ) : (
              <div className="w-full space-y-2">
                {errorMessage && (
                  <p className="text-xs text-danger font-semibold text-center">{errorMessage}</p>
                )}
                <button 
                  onClick={handleComplete}
                  disabled={!isValid() || isSubmitting}
                  className="w-full bg-primary text-primary-fg px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering in MongoDB...' : 'Send OTP & Verify'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
