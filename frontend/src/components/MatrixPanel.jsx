import React, { useEffect, useState } from 'react';
import { Activity, Grid, Zap, Info } from 'lucide-react';

const getApiUrl = () => {
    const url = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    return url.startsWith('http') ? url : `https://${url}`;
};
const API_URL = getApiUrl();

const HeatmapCell = ({ value, label, tooltip }) => {
    // Value 0 to 1. 
    // Color scale: Dark Blue (Low) -> Bright Red (High)
    // Blue: hue 240. Red: hue 0.
    // We want a gradient. 
    // Let's use HSL. Low=240, High=0.
    // Saturation 100%, Lightness 50%.

    // Actually, let's make it look "Matrix" style? 
    // User asked for: "Dark Blue (Low probability) to Bright Red (High probability)."

    const hue = (1 - value) * 240; // 0->240 (Red->Blue). So we reverse: value 0 -> 240 (Blue), value 1 -> 0 (Red).
    // wait, 1-value: if value=1 -> 0 (Red). if value=0 -> 240 (Blue). Correct.

    const style = {
        backgroundColor: `hsla(${hue}, 70%, 50%, 0.8)`,
        boxShadow: value > 0.8 ? `0 0 10px hsla(${hue}, 100%, 50%, 0.8)` : 'none'
    };

    return (
        <div
            className="group relative w-full pt-[100%] rounded-sm cursor-pointer transition-all duration-300 hover:scale-110 hover:z-10"
            style={style}
        >
            <div className="absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-bold text-white/90 drop-shadow-md">
                {label}
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-32 p-2 bg-black/90 text-white text-xs rounded border border-white/20 pointer-events-none shadow-xl">
                <div className="font-bold mb-1">Number {label}</div>
                <div>{tooltip}</div>
            </div>
        </div>
    );
};

export default function MatrixPanel() {
    const [matrixData, setMatrixData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('time'); // 'time' (Matrix A) or 'space' (Matrix B)

    useEffect(() => {
        const fetchMatrix = async () => {
            try {
                const res = await fetch(`${API_URL}/matrix`);
                if (res.ok) {
                    const data = await res.json();
                    setMatrixData(data);
                }
            } catch (e) {
                console.error("Matrix fetch failed", e);
            } finally {
                setLoading(false);
            }
        };

        fetchMatrix();
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-400 animate-pulse">Initializing Matrix Engine...</div>;
    if (!matrixData) return <div className="p-8 text-center text-red-400">Matrix Offline</div>;

    // Helper to get value for cell (row i, col j)
    // Matrix A is [25][25]. Row=Previous, Col=Next.
    // For heatmap, we usually show the matrix as is.
    // Visuals: 25x25 grid.

    // Flatten data for grid render (or just nested loops)
    // We want 25x25 grid.

    const matrix = viewMode === 'time' ? matrixData.matrix_a : matrixData.matrix_b;
    const maxVal = Math.max(...matrix.flat()); // Normalize for visualization if needed, though Matrix A rows sum to 1.

    // For Matrix A: values are probabilities 0-1 (usually small, e.g. 0.1).
    // For visualization, we might want to scale them relative to the MAX value in the matrix to use the full color range.
    // Otherwise everything looks blue since 0.1 is close to 0.

    const normalize = (val) => {
        if (maxVal === 0) return 0;
        return Math.min(val / maxVal, 1);
    };

    const predictions = matrixData.prediction.details || [];

    return (
        <div className="flex flex-col gap-8">

            {/* Top Section: Prediction Card */}
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-blue-500/20 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Zap className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Algorithmic Probability</h2>
                        <p className="text-xs text-blue-300/80">Derived from 70% Markov Time + 30% Cluster Space</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {predictions.map((p, idx) => (
                        <div key={p.number} className="relative bg-slate-900/80 p-3 rounded-xl border border-white/5 flex flex-col items-center group hover:border-blue-500/50 transition-colors">
                            <div className="absolute top-2 right-2 text-[10px] text-gray-500 font-mono">#{idx + 1}</div>
                            <div className="text-2xl font-black text-white mb-1 shadow-blue-500/50 drop-shadow-sm">{p.number}</div>
                            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full"
                                    style={{ width: `${Math.min(p.score * 100, 100)}%` }} // arbitrary scale for visual bar
                                />
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">Score: {p.score.toFixed(3)}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Section: The Matrix */}
            <div className="bg-slate-800/30 p-4 md:p-6 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Grid className="w-5 h-5 text-purple-400" />
                        The Matrix
                    </h3>

                    <div className="flex bg-black/40 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('time')}
                            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'time' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Time (Markov)
                        </button>
                        <button
                            onClick={() => setViewMode('space')}
                            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'space' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Space (Affinity)
                        </button>
                    </div>
                </div>

                {/* Heatmap Grid */}
                {/* 25x25 grid */}
                <div
                    className="grid gap-[1px] bg-slate-900 p-1 rounded-lg border border-white/10 mx-auto max-w-[600px]"
                    style={{ gridTemplateColumns: 'repeat(25, 1fr)' }}
                >
                    {/* We need to render row by row, col by col */}
                    {Array.from({ length: 25 }, (_, row) => (
                        Array.from({ length: 25 }, (_, col) => {
                            const val = matrix[row][col];
                            // For visualization: 
                            // Matrix A (Time): Row (From) -> Col (To).
                            // Matrix B (Space): Number (Row) & Number (Col).

                            // Let's create a tooltip text
                            let tooltipStr = "";
                            if (viewMode === 'time') {
                                tooltipStr = `P(${col + 1} | ${row + 1}) = ${(val * 100).toFixed(1)}%`;
                            } else {
                                tooltipStr = `Co-occur: ${val} times`;
                            }

                            return (
                                <HeatmapCell
                                    key={`${row}-${col}`}
                                    value={normalize(val)}
                                    label="" // Too small for labels likely? Or maybe on hover
                                    tooltip={tooltipStr}
                                />
                            );
                        })
                    )).flat()}
                </div>

                <div className="mt-4 flex justify-center items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[hsl(240,70%,50%)] rounded-sm"></div> Low Prob
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[hsl(0,70%,50%)] rounded-sm"></div> High Prob
                    </div>
                    <div className="ml-4 flex items-center gap-1 text-gray-600">
                        <Info className="w-3 h-3" />
                        {viewMode === 'time' ? 'Rows = Input, Cols = Output' : 'Symmetric Co-occurrence'}
                    </div>
                </div>
            </div>

        </div>
    );
}
