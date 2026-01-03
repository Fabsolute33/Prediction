import React from 'react';
import { motion } from 'framer-motion';
import { Star, Zap, Brain } from 'lucide-react';
import StatusGauge from './StatusGauge';

const PredictionCard = ({ title, numbers, icon: Icon, color, delay = 0 }) => (
    <div className={`flex-1 bg-${color}-900/10 border border-${color}-500/20 rounded-xl p-4 overflow-hidden relative group hover:border-${color}-500/50 transition-colors`}>
        {/* Glow */}
        <div className={`absolute -top-10 -right-10 w-32 h-32 bg-${color}-500/20 blur-3xl rounded-full pointer-events-none group-hover:bg-${color}-500/30 transition-all`} />

        <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className={`p-2 rounded-lg bg-${color}-500/10`}>
                <Icon className={`w-5 h-5 text-${color}-400`} />
            </div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>

        <div className="grid grid-cols-5 gap-2 relative z-10">
            {numbers.slice(0, 10).map((num, idx) => (
                <motion.div
                    key={`${title}-${idx}`}
                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: delay + (idx * 0.05) }}
                    className={`w-12 h-12 flex items-center justify-center rounded-full text-xl font-black transition-all cursor-default relative backdrop-blur-md
                        ${color === 'purple'
                            ? 'bg-purple-500/10 border border-purple-400/50 text-purple-100 shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] hover:bg-purple-500/20'
                            : 'bg-blue-500/10 border border-blue-400/50 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] hover:bg-blue-500/20'}
                        `}
                >
                    <span className="drop-shadow-sm">{num}</span>
                </motion.div>
            ))}
        </div>
    </div>
);

const PredictionBoard = ({ prediction, onRefresh }) => {
    const [loading, setLoading] = React.useState(false);
    const [message, setMessage] = React.useState(null);

    const handleRefresh = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const API_URL = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
            const res = await fetch(`${API_URL}/refresh`, { method: 'POST' });
            const data = await res.json();
            setMessage(data.message);
            if (data.updated && onRefresh) {
                onRefresh();
            }
        } catch (e) {
            console.error(e);
            setMessage("Erreur lors de la mise à jour");
        } finally {
            setLoading(false);
            // Clear message after 5 seconds
            setTimeout(() => setMessage(null), 5000);
        }
    };

    if (!prediction) return (
        <div className="glass-card p-8 text-center animate-pulse">
            Loading Neural Engine...
        </div>
    );

    // Determine data structure
    let statNumbers = [];
    let algoNumbers = [];
    let next_draw_time = prediction.next_draw_time;
    // We assume confidence is shared or primarily statistical for the gauge
    let confidence = prediction.confidence;

    if (prediction.statistical) {
        statNumbers = prediction.statistical.numbers || [];
        confidence = prediction.statistical.confidence;
        algoNumbers = prediction.algorithmic ? prediction.algorithmic.numbers : [];
    } else {
        // Legacy
        statNumbers = prediction.numbers || [];
    }

    return (
        <div className="glass-card p-6 md:p-8 w-full max-w-4xl mx-auto mb-8 relative overflow-hidden">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 md:gap-0">
                <div className="flex items-center gap-3">
                    <Zap className="text-yellow-400 w-8 h-8 animate-pulse" />
                    <div>
                        <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 uppercase tracking-tighter">
                            The Oracle
                        </h2>
                        {next_draw_time && (
                            <div className="text-xs text-gray-400 font-mono mt-1">
                                Targets Next Draw: <span className="text-white font-bold">{next_draw_time}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    <StatusGauge confidence={confidence} />
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                            <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        )}
                        {loading ? 'Crunching...' : 'Generate New'}
                    </button>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-black/90 text-white text-[10px] px-3 py-2 rounded-lg border border-white/10 absolute top-20 right-8 z-50 whitespace-nowrap shadow-xl"
                        >
                            {message}
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex flex-col md:flex-row gap-6">
                <PredictionCard
                    title="Statistical"
                    numbers={statNumbers}
                    icon={Brain}
                    color="purple"
                    delay={0}
                />
                {algoNumbers.length > 0 && (
                    <PredictionCard
                        title="Algorithmic"
                        numbers={algoNumbers}
                        icon={Zap}
                        color="blue"
                        delay={0.2}
                    />
                )}
            </div>

            <div className="mt-4 text-center text-[10px] text-gray-500 font-mono">
                Dual-Core Analysis: Statistical Pattern Matching + Matrix Topology
            </div>
        </div>
    );
};

export default PredictionBoard;
