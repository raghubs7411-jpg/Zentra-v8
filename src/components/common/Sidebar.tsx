import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Users,
  Package,
  CreditCard,
  FileSpreadsheet,
  BarChart3,
  Tags,
  Settings,
  Truck,
  History,
  Store,
  ChevronRight,
  TrendingUp,
  Lock,
  LogOut,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export interface TabItem {
  id: string;
  name: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
}

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { business, getLowStockProducts, sales, currentUser, hasModuleAccess, logout } = useApp();
  const lowStockCount = getLowStockProducts().length;
  const pendingSalesCount = sales.filter((s) => s.paymentStatus === 'Pending').length;

  const allTabs: TabItem[] = [
    { id: 'overview', name: 'Overview', icon: LayoutDashboard },
    { id: 'new-sale', name: 'New Sale (POS)', icon: ShoppingCart, badge: 'Fast', badgeColor: 'bg-emerald-500' },
    { id: 'sales', name: 'Sales', icon: Receipt, badge: pendingSalesCount > 0 ? pendingSalesCount : undefined, badgeColor: 'bg-amber-500' },
    { id: 'customers', name: 'Customers CRM', icon: Users },
    { id: 'inventory', name: 'Products / Stock', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined, badgeColor: 'bg-rose-500' },
    { id: 'purchases', name: 'Stock-In / Purchase', icon: Truck },
    { id: 'payments', name: 'Payments & Khata', icon: CreditCard },
    { id: 'invoices', name: 'Invoices', icon: FileSpreadsheet },
    { id: 'reports', name: 'Reports & P&L', icon: BarChart3 },
    { id: 'pricing', name: 'Price Management', icon: Tags },
    { id: 'settings', name: 'Settings & Users', icon: Settings },
    { id: 'audit', name: 'Audit Trail', icon: History },
  ];

  const filteredTabs = allTabs.filter((tab) => hasModuleAccess(tab.id));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 min-h-[calc(100vh-4rem)] no-print">
      {/* Business Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center space-x-3 bg-slate-950/50">
        {business.logoUrl ? (
          <img src={business.logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-contain bg-white/95 p-0.5 shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-black text-base shrink-0">
            Z
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-black text-white truncate leading-tight">{business.name}</h1>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">Zentra Suite v3.0</p>
        </div>
      </div>

      {/* Account Disabled Banner */}
      {currentUser.status === 'Disabled' && (
        <div className="p-3 m-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
          <Lock className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Your account is currently disabled. Access restricted.</span>
        </div>
      )}

      {/* Navigation Menu */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Modules ({filteredTabs.length})
        </div>

        {filteredTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                  }`}
                />
                <span>{tab.name}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold text-white rounded-full ${
                      tab.badgeColor || 'bg-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Summary Pill & Logout at Bottom */}
      <div className="p-3 m-3 space-y-2">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 py-2 bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 border border-slate-800 hover:border-rose-900/50 rounded-xl text-xs font-semibold transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>

        <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800/80 text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span className="flex items-center space-x-1 font-bold text-slate-300">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zentra Suite</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">v3.0</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Connected CRM, Billing, Stock & Payments
          </p>
        </div>
      </div>
    </aside>
  );
};
