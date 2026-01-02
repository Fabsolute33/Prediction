import React, { useEffect, useState } from 'react';
import PredictionBoard from './components/PredictionBoard';
import HistoryTable from './components/HistoryTable';
import { Activity, BarChart3, Brain, History, Stars } from 'lucide-react';
import ExpertAgentPanel from './components/ExpertAgentPanel';
import StatisticsPanel from './components/StatisticsPanel';

const getApiUrl = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return url.startsWith('http') ? url : `https://${url}`;
};
const API_URL = getApiUrl();

function App() {
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("Connecting...");
  const [activeTab, setActiveTab] = useState('dashboard');

  const fetchData = async () => {
    try {
      // Parallel fetch
      const [predRes, histRes, statRes] = await Promise.all([
        fetch(`${API_URL}/predict`),
        fetch(`${API_URL}/history?limit=20`),
        fetch(`${API_URL}/status`)
      ]);

      if (predRes.ok) {
        setPrediction(await predRes.json());
      }
      if (histRes.ok) {
        setHistory(await histRes.json());
      }
      if (statRes.ok) {
        setStatus("Live Connected");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      setStatus("Offline / Retrying...");
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 60 seconds (or faster if "Live" feel needed, but 1 min is good for draws)
    const interval = setInterval(fetchData, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  const NavButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 font-medium text-sm
        ${activeTab === id
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
          : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
    >
      <Icon className="w-5 h-5 md:w-4 md:h-4" />
      <span className="hidden md:inline">{label}</span>
      {/* Mobile Label only for active? Or maybe just icon on mobile if space is tight? 
          Let's keep text hidden on very small screens if needed, but for now Bottom Nav usually has icons.
      */}
    </button>
  );

  const MobileNavButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex flex-col items-center justify-center w-full py-2 transition-all duration-300
            ${activeTab === id ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}
        `}
    >
      <Icon className={`w-6 h-6 mb-1 ${activeTab === id ? 'drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]' : ''}`} />
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white relative flex flex-col">
      {/* Background is handled in global CSS, but structure needs specific padding for mobile bottom bar */}

      <div className="p-4 md:p-8 pb-24 md:pb-8 flex-grow"> {/* Added bottom padding for mobile nav */}
        <header className="max-w-4xl mx-auto mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 text-center md:text-left">
              CRESCENDO<span className="text-white font-light">PROPHET</span>
            </h1>
            <div className="flex items-center gap-2 text-xs font-mono bg-white/5 py-1 px-3 rounded-full border border-white/10">
              <Activity className={`w-3 h-3 ${status.includes('Live') ? 'text-emerald-500 animate-pulse' : 'text-red-500'}`} />
              {status}
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <div className="hidden md:flex justify-start gap-2 bg-gray-900/50 p-1 rounded-full backdrop-blur-sm border border-gray-800 w-fit">
            <NavButton id="dashboard" icon={Stars} label="Prédiction" />
            <NavButton id="stats" icon={BarChart3} label="Statistiques" />
            <NavButton id="expert" icon={Brain} label="Expert IA" />
            <NavButton id="history" icon={History} label="Historique" />
          </div>
        </header>

        <main className="max-w-4xl mx-auto flex flex-col gap-12">

          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="mb-12">
                <PredictionBoard prediction={prediction} onRefresh={fetchData} />
              </section>
              <section>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Derniers Tirages
                </h2>
                <HistoryTable draws={history} />
              </section>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <StatisticsPanel />
            </div>
          )}

          {activeTab === 'expert' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ExpertAgentPanel />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <HistoryTable draws={history} />
            </div>
          )}

        </main>

        <footer className="max-w-4xl mx-auto mt-12 text-center text-gray-500 text-xs pb-4">
          Autonomous Prediction System • v1.0 • Persistent Memory (SQLite)
        </footer>
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-xl border-t border-white/10 z-50 pb-safe">
        <div className="flex justify-between items-center px-6 py-2 max-w-sm mx-auto">
          <MobileNavButton id="dashboard" icon={Stars} label="Oracle" />
          <MobileNavButton id="stats" icon={BarChart3} label="Stats" />
          <MobileNavButton id="expert" icon={Brain} label="Expert" />
          <MobileNavButton id="history" icon={History} label="Hist." />
        </div>
      </div>
    </div>
  );
}

export default App;
