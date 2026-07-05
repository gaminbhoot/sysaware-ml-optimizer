import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { NodeData } from '../../hooks/useFleetStream';

interface LiveNodeCardProps {
  node: NodeData;
  onDelete: () => void;
}

export const LiveNodeCard = memo(({ node, onDelete }: LiveNodeCardProps) => {
  const isServer = node.machine_id.includes('local_server');

  return (
    <Card className="group hover:bg-white/[0.04] transition-all relative overflow-hidden p-6 md:p-8 border-transparent">
      <div className="flex justify-between items-start mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {isServer && <Badge variant="success">CORE SERVER</Badge>}
            <Badge variant={node.status === 'active' || node.status === 'benchmarking' ? 'success' : 'neutral'}>
              {node.status}
            </Badge>
          </div>
          <h4 className="text-lg md:text-xl text-white font-medium truncate pr-4">{node.machine_id.split('_')[0]}</h4>
          <p className="text-xs text-muted mt-1 truncate">{node.hardware_profile.cpu || 'Unknown CPU'}</p>
        </div>
        <button
          onClick={onDelete}
          aria-label={`Remove node ${node.machine_id}`}
          className="p-2.5 rounded-xl text-silver/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all md:opacity-0 md:group-hover:opacity-100 shrink-0"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted">System Load</span>
          <span className="text-silver/70 font-mono">Nominal</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted">Last Pulse</span>
          <span className="text-silver/70 font-mono">
            {new Date(node.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Subtle Progress Bar */}
      <div className="absolute bottom-0 left-0 h-[2px] bg-emerald/20 w-full overflow-hidden">
        <motion.div
          className="h-full bg-emerald shadow-[0_0_8px_#10B981]"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    </Card>
  );
});
