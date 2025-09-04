import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api';
import { message } from 'antd';

interface PushSubscription {
  id: string;
  endpoint: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
  subscriptions: PushSubscription[];
  subscribe: () => Promise<boolean>;
  unsubscribe: (endpoint?: string) => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
  sendTestNotification: () => Promise<boolean>;
  refreshSubscriptions: () => Promise<void>;
}

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const [isSupported] = useState(() => 
    'serviceWorker' in navigator && 
    'PushManager' in window && 
    'Notification' in window
  );
  
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported ? Notification.permission : 'denied'
  );
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [vapidPublicKey, setVapidPublicKey] = useState<string>('');

  // Get VAPID public key from server
  useEffect(() => {
    if (isSupported) {
      apiClient.get('/push/vapid-key')
        .then(response => {
          setVapidPublicKey(response.data.publicKey);
        })
        .catch(error => {
          console.error('Failed to get VAPID public key:', error);
        });
    }
  }, [isSupported]);

  // Check current subscription status
  const checkSubscriptionStatus = useCallback(async () => {
    if (!isSupported || !vapidPublicKey) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      setIsSubscribed(!!subscription);
      
      if (subscription) {
        // Verify subscription exists on server
        const response = await apiClient.get('/push/subscriptions');
        const serverSubscriptions = response.data.subscriptions || [];
        setSubscriptions(serverSubscriptions);
        
        // Check if current subscription exists on server
        const currentExists = serverSubscriptions.some((sub: PushSubscription) => 
          sub.endpoint === subscription.endpoint
        );
        
        if (!currentExists) {
          // Re-subscribe if not found on server
          await subscribe();
        }
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  }, [isSupported, vapidPublicKey]);

  // Register service worker and check subscription
  useEffect(() => {
    if (isSupported) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(registration => {
          console.log('Service Worker registered:', registration);
          return checkSubscriptionStatus();
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, [isSupported, checkSubscriptionStatus]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !vapidPublicKey || isLoading) {
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission if not already granted
      let currentPermission = permission;
      if (currentPermission !== 'granted') {
        currentPermission = await requestPermission();
      }

      if (currentPermission !== 'granted') {
        message.warning('Push notification permission is required.');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
      }

      if (subscription) {
        // Send subscription to server
        const subscriptionData = {
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.getKey('p256dh') ? 
                btoa(String.fromCharCode(...Array.from(new Uint8Array(subscription.getKey('p256dh')!)))) : '',
              auth: subscription.getKey('auth') ? 
                btoa(String.fromCharCode(...Array.from(new Uint8Array(subscription.getKey('auth')!)))) : '',
            },
          },
        };

        await apiClient.post('/push/subscribe', subscriptionData);
        
        setIsSubscribed(true);
        await refreshSubscriptions();
        
        message.success('Push notification subscription completed!');
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Push subscription failed:', error);
      message.error('Push notification subscription failed: ' + (error.message || 'Unknown error'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, vapidPublicKey, isLoading, permission, requestPermission]);

  const unsubscribe = useCallback(async (endpoint?: string): Promise<boolean> => {
    if (!isSupported || isLoading) {
      return false;
    }

    setIsLoading(true);

    try {
      if (!endpoint) {
        // Unsubscribe from browser
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Unsubscribe from server
      await apiClient.post('/push/unsubscribe', { endpoint });
      
      if (!endpoint) {
        setIsSubscribed(false);
      }
      
      await refreshSubscriptions();
      
      message.success('Push notification subscription has been cancelled.');
      return true;
    } catch (error: any) {
      console.error('Push unsubscribe failed:', error);
      message.error('Push notification unsubscription failed: ' + (error.message || 'Unknown error'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, isLoading]);

  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !isSubscribed) {
      return false;
    }

    try {
      await apiClient.post('/push/test');
      message.success('Test notification sent!');
      return true;
    } catch (error: any) {
      console.error('Test notification failed:', error);
      message.error('Failed to send test notification: ' + (error.message || 'Unknown error'));
      return false;
    }
  }, [isSupported, isSubscribed]);

  const refreshSubscriptions = useCallback(async (): Promise<void> => {
    if (!isSupported) return;

    try {
      const response = await apiClient.get('/push/subscriptions');
      setSubscriptions(response.data.subscriptions || []);
    } catch (error) {
      console.error('Failed to refresh subscriptions:', error);
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscriptions,
    subscribe,
    unsubscribe,
    requestPermission,
    sendTestNotification,
    refreshSubscriptions,
  };
};