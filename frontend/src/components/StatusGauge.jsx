import React from 'react';
import { motion } from 'framer-motion';

const StatusGauge = ({ confidence }) => {
    // Color based on confidence
    const getColor = (score) => {
        if (score >= 80) return 'bg-emerald-500';
        if (score >= 50) return 'bg-amber-500';
        return 'bg-rose-500';
    };

    return (
        <div className="glass-panel p-4 flex flex-col items-center justify-center">
            <h3 className="text-sm uppercase tracking-wider text-gray-300 mb-2">Confidence Level</h3>

            <div className="relative w-full h-4 bg-gray-700/50 rounded-full overflow-hidden">
                <motion.div
                    className={`h-full ${getColor(confidence)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${confidence}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                />
            </div>

            <div className="mt-2 text-2xl font-bold font-mono">
                {confidence.toFixed(1)}%
            </div>
        </div>
    );
};

export default StatusGauge;
