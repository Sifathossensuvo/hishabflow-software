import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';
import { Button, Modal } from '../components/ui.jsx';

const Ctx = createContext(null);
const ICONS = { success: FiCheckCircle, error: FiAlertCircle, info: FiInfo };
const TONES = { success: 'text-brand-600', error: 'text-due-600', info: 'text-ink-soft' };

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((type, message) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
  }, [dismiss]);

  const toast = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }), [push]);

  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), []);
  const close = (answer) => { dialog?.resolve(answer); setDialog(null); };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 print:hidden" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type];
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-white p-3.5 shadow-pop" role={t.type === 'error' ? 'alert' : 'status'}>
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${TONES[t.type]}`} />
                <p className="flex-1 text-sm leading-snug text-ink">{t.message}</p>
                <button onClick={() => dismiss(t.id)} className="rounded p-0.5 text-ink-mute hover:text-ink" aria-label="Dismiss"><FiX /></button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <Modal open={!!dialog} onClose={() => close(false)} title={dialog?.title} size="sm">
        <p className="text-[15px] leading-relaxed text-ink-soft">{dialog?.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => close(false)}>{dialog?.cancelText || 'Keep it'}</Button>
          <Button variant={dialog?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{dialog?.confirmText || 'Confirm'}</Button>
        </div>
      </Modal>
    </Ctx.Provider>
  );
}

export const useFeedback = () => useContext(Ctx);
export const useToast = () => useContext(Ctx).toast;
export const useConfirm = () => useContext(Ctx).confirm;
