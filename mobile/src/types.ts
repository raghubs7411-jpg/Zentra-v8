/**
 * Mobile App — Shared Types
 *
 * This file re-exports the exact same TypeScript domain types used by the
 * web app. Both apps share the same data model — zero duplication.
 *
 * In the mobile project (React Native), create a symlink or copy this file
 * from the web project's src/types/index.ts so both stay in sync.
 */
export * from '../src/types';

// Mobile-specific navigation types
export type MobileTab = 'home' | 'new-sale' | 'customers' | 'khata' | 'more';

export interface MobileNavItem {
  tab: MobileTab;
  label: string;
  icon: string;
}
