import React from 'react';
import { Clock, Database, Brain, Zap } from 'lucide-react';
import { format } from 'date-fns';

const PredictionRow = ({ label, icon: Icon, numbers, actualBalls, color, isFuture, labelColor }) => {
    if (!numbers || numbers.length === 0) return null;

    // Calculate stats
    const matches = !isFuture ? actualBalls.filter(b => numbers.includes(b)) : [];
    const successRate = !isFuture && actualBalls.length > 0
        ? Math.round((matches.length / actualBalls.length) * 100)
        : 0;

    return (
        <div className="flex items-center gap-3">
            <div className="w-[120px] flex items-center gap-1.5 shrink-0">
                <Icon className={`w-3 h-3 ${labelColor}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${labelColor}`}>{label}:</span>
            </div>

            <div className="flex gap-1.5 flex-wrap flex-grow">
                {numbers.slice(0, 10).map((ball, i) => { // Limit to 10 for display
                    const isMatch = !isFuture && actualBalls.includes(ball);
                    return (
                        <span key={i} className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold backdrop-blur-sm transition-all
                            ${isMatch
                                ? `bg-${color}-500/20 border-${color}-500 text-${color}-300 shadow-[0_0_8px_rgba(255,255,255,0.2)]`
                                : `bg-${color}-500/5 border-${color}-500/20 text-${color}-400/70`
                            } border`}>
                            {ball}
                        </span>
                    );
                })}
            </div>

            {!isFuture && (
                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border min-w-[60px] text-center
                    ${successRate >= 50 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        successRate >= 30 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                            'bg-gray-700 text-gray-400 border-gray-600'}`}>
                    {successRate}%
                </span>
            )}
        </div>
    );
};

const HistoryTable = ({ draws, nextDrawPrediction }) => {
    // Construct the display list
    let displayDraws = [...(draws || [])];

    // If we have a next prediction, add a "Future" draw at the top
    if (nextDrawPrediction) {
        // Determine unified structure or legacy
        const statNums = nextDrawPrediction.statistical ? nextDrawPrediction.statistical.numbers : (nextDrawPrediction.numbers || []);
        const algoNums = nextDrawPrediction.algorithmic ? nextDrawPrediction.algorithmic.numbers : [];

        if (statNums.length > 0 || algoNums.length > 0) {
            // Calculate a rough "next hour" for display
            const now = new Date();
            const nextHour = new Date(now);
            nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
            const timeString = nextHour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
            const dateString = nextHour.toLocaleDateString('fr-CA'); // YYYY-MM-DD

            const futureDraw = {
                id: 'future',
                draw_id: 'PENDING',
                date: dateString,
                time: timeString,
                balls_list: [], // No winning numbers yet
                bonus_letter: '?',
                source: 'ai',
                isFuture: true,
                prediction: nextDrawPrediction // Pass unified object
            };
            displayDraws = [futureDraw, ...displayDraws];
        }
    }

    if (!displayDraws || displayDraws.length === 0) return null;

    return (
        <div className="w-full max-w-4xl mx-auto">

            {/* Desktop Table View */}
            <div className="hidden md:block glass-card overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-400" />
                        History Log
                    </h3>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        Live Sync
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-gray-400 text-xs uppercase bg-black/20">
                                <th className="p-4 font-medium w-32">Time</th>
                                <th className="p-4 font-medium w-20">Draw</th>
                                <th className="p-4 font-medium min-w-[300px]">
                                    Results & Predictions
                                </th>
                                <th className="p-4 font-medium text-center w-20">Bonus</th>
                                <th className="p-4 font-medium text-right w-24">Source</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {displayDraws.map((draw, idx) => {
                                const pred = draw.prediction || {};
                                // Handle Unified vs Legacy
                                let statNumbers = [];
                                let algoNumbers = [];

                                if (pred.statistical) {
                                    statNumbers = pred.statistical.numbers || [];
                                    algoNumbers = pred.algorithmic ? pred.algorithmic.numbers : [];
                                } else {
                                    // Legacy flat format
                                    statNumbers = pred.numbers || [];
                                }

                                const isFuture = draw.isFuture;

                                return (
                                    <tr
                                        key={draw.id}
                                        className={`border-b border-white/5 hover:bg-white/5 transition-colors 
                                            ${isFuture ? 'bg-purple-500/10 border-purple-500/30' : idx === 0 ? 'bg-blue-500/10' : ''}`}
                                    >
                                        <td className="p-4 whitespace-nowrap text-gray-300 align-top">
                                            <div className="font-bold">{draw.time}</div>
                                            <div className="text-xs text-gray-500">{draw.date}</div>
                                            {isFuture && <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold">NEXT</span>}
                                        </td>
                                        <td className="p-4 font-mono text-gray-400 align-top">#{draw.draw_id}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-3">
                                                {/* Actual Results */}
                                                <div className="flex gap-1 flex-wrap items-center min-h-[24px]">
                                                    {!isFuture ? (
                                                        draw.balls_list.map((ball, i) => {
                                                            // Check matches
                                                            const matchStat = statNumbers.includes(ball);
                                                            const matchAlgo = algoNumbers.includes(ball);

                                                            let className = "bg-white/5 border border-white/10 text-gray-400 shadow-none"; // Default no match

                                                            if (matchStat && matchAlgo) {
                                                                // Both - Gold/Amber Neon
                                                                className = "bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)] font-bold";
                                                            } else if (matchStat) {
                                                                // Stat Only - Purple Neon
                                                                className = "bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.4)] font-bold";
                                                            } else if (matchAlgo) {
                                                                // Algo Only - Blue Neon
                                                                className = "bg-blue-500/20 border-blue-500 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.4)] font-bold";
                                                            }

                                                            return (
                                                                <span key={i} className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs backdrop-blur-sm transition-all ${className}`}>
                                                                    {ball}
                                                                </span>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-gray-500 italic text-xs">Waiting for draw...</span>
                                                    )}
                                                </div>

                                                <div className="h-px bg-white/5 w-full"></div>

                                                {/* Predictions */}
                                                <div className="flex flex-col gap-2">
                                                    <PredictionRow
                                                        label="Statistical"
                                                        icon={Brain}
                                                        numbers={statNumbers}
                                                        actualBalls={draw.balls_list}
                                                        isFuture={isFuture}
                                                        color="purple"
                                                        labelColor="text-purple-400"
                                                    />
                                                    <PredictionRow
                                                        label="Algorithmic"
                                                        icon={Zap}
                                                        numbers={algoNumbers}
                                                        actualBalls={draw.balls_list}
                                                        isFuture={isFuture}
                                                        color="blue"
                                                        labelColor="text-blue-400"
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center font-bold text-yellow-500 align-top pt-5">
                                            {draw.bonus_letter}
                                        </td>
                                        <td className="p-4 text-right align-top pt-5">
                                            <span className={`px-2 py-1 rounded text-xs ${isFuture ? 'bg-purple-500/20 text-purple-300' : draw.source === 'scrape' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-700/50 text-gray-500'}`}>
                                                {isFuture ? 'AI' : draw.source === 'scrape' ? 'LIVE' : 'CSV'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col gap-4">
                {displayDraws.map((draw, idx) => {
                    const pred = draw.prediction || {};
                    let statNumbers = [];
                    let algoNumbers = [];

                    if (pred.statistical) {
                        statNumbers = pred.statistical.numbers || [];
                        algoNumbers = pred.algorithmic ? pred.algorithmic.numbers : [];
                    } else {
                        statNumbers = pred.numbers || [];
                    }
                    const isFuture = draw.isFuture;

                    return (
                        <div key={draw.id} className={`glass-card p-4 
                             ${isFuture ? 'border-2 border-purple-500/30 bg-purple-500/5' : idx === 0 ? 'border-l-4 border-l-blue-500' : ''}`}>

                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-mono text-gray-400">#{draw.draw_id}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${isFuture ? 'bg-purple-500/20 text-purple-300' : draw.source === 'scrape' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-700/50 text-gray-500'}`}>
                                            {isFuture ? 'NEXT' : draw.source === 'scrape' ? 'LIVE' : 'CSV'}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-300">
                                        {draw.time} <span className="text-xs text-gray-500">{draw.date}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-yellow-500">{draw.bonus_letter}</div>
                                </div>
                            </div>

                            {/* Results */}
                            {!isFuture ? (
                                <div className="flex flex-wrap gap-1.5 justify-center bg-black/20 p-2 rounded-lg mb-4">
                                    {draw.balls_list.map((ball, i) => {
                                        const isMatch = statNumbers.includes(ball) || algoNumbers.includes(ball);
                                        return (
                                            <span key={i} className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-medium border ${isMatch ? 'bg-amber-500 text-black border-amber-500 font-bold shadow-lg shadow-amber-500/20' : 'bg-white/10 border-white/10'}`}>
                                                {ball}
                                            </span>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-black/20 p-4 rounded-lg mb-4 text-center text-gray-500 italic text-xs">
                                    Waiting for draw results...
                                </div>
                            )}

                            {/* Predictions */}
                            {(statNumbers.length > 0 || algoNumbers.length > 0) && (
                                <div className="flex flex-col gap-2 bg-white/5 p-2 rounded-lg">
                                    <PredictionRow
                                        label="Statistical"
                                        icon={Brain}
                                        numbers={statNumbers}
                                        actualBalls={draw.balls_list}
                                        isFuture={isFuture}
                                        color="purple"
                                        labelColor="text-purple-400"
                                    />
                                    <PredictionRow
                                        label="Algorithmic"
                                        icon={Zap}
                                        numbers={algoNumbers}
                                        actualBalls={draw.balls_list}
                                        isFuture={isFuture}
                                        color="blue"
                                        labelColor="text-blue-400"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HistoryTable;
