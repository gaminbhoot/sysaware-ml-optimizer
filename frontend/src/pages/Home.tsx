import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, Activity, Cpu, Zap } from 'lucide-react';

export const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let touchStartY = 0;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 50) {
        navigate('/profiler');
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchEndY = e.touches[0].clientY;
      if (touchStartY - touchEndY > 80) {
        navigate('/profiler');
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden bg-black selection:bg-emerald/30">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald/20 blur-[120px] rounded-full"
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-silver/10 blur-[150px] rounded-full"
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center z-10 px-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          <div className="h-px w-8 bg-emerald/50" />
          <span className="text-luxury-mono text-[10px] tracking-[0.4em] uppercase text-emerald">Distributed Optimization</span>
          <div className="h-px w-8 bg-emerald/50" />
        </motion.div>

        <h1 className="text-luxury-header mb-8 text-white tracking-[-0.05em] !text-6xl md:!text-9xl relative">
          SysAware
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute -top-4 -right-8 text-xs font-mono text-emerald/40 tracking-widest hidden md:block"
          >
            v2.0.4-PRO
          </motion.span>
        </h1>
        
        <p className="text-luxury-subheading text-white/40 mb-24 max-w-xl mx-auto leading-relaxed !text-lg md:!text-xl font-light">
          Real-time hardware-aware telemetry and benchmarking suite for the next generation of <span className="text-white/80">distributed model inference.</span>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-12 text-white/20">
          <div className="flex items-center gap-2 group cursor-help">
            <Cpu size={16} className="group-hover:text-emerald transition-colors" />
            <span className="text-[10px] font-mono uppercase tracking-widest group-hover:text-white/60 transition-colors">Silicon-Aware</span>
          </div>
          <div className="flex items-center gap-2 group cursor-help">
            <Activity size={16} className="group-hover:text-emerald transition-colors" />
            <span className="text-[10px] font-mono uppercase tracking-widest group-hover:text-white/60 transition-colors">Real-time SSE</span>
          </div>
          <div className="flex items-center gap-2 group cursor-help">
            <Zap size={16} className="group-hover:text-emerald transition-colors" />
            <span className="text-[10px] font-mono uppercase tracking-widest group-hover:text-white/60 transition-colors">LLM Optimized</span>
          </div>
        </div>
      </motion.div>

      {/* Footer Interaction */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-12 md:bottom-16 flex flex-col items-center gap-6 z-10 cursor-pointer group"
        onClick={() => navigate('/profiler')}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/20 group-hover:text-white/50 transition-colors">Scroll or Click to begin</span>
          <div className="h-12 w-px bg-gradient-to-b from-white/20 to-transparent group-hover:from-emerald/50 transition-all duration-500" />
        </div>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={20} className="text-white/20 group-hover:text-emerald transition-colors" />
        </motion.div>
      </motion.div>

      {/* Decorative Ornaments */}
      <div className="absolute top-12 left-12 hidden md:block opacity-20">
        <div className="text-[10px] font-mono text-white/50 mb-2 tracking-tighter">0x4F9B_SYSTEM_READY</div>
        <div className="text-[10px] font-mono text-emerald">NODE_ID: 127.0.0.1:1234</div>
      </div>
    </div>
  );
};
