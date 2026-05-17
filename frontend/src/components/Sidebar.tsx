import { NavLink, useLocation } from 'react-router-dom';
import { Cpu, Activity, Layers, MessageSquare, Server } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/profiler', icon: Activity, label: 'Profiler' },
  { path: '/model', icon: Layers, label: 'Model' },
  { path: '/prompt', icon: MessageSquare, label: 'Prompts' },
  { path: '/fleet', icon: Server, label: 'Fleet' },
];

export const Sidebar = () => {
  const location = useLocation();

  if (location.pathname === '/') return null; // Hide on Home page (The Void)

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-24 hidden md:flex flex-col items-center py-12 bg-[#020202] border-r border-white/[0.05] z-50">
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
                    layoutId="activeIndicatorDesktop"
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

      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 flex md:hidden items-center justify-around bg-[#020202]/80 backdrop-blur-lg border-t border-white/[0.05] z-50 px-4">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center flex-1 py-1"
            >
              <item.icon
                size={18}
                className={cn(
                  "transition-all duration-300",
                  isActive ? "text-emerald" : "text-white/30"
                )}
              />
              <span className={cn(
                "text-[10px] mt-1 font-medium",
                isActive ? "text-white" : "text-white/30"
              )}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicatorMobile"
                  className="absolute top-0 w-8 h-[2px] bg-emerald shadow-[0_0_10px_#10B981]"
                />
              )}
            </NavLink>
          );
        })}
      </div>
    </>
  );
};
