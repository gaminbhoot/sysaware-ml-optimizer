import { NavLink, useLocation } from 'react-router-dom';
import { Activity, Cpu, Layers, Zap, MessageSquare, Target } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/profiler', icon: Activity, label: 'Profiler' },
  { path: '/model', icon: Layers, label: 'Model' },
  { path: '/optimizer', icon: Zap, label: 'Optimizer' },
  { path: '/prompt', icon: MessageSquare, label: 'Prompts' },
  { path: '/results', icon: Target, label: 'Results' },
];

export const Sidebar = () => {
  const location = useLocation();

  if (location.pathname === '/') return null; // Hide on Home page (The Void)

  return (
    <div className="fixed left-0 top-0 bottom-0 w-24 flex flex-col items-center py-12 bg-[#020202] border-r border-white/[0.05] z-50">
      <div className="mb-16">
        <NavLink to="/">
          <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center hover:bg-white/[0.08] transition-all">
            <Cpu size={18} className="text-white" />
          </div>
        </NavLink>
      </div>

      <nav className="flex flex-col gap-8 flex-1">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative group flex items-center justify-center w-12 h-12"
              title={item.label}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-[-16px] w-[2px] h-8 bg-emerald shadow-[0_0_10px_#10B981]"
                />
              )}
              <item.icon
                size={20}
                className={cn(
                  "transition-all duration-300",
                  isActive ? "text-white" : "text-white/30 group-hover:text-white/70"
                )}
              />
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
