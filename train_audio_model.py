import os
import librosa
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

DATASET_PATH = "data"

X = []
y = []

def extract_features(file_path):
    audio, sr = librosa.load(file_path, sr=None)

    mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
    mfcc_mean = np.mean(mfcc.T, axis=0)

    spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=audio, sr=sr))
    zero_crossing = np.mean(librosa.feature.zero_crossing_rate(audio))

    return np.hstack([mfcc_mean, spectral_centroid, zero_crossing])

for root, dirs, files in os.walk(DATASET_PATH):
    for file in files:
        if file.endswith(".wav"):
            label = file.replace(".wav", "")
            file_path = os.path.join(root, file)

            try:
                features = extract_features(file_path)
                X.append(features)
                y.append(label)
            except Exception as e:
                print("Error:", file_path, e)

X = np.array(X)
y = np.array(y)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"Accuracy: {accuracy*100:.2f}%")

joblib.dump(model, "audio_fault_model.joblib")
print("Model saved as audio_fault_model.joblib")
