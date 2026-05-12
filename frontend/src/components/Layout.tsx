import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AnimatePresence, motion } from 'framer-motion';

export const Layout = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-silver font-sans overflow-x-hidden flex">
      {/* Dynamic Radial Gradient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[1000px] max-h-[1000px] bg-radial-fade opacity-80" />
      </div>

      <Sidebar />

      <main className={location.pathname === '/' ? "flex-1 w-full relative z-10" : "flex-1 w-full pl-24 relative z-10"}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full min-h-screen"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
