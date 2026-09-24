import { useState, useEffect, useCallback } from 'react';

export interface LocationState {
  coordinates: [number, number] | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
  isDemo: boolean;
  locationName: string | null;
  permissionState: PermissionState | null;
  isSecureContext: boolean;
}

export function useGeolocation(watch: boolean = false, lazy: boolean = false) {
  const [state, setState] = useState<LocationState>({
    coordinates: null,
    accuracy: null,
    error: null,
    isLoading: !lazy,
    isDemo: false,
    locationName: null,
    permissionState: null,
    isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false
  });
  const [retryCount, setRetryCount] = useState(0);
  const [triggerCount, setTriggerCount] = useState(lazy ? 0 : 1);

  const fetchLocationName = async (lat: number, lon: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await response.json();
      if (data && data.address) {
        const name = data.address.suburb || data.address.neighbourhood || data.address.city || data.address.town || data.display_name;
        setState(s => ({ ...s, locationName: name }));
      }
    } catch (err) {
      console.error("Failed to reverse geocode:", err);
    }
  };

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setState(s => ({ ...s, permissionState: result.state }));
        result.onchange = () => {
          setState(s => ({ ...s, permissionState: result.state }));
        };
      }).catch(() => {
        // Ignored
      });
    }
  }, []);

  useEffect(() => {
    if (triggerCount === 0) return;

    let watchId: number | null = null;
    let isMounted = true;
    
    // Reset state when trying again
    setState(s => ({ ...s, isLoading: true, error: null }));

    if (!('geolocation' in navigator)) {
      if (isMounted) setState(s => ({ ...s, error: 'Geolocation is not supported by your browser', isLoading: false }));
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      if (!isMounted) return;
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      
      setState(s => ({
        ...s,
        coordinates: [lon, lat],
        accuracy: position.coords.accuracy,
        error: null,
        isLoading: false,
        isDemo: false,
        locationName: "Current Location" // Temporary until reverse geocode completes
      }));
      
      fetchLocationName(lat, lon);
    };

    const handleError = (error: GeolocationPositionError | { code: number, message?: string }) => {
      if (!isMounted) return;
      let errorMessage = 'Failed to get location';
      switch (error.code) {
        case 1: // PERMISSION_DENIED
          errorMessage = 'Location permission denied.';
          break;
        case 2: // POSITION_UNAVAILABLE
          errorMessage = 'Location information is unavailable.';
          break;
        case 3: // TIMEOUT
          errorMessage = 'The request to get user location timed out.';
          break;
      }
      setState(s => ({ ...s, error: errorMessage, isLoading: false, isDemo: false }));
    };

    if (!isSecureContext && process.env.NODE_ENV === 'production') {
      handleError({ code: 1, message: 'Geolocation requires a secure context' });
      return;
    }

    const options = {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 0
    };

    if (watch) {
      watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
    } else {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
    }

    return () => {
      isMounted = false;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watch, retryCount, triggerCount]);

  const useDemoLocation = useCallback(() => {
    setState(s => ({
      ...s,
      coordinates: [72.8697, 19.1136],
      accuracy: 10,
      error: null,
      isLoading: false,
      isDemo: true,
      locationName: 'Andheri East (Demo)'
    }));
  }, []);

  const retryLocation = useCallback(() => {
    setState(s => ({ ...s, coordinates: null, locationName: null, isLoading: true, error: null, isDemo: false }));
    setRetryCount(c => c + 1);
    setTriggerCount(c => c === 0 ? 1 : c);
  }, []);

  const triggerLocationRequest = useCallback(() => {
    setTriggerCount(c => c + 1);
  }, []);

  return { ...state, useDemoLocation, retryLocation, triggerLocationRequest };
}
