/**
 * Cloud-account password recovery (Supabase Auth).
 * Thin wrappers composed into flows by AppContext and the login page.
 */
import { supabase } from '../supabaseClient';
import { restoreCloudSession, CloudSession } from './cloudSync';

/** Send the password-reset email for a cloud (owner) account. */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  if (!supabase) throw new Error('Cloud sync is not configured on this device.');
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: window.location.origin,
  });
  if (error) throw new Error(error.message);
}

/**
 * Set a new password for the account in the current recovery session (the
 * user arrived here by clicking the link in the reset email), then rebuild
 * the cloud session so the app can pull and sync data as usual.
 */
export async function completePasswordReset(newPassword: string): Promise<CloudSession> {
  if (!supabase) throw new Error('Cloud sync is not configured on this device.');
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
  const email = data.user?.email ?? '';
  const session = await restoreCloudSession(email);
  if (!session) {
    throw new Error(
      'Password updated, but no business is linked to this account yet. Set up your data on your main device first.'
    );
  }
  return session;
}
