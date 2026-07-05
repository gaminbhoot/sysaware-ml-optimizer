import { useState, useCallback, memo } from 'react';
import { Server } from 'lucide-react';
import { Card } from '../ui/Card';

interface CLICommandLauncherProps {
  serverBaseUrl: string;
  addNotification: (notif: { type: 'success' | 'error' | 'info'; title?: string; message: string }) => void;
}

export const CLICommandLauncher = memo(({
  serverBaseUrl,
  addNotification
}: CLICommandLauncherProps) => {
  const ingestionUrl = `${serverBaseUrl}/api/telemetry/ingest`;
  const proxyUrl = `${serverBaseUrl}/v1`;
  const cliLaunchCmd = `export SYSAWARE_API_KEY="your_api_key"\npython backend/sysaware/cli.py --model-path <model_path> --server ${serverBaseUrl}`;

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    addNotification({
      type: 'success',
      message: 'Copied to clipboard!'
    });
    setTimeout(() => setCopiedText(null), 2000);
  }, [addNotification]);

  return (
    <Card className="p-6 border-transparent bg-white/[0.01] flex flex-col justify-between h-full min-h-[300px]">
      <div>
        <h4 className="text-sm text-white font-medium mb-3 flex items-center gap-2">
          <Server size={14} className="text-silver/60" />
          Connection Ingestion
        </h4>
        <p className="text-xs text-muted mb-6 font-light leading-relaxed">
          Configure external benchmark client nodes to stream real-time metrics back to this management console.
        </p>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-muted mb-1 uppercase font-mono tracking-wider">Ingestion Target</p>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5 font-mono text-[11px] text-silver/80">
              <span className="truncate pr-2">{ingestionUrl}</span>
              <button
                onClick={() => handleCopy(ingestionUrl)}
                className="text-silver/40 hover:text-white transition-colors hover:underline text-[10px]"
              >
                {copiedText === ingestionUrl ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-muted mb-1 uppercase font-mono tracking-wider">OpenAI Proxy URL</p>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5 font-mono text-[11px] text-silver/80">
              <span className="truncate pr-2">{proxyUrl}</span>
              <button
                onClick={() => handleCopy(proxyUrl)}
                className="text-silver/40 hover:text-white transition-colors hover:underline text-[10px]"
              >
                {copiedText === proxyUrl ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-white/5">
        <p className="text-[10px] text-muted mb-2 uppercase font-mono tracking-wider">CLI Launch Command</p>
        <div className="p-3 bg-black/30 border border-white/5 rounded-xl font-mono text-[10px] text-silver/90 whitespace-pre overflow-x-auto relative group">
          <code>{cliLaunchCmd}</code>
          <button
            onClick={() => handleCopy(cliLaunchCmd)}
            className="absolute top-2 right-2 text-silver/40 hover:text-white text-[10px] bg-white/5 px-2 py-0.5 rounded transition-all opacity-0 group-hover:opacity-100 font-sans"
          >
            {copiedText === cliLaunchCmd ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </Card>
  );
});
