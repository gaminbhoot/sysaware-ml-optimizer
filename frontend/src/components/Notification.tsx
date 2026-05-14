import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import type { Notification as NotificationType } from '../context/NotificationContext';
import { cn } from '../lib/utils';

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: 'text-emerald border-emerald/20 bg-emerald/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]',
  error: 'text-red-500 border-red-500/20 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.1)]',
  info: 'text-blue-400 border-blue-400/20 bg-blue-400/5 shadow-[0_0_20px_rgba(96,165,250,0.1)]',
  warning: 'text-amber-400 border-amber-400/20 bg-amber-400/5 shadow-[0_0_20px_rgba(251,191,36,0.1)]',
};

const NotificationItem = ({ notification }: { notification: NotificationType }) => {
  const { removeNotification } = useNotification();
  const Icon = icons[notification.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'glass-card pointer-events-auto flex items-start gap-4 p-4 min-w-[320px] max-w-md border backdrop-blur-md',
        colors[notification.type]
      )}
    >
      <div className="mt-0.5">
        <Icon size={20} />
      </div>
      <div className="flex-1">
        {notification.title && (
          <h4 className="font-bold text-sm mb-1">{notification.title}</h4>
        )}
        <p className="text-sm text-white/70 leading-relaxed">{notification.message}</p>
      </div>
      <button
        onClick={() => removeNotification(notification.id)}
        className="text-white/20 hover:text-white/60 transition-colors"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};

export const NotificationContainer = () => {
  const { notifications } = useNotification();

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </AnimatePresence>
    </div>
  );
};
