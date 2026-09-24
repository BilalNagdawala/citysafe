'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { GlassButton } from '@/components/ui/GlassButton';
import { AlertTriangle, MapPin, X, CheckCircle2, Camera, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';

interface ReportIncidentSheetProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  "Harassment",
  "Assault",
  "Theft",
  "Suspicious activity",
  "Poor lighting",
  "Unsafe isolated area",
  "Other"
];

export function ReportIncidentSheet({ onClose, onSuccess }: ReportIncidentSheetProps) {
  const { coordinates, isLoading: isLocating, locationName } = useGeolocation();
  
  const [category, setCategory] = useState<string>("");
  const [severity, setSeverity] = useState<number>(50);
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [occurredAt, setOccurredAt] = useState<string>(
    new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  );
  
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    
    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setError('Image exceeds the 5MB size limit.');
      return;
    }
    
    setError(null);

    // Compress image
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
              setPhoto(compressedFile);
              setPhotoPreview(canvas.toDataURL('image/jpeg', 0.8));
            }
          }, 'image/jpeg', 0.8);
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !coordinates) {
      setError("Please select a category and wait for location.");
      return;
    }

    const lat = coordinates[1];
    const lng = coordinates[0];

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError(`Invalid coordinates detected (Lat: ${lat}, Lng: ${lng}). Cannot submit report.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let imageUrl = undefined;
    let photoStorageKey = undefined;
    let photoMimeType = undefined;
    let photoUploadedAt = undefined;
    
    if (photo) {
      try {
        setIsUploadingPhoto(true);
        const formData = new FormData();
        formData.append('file', photo);
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!uploadRes.ok) {
          const upErr = await uploadRes.json();
          throw new Error(upErr.error || 'Failed to upload photo');
        }
        
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
        photoStorageKey = uploadData.photoStorageKey;
        photoMimeType = uploadData.photoMimeType;
        photoUploadedAt = uploadData.photoUploadedAt;
      } catch (err: any) {
        setError(err.message || 'Failed to upload photo');
        setIsSubmitting(false);
        setIsUploadingPhoto(false);
        return;
      }
      setIsUploadingPhoto(false);
    }

    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          severity,
          description,
          lat,
          lng,
          isAnonymous,
          occurredAt: new Date(occurredAt).toISOString(),
          photoUrl: imageUrl,
          photoStorageKey,
          photoMimeType,
          photoUploadedAt
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit report");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-black/40 backdrop-blur-sm">
      <BottomSheet defaultExpanded={true}>
        <div className="relative pb-4 pt-2 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-danger">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="text-lg font-bold">Report Incident</h2>
            </div>
            <button onClick={onClose} className="p-2 bg-muted rounded-full hover:bg-muted/80 text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-sage" />
              <h3 className="text-xl font-bold text-foreground">Report Submitted</h3>
              <p className="text-center text-sm text-muted-fg max-w-xs">
                Thank you for helping keep the community safe. Your report is being processed.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Step 1: What & Severity */}
              <div className="space-y-5">
                <div className="border-b border-border pb-2 mb-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="bg-primary text-primary-fg w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span>
                    What happened?
                  </h3>
                </div>
                
                <div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors border ${
                          category === cat 
                            ? 'bg-danger text-white border-danger shadow-sm' 
                            : 'bg-[--background] border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-3">
                    Severity Level
                  </label>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={severity} 
                    onChange={(e) => setSeverity(parseInt(e.target.value))}
                    className="w-full accent-danger"
                  />
                  <div className="flex justify-between text-xs text-muted-fg mt-2 font-medium">
                    <span>Minor Concern</span>
                    <span>Severe Danger</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-3">
                    When did this happen?
                  </label>
                  <input
                    type="datetime-local"
                    value={occurredAt}
                    onChange={(e) => setOccurredAt(e.target.value)}
                    className="w-full bg-[--background] border border-border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                    max={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  />
                </div>
              </div>

              {/* Step 2: Where */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-border pb-2 mb-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="bg-primary text-primary-fg w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
                    Where is this?
                  </h3>
                </div>
                
                <div className="bg-secondary/50 p-4 rounded-xl border border-border">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      {isLocating ? (
                        <p className="text-xs text-muted-fg animate-pulse">Detecting your exact location...</p>
                      ) : coordinates ? (
                        <div>
                          <p className="text-sm font-medium text-foreground">{locationName || "Current Location"}</p>
                          <p className="text-[10px] text-muted-fg mt-0.5 font-mono">
                            {coordinates[1].toFixed(4)}, {coordinates[0].toFixed(4)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-danger">Location access is required.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Details */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-border pb-2 mb-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="bg-primary text-primary-fg w-5 h-5 rounded-full flex items-center justify-center text-xs">3</span>
                    Additional Details
                  </h3>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide any additional details..."
                    className="w-full bg-[--background] border border-border rounded-xl p-3 text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-primary/20 text-foreground resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Attach Photo (Optional)</label>
                  
                  {photoPreview ? (
                    <div className="relative w-full h-40 rounded-xl border border-border overflow-hidden bg-muted">
                      <img src={photoPreview} alt="Incident preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={removePhoto}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm">
                          <Loader2 className="w-6 h-6 text-white animate-spin mb-2" />
                          <span className="text-white text-xs font-bold">Uploading...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <label className="flex-1 border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                        <ImageIcon className="w-6 h-6 text-muted-fg mb-2" />
                        <span className="text-xs font-medium text-muted-fg">Upload from Gallery</span>
                        <input 
                          type="file" 
                          accept="image/jpeg, image/png, image/webp" 
                          onChange={handlePhotoSelect}
                          className="hidden" 
                        />
                      </label>
                      <label className="flex-1 border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                        <Camera className="w-6 h-6 text-muted-fg mb-2" />
                        <span className="text-xs font-medium text-muted-fg">Take Photo</span>
                        <input 
                          type="file" 
                          accept="image/jpeg, image/png, image/webp" 
                          capture="environment"
                          onChange={handlePhotoSelect}
                          className="hidden" 
                        />
                      </label>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-fg mt-2 font-medium leading-relaxed">Limit 5MB. For your safety, EXIF metadata and original location data are automatically stripped from uploaded photos.</p>
                </div>
              </div>

              {/* Step 4: Privacy */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-border pb-2 mb-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="bg-primary text-primary-fg w-5 h-5 rounded-full flex items-center justify-center text-xs">4</span>
                    Privacy & Submission
                  </h3>
                </div>

                <div className="flex items-center justify-between bg-secondary/30 p-4 rounded-xl border border-border">
                  <div>
                    <span className="text-sm font-bold block mb-0.5">Report Anonymously</span>
                    <span className="text-xs text-muted-fg block max-w-[220px]">Your personal identity and IP address will not be attached to this public report.</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isAnonymous ? 'bg-sage' : 'bg-muted-fg/30'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAnonymous ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {error && (
                  <div className="bg-danger/10 text-danger text-sm p-3 rounded-lg border border-danger/20">
                    {error}
                  </div>
                )}
              </div>

              <GlassButton 
                type="submit" 
                disabled={!category || !coordinates || isSubmitting}
                className="w-full !bg-danger !text-white !border-danger/50 shadow-md shadow-danger/20 mt-4"
              >
                {isSubmitting ? (isUploadingPhoto ? "Uploading Photo..." : "Submitting...") : "SUBMIT REPORT"}
              </GlassButton>
            </form>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
