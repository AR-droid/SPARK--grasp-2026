import React, { useEffect, useRef, useState } from 'react';

const Spectrogram = ({ file, onAnalysis, mode = 'audio' }) => {
    const canvasRef = useRef(null);
    const [bands, setBands] = useState(null);

    useEffect(() => {
        if (!file || !canvasRef.current) return;

        const render = async () => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            let data;
            let sr = 16000;

            if (mode === 'sine') {
                // synthetic sine wave for clear spectrogram bands
                const seconds = 2.5;
                const length = Math.floor(sr * seconds);
                data = new Float32Array(length);
                const freq = 440; // A4 tone
                for (let i = 0; i < length; i++) {
                    data[i] = Math.sin((2 * Math.PI * freq * i) / sr);
                }
            } else if (file) {
                const arrayBuffer = await file.arrayBuffer();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                data = audioBuffer.getChannelData(0);
                sr = audioBuffer.sampleRate;
            } else {
                // fallback to sine if no file provided
                const seconds = 2.0;
                const length = Math.floor(sr * seconds);
                data = new Float32Array(length);
                const freq = 440;
                for (let i = 0; i < length; i++) {
                    data[i] = Math.sin((2 * Math.PI * freq * i) / sr);
                }
            }
            const fftSize = 1024;
            const hop = 512;
            const numFrames = Math.floor((data.length - fftSize) / hop);
            const height = canvas.height;
            const width = canvas.width;

            const windowFn = new Float32Array(fftSize);
            for (let i = 0; i < fftSize; i++) {
                windowFn[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
            }

            // band energy accumulation
            let lowSum = 0;
            let midSum = 0;
            let highSum = 0;
            let frameCount = 0;

            for (let frame = 0; frame < numFrames; frame++) {
                const start = frame * hop;
                const segment = new Float32Array(fftSize);
                for (let i = 0; i < fftSize; i++) {
                    segment[i] = data[start + i] * windowFn[i];
                }
                const spectrum = fft(segment);
                const column = Math.floor((frame / numFrames) * width);
                // Normalize per-frame for visibility
                const maxMag = Math.max(...spectrum) + 1e-9;
                const nyquist = sr / 2;
                for (let y = 0; y < height; y++) {
                    const bin = Math.floor((y / height) * (fftSize / 2));
                    const mag = spectrum[bin] / maxMag;
                    const db = 20 * Math.log10(mag + 1e-6);
                    const norm = Math.min(1, Math.max(0, (db + 60) / 60));
                    // Color map (blue -> yellow -> red)
                    const r = Math.floor(255 * norm);
                    const g = Math.floor(180 * (1 - Math.abs(norm - 0.5) * 2));
                    const b = Math.floor(255 * (1 - norm));
                    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    ctx.fillRect(column, height - y, 1, 1);
                }

                // band energy from spectrum bins
                const binHz = nyquist / (fftSize / 2);
                for (let i = 0; i < spectrum.length; i++) {
                    const hz = i * binHz;
                    if (hz < 300) lowSum += spectrum[i];
                    else if (hz < 2000) midSum += spectrum[i];
                    else if (hz < 8000) highSum += spectrum[i];
                }
                frameCount += 1;
            }

            audioCtx.close();

            if (frameCount > 0) {
                const total = lowSum + midSum + highSum + 1e-9;
                const bandData = {
                    low: lowSum / total,
                    mid: midSum / total,
                    high: highSum / total
                };
                setBands(bandData);
                if (onAnalysis) onAnalysis(bandData);
            }
        };

        const fft = (signal) => {
            const N = signal.length;
            const re = new Float32Array(N);
            const im = new Float32Array(N);
            for (let i = 0; i < N; i++) re[i] = signal[i];
            for (let len = 1; len < N; len <<= 1) {
                const ang = -Math.PI / len;
                const wlenCos = Math.cos(ang);
                const wlenSin = Math.sin(ang);
                for (let i = 0; i < N; i += 2 * len) {
                    let wCos = 1;
                    let wSin = 0;
                    for (let j = 0; j < len; j++) {
                        const uRe = re[i + j];
                        const uIm = im[i + j];
                        const vRe = re[i + j + len] * wCos - im[i + j + len] * wSin;
                        const vIm = re[i + j + len] * wSin + im[i + j + len] * wCos;
                        re[i + j] = uRe + vRe;
                        im[i + j] = uIm + vIm;
                        re[i + j + len] = uRe - vRe;
                        im[i + j + len] = uIm - vIm;
                        const nextCos = wCos * wlenCos - wSin * wlenSin;
                        wSin = wCos * wlenSin + wSin * wlenCos;
                        wCos = nextCos;
                    }
                }
            }
            const mags = new Float32Array(N / 2);
            for (let i = 0; i < N / 2; i++) {
                mags[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
            }
            return mags;
        };

        render();
    }, [file]);

    return (
        <div className="border-2 border-black bg-white p-2">
            <div className="text-[10px] font-mono mb-2 flex items-center justify-between">
                <span className="font-bold uppercase">Sine Spectrogram</span>
                <span className="text-gray-500">A4 · 440 Hz</span>
            </div>
            <div className="rounded-md overflow-hidden border border-black bg-gradient-to-b from-white to-gray-100">
                <canvas ref={canvasRef} width={360} height={120} />
            </div>
            {bands && (
                <div className="mt-2 text-[10px] font-mono space-y-1">
                    <div className="flex items-center justify-between">
                        <span>Low (0-300Hz)</span>
                        <span className="font-bold">{Math.round(bands.low * 100)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span>Mid (300-2kHz)</span>
                        <span className="font-bold">{Math.round(bands.mid * 100)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span>High (2k-8kHz)</span>
                        <span className="font-bold">{Math.round(bands.high * 100)}%</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Spectrogram;
