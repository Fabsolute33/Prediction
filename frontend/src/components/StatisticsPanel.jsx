import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trophy, TrendingDown, Hourglass, Hash, PieChart } from 'lucide-react';

const StatisticsPanel = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const getApiUrl = () => {
        const url = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        return url.startsWith('http') ? url : `https://${url}`;
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(`${getApiUrl()}/stats`);
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to fetch statistics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div className="text-white text-center p-8">Loading Statistics...</div>;
    if (!stats) return <div className="text-white text-center p-8">Statistics Unavailable</div>;

    const StatCard = ({ title, icon: Icon, children, className = "" }) => (
        <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 ${className}`}>
            <div className="flex items-center gap-2 mb-4 text-gray-400 font-medium uppercase text-xs tracking-wider">
                <Icon className="w-4 h-4" />
                {title}
            </div>
            {children}
        </div>
    );

    const NumberBall = ({ number, value, label, color = "blue" }) => (
        <div className="flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-lg
                ${color === 'purple' ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' : ''}
                ${color === 'red' ? 'bg-gradient-to-br from-red-500 to-orange-600 text-white' : ''}
                ${color === 'emerald' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : ''}
                ${color === 'blue' ? 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white' : ''}
            `}>
                {number}
            </div>
            <div className="text-center">
                <div className="text-lg font-bold text-white">{value}</div>
                <div className="text-xs text-gray-400">{label}</div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Hot Numbers */}
                <StatCard title="Fréquences Élevées (50)" icon={Trophy} className="border-l-4 border-l-purple-500">
                    <div className="flex justify-between items-center px-2">
                        {stats.hot_numbers.map((item, idx) => (
                            <NumberBall
                                key={idx}
                                number={item.number}
                                value={item.count}
                                label="sorties"
                                color="purple"
                            />
                        ))}
                    </div>
                </StatCard>

                {/* Cold Numbers */}
                <StatCard title="Fréquences Faibles (50)" icon={TrendingDown} className="border-l-4 border-l-red-500">
                    <div className="flex justify-between items-center px-2">
                        {stats.cold_numbers.map((item, idx) => (
                            <NumberBall
                                key={idx}
                                number={item.number}
                                value={item.count}
                                label="sorties"
                                color="red"
                            />
                        ))}
                    </div>
                </StatCard>

                {/* Overdue Numbers */}
                <StatCard title="Plus Gros Écarts" icon={Hourglass} className="border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-center px-2">
                        {stats.overdue_numbers.map((item, idx) => (
                            <NumberBall
                                key={idx}
                                number={item.number}
                                value={item.gap}
                                label="tirages"
                                color="emerald"
                            />
                        ))}
                    </div>
                </StatCard>
            </div>

            {/* Letter Stats Removed as per user request */}

            <div className="text-right text-xs text-gray-600">
                Basé sur une analyse de {stats.total_draws} tirages historiques.
            </div>
        </div>
    );
};

export default StatisticsPanel;
