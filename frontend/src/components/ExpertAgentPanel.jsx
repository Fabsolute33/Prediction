import React, { useState, useEffect } from 'react';

const getApiUrl = () => {
    const url = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    return url.startsWith('http') ? url : `https://${url}`;
};
const API_BASE = getApiUrl();

const ExpertAgentPanel = () => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [optimizationResult, setOptimizationResult] = useState(null);
    const [optimizing, setOptimizing] = useState(false);

    const fetchAnalysis = async () => {
        try {
            const res = await fetch(`${API_BASE}/expert/analysis`);
            const data = await res.json();
            setAnalysis(data);
        } catch (err) {
            console.error("Failed to fetch analysis", err);
        }
    };

    useEffect(() => {
        fetchAnalysis();
    }, []);

    const handleOptimize = async () => {
        setOptimizing(true);
        setOptimizationResult(null);
        try {
            const res = await fetch(`${API_BASE}/expert/optimize`, { method: 'POST' });
            const data = await res.json();
            setOptimizationResult(data);
        } catch (err) {
            console.error("Optimization failed", err);
        } finally {
            setOptimizing(false);
        }
    };

    const handleApply = async () => {
        if (!optimizationResult?.proposed_params) return;
        try {
            await fetch(`${API_BASE}/expert/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(optimizationResult.proposed_params)
            });
            // Refresh analysis
            setOptimizationResult(null);
            fetchAnalysis();
            alert("Nouvelle formule appliquée avec succès !");
        } catch (err) {
            console.error("Failed to apply", err);
        }
    };

    if (!analysis) return <div className="p-4 rounded-xl bg-gray-800 text-white shadow-lg animate-pulse">Chargement de l'Agent Expert...</div>;

    const { current_params, accuracy_last_50, message } = analysis;

    return (
        <div className="bg-gray-900 text-white rounded-2xl shadow-2xl p-6 border border-gray-700 mt-8">
            <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
                        Expert Mathématique
                    </h2>
                    <p className="text-gray-400 text-sm">Analyse probabiliste et évolution de la formule</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Status */}
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 text-purple-300">Paramètres Actuels</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
                            <span className="text-gray-400">Poids Fréquence:</span>
                            <span className="font-mono text-purple-200">{current_params.freq_weight}</span>
                        </div>
                        <div className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
                            <span className="text-gray-400">Poids Écart (Gap):</span>
                            <span className="font-mono text-purple-200">{current_params.gap_weight}</span>
                        </div>
                        <div className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
                            <span className="text-gray-400">Taux Décroissance:</span>
                            <span className="font-mono text-purple-200">{current_params.decay_rate}</span>
                        </div>
                        <div className="mt-4 p-3 bg-indigo-900/30 border border-indigo-500/30 rounded-lg">
                            <div className="text-sm text-indigo-300 mb-1">Performance (50 derniers tirages)</div>
                            <div className="text-2xl font-bold text-indigo-100">{(accuracy_last_50 * 100).toFixed(1)}%</div>
                        </div>
                    </div>
                </div>

                {/* Actions / Results */}
                <div className="flex flex-col justify-between">
                    {!optimizationResult ? (
                        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 h-full flex flex-col justify-center items-center text-center">
                            <p className="text-gray-300 mb-6">
                                L'agent peut étudier les tirages successifs pour optimiser les variables de la formule de prédiction.
                            </p>
                            <button
                                onClick={handleOptimize}
                                disabled={optimizing}
                                className={`px-6 py-3 rounded-lg font-bold shadow-lg transition-all transform hover:scale-105 ${optimizing
                                    ? 'bg-gray-600 cursor-wait'
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
                                    }`}
                            >
                                {optimizing ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Analyse en cours...
                                    </span>
                                ) : (
                                    "Lancer l'Analyse Expert"
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 h-full">
                            <h3 className="text-lg font-semibold mb-3 text-green-400">Résultat de l'analyse</h3>
                            <p className="text-gray-300 mb-4">{optimizationResult.message}</p>

                            {optimizationResult.found_better && (
                                <div className="space-y-4">
                                    <div className="bg-green-900/20 border border-green-500/30 p-3 rounded-lg">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-green-200">Gain de performance:</span>
                                            <span className="font-bold text-green-400">{optimizationResult.improvement}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Nouvelle précision:</span>
                                            <span className="text-white">{(optimizationResult.best_accuracy * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleApply}
                                        className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg transition-colors"
                                    >
                                        Valider et Appliquer la Formule
                                    </button>
                                    <button
                                        onClick={() => setOptimizationResult(null)}
                                        className="w-full py-2 text-gray-400 hover:text-white text-sm"
                                    >
                                        Ignorer
                                    </button>
                                </div>
                            )}
                            {!optimizationResult.found_better && (
                                <button
                                    onClick={() => setOptimizationResult(null)}
                                    className="w-full mt-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                                >
                                    Retour
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExpertAgentPanel;
