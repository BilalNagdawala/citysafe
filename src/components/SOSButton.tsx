'use client';

import { useState, useRef, useEffect } from 'react';
import { AlertCircle, Phone, MapPin, Users, Building, X, CheckCircle2, Loader2, ShieldAlert, ArrowLeft, Navigation, Navigation2 } from 'lucide-react';
import { QuickActionTile } from '@/components/ui/QuickActionTile';
import { useTrustedContacts } from '@/hooks/useTrustedContacts';
import { useGeolocation } from '@/hooks/useGeolocation';
import { findNearbyHelp, NearbyHelpResult } from '@/lib/geocoding';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export default function SOSButton({ inline = false }: { inline?: boolean | 'home' }) {
  const prefersReducedMotion = useReducedMotion();
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isActivated, setIsActivated] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [helpScreen, setHelpScreen] = useState<'main' | 'contacts' | 'nearby'>('main');
  const [alertSent, setAlertSent] = useState(false);
  
  // Share state locks
  const [isSharingState, setIsSharingState] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const holdDuration = 2000;
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const holdingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const sharingRef = useRef(false);

  // Contacts flow states
  const { contacts, addContact, isLoaded } = useTrustedContacts();
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // Nearby Help flow states
  const { coordinates, isLoading: isLocLoading, error: locError, isDemo, useDemoLocation, locationName, retryLocation, triggerLocationRequest, permissionState, isSecureContext } = useGeolocation(false, true);
  
  const [nearbyResults, setNearbyResults] = useState<NearbyHelpResult[]>([]);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [selectedContactToAlert, setSelectedContactToAlert] = useState<any | null>(null);

  useEffect(() => {
    if (helpScreen === 'nearby' && coordinates && !isLocLoading) {
      if (nearbyResults.length > 0) return;
      
      const fetchNearby = async () => {
        setIsSearchingNearby(true);
        setNearbyError(null);
        
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        
        try {
          const results = await findNearbyHelp(coordinates[1], coordinates[0]);
          if (!abortController.signal.aborted) {
            setNearbyResults(results);
          }
        } catch (error: any) {
          if (!abortController.signal.aborted) {
            console.error("Failed to fetch nearby help:", error);
            setNearbyError(error.message || "Failed to load nearby locations.");
          }
        } finally {
          if (!abortController.signal.aborted) {
            setIsSearchingNearby(false);
          }
        }
      };
      
      fetchNearby();
    }
  }, [helpScreen, coordinates, isLocLoading, nearbyResults.length]);

  const handleRetryNearby = () => {
    setNearbyResults([]);
    setNearbyError(null);
  };

  const cleanup = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
    holdingRef.current = false;
    
    if (pointerIdRef.current !== null && buttonRef.current) {
      try {
        if (buttonRef.current.hasPointerCapture(pointerIdRef.current)) {
          buttonRef.current.releasePointerCapture(pointerIdRef.current);
        }
      } catch (e) {}
      pointerIdRef.current = null;
    }
  };

  const triggerSOSAlert = async (coords?: [number, number]) => {
    if (alertSent) return;
    setAlertSent(true);
    try {
      let locationStr = 'Location unavailable';
      if (coords) {
        locationStr = `Lat: ${coords[1].toFixed(4)}, Lng: ${coords[0].toFixed(4)}`;
      } else if (locationName) {
        locationStr = locationName;
      }

      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sos',
          title: 'SOS Triggered',
          description: 'User activated SOS from their device.',
          location: locationStr,
          lat: coords ? coords[1] : undefined,
          lng: coords ? coords[0] : undefined,
          severity: 'critical'
        })
      });
    } catch (e) {
      console.error('Failed to trigger alert API', e);
    }
  };

  const handlePointerCancel = (e?: React.PointerEvent<HTMLButtonElement>) => {
    if (!holdingRef.current || isActivated) return;
    setIsHolding(false);
    setProgress(0);
    cleanup();
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) handlePointerCancel();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cleanup();
    };
  }, [isActivated]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (isActivated) return;
    
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
    holdingRef.current = true;
    
    setIsHolding(true);
    setProgress(0);
    
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min((elapsed / holdDuration) * 100, 100);
      setProgress(currentProgress);
    }, 16);

    timerRef.current = setTimeout(() => {
      if (holdingRef.current) {
        setIsActivated(true);
        triggerSOSAlert(coordinates || undefined);
        if (!coordinates && !isLocLoading) triggerLocationRequest();
        cleanup();
        setIsHolding(false);
      }
    }, holdDuration);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isActivated) {
        setIsActivated(true);
        triggerSOSAlert(coordinates || undefined);
        if (!coordinates && !isLocLoading) triggerLocationRequest();
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!isActivated) {
      setIsActivated(true);
      triggerSOSAlert(coordinates || undefined);
      if (!coordinates && !isLocLoading) triggerLocationRequest();
    }
  };

  const handleCallEmergency = () => {
    window.location.href = "tel:112";
  };

  const executeShare = async (url: string, isAlertContact = false, contactPhone?: string) => {
    if (sharingRef.current) return;
    sharingRef.current = true;
    setIsSharingState(true);
    setShareStatus("Preparing emergency message...");

    const message = `EMERGENCY: SOS\nI need help. My current location is: ${url}\n${isDemo ? '(Demo Location)' : ''}\nTime: ${new Date().toLocaleTimeString()}`;

    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: "EMERGENCY: SOS",
            text: message,
          });
          setShareStatus("Shared successfully.");
        } catch (shareErr: any) {
          if (shareErr.name === 'InvalidStateError') {
            console.warn("Share already in progress");
          } else if (shareErr.name === 'AbortError') {
            setShareStatus("Share cancelled.");
          } else {
            throw shareErr;
          }
        }
      } else {
        throw new Error("Share API not supported");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setShareStatus("Share cancelled.");
      } else {
        // Fallback for contacts
        if (isAlertContact && contactPhone) {
          setShareStatus("SMS composer opened.");
          window.location.href = `sms:${contactPhone}?body=${encodeURIComponent(message)}`;
        } else {
          try {
            await navigator.clipboard.writeText(message);
            setShareStatus("Message copied to clipboard.");
          } catch {
            setShareStatus("Sharing is unavailable on this browser.");
          }
        }
      }
    } finally {
      sharingRef.current = false;
      setIsSharingState(false);
      setTimeout(() => setShareStatus(null), 3000);
    }
  };

  const handleShareLocation = () => {
    if (sharingRef.current) return;
    setShareStatus("Getting location...");
    
    if (coordinates) {
      const url = `https://maps.google.com/?q=${coordinates[1]},${coordinates[0]}`;
      executeShare(url);
    } else if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const url = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
          executeShare(url);
        }, 
        () => {
          executeShare("https://citysafe.ai");
          setShareStatus("Location unavailable. Sharing generic alert.");
        },
        { timeout: 5000 }
      );
    } else {
      executeShare("https://citysafe.ai");
    }
  };

  const handleAlertContact = (contact: {phone: string}) => {
    let url = "https://citysafe.ai";
    if (coordinates) {
      url = `https://maps.google.com/?q=${coordinates[1]},${coordinates[0]}`;
    }
    executeShare(url, true, contact.phone);
  };

  const handleFindNearby = () => {
    setHelpScreen('nearby');
    if (!coordinates && !isLocLoading && !locError) {
      triggerLocationRequest();
    }
  };

  if (isActivated) {
    const modalContent = (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed inset-0 z-[9999] bg-[--background] backdrop-blur-3xl flex flex-col p-6 pb-[calc(100px+env(safe-area-inset-bottom))] overflow-y-auto"
      >
        <div className="absolute inset-0 bg-danger/10 pointer-events-none fixed" />
        <div className="flex justify-between items-center mb-6 pt-[env(safe-area-inset-top)] relative z-10">
          <div className="flex items-center gap-3">
            {helpScreen !== 'main' && (
              <button onClick={() => setHelpScreen('main')} className="p-2 rounded-full hover:bg-muted text-foreground">
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            <div className="flex items-center gap-2 text-danger">
              {helpScreen === 'main' && <AlertCircle className="w-8 h-8 animate-pulse" />}
              <h1 className="text-xl font-bold tracking-wider">
                {helpScreen === 'main' && 'HELP MODE ACTIVE'}
                {helpScreen === 'contacts' && 'TRUSTED CONTACTS'}
                {helpScreen === 'nearby' && 'NEARBY HELP'}
              </h1>
            </div>
          </div>
          <button 
            onClick={() => { setIsActivated(false); setHelpScreen('main'); }}
            className="p-3 rounded-full bg-muted text-muted-fg hover:bg-muted/80 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <AnimatePresence mode="wait">
        {helpScreen === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col relative z-10"
          >
            <div className="glass-panel rounded-2xl p-4 mb-8">
              <p className="text-muted-fg text-sm mb-1">Current Location</p>
              <div className="text-foreground font-medium flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {isLocLoading ? 'Searching GPS...' : coordinates ? (locationName || 'Location Acquired') : 'Location Unavailable'}
                  </span>
                  {coordinates && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${isDemo ? 'bg-warning/20 text-warning-fg' : 'bg-primary/20 text-primary-fg'}`}>
                      {isDemo ? 'Demo' : 'Real GPS'}
                    </span>
                  )}
                </div>
                {!coordinates && !isLocLoading && locError && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={retryLocation} className="text-xs bg-primary text-primary-fg px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
                      Try Again
                    </button>
                    <button onClick={useDemoLocation} className="text-xs bg-muted text-foreground px-3 py-1.5 rounded-lg active:scale-95 transition-transform font-medium border border-border">
                      Use Demo Location
                    </button>
                  </div>
                )}
              </div>
            </div>

            <motion.div 
              className="space-y-4 flex-1 flex flex-col"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
            >
              <motion.button 
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                onClick={handleCallEmergency}
                className="w-full bg-danger hover:opacity-90 text-primary-fg p-5 rounded-2xl font-bold text-lg flex items-center gap-4 transition-transform active:scale-95 shadow-sm min-h-[44px]"
              >
                <Phone className="w-6 h-6" />
                CALL EMERGENCY SERVICES
              </motion.button>

              <motion.button 
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                onClick={handleShareLocation}
                disabled={isSharingState}
                className="w-full glass-panel hover:bg-muted/50 disabled:opacity-50 disabled:active:scale-100 text-foreground p-5 rounded-2xl font-semibold flex items-center gap-4 transition-transform active:scale-95 min-h-[44px]"
              >
                {isSharingState ? <Loader2 className="w-6 h-6 animate-spin" /> : <MapPin className="w-6 h-6" />}
                SHARE MY LOCATION
              </motion.button>

              <AnimatePresence>
              {shareStatus && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-3 bg-muted rounded-xl text-center flex justify-center items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{shareStatus}</span>
                </motion.div>
              )}
              </AnimatePresence>

              <motion.button 
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                onClick={() => setHelpScreen('contacts')}
                className="w-full glass-panel hover:bg-muted/50 text-foreground p-5 rounded-2xl font-semibold flex items-center gap-4 transition-transform active:scale-95 min-h-[44px]"
              >
                <Users className="w-6 h-6" />
                ALERT TRUSTED CONTACT
              </motion.button>
              
              <motion.button 
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                onClick={handleFindNearby}
                className="w-full glass-panel hover:bg-muted/50 text-foreground p-5 rounded-2xl font-semibold flex items-center gap-4 transition-transform active:scale-95 min-h-[44px]"
              >
                <Building className="w-6 h-6" />
                FIND NEARBY HELP
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {helpScreen === 'contacts' && (
          <motion.div 
            key="contacts"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 relative z-10 space-y-4"
          >
            {shareStatus && (
              <div className="p-3 bg-muted rounded-xl text-center flex justify-center items-center gap-2 mb-4 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{shareStatus}</span>
              </div>
            )}
            
            {contacts.length === 0 ? (
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="font-semibold mb-2">No trusted contacts found</h3>
                <p className="text-muted-fg text-sm mb-4">Add a trusted contact to quickly alert them in an emergency.</p>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Name" 
                    value={newContactName}
                    onChange={e => setNewContactName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-background border border-border"
                  />
                  <input 
                    type="tel" 
                    placeholder="Phone Number" 
                    value={newContactPhone}
                    onChange={e => setNewContactPhone(e.target.value)}
                    className="w-full p-3 rounded-xl bg-background border border-border"
                  />
                  <button 
                    onClick={() => {
                      if (newContactName && newContactPhone) {
                        addContact(newContactName, newContactPhone);
                        setNewContactName('');
                        setNewContactPhone('');
                      }
                    }}
                    className="w-full bg-primary text-primary-fg p-3 rounded-xl font-semibold min-h-[44px]"
                  >
                    Save Contact
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedContactToAlert ? (
                  <div className="glass-panel p-6 rounded-2xl animate-in fade-in zoom-in-95">
                    <h3 className="font-semibold mb-2">Alert {selectedContactToAlert.name}?</h3>
                    <p className="text-muted-fg text-sm mb-6">They will receive an emergency SMS containing your current location and a map link.</p>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setSelectedContactToAlert(null)}
                        className="flex-1 bg-secondary text-secondary-fg p-3 rounded-xl font-semibold min-h-[44px]"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          handleAlertContact(selectedContactToAlert);
                          setSelectedContactToAlert(null);
                        }}
                        disabled={isSharingState}
                        className="flex-1 bg-danger text-primary-fg p-3 rounded-xl font-semibold min-h-[44px]"
                      >
                        Confirm Alert
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-fg mb-4">Select a contact to send an emergency alert with your current location.</p>
                    {contacts.map(c => (
                      <button 
                        key={c.id}
                        onClick={() => setSelectedContactToAlert(c)}
                        disabled={isSharingState}
                        className="w-full glass-panel hover:bg-muted/50 p-4 rounded-2xl flex items-center justify-between transition-transform active:scale-95 disabled:opacity-50 text-left min-h-[44px]"
                      >
                        <div>
                          <p className="font-bold text-foreground">{c.name}</p>
                          <p className="text-xs text-muted-fg">{c.phone}</p>
                        </div>
                        <AlertCircle className="w-5 h-5 text-danger opacity-80" />
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}

        {helpScreen === 'nearby' && (
          <motion.div 
            key="nearby"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 relative z-10 flex flex-col h-full"
          >
            {!coordinates && !isLocLoading && !isDemo && (
              <div className="glass-panel p-6 rounded-2xl text-center space-y-4">
                <p className="text-muted-fg">{locError || "GPS location is unavailable."}</p>
                <div className="flex flex-col gap-2">
                  <button onClick={triggerLocationRequest} className="w-full bg-secondary text-secondary-fg p-3 rounded-xl font-semibold min-h-[44px]">
                    Request Location Access
                  </button>
                  <button onClick={useDemoLocation} className="w-full bg-primary text-primary-fg p-3 rounded-xl font-semibold min-h-[44px]">
                    Use Demo Location
                  </button>
                </div>
              </div>
            )}

            {isLocLoading && (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-70">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p>Acquiring GPS location...</p>
              </div>
            )}

            {coordinates && (
              <div className="space-y-4 pb-8">
                <a
                  href="tel:112"
                  className="w-full flex items-center justify-center gap-3 bg-danger text-primary-fg p-4 rounded-xl font-bold min-h-[44px] active:scale-95 transition-transform"
                >
                  <Phone className="w-6 h-6" />
                  Call Emergency Services — 112
                </a>
                
                {isSearchingNearby && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3 opacity-80">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm font-medium">Finding nearby facilities...</p>
                  </div>
                )}
                
                {!isSearchingNearby && nearbyError && (
                  <div className="glass-panel p-4 rounded-2xl text-center space-y-3 border-danger/30">
                    <p className="text-danger font-medium text-sm">
                      {nearbyError.includes('not configured') ? 'API Configuration Missing' :
                       nearbyError.includes('could not be loaded') ? 'Provider Request Failed' :
                       nearbyError.includes('Invalid') ? 'Invalid Coordinates' : 
                       'Nearby results unavailable'}
                    </p>
                    <p className="text-xs text-muted-fg">{nearbyError}</p>
                    <button onClick={handleRetryNearby} className="bg-secondary text-secondary-fg px-4 py-2 rounded-lg text-sm font-medium">
                      Retry
                    </button>
                  </div>
                )}

                {!isSearchingNearby && !nearbyError && nearbyResults.length > 0 && (
                  <div className="space-y-3">
                    {nearbyResults.map((result, idx) => (
                      <div key={idx} className="glass-panel p-4 rounded-xl flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-bold text-foreground leading-tight">{result.name}</p>
                            <p className="text-xs text-primary font-medium mt-0.5">{result.category === 'police' ? 'Police Station' : result.category === 'hospital' ? 'Hospital' : 'Emergency Service'}</p>
                          </div>
                          <span className="text-xs font-semibold bg-muted px-2 py-1 rounded text-muted-fg whitespace-nowrap">
                            {result.distance ? result.distance.toFixed(1) + ' km' : 'Nearby'}
                          </span>
                        </div>
                        
                        {result.address && (
                          <p className="text-xs text-muted-fg line-clamp-2 leading-relaxed">{result.address}</p>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2 mt-1">
                          {result.phone ? (
                            <a
                              href={`tel:${result.phone}`}
                              className="flex-1 flex items-center justify-center gap-2 bg-[#34c759] text-white py-2.5 px-3 rounded-lg text-sm font-bold min-h-[44px] active:scale-95 transition-transform"
                            >
                              <Phone className="w-4 h-4" /> Call
                            </a>
                          ) : (
                            <button
                              disabled
                              className="flex-1 flex items-center justify-center gap-2 bg-muted/50 text-muted-fg py-2.5 px-3 rounded-lg text-sm font-medium min-h-[44px] opacity-70 cursor-not-allowed"
                            >
                              <Phone className="w-4 h-4 opacity-50" /> Phone number unavailable
                            </button>
                          )}
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${result.lat},${result.lon}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-fg py-2.5 px-3 rounded-lg text-sm font-bold min-h-[44px] active:scale-95 transition-transform"
                          >
                            <Navigation className="w-4 h-4" /> Get Directions
                          </a>
                        </div>
                      </div>
                    ))}
                    {isDemo && (
                      <p className="text-xs text-center text-warning-fg bg-warning/20 p-2 rounded-lg font-medium mt-2">
                        Demo data — not for emergency use
                      </p>
                    )}
                  </div>
                )}
                
                <div className="mt-6 space-y-3 border-t border-border pt-4">
                  <p className="text-sm font-semibold text-foreground px-1">Other Search Options</p>
                  <div className="grid grid-cols-1 gap-3">
                    <a
                      href={`https://www.google.com/maps/search/police+station/@${coordinates[1]},${coordinates[0]},14z`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 bg-secondary text-secondary-fg p-4 rounded-xl font-medium min-h-[44px] active:scale-95 transition-transform"
                    >
                      <ShieldAlert className="w-5 h-5 opacity-70" /> Search Police Stations Nearby
                    </a>
                    
                    <a
                      href={`https://www.google.com/maps/search/hospital/@${coordinates[1]},${coordinates[0]},14z`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 bg-secondary text-secondary-fg p-4 rounded-xl font-medium min-h-[44px] active:scale-95 transition-transform"
                    >
                      <Building className="w-5 h-5 opacity-70" /> Search Hospitals Nearby
                    </a>
                    
                    <a
                      href={`https://www.google.com/maps/search/emergency+services/@${coordinates[1]},${coordinates[0]},14z`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 bg-secondary text-secondary-fg p-4 rounded-xl font-medium min-h-[44px] active:scale-95 transition-transform"
                    >
                      <AlertCircle className="w-5 h-5 opacity-70" /> Search Emergency Services
                    </a>
                    
                    <a
                      href={`https://maps.google.com/?q=${coordinates[1]},${coordinates[0]}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 glass-panel hover:bg-muted p-4 rounded-xl font-medium min-h-[44px] active:scale-95 transition-transform border border-border"
                    >
                      <MapPin className="w-5 h-5 opacity-70" /> Open Current Location
                    </a>
                  </div>
                </div>

                {process.env.NODE_ENV !== 'production' && (
                  <div className="glass-panel p-4 rounded-xl text-xs font-mono space-y-2 mt-4 text-muted-fg overflow-hidden break-words">
                    <p className="font-bold text-foreground border-b border-border pb-2 mb-2">Development Diagnostics</p>
                    <p>isSecureContext: {String(isSecureContext)}</p>
                    <p>Permission: {permissionState || 'unknown'}</p>
                    <p>Lat: {coordinates[1]}</p>
                    <p>Lng: {coordinates[0]}</p>
                    {locError && <p className="text-danger">Error: {locError}</p>}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
    );
    
    return typeof document !== 'undefined' ? require('react-dom').createPortal(modalContent, document.body) : modalContent;
  }

  if (inline === 'home') {
    return (
      <button 
        onClick={(e) => {
          e.preventDefault();
          if (!isActivating && !isActivated) {
            setIsActivating(true);
            if (!coordinates && !isLocLoading) triggerLocationRequest();
            setTimeout(() => {
              setIsActivated(true);
              triggerSOSAlert(coordinates || undefined);
              setIsActivating(false);
            }, 300); // Quick tap-to-confirm
          }
        }}
        disabled={isActivating || isActivated}
        className={`w-full rounded-2xl flex flex-col items-center justify-center p-6 gap-2 transition-all active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-danger/30 shadow-md ${
          isActivating ? 'bg-danger/80' : 'bg-[#e06666] hover:bg-[#d55555]'
        } text-white`}
      >
        {isActivating ? (
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xl font-bold tracking-wide">ACTIVATING...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-1">
              <ShieldAlert className="w-8 h-8" />
              <span className="text-2xl font-bold tracking-wide">SOS — Get Help Now</span>
            </div>
            <span className="text-sm font-medium text-white/90 text-center">
              Call emergency services, share your location, and alert trusted contacts
            </span>
          </>
        )}
      </button>
    );
  }

  if (inline) {
    return (
      <QuickActionTile 
        title="SOS" 
        icon={ShieldAlert} 
        variant="danger" 
        onClick={() => {
          setIsActivated(true);
          triggerSOSAlert(coordinates || undefined);
          if (!coordinates && !isLocLoading) triggerLocationRequest();
        }} 
      />
    );
  }

  return (
    <button
      ref={buttonRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerCancel}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={isHolding ? "Hold to activate SOS" : "Press and hold for SOS"}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        minHeight: '56px',
        minWidth: '56px',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))'
      }}
      className={`relative w-full h-full flex flex-col items-center justify-center overflow-hidden transition-transform duration-300 rounded-3xl shadow-sm border border-[--glass-border] focus:outline-none focus:ring-4 focus:ring-danger/30
        ${isHolding ? 'scale-[0.98]' : 'hover:scale-[1.02]'}
      `}
    >
      <div className="absolute inset-0 bg-danger opacity-90 backdrop-blur-md"></div>
      
      <div 
        className="absolute inset-0 bg-danger/80 origin-left transition-none mix-blend-overlay"
        style={{ transform: `scaleX(${progress / 100})` }}
      ></div>

      <div className="relative z-10 p-6 flex flex-col items-center justify-center gap-2 text-white pb-[env(safe-area-inset-bottom)]">
        <AlertCircle className={`w-10 h-10 ${isHolding ? 'animate-pulse opacity-100' : 'opacity-90'}`} strokeWidth={isHolding ? 2.5 : 2} />
        <h2 className="text-2xl font-bold tracking-wide">SOS</h2>
        <p className="text-white/80 text-sm font-medium text-center h-5">
          {isHolding ? 'Hold to activate SOS' : 'Tap for emergency'}
        </p>
      </div>
    </button>
  );
}
