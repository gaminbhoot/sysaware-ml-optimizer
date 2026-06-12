import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  className?: string;
  dotClassName?: string;
}

export const TypingIndicator = ({
  className = "flex gap-1.5 pt-2",
  dotClassName = "w-1.5 h-1.5 rounded-full bg-emerald/60 animate-pulse"
}: TypingIndicatorProps) => {
  return (
    <div className={className}>
      <motion.div 
        animate={{ opacity: [0.3, 1, 0.3] }} 
        transition={{ repeat: Infinity, duration: 1 }} 
        className={dotClassName} 
      />
      <motion.div 
        animate={{ opacity: [0.3, 1, 0.3] }} 
        transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} 
        className={dotClassName} 
      />
      <motion.div 
        animate={{ opacity: [0.3, 1, 0.3] }} 
        transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} 
        className={dotClassName} 
      />
    </div>
  );
};
