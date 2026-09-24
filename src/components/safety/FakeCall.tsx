'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, X, User, Mic, MicOff, Volume2, Grid, Bell, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FakeCall() {
  const [isActive, setIsActive] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callerName, setCallerName] = useState('Mom');
  const [delay, setDelay] = useState(5); // seconds
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isRingtoneMuted, setIsRingtoneMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const vibrateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isActive && !isRinging && !isCallActive) {
      timer = setTimeout(() => {
        setIsRinging(true);
      }, delay * 1000);
    }
    return () => clearTimeout(timer);
  }, [isActive, delay, isRinging, isCallActive]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  // Audio & Vibration Lifecycle
  useEffect(() => {
    if (isRinging && !isCallActive) {
      if (!isRingtoneMuted && !autoplayBlocked) {
        if (!audioRef.current) {
          audioRef.current = new Audio('/ringtone.mp3');
          audioRef.current.loop = true;
        }
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name === 'NotAllowedError') {
              setAutoplayBlocked(true);
            }
          });
        }
      } else if (audioRef.current) {
        audioRef.current.pause();
      }

      // Vibration
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!isRingtoneMuted && !prefersReducedMotion && 'vibrate' in navigator) {
        navigator.vibrate([1000, 1000]);
        if (!vibrateIntervalRef.current) {
          vibrateIntervalRef.current = setInterval(() => {
            if ('vibrate' in navigator) navigator.vibrate([1000, 1000]);
          }, 2000);
        }
      } else {
        if (vibrateIntervalRef.current) {
          clearInterval(vibrateIntervalRef.current);
          vibrateIntervalRef.current = null;
        }
        if ('vibrate' in navigator) navigator.vibrate(0);
      }
    } else {
      // Stop everything when call is accepted, cancelled, etc.
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (vibrateIntervalRef.current) {
        clearInterval(vibrateIntervalRef.current);
        vibrateIntervalRef.current = null;
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
    }

    return () => {
      // Cleanup on unmount
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (vibrateIntervalRef.current) {
        clearInterval(vibrateIntervalRef.current);
        vibrateIntervalRef.current = null;
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
    };
  }, [isRinging, isCallActive, isRingtoneMuted, autoplayBlocked]);

  const handleStart = () => {
    setIsActive(true);
  };

  const handleCancel = () => {
    setIsActive(false);
    setIsRinging(false);
    setIsCallActive(false);
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeaker(false);
    setAutoplayBlocked(false);
  };

  const handleAccept = () => {
    setIsRinging(false);
    setIsCallActive(true);
  };

  const handleDecline = () => {
    handleCancel();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (isRinging || isCallActive) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-zinc-900 text-white flex flex-col items-center justify-between py-16 px-6"
        >
          <div className="flex flex-col items-center mt-12 z-20 relative">
            <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
              <User className="w-12 h-12 text-zinc-500" />
            </div>
            <h2 className="text-4xl font-light tracking-wider mb-2">{callerName}</h2>
            <p className="text-zinc-400 font-medium">
              {isRinging ? 'Simulated Incoming Call...' : formatTime(callDuration)}
            </p>
          </div>

          {isRinging && autoplayBlocked && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-30 px-6">
              <p className="text-white text-lg font-bold mb-6 text-center">Tap to enable ringtone</p>
              <button 
                onClick={() => setAutoplayBlocked(false)}
                className="bg-primary text-white px-8 py-4 rounded-full font-bold shadow-lg active:scale-95 transition-transform"
              >
                Enable Audio
              </button>
            </div>
          )}

          {isRinging && !autoplayBlocked && (
            <button
              onClick={() => setIsRingtoneMuted(!isRingtoneMuted)}
              className="absolute top-16 right-6 p-3 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors z-20"
              aria-label={isRingtoneMuted ? "Unmute ringtone" : "Mute ringtone"}
            >
              {isRingtoneMuted ? <BellOff className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
            </button>
          )}

          {!isRinging && (
            <div className="grid grid-cols-3 gap-8 mb-8 mt-auto">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="flex flex-col items-center gap-2"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-white text-black' : 'bg-zinc-800 text-white'}`}>
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </div>
                <span className="text-xs text-zinc-400">Mute</span>
              </button>
              
              <button className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-white">
                  <Grid className="w-6 h-6" />
                </div>
                <span className="text-xs text-zinc-400">Keypad</span>
              </button>

              <button 
                onClick={() => setIsSpeaker(!isSpeaker)}
                className="flex flex-col items-center gap-2"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isSpeaker ? 'bg-white text-black' : 'bg-zinc-800 text-white'}`}>
                  <Volume2 className="w-6 h-6" />
                </div>
                <span className="text-xs text-zinc-400">Speaker</span>
              </button>
            </div>
          )}

          <div className="flex w-full justify-around mb-12 max-w-sm z-20 relative">
            {isRinging ? (
              <>
                <button 
                  onClick={handleDecline}
                  className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center animate-pulse"
                >
                  <Phone className="w-8 h-8 rotate-[135deg]" />
                </button>
                <button 
                  onClick={handleAccept}
                  className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center animate-bounce"
                >
                  <Phone className="w-8 h-8" />
                </button>
              </>
            ) : (
              <button 
                onClick={handleDecline}
                className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center"
              >
                <Phone className="w-8 h-8 rotate-[135deg]" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="bg-card border border-border p-5 rounded-2xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold">Fake Call</h3>
          <p className="text-xs text-muted-fg">Simulate an incoming call for a discreet exit.</p>
        </div>
        <Phone className="w-5 h-5 text-primary opacity-50" />
      </div>

      {!isActive ? (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-muted-fg mb-1 block">Caller Name</label>
            <input 
              type="text" 
              value={callerName} 
              onChange={(e) => setCallerName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="e.g. Mom, Roommate"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-fg mb-1 block">Delay</label>
            <div className="flex gap-2">
              {[5, 15, 30].map(time => (
                <button 
                  key={time}
                  onClick={() => setDelay(time)}
                  className={`flex-1 p-2 rounded-xl text-sm font-medium transition-colors ${delay === time ? 'bg-primary text-primary-fg' : 'bg-secondary text-secondary-fg hover:bg-secondary/80'}`}
                >
                  {time}s
                </button>
              ))}
            </div>
          </div>
          <button 
            onClick={handleStart}
            className="w-full bg-primary text-primary-fg p-3 rounded-xl font-bold active:scale-95 transition-transform"
          >
            Start Timer
          </button>
        </div>
      ) : (
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium">Call in {delay}s</span>
          </div>
          <button 
            onClick={handleCancel}
            className="p-2 rounded-lg bg-background text-danger hover:bg-danger/10 border border-border transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
