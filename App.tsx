/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader, useProgress } from '@react-three/drei';
import { GameStatus, NoteData } from './types';
import { DEMO_CHART, SONG_URL, SONG_BPM, HIT_SOUND_URL, generateRandomChart } from './constants';
import { useMediaPipe } from './hooks/useMediaPipe';
import GameScene from './components/GameScene';
import WebcamPreview from './components/WebcamPreview';
import { Play, RefreshCw, VideoOff, Hand, Sparkles, Upload } from 'lucide-react';

const App: React.FC = () => {
    const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.LOADING);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [multiplier, setMultiplier] = useState(1);
    const [health, setHealth] = useState(100);

    const [audioSrc, setAudioSrc] = useState(SONG_URL);
    const [chart, setChart] = useState<NoteData[]>(DEMO_CHART);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [isZenMode, setIsZenMode] = useState(false);

    // Audio Analysis State
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

    const audioRef = useRef<HTMLAudioElement>(new Audio(SONG_URL));
    const videoRef = useRef<HTMLVideoElement>(null);

    // Now getting lastResultsRef from the hook
    const { isCameraReady, handPositionsRef, lastResultsRef, error: cameraError } = useMediaPipe(videoRef);
    const { progress } = useProgress();

    // Game Logic Handlers
    const handleNoteHit = useCallback((note: NoteData, goodCut: boolean) => {
        let points = 100;
        if (goodCut) points += 50;

        // Sound effect
        const hitSound = new Audio(HIT_SOUND_URL);
        hitSound.volume = 0.4;
        hitSound.play().catch(() => { });

        // Haptic feedback for impact
        if (navigator.vibrate) {
            navigator.vibrate(goodCut ? 40 : 20);
        }

        setCombo(c => {
            const newCombo = c + 1;
            if (newCombo > 30) setMultiplier(8);
            else if (newCombo > 20) setMultiplier(4);
            else if (newCombo > 10) setMultiplier(2);
            else setMultiplier(1);
            return newCombo;
        });

        setScore(s => s + (points * multiplier));
        setHealth(h => Math.min(100, h + 2));
    }, [multiplier]);

    const handleNoteMiss = useCallback((note: NoteData) => {
        setCombo(0);
        setMultiplier(1);
        if (!isZenMode) {
            setHealth(h => {
                const newHealth = h - 10;
                if (newHealth <= 0) {
                    setTimeout(() => endGame(false), 0);
                    return 0;
                }
                return newHealth;
            });
        }
    }, [isZenMode]);

    const startGame = async () => {
        if (!isCameraReady) return;

        setScore(0);
        setCombo(0);
        setMultiplier(1);
        setHealth(100);

        // Reset hit/miss status for current chart
        const resetChart = chart.map(n => ({ ...n, hit: false, missed: false }));
        setChart(resetChart);

        try {
            if (audioRef.current) {
                // Ensure context is running (browser policy)
                if (audioContext && audioContext.state === 'suspended') {
                    await audioContext.resume();
                } else if (!audioContext) {
                    // Init if not yet done (e.g. default song)
                    const ctx = setupAudioAnalyzer(audioRef.current);
                    if (ctx.state === 'suspended') await ctx.resume();
                }

                audioRef.current.currentTime = 0;
                await audioRef.current.play();
                setGameStatus(GameStatus.PLAYING);
            }
        } catch (e) {
            console.error("Audio play failed", e);
            alert("Could not start audio. Please interact with the page first.");
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoadingAudio(true);
        const url = URL.createObjectURL(file);
        setAudioSrc(url);

        // Load audio to get duration
        const tempAudio = new Audio(url);
        tempAudio.onloadedmetadata = () => {
            const duration = tempAudio.duration;
            if (duration === Infinity || isNaN(duration)) {
                // Fallback if metadata fails - usually waiting helps or we guess
                // Try seeking to end
                tempAudio.currentTime = 1e6;
            } else {
                finalizeUpload(url, duration);
            }
        };
        // Fallback for duration fix (seek hack)
        tempAudio.ontimeupdate = () => {
            if (tempAudio.duration !== Infinity && !isNaN(tempAudio.duration)) {
                finalizeUpload(url, tempAudio.duration);
                tempAudio.ontimeupdate = null; // Remove handler
            }
        };
    };

    const setupAudioAnalyzer = (audioElement: HTMLAudioElement) => {
        if (!audioContext) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const anal = ctx.createAnalyser();
            anal.fftSize = 256;

            // Connect
            const source = ctx.createMediaElementSource(audioElement);
            source.connect(anal);
            anal.connect(ctx.destination);

            sourceNodeRef.current = source;
            setAudioContext(ctx);
            setAnalyser(anal);
            return ctx;
        }
        return audioContext;
    };

    const finalizeUpload = (url: string, duration: number) => {
        console.log(`Loaded song: ${duration}s`);
        const newChart = generateRandomChart(duration);
        setChart(newChart);

        // Update global audio ref
        if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.crossOrigin = "anonymous"; // Enable CORS for analysis if needed
            audioRef.current.load();

            // Re-setup analyzer if needed (usually persist, but context might need resume)
            if (!audioContext) {
                setupAudioAnalyzer(audioRef.current);
            }
        }

        setIsLoadingAudio(false);
    };

    const endGame = (victory: boolean) => {
        setGameStatus(victory ? GameStatus.VICTORY : GameStatus.GAME_OVER);
        if (audioRef.current) {
            audioRef.current.pause();
        }
    };

    useEffect(() => {
        if (gameStatus === GameStatus.LOADING && isCameraReady) {
            setGameStatus(GameStatus.IDLE);
        }
    }, [isCameraReady, gameStatus]);

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
            {/* Hidden Video for Processing */}
            <video
                ref={videoRef}
                className="absolute opacity-0 pointer-events-none"
                playsInline
                muted
                autoPlay
                style={{ width: '640px', height: '480px' }}
            />

            {/* 3D Canvas */}
            <Canvas shadows dpr={[1, 1.5]}>
                {gameStatus !== GameStatus.LOADING && (
                    <GameScene
                        gameStatus={gameStatus}
                        audioRef={audioRef}
                        analyser={analyser}
                        handPositionsRef={handPositionsRef}
                        chart={chart}
                        onNoteHit={handleNoteHit}
                        onNoteMiss={handleNoteMiss}
                        onSongEnd={() => endGame(true)}
                    />
                )}
            </Canvas>

            {/* Webcam Mini-Map Preview */}
            <WebcamPreview
                videoRef={videoRef}
                resultsRef={lastResultsRef}
                isCameraReady={isCameraReady}
            />

            {/* UI Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">

                {/* HUD (Top) */}
                <div className="flex justify-between items-start text-white w-full">
                    {/* Health Bar */}
                    <div className="w-1/3 max-w-xs">
                        <div className="h-4 bg-gray-800 rounded-full overflow-hidden border-2 border-gray-700">
                            <div
                                className={`h-full transition-all duration-300 ease-out ${health > 50 ? 'bg-green-500' : health > 20 ? 'bg-yellow-500' : 'bg-red-600'}`}
                                style={{ width: `${health}%` }}
                            />
                        </div>
                        <p className="text-xs mt-1 opacity-70">
                            {isZenMode ? "ZEN MODE ACTIVE" : "System Integrity"}
                        </p>
                    </div>

                    {/* Score & Combo */}
                    <div className="text-center">
                        <h1 className="text-5xl font-black tracking-wider neon-text-blue italic">
                            {score.toLocaleString()}
                        </h1>
                        <div className="mt-2 flex flex-col items-center">
                            <p className={`text-2xl font-bold ${combo > 10 ? 'text-blue-400 scale-110' : 'text-gray-300'} transition-all`}>
                                {combo}x COMBO
                            </p>
                            {multiplier > 1 && (
                                <span className="text-sm px-2 py-1 bg-blue-900 rounded-full mt-1 animate-pulse">
                                    {multiplier}x Multiplier!
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="w-1/3"></div>
                </div>

                {/* Menus (Centered) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">

                    {gameStatus === GameStatus.LOADING && (
                        <div className="bg-black/80 p-10 rounded-2xl flex flex-col items-center border border-blue-900/50 backdrop-blur-md">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-6"></div>
                            <h2 className="text-2xl text-white font-bold mb-2">Initializing System</h2>
                            <p className="text-blue-300">{!isCameraReady ? "Waiting for camera..." : "Loading assets..."}</p>
                            {cameraError && <p className="text-red-500 mt-4 max-w-xs text-center">{cameraError}</p>}
                        </div>
                    )}

                    {gameStatus === GameStatus.IDLE && (
                        <div className="bg-black/80 p-12 rounded-3xl text-center border-2 border-blue-500/30 backdrop-blur-xl max-w-lg">
                            <div className="mb-6 flex justify-center">
                                <Sparkles className="w-16 h-16 text-blue-400" />
                            </div>
                            <h1 className="text-7xl font-black text-white mb-6 tracking-tighter italic neon-text-blue">
                                TEMPO <span className="text-blue-500">STRIKE</span>
                            </h1>
                            <div className="space-y-4 text-gray-300 mb-8">
                                <p className="flex items-center justify-center gap-2">
                                    <Hand className="w-5 h-5 text-blue-400" />
                                    <span>Stand back so your hands are visible.</span>
                                </p>
                                <p>Use your <span className="text-red-500 font-bold">LEFT</span> and <span className="text-blue-500 font-bold">RIGHT</span> hands.</p>
                                <p>Slash the <span className="text-white font-bold">Sparks</span> to the beat!</p>
                            </div>

                            {!isCameraReady ? (
                                <div className="flex items-center justify-center text-red-400 gap-2 bg-red-900/20 p-4 rounded-lg">
                                    <VideoOff /> Camera not ready yet.
                                </div>
                            ) : (
                                <button
                                    onClick={startGame}
                                    className="bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold py-4 px-12 rounded-full transition-all transform hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] flex items-center justify-center mx-auto gap-3"
                                >
                                    <Play fill="currentColor" /> START GAME
                                </button>
                            )}

                            <div className="mt-6">
                                <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-white py-2 px-6 rounded-lg flex items-center gap-2 transition-all border border-gray-600">
                                    <Upload size={18} />
                                    <span>Upload MP3</span>
                                    <input
                                        type="file"
                                        accept="audio/mp3,audio/wav,audio/ogg"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={isLoadingAudio}
                                    />
                                </label>
                                {isLoadingAudio && <p className="text-blue-400 text-xs mt-2">Processing Audio...</p>}
                            </div>

                            <div className="mt-4">
                                <label className="flex items-center justify-center gap-2 cursor-pointer text-gray-400 hover:text-white transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={isZenMode}
                                        onChange={(e) => setIsZenMode(e.target.checked)}
                                        className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-bold">ZEN MODE (No Fail)</span>
                                </label>
                            </div>

                        </div>
                    )}

                    {(gameStatus === GameStatus.GAME_OVER || gameStatus === GameStatus.VICTORY) && (
                        <div className="bg-black/90 p-12 rounded-3xl text-center border-2 border-white/10 backdrop-blur-xl">
                            <h2 className={`text-6xl font-bold mb-4 ${gameStatus === GameStatus.VICTORY ? 'text-green-400' : 'text-red-500'}`}>
                                {gameStatus === GameStatus.VICTORY ? "SEQUENCE COMPLETE" : "SYSTEM FAILURE"}
                            </h2>
                            <p className="text-white text-3xl mb-8">Final Score: {score.toLocaleString()}</p>
                            <button
                                onClick={() => setGameStatus(GameStatus.IDLE)}
                                className="bg-white/10 hover:bg-white/20 text-white text-xl py-3 px-8 rounded-full flex items-center justify-center mx-auto gap-2 transition-colors"
                            >
                                <RefreshCw /> Play Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
