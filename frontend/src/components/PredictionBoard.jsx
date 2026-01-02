import React from 'react';
import { motion } from 'framer-motion';
import { Star, Zap } from 'lucide-react';
import StatusGauge from './StatusGauge';

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

    const { numbers, confidence } = prediction;

    return (
        <div className="glass-card p-6 md:p-8 w-full max-w-4xl mx-auto mb-8 relative overflow-hidden group">
            {/* Glow Effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 z-10 relative gap-4 md:gap-0">
                <div className="flex items-center gap-2">
                    <Zap className="text-yellow-400 w-6 h-6" />
                    <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        The Oracle
                    </h2>
                </div>
                <div className="w-full md:w-64 flex flex-col items-center md:items-end gap-3 md:gap-2">
                    <StatusGauge confidence={confidence} />

                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                            <Zap className="w-3 h-3" />
                        )}
                        {loading ? 'Analyse...' : 'Générer la nouvelle prédiction'}
                    </button>

                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-black/80 text-white text-[10px] md:text-xs px-3 py-2 rounded-lg border border-white/10 absolute top-full right-0 mt-2 z-50 whitespace-nowrap"
                        >
                            {message}
                        </motion.div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-5 md:grid-cols-10 gap-3 md:gap-4 mb-6">
                {numbers.map((num, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="aspect-square flex items-center justify-center bg-white/10 border border-white/20 rounded-full text-xl md:text-2xl font-bold shadow-lg shadow-blue-500/20 hover:scale-110 transition-transform cursor-default"
                    >
                        {num}
                    </motion.div>
                ))}
            </div>

            {/* Bonus Letter Removed */}
        </div>
    );
};

export default PredictionBoard;
