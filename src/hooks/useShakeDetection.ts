import { useState, useEffect, useCallback, useRef } from 'react';

interface UseShakeDetectionOptions {
  onShake: () => void;
  threshold?: number;
  timeout?: number;
  cooldown?: number;
}

export function useShakeDetection({
  onShake,
  threshold = 25, // higher threshold for deliberate shake
  timeout = 1000,
  cooldown = 3000,
}: UseShakeDetectionOptions) {
  const [enabled, setEnabled] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // On mount, check if shake is enabled in localStorage
    const savedState = localStorage.getItem('citysafe_shake_enabled');
    if (savedState === 'true') {
      setEnabled(true);
      // For browsers that don't need explicit permission, or if permission is remembered
      setPermissionGranted(true);
    }
  }, []);

  const lastShakeRef = useRef<number>(0);
  const shakeCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const handleMotion = useCallback(
    (event: DeviceMotionEvent) => {
      if (!enabled) return;

      const { accelerationIncludingGravity } = event;
      if (!accelerationIncludingGravity) return;

      const { x, y, z } = accelerationIncludingGravity;
      if (x === null || y === null || z === null) return;

      const currentTime = Date.now();
      if (currentTime - lastShakeRef.current < cooldown) {
        return; // In cooldown
      }

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
        return;
      }

      const timeDifference = currentTime - lastTimeRef.current;

      if (timeDifference > 50) { // Throttle processing
        const magnitude = Math.sqrt(x*x + y*y + z*z);
        
        // Gravity is around 9.8. If magnitude > threshold, it's a hard shake.
        if (magnitude > threshold) {
          shakeCountRef.current += 1;
          
          if (shakeCountRef.current >= 3) { // Require 3 shakes
            lastShakeRef.current = currentTime;
            shakeCountRef.current = 0;
            onShake();
          }
        }
        
        // Reset shake count if too much time passes between shakes
        if (currentTime - lastTimeRef.current > timeout) {
           shakeCountRef.current = 0;
        }

        lastTimeRef.current = currentTime;
      }
    },
    [enabled, onShake, threshold, timeout, cooldown]
  );

  useEffect(() => {
    if (enabled && permissionGranted) {
      window.addEventListener('devicemotion', handleMotion);
    } else {
      window.removeEventListener('devicemotion', handleMotion);
      lastTimeRef.current = 0;
      shakeCountRef.current = 0;
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [enabled, permissionGranted, handleMotion]);

  const requestPermission = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceMotionEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setPermissionGranted(true);
          setEnabled(true);
          localStorage.setItem('citysafe_shake_enabled', 'true');
          setError(null);
        } else {
          setPermissionGranted(false);
          setEnabled(false);
          localStorage.removeItem('citysafe_shake_enabled');
          setError('Permission to access device motion was denied.');
        }
      } catch (err: any) {
        setPermissionGranted(false);
        setError(err.message || 'Error requesting motion permission.');
      }
    } else {
      // Non-iOS 13+ devices typically don't require permission
      setPermissionGranted(true);
      setEnabled(true);
      localStorage.setItem('citysafe_shake_enabled', 'true');
      setError(null);
    }
  };

  const toggleShake = () => {
    if (!enabled && permissionGranted !== true) {
      requestPermission();
    } else {
      const newState = !enabled;
      setEnabled(newState);
      if (newState) {
        localStorage.setItem('citysafe_shake_enabled', 'true');
      } else {
        localStorage.removeItem('citysafe_shake_enabled');
      }
    }
  };

  return {
    enabled,
    toggleShake,
    permissionGranted,
    error,
    requestPermission
  };
}
