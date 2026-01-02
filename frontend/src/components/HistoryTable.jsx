import React from 'react';
import { Clock, Database } from 'lucide-react';
import { format } from 'date-fns';

const HistoryTable = ({ draws }) => {
    if (!draws || draws.length === 0) return null;

    return (
        <div className="glass-card w-full max-w-4xl mx-auto overflow-hidden">
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
                            <th className="p-4 font-medium">Winning Numbers</th>
                            <th className="p-4 font-medium text-center">Bonus</th>
                            <th className="p-4 font-medium text-right">Gain</th>
                            <th className="p-4 font-medium text-right">Source</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {draws.map((draw, idx) => {
                            const predNumbers = draw.prediction?.numbers || [];
                            return (
                                <tr
                                    key={draw.id}
                                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${idx === 0 ? 'bg-blue-500/10' : ''}`}
                                >
                                    <td className="p-4 whitespace-nowrap text-gray-300">
                                        {draw.date} <span className="text-gray-500 text-xs ml-1">{draw.time}</span>
                                    </td>
                                    <td className="p-4 font-mono text-gray-400">#{draw.draw_id}</td>
                                    <td className="p-4">
                                        <div className="flex gap-1 flex-wrap">
                                            {draw.balls_list.map((ball, i) => {
                                                const isMatch = predNumbers.includes(ball);
                                                return (
                                                    <span key={i} className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-medium border ${isMatch ? 'bg-amber-500 text-black border-amber-500 font-bold shadow-lg shadow-amber-500/20' : 'bg-white/10 border-white/10'}`}>
                                                        {ball}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center font-bold text-yellow-500">
                                        {draw.bonus_letter}
                                    </td>
                                    <td className="p-4 text-right">
                                        {draw.gain > 0 ? (
                                            <span className="text-emerald-400 font-bold px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                                                {draw.gain.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                            </span>
                                        ) : (
                                            <span className="text-gray-600">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className={`px-2 py-1 rounded text-xs ${draw.source === 'scrape' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-700/50 text-gray-500'}`}>
                                            {draw.source === 'scrape' ? 'LIVE' : 'CSV'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HistoryTable;
