import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { AlertTriangle, AlertCircle } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export const useConfirm = (): ConfirmFn => useContext(ConfirmContext);

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
    // Clear options after dialog closes
    setTimeout(() => setOptions(null), 200);
  }, []);

  const variant = options?.variant || 'default';
  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  const iconColor = isDanger ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-blue-600';
  const iconBg = isDanger ? 'bg-rose-50' : isWarning ? 'bg-amber-50' : 'bg-blue-50';
  const confirmBtn = isDanger
    ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
    : isWarning
    ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={isOpen} onClose={() => handleClose(false)} className="relative z-[100]">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden transition-all">
            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-4">
                <div className={`shrink-0 w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center`}>
                  {isDanger ? (
                    <AlertCircle className={`w-6 h-6 ${iconColor}`} />
                  ) : (
                    <AlertTriangle className={`w-6 h-6 ${iconColor}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-base font-bold text-slate-900">
                    {options?.title || 'Confirm'}
                  </DialogTitle>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    {options?.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {options?.cancelText || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => handleClose(true)}
                  className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${confirmBtn}`}
                >
                  {options?.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  );
};
