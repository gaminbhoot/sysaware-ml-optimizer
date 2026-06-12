import { motion } from 'framer-motion';
import { Stethoscope, Search, Zap, RefreshCcw, Info, ShieldAlert, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';

const DiagnosticFinding = ({ finding }: { finding: any }) => {
  const iconMap: any = {
    dtype_inefficiency: <Zap className="text-yellow-400" size={16} />,
    dead_neurons: <ShieldAlert className="text-blue-400" size={16} />,
    quantization_headroom: <BarChart3 className="text-emerald-400" size={16} />
  };

  const severityStyles: any = {
    warning: "border-yellow-500/20 bg-yellow-500/5 text-yellow-200",
    info: "border-blue-500/20 bg-blue-500/5 text-blue-200",
    success: "border-emerald-500/20 bg-emerald-500/5 text-emerald-200",
    error: "border-red-500/20 bg-red-500/5 text-red-200"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn("p-4 rounded-xl border flex gap-4 items-start mb-3", severityStyles[finding.severity] || severityStyles.info)}
    >
      <div className="mt-1">{iconMap[finding.type] || <Info size={16} />}</div>
      <div className="flex-1">
        <div className="font-mono text-[10px] uppercase tracking-wider mb-1 font-bold text-white">{finding.name || finding.type}</div>
        <p className="text-xs opacity-75 font-light leading-relaxed">{finding.description}</p>
        {finding.impact && (
          <div className="mt-2 text-[10px] font-mono opacity-50 flex items-center gap-1.5">
            <span className="text-emerald">Impact:</span> {finding.impact}
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface DiagnoseTabProps {
  modelAnalysis: any;
  isDiagnosing: boolean;
  diagnosticFindings: any[];
  runDiagnostics: () => Promise<void>;
}

export const DiagnoseTab = ({
  modelAnalysis,
  isDiagnosing,
  diagnosticFindings,
  runDiagnostics
}: DiagnoseTabProps) => {
  return (
    <div className="glass-card p-10 relative overflow-hidden">
      {!modelAnalysis ? (
        <div className="py-20 flex flex-col items-center text-center">
          <Stethoscope size={48} className="text-white/10 mb-6" />
          <h3 className="text-xl font-light mb-2">No Model Loaded</h3>
          <p className="text-sm text-white/30 max-w-sm">Load a model in the Inspect tab first to run architectural diagnostics.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-light mb-2">Model Diagnostic</h3>
              <p className="text-sm text-white/30">Deep scan for dtype inefficiencies, dead layers, and quantization headroom.</p>
            </div>
            <button
              onClick={runDiagnostics}
              disabled={isDiagnosing}
              className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-xl font-mono text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {isDiagnosing ? <RefreshCcw size={16} className="animate-spin" /> : <Zap size={16} />}
              {isDiagnosing ? "Analyzing..." : "Initiate Scan"}
            </button>
          </div>

          {/* Results / Progress */}
          <div className="min-h-[300px] bg-white/[0.02] border border-white/5 rounded-2xl p-8">
            {isDiagnosing ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-24 h-24 rounded-full border-4 border-emerald/20 border-t-emerald flex items-center justify-center mb-8"
                >
                  <Stethoscope size={32} className="text-emerald" />
                </motion.div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-emerald/60">Scanning Layers...</div>
              </div>
            ) : diagnosticFindings.length > 0 ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-8 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
                  <Search size={14} /> Scan Results for {modelAnalysis.model_name}
                </div>
                {diagnosticFindings.map((f, i) => <DiagnosticFinding key={i} finding={f} />)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-white/10">
                <Stethoscope size={32} className="mb-4 opacity-50" />
                <p className="text-xs font-mono uppercase tracking-widest">Ready for analysis</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
