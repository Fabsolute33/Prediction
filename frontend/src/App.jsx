import React, { useEffect, useState } from 'react';
import PredictionBoard from './components/PredictionBoard';
import HistoryTable from './components/HistoryTable';
import { Activity } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("Connecting...");

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

  return (
    <div className="min-h-screen p-4 md:p-8 relative">
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-12">
        <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          CRESCENDO<span className="text-white font-light">PROPHET</span>
        </h1>
        <div className="flex items-center gap-2 text-xs font-mono bg-white/5 py-1 px-3 rounded-full border border-white/10">
          <Activity className={`w-3 h-3 ${status.includes('Live') ? 'text-emerald-500 animate-pulse' : 'text-red-500'}`} />
          {status}
        </div>
      </header>

      <main className="flex flex-col gap-12">
        {/* Section 1: The Future */}
        <section>
          <PredictionBoard prediction={prediction} onRefresh={fetchData} />
        </section>

        {/* Section 2: The Past */}
        <section>
          <HistoryTable draws={history} />
        </section>
      </main>

      <footer className="max-w-4xl mx-auto mt-12 text-center text-gray-500 text-xs pb-4">
        Autonomous Prediction System • v1.0 • Persistent Memory (SQLite)
      </footer>
    </div>
  );
}

export default App;
