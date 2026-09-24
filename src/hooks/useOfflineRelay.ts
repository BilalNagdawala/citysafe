import { useState, useEffect, useCallback } from 'react';

interface QueuedMessage {
  id: string;
  type: 'sos' | 'incident' | 'guardian_alert';
  data: any;
  timestamp: number;
}

export function useOfflineRelay() {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [bluetoothSupported, setBluetoothSupported] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('Online. Syncing queued messages...');
      syncMessages();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('Offline. Messages will be queued.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check BT support
    if ((navigator as any).bluetooth) {
      setBluetoothSupported(true);
    }

    // Load queue from localStorage
    const saved = localStorage.getItem('citysafe_offline_queue');
    if (saved) {
      try {
        setQueuedMessages(JSON.parse(saved));
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveToQueue = (msg: QueuedMessage) => {
    setQueuedMessages((prev) => {
      const updated = [...prev, msg];
      localStorage.setItem('citysafe_offline_queue', JSON.stringify(updated));
      return updated;
    });
    setSyncStatus('Saved offline — waiting for connection');
  };

  const syncMessages = useCallback(async () => {
    const saved = localStorage.getItem('citysafe_offline_queue');
    if (!saved) {
      setSyncStatus('Online');
      return;
    }
    
    try {
      const messages: QueuedMessage[] = JSON.parse(saved);
      if (messages.length === 0) {
        setSyncStatus('Online');
        return;
      }
      
      // Simulate backend sync
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Clear queue
      localStorage.removeItem('citysafe_offline_queue');
      setQueuedMessages([]);
      setSyncStatus('All offline messages synced.');
      
      setTimeout(() => setSyncStatus('Online'), 3000);
    } catch (e) {
      console.error(e);
      setSyncStatus('Failed to sync. Will retry.');
    }
  }, []);

  const queueMessage = (type: 'sos' | 'incident' | 'guardian_alert', data: any) => {
    if (isOnline) {
      // Direct send (simulated)
      console.log(`Sending directly: ${type}`, data);
      return true;
    } else {
      saveToQueue({
        id: Math.random().toString(36).substring(7),
        type,
        data,
        timestamp: Date.now()
      });
      return false; // indicates it was queued
    }
  };

  const connectBluetoothMesh = async () => {
    if (!(navigator as any).bluetooth) {
      alert("Bluetooth API not supported on this browser.");
      return;
    }
    
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        // In a real app, you would filter by specific UUIDs for your mesh protocol
        // filters: [{ services: ['xxx-xxx-xxx'] }]
      });
      
      console.log('Bluetooth device selected:', device.name);
      setBluetoothEnabled(true);
      setSyncStatus(`Connected to mesh relay: ${device.name || 'Unknown device'}`);
    } catch (err: any) {
      console.error('Bluetooth connection failed:', err);
      setBluetoothEnabled(false);
      setSyncStatus(`Bluetooth failed: ${err.message}`);
    }
  };

  return {
    isOnline,
    bluetoothSupported,
    bluetoothEnabled,
    queuedMessages,
    syncStatus,
    queueMessage,
    connectBluetoothMesh
  };
}
