import { useState, useEffect, useCallback } from 'react';
import { useFirebase } from '../context/FirebaseContext';

export interface QuotaItem {
  used: number;
  limit: number;
  remaining: number;
}

export interface QuotaData {
  tier: 'guest' | 'free' | 'pro' | 'agency';
  extractions: QuotaItem;
  generations: QuotaItem;
  multimodal: QuotaItem;
}

export function useQuota() {
  const { user } = useFirebase();
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchQuota = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user) {
        try {
          const token = await user.getIdToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      } else {
        const guestToken = localStorage.getItem('axe_hours_guest_token');
        if (guestToken) headers['Authorization'] = `Bearer ${guestToken}`;
      }

      const res = await fetch('/api/me/quota', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          setQuota(data);
        }
      }
    } catch (e) {
      console.warn('[useQuota] Failed to fetch quota:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchQuota();

    const handleRefresh = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setQuota(customEvent.detail);
      } else {
        fetchQuota();
      }
    };

    window.addEventListener('axe-refresh-quota', handleRefresh);
    window.addEventListener('axe-quota-synced', handleRefresh);
    return () => {
      window.removeEventListener('axe-refresh-quota', handleRefresh);
      window.removeEventListener('axe-quota-synced', handleRefresh);
    };
  }, [fetchQuota]);

  return { quota, refreshQuota: fetchQuota, isLoading };
}

