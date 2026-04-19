import { useState } from 'react'

function App() {
  const [systemProfile, setSystemProfile] = useState<any>(null);
  const [modelAnalysis, setModelAnalysis] = useState<any>(null);
  const [modelPath, setModelPath] = useState('');
  const [loadingSys, setLoadingSys] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);

  const fetchSystem = async () => {
    setLoadingSys(true);
    try {
      const res = await fetch('/api/system');
      const data = await res.json();
      setSystemProfile(data.profile);
    } catch (e) {
      console.error(e);
    }
    setLoadingSys(false);
  };

  const analyzeModel = async () => {
    if(!modelPath) return;
    setLoadingModel(true);
    try {
      const res = await fetch('/api/model/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_path: modelPath, unsafe_load: false })
      });
      const data = await res.json();
      setModelAnalysis(data.analysis);
    } catch (e) {
      console.error(e);
    }
    setLoadingModel(false);
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white px-6 py-12 pb-32 font-sans overflow-hidden relative selection:bg-[#E8ff00] selection:text-black">
      {/* Ambient Glows simulating AirShifumi vibrance mixed with dark luxury */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-purple-600/20 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] bg-blue-600/20 blur-[140px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-[1200px] relative z-10">
        {/* Header */}
        <header className="flex flex-col items-center justify-center pb-12 mb-10 text-center relative pt-8">
          <h1 
            className="font-serif text-6xl md:text-[9rem] font-black tracking-tighter lowercase leading-[0.8]"
            style={{
              WebkitTextStroke: '2px rgba(255,255,255,0.9)',
              color: 'transparent',
            }}
          >
            sysaware
          </h1>
          <p className="font-sans text-xs md:text-sm font-bold text-white/70 tracking-[0.3em] uppercase mt-8 bg-white/5 px-6 py-3 rounded-full backdrop-blur-md border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            ml model optimization
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Column 1 - System Profile */}
          <section className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 flex flex-col relative group hover:border-white/20 transition-all duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8ff00]/10 blur-[50px] rounded-full group-hover:bg-[#E8ff00]/20 transition-all" />
            
            <h2 className="font-sans text-sm font-bold tracking-[0.2em] text-white/50 uppercase mb-8 flex items-center gap-4">
              <span className="w-2 h-2 rounded-full bg-[#E8ff00] shadow-[0_0_10px_#E8ff00]"></span>
              system physical
            </h2>

            <button 
              onClick={fetchSystem}
              disabled={loadingSys}
              className="w-full inline-flex justify-center uppercase font-black text-xs tracking-[0.2rem] bg-white text-black hover:bg-[#E8ff00] hover:shadow-[0_0_20px_rgba(232,255,0,0.3)] border border-transparent rounded-full px-8 py-5 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 z-10"
            >
              {loadingSys ? 'scanning...' : 'initiate telemetry'}
            </button>

            {systemProfile && (
              <div className="mt-10 flex flex-col gap-4 text-sm font-medium z-10">
                <div className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-white/5">
                  <span className="text-white/50 text-xs tracking-wider uppercase">os env</span>
                  <span className="font-bold text-[#E8ff00]">{systemProfile.os || '—'}</span>
                </div>
                <div className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-white/5">
                  <span className="text-white/50 text-xs tracking-wider uppercase">compute</span>
                  <span className="font-bold">{systemProfile.cpu_cores || '—'} cores</span>
                </div>
                <div className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-white/5">
                  <span className="text-white/50 text-xs tracking-wider uppercase">memory</span>
                  <span className="font-bold">{systemProfile.ram_gb?.toFixed(1) || 0} GB</span>
                </div>
                <div className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-white/5">
                  <span className="text-white/50 text-xs tracking-wider uppercase">dgpu</span>
                  <span className={systemProfile.dgpu_name ? "text-white font-bold" : "text-red-400 font-semibold"}>
                    {systemProfile.dgpu_name || 'None'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-white/5">
                  <span className="text-white/50 text-xs tracking-wider uppercase">npu core</span>
                  <span className={systemProfile.npu_available ? "text-[#E8ff00] font-bold" : "text-white/30 font-semibold"}>
                    {systemProfile.npu_name || 'Not Detected'}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Column 2 - Model Input */}
          <section className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 flex flex-col relative group hover:border-white/20 transition-all duration-500">
            <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full group-hover:bg-purple-500/20 transition-all" />
            
            <h2 className="font-sans text-sm font-bold tracking-[0.2em] text-white/50 uppercase mb-8 flex items-center gap-4 z-10">
              <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,1)]"></span>
              model payload
            </h2>
            
            <div className="flex flex-col gap-6 z-10">
              <div className="flex flex-col gap-3">
                <label className="text-white/50 text-xs font-bold tracking-widest uppercase ml-2">
                  model target (.pt/.pth)
                </label>
                <input 
                  type="text"
                  value={modelPath}
                  onChange={(e) => setModelPath(e.target.value)}
                  placeholder="/models/resnet50.pt"
                  className="bg-black/50 border border-white/10 text-white font-sans px-6 py-4 rounded-full focus:outline-none focus:border-purple-500 focus:bg-white/5 transition-colors text-sm"
                />
              </div>

              <button 
                onClick={analyzeModel}
                disabled={loadingModel || !modelPath}
                className="w-full inline-flex justify-center uppercase font-black text-xs tracking-[0.2rem] bg-white text-black hover:bg-purple-400 hover:shadow-[0_0_20px_rgba(192,132,252,0.4)] border border-transparent rounded-full px-8 py-5 transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
              >
                {loadingModel ? 'analyzing...' : 'load payload'}
              </button>

              {modelAnalysis && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-black/40 border border-white/5 p-6 rounded-[2rem] text-center shadow-inner flex flex-col justify-center">
                    <span className="font-serif text-3xl md:text-5xl font-bold text-white block">
                      {modelAnalysis.num_params?.toLocaleString() || 0}
                    </span>
                    <span className="font-sans text-[0.6rem] text-purple-400 tracking-[0.2em] uppercase mt-3 block font-bold">
                      parameters
                    </span>
                  </div>
                  <div className="bg-black/40 border border-white/5 p-6 rounded-[2rem] text-center shadow-inner flex flex-col justify-center">
                    <span className="font-serif text-3xl md:text-5xl font-bold text-white block">
                      {modelAnalysis.size_mb?.toFixed(2) || 0}
                    </span>
                    <span className="font-sans text-[0.6rem] text-purple-400 tracking-[0.2em] uppercase mt-3 block font-bold">
                      size (mb)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

      </div>
    </div>
  )
}

export default App
