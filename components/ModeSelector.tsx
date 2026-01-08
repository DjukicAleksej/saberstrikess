import React from 'react';
import { Difficulty } from '../types';
import { Zap, ShieldCheck } from 'lucide-react';

interface ModeSelectorProps {
    difficulty: Difficulty;
    setDifficulty: (diff: Difficulty) => void;
    isZenMode: boolean;
    setIsZenMode: (isZen: boolean) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ difficulty, setDifficulty, isZenMode, setIsZenMode }) => {
    return (
        <div className="flex flex-col gap-4 w-full max-w-md mx-auto mt-6">
            {/* Difficulty Selection */}
            <div className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-700">
                {(Object.values(Difficulty) as Difficulty[]).map((diff) => (
                    <button
                        key={diff}
                        onClick={() => setDifficulty(diff)}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${difficulty === diff
                                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                    >
                        {diff}
                    </button>
                ))}
            </div>

            {/* Zen Mode Toggle */}
            <button
                onClick={() => setIsZenMode(!isZenMode)}
                className={`flex items-center justify-between w-full p-4 rounded-xl border transition-all duration-300 ${isZenMode
                        ? 'bg-green-900/30 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                        : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isZenMode ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                        {isZenMode ? <ShieldCheck size={20} /> : <Zap size={20} />}
                    </div>
                    <div className="text-left">
                        <h3 className={`font-bold ${isZenMode ? 'text-green-400' : 'text-gray-300'}`}>Zen Mode</h3>
                        <p className="text-xs text-gray-500">No Fail • Relaxed Play</p>
                    </div>
                </div>

                <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isZenMode ? 'bg-green-500' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isZenMode ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
            </button>
        </div>
    );
};

export default ModeSelector;
