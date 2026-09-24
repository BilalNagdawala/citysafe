'use client';

import { useState, useRef } from 'react';
import { Mic, Square, Play, Trash2, RotateCcw, AlertCircle, Share2 } from 'lucide-react';

export default function VoiceNote() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return stream;
    } catch (err) {
      setPermissionError("Microphone permission is required to record voice notes.");
      return null;
    }
  };

  const startRecording = async () => {
    setPermissionError(null);
    const stream = await requestPermission();
    
    if (stream) {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        // Stop all tracks to release mic
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 120) { // Max 2 minutes
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const deleteRecording = () => {
    setAudioUrl(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  const shareRecording = async () => {
    if (!audioUrl) return;
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const file = new File([blob], 'emergency_voice_note.webm', { type: 'audio/webm' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Emergency Voice Note',
          text: 'Please listen to this emergency voice note.',
          files: [file],
        });
      } else {
        // Fallback to download
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = 'emergency_voice_note.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.warn('Error sharing voice note:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="bg-card border border-border p-5 rounded-2xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold">Voice Note</h3>
          <p className="text-xs text-muted-fg">Record an incident description or evidence.</p>
        </div>
        <Mic className="w-5 h-5 text-primary opacity-50" />
      </div>

      {permissionError && (
        <div className="flex gap-2 text-danger bg-danger/10 p-3 rounded-xl text-sm mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{permissionError}</span>
        </div>
      )}

      {!isRecording && !audioUrl && (
        <button 
          onClick={startRecording}
          className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-fg hover:bg-secondary/80 p-4 rounded-xl font-medium transition-colors"
        >
          <Mic className="w-5 h-5" /> Tap to Record
        </button>
      )}

      {isRecording && (
        <div className="flex items-center justify-between bg-danger/10 p-4 rounded-xl border border-danger/20">
          <div className="flex items-center gap-3 text-danger">
            <div className="w-3 h-3 rounded-full bg-danger animate-pulse" />
            <span className="font-mono font-medium">{formatTime(recordingTime)}</span>
          </div>
          <button 
            onClick={stopRecording}
            className="p-3 bg-danger text-white rounded-full hover:bg-danger/90 active:scale-95 transition-transform shadow-md"
            aria-label="Stop Recording"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="space-y-3">
          <div className="bg-secondary/50 p-4 rounded-xl border border-border">
            <audio controls src={audioUrl} className="w-full h-10" />
          </div>
          
          <button 
            onClick={shareRecording}
            className="w-full flex items-center justify-center gap-2 p-3 bg-primary text-primary-fg hover:bg-primary/90 rounded-xl text-sm font-bold transition-colors active:scale-95 shadow-sm"
          >
            <Share2 className="w-5 h-5" /> Send to Trusted Contacts
          </button>

          <div className="flex gap-2">
            <button 
              onClick={deleteRecording}
              className="flex-1 flex items-center justify-center gap-2 p-3 bg-danger/10 text-danger hover:bg-danger/20 rounded-xl text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <button 
              onClick={() => {
                deleteRecording();
                startRecording();
              }}
              className="flex-1 flex items-center justify-center gap-2 p-3 bg-secondary text-secondary-fg hover:bg-secondary/80 rounded-xl text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Re-record
            </button>
          </div>
          <p className="text-[10px] text-center text-muted-fg italic">
            Audio is stored locally. Share or download to save evidence.
          </p>
        </div>
      )}
    </div>
  );
}
