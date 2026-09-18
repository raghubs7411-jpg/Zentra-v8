/**
 * Push Notification Service — FCM (Firebase Cloud Messaging)
 *
 * Wires up push notifications for Android devices. Listens for:
 * - payment_overdue: Customer payment is overdue
 * - low_stock: Product stock dropped below minimum
 * - sale_completed: New sale recorded by another device/user
 * - payment_received: Payment recorded against an invoice
 * - daily_summary: End-of-day sales summary
 * - delivery_confirmed: Delivery challan marked as delivered
 */
import messaging from '@react-native-firebase/messaging';
import { supabase } from './supabaseClient';

class PushNotificationService {
  /** Request permission and register FCM token on app launch */
  async initialize(userId: string) {
    // Request notification permission (Android 13+)
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('Push notification permission not granted');
      return;
    }

    // Register FCM token with Supabase for this user
    const token = await messaging().getToken();
    await this.registerToken(userId, token);

    // Listen for token refresh
    messaging().onTokenRefresh((newToken) => {
      this.registerToken(userId, newToken);
    });

    // Foreground message handler
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground notification:', remoteMessage);
      // In a real app, show an in-app banner here
    });

    // Background/hardware-quit message handler
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background notification:', remoteMessage);
    });
  }

  /** Store the FCM token so the server can send targeted notifications */
  async registerToken(userId: string, token: string) {
    try {
      await supabase
        .from('users')
        .update({ fcm_token: token })
        .eq('id', userId);
    } catch (err) {
      console.error('Failed to register FCM token:', err);
    }
  }

  /** Subscribe to Supabase real-time notifications table and show local notification */
  subscribeToNotifications(userId: string) {
    const channel = supabase
      .channel('mobile-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const notif = payload.new;
          if (notif) {
            // Display local notification
            // In production, use notifee or react-native-push-notification
            console.log(`📱 [${notif.type}] ${notif.title}: ${notif.body}`);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }
}

export const pushService = new PushNotificationService();
