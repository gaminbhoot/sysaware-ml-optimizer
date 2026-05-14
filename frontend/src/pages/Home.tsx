import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { HomeGradient } from '../components/HomeGradient';

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
    <div 
      className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden bg-black selection:bg-emerald/30 cursor-pointer"
      onClick={() => navigate('/profiler')}
    >
      {/* 3D Background Gradient */}
      <HomeGradient />

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center z-10 px-6 -mt-32"
      >
        <h1 className="font-nistha mb-8 text-white tracking-normal !text-7xl md:!text-9xl lowercase">
          anugya
        </h1>
        
        <p className="text-luxury-subheading text-white/40 max-w-xl mx-auto leading-relaxed !text-lg md:!text-xl font-light">
          Real-time hardware-aware telemetry and benchmarking suite for the next generation of <span className="text-white/80">distributed model inference.</span>
        </p>
      </motion.div>

      {/* Scroll Suggestion */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-12 flex flex-col items-center gap-4 z-10 opacity-20 hover:opacity-50 transition-opacity"
      >
        <span className="text-[9px] font-mono uppercase tracking-[0.4em] text-white">Scroll to begin</span>
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={16} className="text-white" />
        </motion.div>
      </motion.div>
    </div>
  );
};
