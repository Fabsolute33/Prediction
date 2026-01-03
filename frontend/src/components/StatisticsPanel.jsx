import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend } from 'recharts';
import { Trophy, TrendingDown, Hourglass, Hash, PieChart, Info, BarChart3 } from 'lucide-react';

const StatisticsPanel = ({ stats }) => {

    if (!stats) return <div className="text-white text-center p-8">Chargement des statistiques...</div>;
    if (!stats) return <div className="text-white text-center p-8">Statistics Unavailable</div>;

    const StatCard = ({ title, icon: Icon, children, className = "", tooltip }) => (
        <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 md:p-6 ${className}`}>
            <div className="flex items-center justify-between mb-4 text-gray-400 font-medium uppercase text-xs tracking-wider">
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {title}
                </div>
                {tooltip && (
                    <div className="relative group">
                        <Info className="w-4 h-4 cursor-help text-gray-500 hover:text-gray-300 transition-colors" />
                        <div className="absolute right-0 bottom-full mb-2 w-48 md:w-64 p-3 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                            <p className="text-gray-300 text-xs normal-case tracking-normal leading-relaxed text-left">
                                {tooltip}
                            </p>
                        </div>
                    </div>
                )}
            </div>
            {children}
        </div>
    );

    const NumberBall = ({ number, value, label, color = "blue" }) => (
        <div className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-base md:text-lg font-bold shadow-lg
                ${color === 'purple' ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' : ''}
                ${color === 'red' ? 'bg-gradient-to-br from-red-500 to-orange-600 text-white' : ''}
                ${color === 'emerald' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : ''}
                ${color === 'blue' ? 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white' : ''}
            `}>
                {number}
            </div>
            <div className="text-center">
                <div className="text-base md:text-lg font-bold text-white">{value}</div>
                <div className="text-[10px] md:text-xs text-gray-400">{label}</div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {/* Hot Numbers */}
                <StatCard
                    title="Fréquences Élevées (50)"
                    icon={Trophy}
                    className="border-l-4 border-l-purple-500"
                    tooltip="Les numéros les plus souvent tirés lors des 50 derniers tirages. Indique une tendance 'chaude'."
                >
                    <div className="flex justify-between items-center px-2 mobile-scroll-x md:overflow-visible">
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
                <StatCard
                    title="Fréquences Faibles (50)"
                    icon={TrendingDown}
                    className="border-l-4 border-l-red-500"
                    tooltip="Les numéros les moins souvent tirés lors des 50 derniers tirages. Ces numéros sont en 'retrait' statistique."
                >
                    <div className="flex justify-between items-center px-2 mobile-scroll-x md:overflow-visible">
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
                <StatCard
                    title="Plus Gros Écarts"
                    icon={Hourglass}
                    className="border-l-4 border-l-emerald-500"
                    tooltip="Les numéros qui ne sont pas sortis depuis le plus grand nombre de tirages consécutifs."
                >
                    <div className="flex justify-between items-center px-2 mobile-scroll-x md:overflow-visible">
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

            {/* Global Frequency Chart */}
            <StatCard
                title="Fréquence Globale (Historique)"
                icon={BarChart3}
                className="border-t-4 border-t-blue-500"
                tooltip="La fréquence de sortie de chaque numéro sur l'ensemble de l'historique."
            >
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.frequency_all}>
                            <XAxis
                                dataKey="number"
                                stroke="#9ca3af"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                            />
                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                {stats.frequency_all && stats.frequency_all.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`hsl(${210 + (index * 2)}, 80%, 60%)`} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </StatCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Parity Chart */}
                <StatCard
                    title="Parité (Pairs / Impairs)"
                    icon={PieChart}
                    className="border-t-4 border-t-purple-500"
                    tooltip="Répartition entre les numéros pairs et impairs."
                >
                    <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={stats.parity_stats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.parity_stats && stats.parity_stats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#8b5cf6' : '#ec4899'} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#9ca3af' }} />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </StatCard>

                {/* Decades Chart */}
                <StatCard
                    title="Répartition par Dizaine"
                    icon={Hash}
                    className="border-t-4 border-t-emerald-500"
                    tooltip="Répartition des numéros par tranche (1-9, 10-19, 20-25)."
                >
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.decade_stats} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={50} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                    <Cell fill="#10b981" />
                                    <Cell fill="#06b6d4" />
                                    <Cell fill="#3b82f6" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </StatCard>
            </div>

            {/* Letter Stats Removed as per user request */}

            <div className="text-right text-xs text-gray-600">
                Basé sur une analyse de {stats.total_draws} tirages historiques.
            </div>
        </div >
    );
};

export default StatisticsPanel;
