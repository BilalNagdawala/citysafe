'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { GlassButton } from '@/components/ui/GlassButton';
import {
  AlertTriangle,
  MapPin,
  X,
  CheckCircle2,
  Camera,
  Trash2,
  Loader2,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';

interface ReportIncidentSheetProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  'Harassment',
  'Assault',
  'Theft',
  'Suspicious activity',
  'Poor lighting',
  'Unsafe isolated area',
  'Other',
];

export function ReportIncidentSheet({ onClose, onSuccess }: ReportIncidentSheetProps) {
  const {
    coordinates,
    isLoading: isLocating,
    locationName,
    error: locationError,
    retryLocation,
  } = useGeolocation();

  const [category, setCategory] = useState<string>('');
  const [severity, setSeverity] = useState<number>(50);
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [occurredAt, setOccurredAt] = useState<string>(
    new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );

  // Manual fallback coordinates when location permission is denied
  const [manualLat, setManualLat] = useState<string>('');
  const [manualLng, setManualLng] = useState<string>('');
  const [useManualLocation, setUseManualLocation] = useState(false);

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedIncidentId, setSubmittedIncidentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image exceeds the 5MB size limit.');
      return;
    }

    setError(null);

    // Compress client-side
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
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                setPhoto(compressedFile);
                setPhotoPreview(canvas.toDataURL('image/jpeg', 0.8));
              }
            },
            'image/jpeg',
            0.8
          );
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

  // Determine active coordinates
  const effectiveCoordinates = (() => {
    if (useManualLocation && manualLat && manualLng) {
      const parsedLat = parseFloat(manualLat);
      const parsedLng = parseFloat(manualLng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        return [parsedLng, parsedLat] as [number, number];
      }
    }
    return coordinates;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return; // Prevent duplicate submissions

    if (!category) {
      setError('Please select an incident category.');
      return;
    }

    if (!effectiveCoordinates) {
      setError('Location is required. Please grant location access or enter coordinates.');
      return;
    }

    const lat = effectiveCoordinates[1];
    const lng = effectiveCoordinates[0];

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError(`Invalid coordinates (Lat: ${lat}, Lng: ${lng}). Please check location.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let imageUrl: string | undefined;
    let photoStorageKey: string | undefined;
    let photoMimeType: string | undefined;
    let photoUploadedAt: string | undefined;

    // 1. Upload photo if present
    if (photo) {
      try {
        setIsUploadingPhoto(true);
        const formData = new FormData();
        formData.append('file', photo);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.details || uploadData.error || 'Failed to upload photo');
        }

        imageUrl = uploadData.url;
        photoStorageKey = uploadData.photoStorageKey;
        photoMimeType = uploadData.photoMimeType;
        photoUploadedAt = uploadData.photoUploadedAt;
      } catch (err: any) {
        setError(err.message || 'Failed to upload photo. You can remove it and try again.');
        setIsSubmitting(false);
        setIsUploadingPhoto(false);
        return;
      } finally {
        setIsUploadingPhoto(false);
      }
    }

    // 2. Submit incident report
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          severity,
          description: description.trim(),
          lat,
          lng,
          isAnonymous,
          occurredAt: new Date(occurredAt).toISOString(),
          photoUrl: imageUrl,
          photoStorageKey,
          photoMimeType,
          photoUploadedAt,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const errorMsg = data.details || data.error || `Server responded with HTTP ${res.status}`;
        throw new Error(errorMsg);
      }

      const newId = data.incidentId || data.incident?.id || 'Recorded';
      setSubmittedIncidentId(newId);
      setSuccess(true);

      // Auto close after notifying parent
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error('Incident submission failed:', err);
      setError(err.message || 'Failed to submit incident. Please check your network and retry.');
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
            <button
              onClick={onClose}
              className="p-2 bg-muted rounded-full hover:bg-muted/80 text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-sage/10 text-sage flex items-center justify-center border border-sage/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Report Submitted</h3>
              {submittedIncidentId && (
                <div className="bg-muted px-4 py-1.5 rounded-lg border border-border">
                  <span className="text-xs text-muted-fg font-mono font-bold">
                    Incident ID: {submittedIncidentId}
                  </span>
                </div>
              )}
              <p className="text-sm text-muted-fg max-w-xs leading-relaxed">
                Thank you for keeping the community safe. Your report has been saved to the database and
                dispatched to nearby Guardians.
              </p>
              <button
                type="button"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="mt-2 px-6 py-2.5 bg-primary text-primary-fg font-bold rounded-xl text-sm shadow hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: What & Severity */}
              <div className="space-y-5">
                <div className="border-b border-border pb-2 mb-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="bg-primary text-primary-fg w-5 h-5 rounded-full flex items-center justify-center text-xs">
                      1
                    </span>
                    What happened?
                  </h3>
                </div>

                <div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
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
                    Severity Level ({severity} / 100)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={severity}
                    onChange={(e) => setSeverity(parseInt(e.target.value, 10))}
                    className="w-full accent-danger cursor-pointer"
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
                    max={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16)}
                  />
                </div>
              </div>

              {/* Step 2: Where */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-border pb-2 mb-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="bg-primary text-primary-fg w-5 h-5 rounded-full flex items-center justify-center text-xs">
                      2
                    </span>
                    Where is this?
                  </h3>
                </div>

                <div className="bg-secondary/50 p-4 rounded-xl border border-border space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      {isLocating ? (
                        <p className="text-xs text-muted-fg animate-pulse">Detecting your exact location...</p>
                      ) : effectiveCoordinates ? (
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {useManualLocation ? 'Manually Specified Location' : locationName || 'Current Location'}
                          </p>
                          <p className="text-[10px] text-muted-fg mt-0.5 font-mono">
                            Lat: {effectiveCoordinates[1].toFixed(4)}, Lng: {effectiveCoordinates[0].toFixed(4)}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-danger font-medium">
                            {locationError || 'Location detection unavailable.'}
                          </p>
                          <p className="text-[11px] text-muted-fg mt-1">
                            Click retry or enter coordinates manually below.
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => retryLocation()}
                      className="p-1.5 hover:bg-muted rounded-lg text-muted-fg hover:text-foreground transition-colors"
                      title="Retry location detection"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Manual coordinates fallback */}
                  <div className="pt-2 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => setUseManualLocation(!useManualLocation)}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      {useManualLocation ? 'Use Automatic GPS' : 'Enter Location Manually'}
                    </button>

                    {useManualLocation && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <input
                          type="number"
                          step="any"
                          placeholder="Latitude (e.g. 19.0760)"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                          className="bg-card border border-border rounded-lg p-2 text-xs text-foreground outline-none"
                        />
                        <input
                          type="number"
                          step="any"
                          placeholder="Longitude (e.g. 72.8777)"
                          value={manualLng}
                          onChange={(e) => setManualLng(e.target.value)}
                          className="bg-card border border-border rounded-lg p-2 text-xs text-foreground outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Details */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-border pb-2 mb-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="bg-primary text-primary-fg w-5 h-5 rounded-full flex items-center justify-center text-xs">
                      3
                    </span>
                    Additional Details
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details that can help Guardians assess the situation..."
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
                          <span className="text-white text-xs font-bold">Uploading Photo...</span>
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
                  <p className="text-[10px] text-muted-fg mt-2 font-medium leading-relaxed">
                    Limit 5MB (JPG, PNG, WebP). EXIF metadata is stripped before saving.
                  </p>
                </div>
              </div>

              {/* Step 4: Privacy */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-border pb-2 mb-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="bg-primary text-primary-fg w-5 h-5 rounded-full flex items-center justify-center text-xs">
                      4
                    </span>
                    Privacy & Submission
                  </h3>
                </div>

                <div className="flex items-center justify-between bg-secondary/30 p-4 rounded-xl border border-border">
                  <div>
                    <span className="text-sm font-bold block mb-0.5">Report Anonymously</span>
                    <span className="text-xs text-muted-fg block max-w-[220px]">
                      Your identity will not be attached to this public report.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      isAnonymous ? 'bg-sage' : 'bg-muted-fg/30'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isAnonymous ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {error && (
                  <div className="bg-danger/10 text-danger text-sm p-4 rounded-xl border border-danger/20 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1 font-medium">{error}</div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-3 py-1 bg-danger text-white rounded-lg text-xs font-bold hover:bg-danger/90 transition-colors"
                    >
                      Retry Submission
                    </button>
                  </div>
                )}
              </div>

              <GlassButton
                type="submit"
                disabled={!category || !effectiveCoordinates || isSubmitting}
                className="w-full !bg-danger !text-white !border-danger/50 shadow-md shadow-danger/20 mt-4 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isUploadingPhoto ? 'Uploading Photo...' : 'Recording Incident...'}
                  </span>
                ) : (
                  'SUBMIT REPORT'
                )}
              </GlassButton>
            </form>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
