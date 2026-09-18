import React, { useState } from 'react';
import {
  Search,
  Bell,
  PlusCircle,
  Shield,
  ChevronDown,
  AlertTriangle,
  FileText,
  UserCheck,
  UserX,
  Zap,
  LogOut,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';

interface NavbarProps {
  onOpenGlobalSearch: () => void;
  onNavigateTab: (tabId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenGlobalSearch, onNavigateTab }) => {
  const { business, users, currentUser, setCurrentUser, getLowStockProducts, sales, logout } = useApp();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  const lowStockItems = getLowStockProducts();
  const pendingInvoices = sales.filter((s) => s.paymentStatus === 'Pending' || s.paymentStatus === 'Partially Paid');

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setShowRoleMenu(false);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b border-slate-200 shadow-xs no-print">
      {/* Left: Brand Title & Global Search */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 md:hidden">
          {business.logoUrl ? (
            <img src={business.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
          ) : (
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-sm">
              Z
            </div>
          )}
          <span className="font-black text-slate-900 text-sm truncate max-w-[140px]">{business.name || 'Zentra'}</span>
        </div>

        {/* Global Search Bar (Hot-key Cmd/Ctrl + K or Click) */}
        <button
          onClick={onOpenGlobalSearch}
          className="hidden sm:flex items-center space-x-2 w-64 md:w-80 px-3 py-1.5 text-xs md:text-sm text-slate-500 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl transition-colors text-left"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="flex-1 truncate">Search phone, customer, invoice, SKU...</span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-300 rounded text-slate-500 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Actions, Notifications, Role & User Switcher */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenGlobalSearch}
          className="sm:hidden p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg"
          title="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Quick New Sale Shortcut */}
        <button
          onClick={() => onNavigateTab('new-sale')}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-semibold rounded-xl shadow-xs transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">New Sale</span>
          <span className="sm:hidden">Sale</span>
        </button>

        {/* Notification Bell with Low Stock & Pending Payment alerts */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotificationMenu(!showNotificationMenu);
              setShowRoleMenu(false);
            }}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="Notifications & Alerts"
          >
            <Bell className="w-5 h-5" />
            {lowStockItems.length > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-amber-500 rounded-full animate-pulse">
                {lowStockItems.length}
              </span>
            )}
          </button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-sm">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-xs">Alerts & Notifications</span>
                <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                  {lowStockItems.length + (pendingInvoices.length > 0 ? 1 : 0)} Active
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {lowStockItems.length > 0 && (
                  <div
                    className="p-3 bg-amber-50/50 hover:bg-amber-50 cursor-pointer"
                    onClick={() => {
                      onNavigateTab('inventory');
                      setShowNotificationMenu(false);
                    }}
                  >
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-amber-900 text-xs">Low Stock Alert ({lowStockItems.length} items)</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          {lowStockItems.slice(0, 2).map((p) => p.name).join(', ')}
                          {lowStockItems.length > 2 ? ` + ${lowStockItems.length - 2} more` : ''} below threshold.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {pendingInvoices.length > 0 && (
                  <div
                    className="p-3 hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      onNavigateTab('sales');
                      setShowNotificationMenu(false);
                    }}
                  >
                    <div className="flex items-start space-x-2">
                      <FileText className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-slate-800 text-xs">{pendingInvoices.length} Pending Invoices</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Customer balances awaiting payment collection.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {lowStockItems.length === 0 && pendingInvoices.length === 0 && (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    All inventory levels and payments are up to date! 🎉
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic User Profile & Role Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setShowRoleMenu(!showRoleMenu);
              setShowNotificationMenu(false);
            }}
            className="flex items-center space-x-2 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
              {currentUser.name.charAt(0)}
            </div>
            <span className="hidden sm:inline font-bold text-slate-900">{currentUser.name}</span>
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded font-bold uppercase tracking-wider ${
                currentUser.status === 'Disabled'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {currentUser.role}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-xs">
              <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active User Profile</p>
                  <p className="text-slate-800 font-bold">{currentUser.name}</p>
                </div>
                <button
                  onClick={() => {
                    onNavigateTab('settings');
                    setShowRoleMenu(false);
                  }}
                  className="text-blue-600 font-bold hover:underline text-[11px]"
                >
                  Manage Users
                </button>
              </div>

              <div className="p-1.5 max-h-64 overflow-y-auto space-y-1">
                {users.map((u) => {
                  const isSelected = u.id === currentUser.id;
                  const isDisabled = u.status === 'Disabled';

                  return (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                        isSelected
                          ? 'bg-blue-50 text-blue-900 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight flex items-center space-x-1">
                            <span>{u.name}</span>
                            {isDisabled && (
                              <span className="text-[9px] bg-rose-100 text-rose-700 font-bold px-1 rounded">
                                Disabled
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400">{u.role}</p>
                        </div>
                      </div>
                      {isSelected && <UserCheck className="w-4 h-4 text-blue-600" />}
                    </button>
                  );
                })}
              </div>

              {/* Logout Button inside dropdown */}
              <div className="p-2 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={() => {
                    setShowRoleMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out of Zentra</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dedicated Quick Logout Icon Button */}
        <button
          onClick={logout}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          title="Sign Out / Lock Session"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
