import React from 'react';
import { Clock, Database } from 'lucide-react';
import { format } from 'date-fns';

const HistoryTable = ({ draws, nextDrawPrediction }) => {
    // Construct the display list
    let displayDraws = [...(draws || [])];

    // If we have a next prediction, add a "Future" draw at the top
    if (nextDrawPrediction && nextDrawPrediction.numbers && nextDrawPrediction.numbers.length > 0) {
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
            prediction: {
                numbers: nextDrawPrediction.numbers
            }
        };
        displayDraws = [futureDraw, ...displayDraws];
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
                                <th className="p-4 font-medium">Time</th>
                                <th className="p-4 font-medium">Draw</th>
                                <th className="p-4 font-medium min-w-[300px]">
                                    Winning Numbers
                                    <span className="block text-[10px] text-amber-500 font-normal mt-0.5">Amber = AI Match</span>
                                </th>
                                <th className="p-4 font-medium text-center">Bonus</th>
                                <th className="p-4 font-medium text-right">Gain</th>
                                <th className="p-4 font-medium text-right">Source</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {displayDraws.map((draw, idx) => {
                                const predNumbers = draw.prediction?.numbers || [];
                                const isFuture = draw.isFuture;

                                // Calculate Stats
                                const matches = !isFuture ? draw.balls_list.filter(b => predNumbers.includes(b)) : [];
                                const successRate = !isFuture && draw.balls_list.length > 0
                                    ? Math.round((matches.length / draw.balls_list.length) * 100)
                                    : 0;

                                return (
                                    <tr
                                        key={draw.id}
                                        className={`border-b border-white/5 hover:bg-white/5 transition-colors 
                                            ${isFuture ? 'bg-purple-500/10 border-purple-500/30' : idx === 0 ? 'bg-blue-500/10' : ''}`}
                                    >
                                        <td className="p-4 whitespace-nowrap text-gray-300">
                                            {draw.date} <span className="text-gray-500 text-xs ml-1">{draw.time}</span>
                                            {isFuture && <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold">NEXT</span>}
                                        </td>
                                        <td className="p-4 font-mono text-gray-400">#{draw.draw_id}</td>
                                        <td className="p-4">
                                            {/* Winning Numbers Row */}
                                            <div className="flex gap-1 flex-wrap mb-2 items-center min-h-[24px]">
                                                {!isFuture ? (
                                                    draw.balls_list.map((ball, i) => {
                                                        const isMatch = predNumbers.includes(ball);
                                                        return (
                                                            <span key={i} className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-medium border ${isMatch ? 'bg-amber-500 text-black border-amber-500 font-bold shadow-lg shadow-amber-500/20' : 'bg-white/10 border-white/10'}`}>
                                                                {ball}
                                                            </span>
                                                        );
                                                    })
                                                ) : (
                                                    <span className="text-gray-500 italic text-xs">Waiting for draw...</span>
                                                )}
                                            </div>

                                            {/* AI Prediction Row */}
                                            {predNumbers.length > 0 && (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex gap-1 flex-wrap">
                                                        <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider self-center mr-1">AI:</span>
                                                        {predNumbers.map((ball, i) => {
                                                            const isMatch = !isFuture && draw.balls_list.includes(ball);
                                                            return (
                                                                <span key={i} className={`inline-flex w-5 h-5 items-center justify-center rounded-full text-[10px] font-medium border 
                                                                    ${isMatch ? 'bg-emerald-500 text-black border-emerald-500 font-bold' : 'bg-purple-500/5 border-purple-500/20 text-purple-300/70'}`}>
                                                                    {ball}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                    {!isFuture && (
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border 
                                                            ${successRate >= 50 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                                successRate >= 30 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                                                    'bg-gray-700 text-gray-400 border-gray-600'}`}>
                                                            {successRate}% Found
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-center font-bold text-yellow-500">
                                            {draw.bonus_letter}
                                        </td>
                                        <td className="p-4 text-right">
                                            {!isFuture && draw.gain > 0 ? (
                                                <span className="text-emerald-400 font-bold px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                                                    {draw.gain.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                                </span>
                                            ) : (
                                                <span className="text-gray-600">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
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
                    const predNumbers = draw.prediction?.numbers || [];
                    const isFuture = draw.isFuture;

                    // Same stats logic
                    const matches = !isFuture ? draw.balls_list.filter(b => predNumbers.includes(b)) : [];
                    const successRate = !isFuture && draw.balls_list.length > 0
                        ? Math.round((matches.length / draw.balls_list.length) * 100)
                        : 0;

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
                                    <div className="text-xs">
                                        {!isFuture && draw.gain > 0 ? (
                                            <span className="text-emerald-400 font-bold">
                                                {draw.gain.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                            </span>
                                        ) : (
                                            <span className="text-gray-600">-</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Winning Numbers */}
                            <div className="mb-2 flex justify-between items-end">
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Winning Numbers</span>
                                <span className="text-[10px] text-amber-500">Amber = AI Match</span>
                            </div>

                            {!isFuture ? (
                                <div className="flex flex-wrap gap-1.5 justify-center bg-black/20 p-2 rounded-lg mb-4">
                                    {draw.balls_list.map((ball, i) => {
                                        const isMatch = predNumbers.includes(ball);
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

                            {/* AI Prediction Section */}
                            {predNumbers.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-purple-300 uppercase font-bold tracking-wider">AI Prediction</span>
                                        {!isFuture && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border 
                                                ${successRate >= 50 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                    successRate >= 30 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                                        'bg-gray-700 text-gray-400 border-gray-600'}`}>
                                                {successRate}% Found
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 justify-start bg-purple-900/10 p-2 rounded-lg border border-purple-500/10">
                                        {predNumbers.map((ball, i) => {
                                            const isMatch = !isFuture && draw.balls_list.includes(ball);
                                            return (
                                                <span key={i} className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-[10px] font-medium border 
                                                    ${isMatch ? 'bg-emerald-500 text-black border-emerald-500 font-bold shadow-emerald-500/20' : 'bg-purple-500/10 border-purple-500/30 text-purple-300'}`}>
                                                    {ball}
                                                </span>
                                            );
                                        })}
                                    </div>
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
