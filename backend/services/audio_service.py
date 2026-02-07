import os
import json
import wave
import tempfile
import numpy as np
import joblib
import warnings
try:
    from sklearn.exceptions import InconsistentVersionWarning
    warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
except Exception:
    pass

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'audio_fault_model.joblib')

class AudioService:
    def __init__(self):
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError("audio_fault_model.joblib not found")
        self.model = joblib.load(MODEL_PATH)

    def _read_wav(self, file_path):
        with wave.open(file_path, 'rb') as wf:
            sr = wf.getframerate()
            n = wf.getnframes()
            audio = wf.readframes(n)
            samples = np.frombuffer(audio, dtype=np.int16).astype(np.float32)
            if wf.getnchannels() > 1:
                samples = samples.reshape(-1, wf.getnchannels()).mean(axis=1)
            # Normalize
            if samples.size > 0:
                samples = samples / (np.max(np.abs(samples)) + 1e-6)
            return samples, sr

    def _resample(self, x, sr, target_sr=16000):
        if sr == target_sr:
            return x, sr
        # Simple linear resampling
        duration = len(x) / float(sr)
        t_old = np.linspace(0, duration, num=len(x), endpoint=False)
        t_new = np.linspace(0, duration, num=int(duration * target_sr), endpoint=False)
        y = np.interp(t_new, t_old, x)
        return y.astype(np.float32), target_sr

    def _mel_filterbank(self, n_mels, n_fft, sr, fmin=0.0, fmax=None):
        if fmax is None:
            fmax = sr / 2.0
        def hz_to_mel(hz):
            return 2595.0 * np.log10(1.0 + hz / 700.0)
        def mel_to_hz(mel):
            return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)

        mel_min = hz_to_mel(fmin)
        mel_max = hz_to_mel(fmax)
        mel_points = np.linspace(mel_min, mel_max, n_mels + 2)
        hz_points = mel_to_hz(mel_points)
        bins = np.floor((n_fft + 1) * hz_points / sr).astype(int)

        fb = np.zeros((n_mels, n_fft // 2 + 1))
        for m in range(1, n_mels + 1):
            f_m_minus = bins[m - 1]
            f_m = bins[m]
            f_m_plus = bins[m + 1]
            if f_m_minus == f_m:
                f_m = f_m_minus + 1
            for k in range(f_m_minus, f_m):
                fb[m - 1, k] = (k - f_m_minus) / (f_m - f_m_minus + 1e-9)
            for k in range(f_m, f_m_plus):
                fb[m - 1, k] = (f_m_plus - k) / (f_m_plus - f_m + 1e-9)
        return fb

    def _stft(self, x, n_fft, hop_length, win_length):
        if len(x) < win_length:
            x = np.pad(x, (0, win_length - len(x)))
        window = np.hanning(win_length)
        frames = []
        for start in range(0, len(x) - win_length + 1, hop_length):
            frame = x[start:start + win_length] * window
            spec = np.fft.rfft(frame, n=n_fft)
            frames.append(np.abs(spec) ** 2)
        if not frames:
            return np.empty((0, n_fft // 2 + 1), dtype=np.float32)
        return np.vstack(frames)

    def _yamnet_features(self, samples, sr):
        # YAMNet-like log-mel features (64 mel bands)
        n_fft = 512
        win_length = int(sr * 0.025)
        hop_length = int(sr * 0.010)
        spec = self._stft(samples, n_fft, hop_length, win_length)
        if spec.shape[0] == 0:
            return np.zeros(128, dtype=np.float32)
        mel_fb = self._mel_filterbank(64, n_fft, sr)
        mel_spec = np.dot(spec, mel_fb.T)
        log_mel = np.log(mel_spec + 1e-6)

        mel_mean = log_mel.mean(axis=0)
        mel_std = log_mel.std(axis=0)

        # Additional simple features
        rms = np.sqrt(spec.mean(axis=1) + 1e-9)
        centroid = (spec * np.arange(spec.shape[1])).sum(axis=1) / (spec.sum(axis=1) + 1e-9)
        zcr = np.mean(np.abs(np.diff(np.sign(samples)))) / 2.0

        extras = np.array([rms.mean(), rms.std(), centroid.mean(), centroid.std(), zcr], dtype=np.float32)
        feats = np.concatenate([mel_mean, mel_std, extras], axis=0)
        return feats.astype(np.float32)

    def predict_from_file(self, file_path):
        samples, sr = self._read_wav(file_path)
        samples, sr = self._resample(samples, sr, target_sr=16000)
        feats = self._yamnet_features(samples, sr).reshape(1, -1)

        # Align feature size with model if needed
        n_expected = getattr(self.model, "n_features_in_", feats.shape[1])
        if feats.shape[1] < n_expected:
            pad = np.zeros((1, n_expected - feats.shape[1]), dtype=np.float32)
            feats = np.hstack([feats, pad])
        elif feats.shape[1] > n_expected:
            feats = feats[:, :n_expected]

        if hasattr(self.model, "predict_proba"):
            proba = self.model.predict_proba(feats)[0]
            pred = int(np.argmax(proba))
            score = float(np.max(proba))
        else:
            pred = int(self.model.predict(feats)[0])
            score = 0.5

        return {
            "prediction": pred,
            "confidence": score,
            "feature_size": int(feats.shape[1])
        }

    def analyze_upload(self, file_storage):
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        file_storage.save(tmp.name)
        try:
            return self.predict_from_file(tmp.name)
        finally:
            try:
                os.unlink(tmp.name)
            except Exception:
                pass
