import React, { useEffect, useState } from 'react';
import PredictionBoard from './components/PredictionBoard';
import HistoryTable from './components/HistoryTable';
import { Activity, BarChart3, Brain, History, Stars, Menu, X } from 'lucide-react';
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
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fetchData = async () => {
    try {
      // Parallel fetch
      const [predRes, histRes, statRes] = await Promise.all([
        fetch(`${API_URL}/predict`),
        fetch(`${API_URL}/history?limit=20`),
        fetch(`${API_URL}/stats`),
        fetch(`${API_URL}/status`)
      ]);

      if (predRes.ok) {
        setPrediction(await predRes.json());
      }
      if (histRes.ok) {
        setHistory(await histRes.json());
      }
      if (statRes.ok) {
        setStats(await statRes.json());
      }
      if (predRes.ok && histRes.ok && statRes.ok) {
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
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  const MobileMenuItem = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setIsMenuOpen(false);
      }}
      className={`flex items-center gap-4 w-full p-4 rounded-xl transition-all duration-300
            ${activeTab === id ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-gray-400 hover:bg-white/5'}
        `}
    >
      <Icon className="w-6 h-6" />
      <span className="text-lg font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white relative flex flex-col font-sans">

      <div className="p-4 md:p-8 flex-grow">
        <header className="max-w-4xl mx-auto mb-8">
          <div className="flex justify-between items-center gap-4 mb-8">
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
              CRESCENDO<span className="text-white font-light">PROPHET</span>
            </h1>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-white/5 py-1 px-3 rounded-full border border-white/10">
                <Activity className={`w-3 h-3 ${status.includes('Live') ? 'text-emerald-500 animate-pulse' : 'text-red-500'}`} />
                {status}
              </div>

              {/* Hamburger Button */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="md:hidden p-2 text-gray-300 hover:text-white bg-white/5 rounded-lg border border-white/10"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <div className="hidden md:flex justify-start gap-2 bg-gray-900/50 p-1 rounded-full backdrop-blur-sm border border-gray-800 w-fit">
            <NavButton id="dashboard" icon={Stars} label="Prédiction" />
            <NavButton id="stats" icon={BarChart3} label="Statistiques" />
            <NavButton id="expert" icon={Brain} label="Expert IA" />
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
                <HistoryTable draws={history} nextDrawPrediction={prediction} />
              </section>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <StatisticsPanel stats={stats} />
            </div>
          )}

          {activeTab === 'expert' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ExpertAgentPanel />
            </div>
          )}

        </main>

        <footer className="max-w-4xl mx-auto mt-12 text-center text-gray-500 text-xs pb-4">
          Autonomous Prediction System • v1.0 • Persistent Memory (SQLite)
        </footer>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-xl p-6 flex flex-col animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white">Menu</h2>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <MobileMenuItem id="dashboard" icon={Stars} label="Prédiction" />
            <MobileMenuItem id="stats" icon={BarChart3} label="Statistiques" />
            <MobileMenuItem id="expert" icon={Brain} label="Expert IA" />
          </div>

          <div className="mt-auto pt-8 border-t border-white/10">
            <div className="flex items-center gap-2 text-sm font-mono text-gray-400 justify-center">
              <Activity className={`w-4 h-4 ${status.includes('Live') ? 'text-emerald-500' : 'text-red-500'}`} />
              {status}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
