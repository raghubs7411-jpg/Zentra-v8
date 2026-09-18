import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Building,
  CreditCard,
  Users,
  Shield,
  Database,
  Save,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Key,
  UserCheck,
  UserX,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Lock,
  Unlock,
  Image as ImageIcon,
  Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BusinessProfile, User, RolePermission } from '../../types';
import { exportToJsonFile, exportToCsvFile } from '../../utils/storage';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { toast } from 'sonner';
import { DeliveryChallanTab } from './DeliveryChallanTab';
import { useConfirm } from '../ui/ConfirmDialog';

export const SettingsPage: React.FC = () => {
  const {
    business,
    updateBusiness,
    users,
    roles,
    currentUser,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    addRole,
    updateRole,
    deleteRole,
    sales,
    invoices,
    products,
    customers,
    payments,
    purchases,
    stockMovements,
    salesReturns,
    priceHistories,
    auditLogs,
    resetToDemoData,
    importBackupData,
    deliveryChallans,
    createDeliveryChallan,
    updateChallanStatus,
  } = useApp() as any;

  const confirmDialog = useConfirm();
  const logoFileRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'bank' | 'users-roles' | 'csv-hub' | 'backup' | 'delivery'>('users-roles');
  const [profileData, setProfileData] = useState<BusinessProfile>({ ...business });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync profileData when business changes in context (e.g. logo uploaded elsewhere)
  useEffect(() => {
    setProfileData({ ...business });
  }, [business.logoUrl, business.name, business.phone, business.email, business.address, business.city, business.state, business.pincode, business.gstin, business.pan, business.stateCode]);

  // Sub-tab under Users & Roles
  const [userRoleSubTab, setUserRoleSubTab] = useState<'users' | 'roles'>('users');

  // User Modals State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    role: string;
    roleId: string;
    status: 'Active' | 'Disabled';
    password: string;
  }>({
    name: '',
    email: '',
    phone: '',
    role: 'Sales Executive',
    roleId: 'role-sales',
    status: 'Active',
    password: '',
  });

  // Role Modals State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<RolePermission | null>(null);
  const [roleFormData, setRoleFormData] = useState<Omit<RolePermission, 'id'>>({
    name: '',
    description: '',
    isSystemRole: false,
    accessibleModules: ['new-sale', 'sales', 'customers', 'invoices'],
    canViewCostPrice: false,
    canViewProfit: false,
    canEditPrices: false,
    canCancelInvoices: false,
    canProcessReturns: false,
    canDeleteProducts: false,
    canDeleteSales: false,
    canModifyStock: false,
    canExportData: false,
    canManageSettings: false,
  });

  const allAvailableModules = [
    { id: 'overview', label: 'Overview / Dashboard' },
    { id: 'new-sale', label: 'New Sale (POS Billing)' },
    { id: 'sales', label: 'Sales Management' },
    { id: 'customers', label: 'Customers CRM & Khata' },
    { id: 'inventory', label: 'Products & Inventory' },
    { id: 'purchases', label: 'Purchases / Stock-In' },
    { id: 'payments', label: 'Payments & Receipts' },
    { id: 'invoices', label: 'Invoices Register' },
    { id: 'reports', label: 'Reports & P&L Analysis' },
    { id: 'pricing', label: 'Price Management & Audit' },
    { id: 'settings', label: 'Settings & User Administration' },
    { id: 'audit', label: 'System Audit Trail' },
  ];

  // ----------------------------------------------------
  // PROFILE & BANK HANDLERS
  // ----------------------------------------------------
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusiness(profileData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // ----------------------------------------------------
  // USER CRUD HANDLERS
  // ----------------------------------------------------
  const handleOpenAddUser = () => {
    setUserToEdit(null);
    setUserFormData({
      name: '',
      email: '',
      phone: '',
      role: roles[0]?.name || 'Sales Executive',
      roleId: roles[0]?.id || 'role-sales',
      status: 'Active',
      password: '',
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: User) => {
    setUserToEdit(u);
    setUserFormData({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      roleId: u.roleId,
      status: u.status,
      password: u.password || '',
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedRole = roles.find((r) => r.id === userFormData.roleId || r.name === userFormData.role);

    if (userToEdit) {
      updateUser(userToEdit.id, {
        name: userFormData.name.trim(),
        email: userFormData.email.trim(),
        phone: userFormData.phone.trim() || undefined,
        role: matchedRole ? matchedRole.name : userFormData.role,
        roleId: matchedRole ? matchedRole.id : userFormData.roleId,
        status: userFormData.status,
        password: userFormData.password || undefined,
      });
    } else {
      addUser({
        name: userFormData.name.trim(),
        email: userFormData.email.trim(),
        phone: userFormData.phone.trim() || undefined,
        role: matchedRole ? matchedRole.name : userFormData.role,
        roleId: matchedRole ? matchedRole.id : userFormData.roleId,
        status: userFormData.status,
        password: userFormData.password || '1234',
      });
    }

    setIsUserModalOpen(false);
  };

  // ----------------------------------------------------
  // ROLE CRUD HANDLERS
  // ----------------------------------------------------
  const handleOpenAddRole = () => {
    setRoleToEdit(null);
    setRoleFormData({
      name: '',
      description: '',
      isSystemRole: false,
      accessibleModules: ['new-sale', 'sales', 'customers', 'invoices'],
      canViewCostPrice: false,
      canViewProfit: false,
      canEditPrices: false,
      canCancelInvoices: false,
      canProcessReturns: false,
      canDeleteProducts: false,
      canDeleteSales: false,
      canModifyStock: false,
      canExportData: false,
      canManageSettings: false,
    });
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (r: RolePermission) => {
    setRoleToEdit(r);
    setRoleFormData({
      name: r.name,
      description: r.description,
      isSystemRole: r.isSystemRole,
      accessibleModules: [...r.accessibleModules],
      canViewCostPrice: r.canViewCostPrice,
      canViewProfit: r.canViewProfit,
      canEditPrices: r.canEditPrices,
      canCancelInvoices: r.canCancelInvoices,
      canProcessReturns: r.canProcessReturns,
      canDeleteProducts: r.canDeleteProducts ?? false,
      canDeleteSales: r.canDeleteSales ?? false,
      canModifyStock: r.canModifyStock ?? false,
      canExportData: r.canExportData,
      canManageSettings: r.canManageSettings,
    });
    setIsRoleModalOpen(true);
  };

  const handleToggleModuleInRole = (modId: string) => {
    setRoleFormData((prev) => {
      const exists = prev.accessibleModules.includes(modId);
      return {
        ...prev,
        accessibleModules: exists
          ? prev.accessibleModules.filter((m) => m !== modId)
          : [...prev.accessibleModules, modId],
      };
    });
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (roleToEdit) {
      updateRole(roleToEdit.id, roleFormData);
    } else {
      addRole(roleFormData);
    }
    setIsRoleModalOpen(false);
  };

  // ----------------------------------------------------
  // CSV EXPORT HUB HANDLERS
  // ----------------------------------------------------
  const handleExportCustomersCsv = () => {
    const data = customers.map((c) => ({
      ID: c.id,
      Name: c.name,
      Phone: c.phone,
      'Alt Phone': c.altPhone || '',
      Email: c.email || '',
      Address: c.address,
      City: c.city,
      State: c.state,
      GSTIN: c.gstin || '',
      Type: c.customerType,
      'Credit Limit (₹)': c.creditLimit,
      'Payment Terms (Days)': c.paymentTermsDays,
      'Total Billed (₹)': c.totalPurchases,
      'Total Paid (₹)': c.totalPaid,
      'Outstanding Balance (₹)': c.outstandingBalance,
    }));
    exportToCsvFile(data, 'Zentra_Customers_Directory');
  };

  const handleExportProductsCsv = () => {
    const data = products.map((p) => ({
      ID: p.id,
      SKU: p.sku,
      Barcode: p.barcode || '',
      Name: p.name,
      Category: p.category,
      Unit: p.unit,
      'Purchase Price (₹)': p.purchasePrice,
      'Retail Price (₹)': p.sellingPrice,
      'Wholesale Price (₹)': p.wholesalePrice,
      'Dealer Price (₹)': p.dealerPrice,
      'Stock on Hand': p.currentStock,
      'Min Stock Alert': p.minStockLevel,
      'GST Rate (%)': p.gstRate,
      'HSN Code': p.hsnCode || '',
    }));
    exportToCsvFile(data, 'Zentra_Products_Inventory');
  };

  const handleExportSalesCsv = () => {
    const data = sales.map((s) => ({
      'Invoice #': s.invoiceNumber,
      Date: formatDate(s.date),
      Customer: s.customerName,
      Phone: s.customerPhone,
      'Subtotal (₹)': s.subtotal,
      'Discount (₹)': s.totalDiscount,
      'Tax (₹)': s.totalTax,
      'Grand Total (₹)': s.grandTotal,
      'Amount Paid (₹)': s.amountPaid,
      'Balance Due (₹)': s.balanceDue,
      'Payment Status': s.paymentStatus,
      'Payment Mode': s.paymentMethod,
      '0% GST Bill': s.isZeroGst ? 'Yes' : 'No',
      BilledBy: s.employeeName,
    }));
    exportToCsvFile(data, 'Zentra_Sales_Invoices_Register');
  };

  const handleExportPaymentsCsv = () => {
    const data = payments.map((p) => ({
      'Receipt #': p.paymentNumber,
      Date: formatDate(p.paymentDate),
      'Invoice #': p.invoiceNumber || 'General Khata',
      Customer: p.customerName,
      'Amount (₹)': p.amount,
      'Payment Mode': p.paymentMethod,
      'Reference / UTR': p.referenceNo || '',
      Bank: p.bankName || '',
      'Cheque #': p.chequeNumber || '',
      'Recorded By': p.recordedBy,
    }));
    exportToCsvFile(data, 'Zentra_Payments_Ledger');
  };

  const handleExportPurchasesCsv = () => {
    const data = purchases.map((p) => ({
      'Purchase #': p.purchaseNumber,
      'Vendor Inv #': p.vendorInvoiceNo,
      Date: formatDate(p.date),
      Supplier: p.supplierName,
      Phone: p.supplierPhone,
      'Total Amount (₹)': p.totalAmount,
      'Amount Paid (₹)': p.amountPaid,
      Status: p.paymentStatus,
      'Recorded By': p.recordedBy,
    }));
    exportToCsvFile(data, 'Zentra_Purchases_Register');
  };

  const handleExportAllCsvs = () => {
    handleExportCustomersCsv();
    setTimeout(() => handleExportProductsCsv(), 300);
    setTimeout(() => handleExportSalesCsv(), 600);
    setTimeout(() => handleExportPaymentsCsv(), 900);
    setTimeout(() => handleExportPurchasesCsv(), 1200);
  };

  // ----------------------------------------------------
  // BACKUP & RESTORE
  // ----------------------------------------------------
  const handleDownloadJsonBackup = () => {
    const fullState = {
      business,
      customers,
      products,
      sales,
      invoices,
      payments,
      purchases,
      stockMovements,
      salesReturns,
      priceHistories,
      auditLogs,
      roles,
      users,
      currentUser,
    };
    exportToJsonFile(fullState, 'Zentra_Complete_Business_Backup');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string);
        const ok = await confirmDialog({
          title: 'Import Backup',
          message: 'Importing this backup will overwrite current database state. Proceed?',
          variant: 'warning',
          confirmText: 'Import',
        });
        if (ok) {
          importBackupData(imported);
        }
      } catch (err: any) {
        toast.error(`Failed to parse backup file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Settings className="w-6 h-6 text-blue-600" />
            <span>Settings & Administration</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Manage user roles, access permissions, company profile, banking details, and CSV data exports.
          </p>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center space-x-4 border-b border-slate-200 bg-white px-4 pt-3 rounded-2xl shadow-xs">
        <button
          onClick={() => setActiveTab('users-roles')}
          className={`pb-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTab === 'users-roles'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User & Role Management</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Business & GST Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('bank')}
          className={`pb-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTab === 'bank'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Bank & UPI Details</span>
        </button>

        <button
          onClick={() => setActiveTab('csv-hub')}
          className={`pb-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTab === 'csv-hub'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>CSV Data Management</span>
        </button>

        <button
          onClick={() => setActiveTab('delivery')}
          className={`pb-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTab === 'delivery'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Delivery Challans</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`pb-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTab === 'backup'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>System Backup & Reset</span>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: USER & ROLE MANAGEMENT (PRIMARY REQUIREMENT)  */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'users-roles' && (
        <div className="space-y-6">
          {/* Sub Navigation: Users vs Roles */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setUserRoleSubTab('users')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  userRoleSubTab === 'users' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Team Users ({users.length})
              </button>
              <button
                onClick={() => setUserRoleSubTab('roles')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  userRoleSubTab === 'roles' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Roles & Permissions ({roles.length})
              </button>
            </div>

            {userRoleSubTab === 'users' ? (
              <button
                onClick={handleOpenAddUser}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create New User</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAddRole}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Custom Role</span>
              </button>
            )}
          </div>

          {/* SUB-SECTION A: TEAM USERS TABLE */}
          {userRoleSubTab === 'users' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-xs md:text-sm">Team User Directory</h3>
                <p className="text-[11px] text-slate-500">
                  Manage user accounts, assign roles, reset login credentials, and enable or disable access.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/80 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="py-3 px-4">User Name</th>
                      <th className="py-3 px-4">Email & Phone</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4 text-center">Account Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const isActive = u.status === 'Active';
                      const isMe = u.id === currentUser.id;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* User Avatar & Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 flex items-center space-x-1.5">
                                  <span>{u.name}</span>
                                  {isMe && (
                                    <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-full">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-400">ID: {u.id}</p>
                              </div>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="py-3 px-4">
                            <p className="text-slate-800 font-medium">{u.email}</p>
                            <p className="text-[11px] text-slate-500">{u.phone ? `📞 ${u.phone}` : 'No phone'}</p>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {u.role}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleUserStatus(u.id)}
                              disabled={isMe}
                              title={isMe ? 'Cannot disable your own active account' : 'Click to toggle access'}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              } ${isMe ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
                            >
                              {isActive ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                              <span>{u.status}</span>
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit User & Credentials"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {!isMe && (
                                <button
                                  onClick={async () => {
                                    const ok = await confirmDialog({
                                      title: 'Delete User',
                                      message: `Are you sure you want to delete user account "${u.name}"?`,
                                      variant: 'danger',
                                      confirmText: 'Delete',
                                    });
                                    if (ok) {
                                      deleteUser(u.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-SECTION B: ROLES & PERMISSIONS CARDS */}
          {userRoleSubTab === 'roles' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-slate-900 text-sm">{r.name}</h4>
                        {r.isSystemRole ? (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">
                            System Role
                          </span>
                        ) : (
                          <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-md border border-purple-200">
                            Custom Role
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed">{r.description}</p>

                      {/* Module Access Count */}
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Accessible Modules ({r.accessibleModules.length}/12)
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {r.accessibleModules.map((modId) => (
                            <span
                              key={modId}
                              className="text-[10px] bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-md"
                            >
                              {modId}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Sensitive Permissions Preview */}
                      <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                        <p className={r.canViewCostPrice ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                          {r.canViewCostPrice ? '✓ Cost Price Visible' : '✗ Cost Price Masked'}
                        </p>
                        <p className={r.canViewProfit ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                          {r.canViewProfit ? '✓ P&L & Profit Visible' : '✗ P&L Reports Hidden'}
                        </p>
                        <p className={r.canEditPrices ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                          {r.canEditPrices ? '✓ Can Edit Selling Prices' : '✗ Price Modification Disabled'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                      <button
                        onClick={() => handleOpenEditRole(r)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Edit Permissions
                      </button>
                      {!r.isSystemRole && (
                        <button
                          onClick={async () => {
                            const ok = await confirmDialog({
                              title: 'Delete Role',
                              message: `Delete custom role "${r.name}"?`,
                              variant: 'danger',
                              confirmText: 'Delete',
                            });
                            if (ok) {
                              deleteRole(r.id);
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: BUSINESS & GST PROFILE                        */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 text-xs md:text-sm">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-bold">Business profile settings updated successfully!</span>
            </div>
          )}

          {/* Logo Upload Section */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="shrink-0">
              {profileData.logoUrl ? (
                <img
                  src={profileData.logoUrl}
                  alt="Business Logo"
                  className="w-20 h-20 rounded-xl object-contain border border-slate-300 bg-white"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-white border border-dashed border-slate-300 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">Business Logo</p>
              <p className="text-xs text-slate-500 mb-2">Appears on all invoice templates (GST, Classic, Thermal). Recommended: 200x200px, PNG/JPG.</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => logoFileRef.current?.click()}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Logo</span>
                </button>
                {profileData.logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileData({ ...profileData, logoUrl: undefined });
                      updateBusiness({ logoUrl: undefined });
                      toast.success('Logo removed.');
                    }}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={logoFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 500 * 1024) {
                    toast.error('Logo file too large. Please use an image under 500KB.');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const newLogoUrl = evt.target?.result as string;
                    setProfileData({ ...profileData, logoUrl: newLogoUrl });
                    // Auto-save logo to context immediately so it persists across tabs
                    updateBusiness({ logoUrl: newLogoUrl });
                    toast.success('Logo uploaded and saved!');
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Business / Trade Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tagline / Business Subtitle</label>
              <input
                type="text"
                value={profileData.tagline}
                onChange={(e) => setProfileData({ ...profileData, tagline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Mobile Phone</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Email</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Shop / Godown Address</label>
              <input
                type="text"
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={profileData.city}
                onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={profileData.state}
                onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={profileData.gstin}
                onChange={(e) => setProfileData({ ...profileData, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business State Code (for GST)</label>
              <input
                type="text"
                value={profileData.businessStateCode || ''}
                onChange={(e) => setProfileData({ ...profileData, businessStateCode: e.target.value })}
                placeholder="e.g. 29 for Karnataka"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-1">First 2 digits of your GSTIN. Used to determine IGST vs CGST/SGST.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">PAN Number</label>
              <input
                type="text"
                value={profileData.pan}
                onChange={(e) => setProfileData({ ...profileData, pan: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={profileData.invoicePrefix}
                onChange={(e) => setProfileData({ ...profileData, invoicePrefix: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default GST Rate (%)</label>
              <select
                value={profileData.defaultGstRate}
                onChange={(e) => setProfileData({ ...profileData, defaultGstRate: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Standard Terms & Conditions on Invoices</label>
              <textarea
                rows={3}
                value={profileData.invoiceTerms}
                onChange={(e) => setProfileData({ ...profileData, invoiceTerms: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono text-xs"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Business Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: BANK & UPI DETAILS                            */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'bank' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 text-xs md:text-sm">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-bold">Banking details updated successfully!</span>
            </div>
          )}

          <p className="text-xs text-slate-500">
            These banking credentials are automatically printed on every GST Tax Invoice and shared in WhatsApp payment links.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                value={profileData.bankDetails.bankName}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    bankDetails: { ...profileData.bankDetails, bankName: e.target.value },
                  })
                }
                placeholder="e.g. HDFC Bank, SBI"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Account Holder Name</label>
              <input
                type="text"
                value={profileData.bankDetails.accountHolderName}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    bankDetails: { ...profileData.bankDetails, accountHolderName: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bank Account Number</label>
              <input
                type="text"
                value={profileData.bankDetails.accountNo}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    bankDetails: { ...profileData.bankDetails, accountNo: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">IFSC Code</label>
              <input
                type="text"
                value={profileData.bankDetails.ifscCode}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    bankDetails: { ...profileData.bankDetails, ifscCode: e.target.value.toUpperCase() },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Branch Name</label>
              <input
                type="text"
                value={profileData.bankDetails.branch}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    bankDetails: { ...profileData.bankDetails, branch: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">UPI ID (VPA) for QR & Direct Pay</label>
              <input
                type="text"
                value={profileData.bankDetails.upiId}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    bankDetails: { ...profileData.bankDetails, upiId: e.target.value },
                  })
                }
                placeholder="e.g. zentra@hdfcbank"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Bank Details</span>
            </button>
          </div>
        </form>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 4: CSV DATA MANAGEMENT HUB (NEW REQUIREMENT)    */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'csv-hub' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 text-xs md:text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">CSV Data Management & Export Hub</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Export individual table spreadsheets or download complete business data in universal CSV format.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportAllCsvs}
              className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download All Tables (5 CSVs)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Customers CSV */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Customers & Khata Ledger</h4>
                <p className="text-xs text-slate-500">
                  {customers.length} customer records with credit limits, total billed, and dues.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportCustomersCsv}
                className="w-full flex items-center justify-center space-x-1.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Customers CSV</span>
              </button>
            </div>

            {/* Products CSV */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Products & Stock Catalog</h4>
                <p className="text-xs text-slate-500">
                  {products.length} products with retail, wholesale, dealer prices, and live stock.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportProductsCsv}
                className="w-full flex items-center justify-center space-x-1.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Products CSV</span>
              </button>
            </div>

            {/* Sales Invoices CSV */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Sales & Invoices Register</h4>
                <p className="text-xs text-slate-500">
                  {sales.length} sales with bill numbers, subtotals, GST, and payment status.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportSalesCsv}
                className="w-full flex items-center justify-center space-x-1.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Sales CSV</span>
              </button>
            </div>

            {/* Payments CSV */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Payments & Receipts</h4>
                <p className="text-xs text-slate-500">
                  {payments.length} payment vouchers across UPI, Cash, Cheque, and Bank Transfer.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportPaymentsCsv}
                className="w-full flex items-center justify-center space-x-1.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Payments CSV</span>
              </button>
            </div>

            {/* Purchases CSV */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Supplier Purchases</h4>
                <p className="text-xs text-slate-500">
                  {purchases.length} inward vendor bills with purchase prices and stock updates.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportPurchasesCsv}
                className="w-full flex items-center justify-center space-x-1.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Purchases CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 5: SYSTEM BACKUP & RESET                         */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'backup' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 text-xs md:text-sm">
          <div>
            <h3 className="font-bold text-base text-slate-900">System Backup & Demo Data</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Export full business state to JSON, restore backups, or reset to realistic sample MSME data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Backup */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Download JSON Database Backup</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Full backup containing all users, sales, products, stock movements, and settings.
                </p>
              </div>
              <button
                onClick={handleDownloadJsonBackup}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export JSON Backup</span>
              </button>
            </div>

            {/* Restore */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Restore from JSON Backup</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Upload a previously saved `.json` database file to restore all business records.
                </p>
              </div>
              <label className="w-full flex items-center justify-center space-x-2 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-xs cursor-pointer transition-all">
                <Upload className="w-4 h-4" />
                <span>Upload & Restore Backup</span>
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {/* Reset Demo Data */}
            <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-amber-900 text-sm">Reset to Demo Sample Data</h4>
                <p className="text-xs text-amber-700 mt-1">
                  Pre-loads realistic hardware, cement, paint & electrical products with sample transactions.
                </p>
              </div>
              <button
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: 'Reset Demo Data',
                    message: 'Reset to initial sample demo data? All records will be restored to realistic MSME samples.',
                    variant: 'warning',
                    confirmText: 'Reset',
                  });
                  if (ok) {
                    resetToDemoData();
                  }
                }}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset Demo Seed Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB: DELIVERY CHALLANS                              */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'delivery' && (
        <DeliveryChallanTab
          sales={sales}
          deliveryChallans={deliveryChallans || []}
          createDeliveryChallan={createDeliveryChallan}
          updateChallanStatus={updateChallanStatus}
          confirmDialog={confirmDialog}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: ADD / EDIT USER                             */}
      {/* ---------------------------------------------------- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900">
              {userToEdit ? 'Edit User & Credentials' : 'Create New Team User'}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  placeholder="e.g. Suresh Gowda"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="user@zentra.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    placeholder="9845012345"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Role</label>
                  <select
                    value={userFormData.roleId}
                    onChange={(e) => {
                      const sel = roles.find((r) => r.id === e.target.value);
                      setUserFormData({
                        ...userFormData,
                        roleId: e.target.value,
                        role: sel ? sel.name : userFormData.role,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value as 'Active' | 'Disabled' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold"
                  >
                    <option value="Active">Active (Allowed Access)</option>
                    <option value="Disabled">Disabled (Access Locked)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Login Password / PIN <span className="text-slate-400 font-normal">(for quick sign-in)</span>
                </label>
                <input
                  type="text"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder="e.g. 1234"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {userToEdit ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: ADD / EDIT CUSTOM ROLE & PERMISSIONS        */}
      {/* ---------------------------------------------------- */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-slate-900">
              {roleToEdit ? `Configure Permissions: ${roleToEdit.name}` : 'Create Custom User Role'}
            </h3>

            <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Role Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                    placeholder="e.g. Billing Cashier"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role Description</label>
                  <input
                    type="text"
                    value={roleFormData.description}
                    onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                    placeholder="e.g. Can bill sales and receive payments"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Module Access Checkboxes */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block font-bold text-slate-900 mb-2">Module-Level Access Control</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {allAvailableModules.map((mod) => {
                    const isChecked = roleFormData.accessibleModules.includes(mod.id);
                    return (
                      <button
                        type="button"
                        key={mod.id}
                        onClick={() => handleToggleModuleInRole(mod.id)}
                        className="flex items-center space-x-2 text-left p-1.5 rounded-lg hover:bg-white transition-colors"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className={`text-xs ${isChecked ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                          {mod.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sensitive Feature Checkboxes */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block font-bold text-slate-900 mb-2">Sensitive Feature Permissions</label>
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleFormData.canViewCostPrice}
                      onChange={(e) => setRoleFormData({ ...roleFormData, canViewCostPrice: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-800">Can view inventory purchase cost prices</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleFormData.canViewProfit}
                      onChange={(e) => setRoleFormData({ ...roleFormData, canViewProfit: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-800">Can view gross profit & P&L margin analytics</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleFormData.canEditPrices}
                      onChange={(e) => setRoleFormData({ ...roleFormData, canEditPrices: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-800">Can modify product selling and wholesale prices</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleFormData.canCancelInvoices}
                      onChange={(e) => setRoleFormData({ ...roleFormData, canCancelInvoices: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-800">Can cancel finalized sales and invoices</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleFormData.canProcessReturns ?? false}
                      onChange={(e) => setRoleFormData({ ...roleFormData, canProcessReturns: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-800">Can process sales returns & refunds</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleFormData.canDeleteProducts ?? false}
                      onChange={(e) => setRoleFormData({ ...roleFormData, canDeleteProducts: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-800">Can delete products from catalog</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleFormData.canDeleteSales ?? false}
                      onChange={(e) => setRoleFormData({ ...roleFormData, canDeleteSales: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-800">Can permanently delete bills & invoices</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleFormData.canModifyStock ?? false}
                      onChange={(e) => setRoleFormData({ ...roleFormData, canModifyStock: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-800">Can adjust & modify stock levels</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleFormData.canExportData}
                      onChange={(e) => setRoleFormData({ ...roleFormData, canExportData: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-800">Can export CSV spreadsheets and database backups</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {roleToEdit ? 'Save Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
