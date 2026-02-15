# train_walking_milestones.py
"""
Training script for Deep Neural Network on childdevdata walking milestones
Target: Predict walking onset from longitudinal growth data
Dataset: https://github.com/D-score/childdevdata
"""

import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, confusion_matrix
import matplotlib.pyplot as plt
from pathlib import Path
import warnings

warnings.filterwarnings("ignore")

# Set device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")


class WalkingMilestoneDataset(Dataset):
    """Custom dataset for longitudinal walking milestone data"""

    def __init__(self, df, scaler=None, label_encoder=None, seq_len=12):
        self.seq_len = seq_len

        # Features: age_months, weight_z, length_z, headcirc_z, motor_milestones
        feature_cols = [
            "age_months",
            "weight_z",
            "length_z",
            "headcirc_z",
            "rolls_over",
            "sits_no_support",
            "stands_support",
        ]

        self.X = df[feature_cols].fillna(0).values
        self.y = (df["walking_alone"] == 1).astype(int).values

        # Normalize features
        if scaler is None:
            self.scaler = StandardScaler()
            self.X = self.scaler.fit_transform(self.X)
        else:
            self.scaler = scaler
            self.X = self.scaler.transform(self.X)

        # Encode labels
        if label_encoder is None:
            self.label_encoder = LabelEncoder()
            self.y = self.label_encoder.fit_transform(self.y)
        else:
            self.label_encoder = label_encoder
            self.y = self.label_encoder.transform(self.y)

        # Create sequences for longitudinal data
        self.sequences = self._create_sequences()

    def _create_sequences(self):
        """Create fixed-length sequences from longitudinal data"""
        sequences = []
        for i in range(len(self.X) - self.seq_len + 1):
            seq = self.X[i : i + self.seq_len]
            label = self.y[i + self.seq_len - 1]
            sequences.append((seq, label))
        return sequences

    def __len__(self):
        return len(self.sequences)

    def __getitem__(self, idx):
        seq, label = self.sequences[idx]
        return (torch.FloatTensor(seq), torch.LongTensor([label]))


class WalkingMilestoneLSTM(nn.Module):
    """LSTM + Dense classifier for walking milestone prediction"""

    def __init__(self, input_size=7, hidden_size=128, num_layers=2, dropout=0.3):
        super(WalkingMilestoneLSTM, self).__init__()

        self.lstm = nn.LSTM(
            input_size,
            hidden_size,
            num_layers,
            batch_first=True,
            dropout=dropout,
            bidirectional=True,
        )
        self.dropout = nn.Dropout(dropout)
        self.fc1 = nn.Linear(hidden_size * 2, 64)
        self.fc2 = nn.Linear(64, 32)
        self.fc3 = nn.Linear(32, 1)
        self.relu = nn.ReLU()
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        # x shape: (batch, seq_len, features)
        lstm_out, (h_n, c_n) = self.lstm(x)

        # Use last output or mean pool
        pooled = torch.mean(lstm_out, dim=1)
        x = self.dropout(pooled)

        x = self.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.relu(self.fc2(x))
        x = self.dropout(x)
        x = self.sigmoid(self.fc3(x))

        return x


def load_childdevdata():
    """Load and preprocess childdevdata walking milestones.

    Note: Download from https://github.com/D-score/childdevdata
    For demo, create synthetic data matching schema.
    """
    np.random.seed(42)
    n_samples = 5000

    # Generate longitudinal data per child (6-24 months)
    data = []
    for child_id in range(1000):
        for month in range(6, 25):
            row = {
                "child_id": child_id,
                "age_months": month,
                "sex": np.random.choice([0, 1]),
                "weight_z": np.random.normal(0, 1),
                "length_z": np.random.normal(0, 1),
                "headcirc_z": np.random.normal(0, 1),
                # Motor milestones (cumulative)
                "rolls_over": 1 if month >= 4 else 0,
                "sits_no_support": 1 if month >= 6 else 0,
                "stands_support": 1 if month >= 9 else 0,
                "walking_alone": 1 if month >= 12 + np.random.poisson(3) else 0,
            }
            data.append(row)

    df = pd.DataFrame(data)
    print(
        f"Generated {len(df)} longitudinal records for {df['child_id'].nunique()} children"
    )
    return df


def train_model():
    """Complete training pipeline"""

    # 1. Load and prepare data
    print("📥 Loading child development data...")
    df = load_childdevdata()

    # Split by child_id to avoid leakage
    train_childs, test_childs = train_test_split(
        df["child_id"].unique(), test_size=0.2, random_state=42
    )
    train_df = df[df["child_id"].isin(train_childs)]
    test_df = df[df["child_id"].isin(test_childs)]

    # Create datasets - fit scaler/encoder on train only
    train_dataset = WalkingMilestoneDataset(train_df, scaler=None, label_encoder=None)
    scaler = train_dataset.scaler
    label_encoder = train_dataset.label_encoder

    test_dataset = WalkingMilestoneDataset(test_df, scaler=scaler, label_encoder=label_encoder)

    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False)

    # 2. Initialize model
    model = WalkingMilestoneLSTM(input_size=7).to(device)
    criterion = nn.BCELoss()
    optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=0.01)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5)

    # 3. Training loop
    print("🚀 Starting training...")
    history = {"train_loss": [], "val_loss": [], "val_auc": []}

    best_auc = 0
    patience_counter = 0

    output_dir = Path(__file__).resolve().parent
    best_path = output_dir / "best_walking_model.pth"

    for epoch in range(50):
        # Training
        model.train()
        train_loss = 0
        for X_batch, y_batch in train_loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device).float()

            optimizer.zero_grad()
            outputs = model(X_batch).squeeze()
            loss = criterion(outputs, y_batch)
            loss.backward()

            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            train_loss += loss.item()

        # Validation
        model.eval()
        val_loss = 0
        y_true, y_pred, y_scores = [], [], []

        with torch.no_grad():
            for X_batch, y_batch in test_loader:
                X_batch, y_batch = X_batch.to(device), y_batch.to(device).float()
                outputs = model(X_batch).squeeze()
                loss = criterion(outputs, y_batch)
                val_loss += loss.item()

                y_true.extend(y_batch.cpu().numpy())
                y_pred.extend((outputs > 0.5).cpu().numpy())
                y_scores.extend(outputs.cpu().numpy())

        # Metrics
        train_loss /= len(train_loader)
        val_loss /= len(test_loader)
        auc = roc_auc_score(y_true, y_scores)

        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["val_auc"].append(auc)

        scheduler.step(val_loss)

        print(f"Epoch {epoch+1:2d}: Train={train_loss:.4f}, Val={val_loss:.4f}, AUC={auc:.4f}")

        # Early stopping
        if auc > best_auc:
            best_auc = auc
            torch.save(model.state_dict(), best_path)
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= 10:
                print("Early stopping")
                break

    # 4. Final evaluation
    model.load_state_dict(torch.load(best_path))
    model.eval()

    y_true_final, y_pred_final, y_scores_final = [], [], []
    with torch.no_grad():
        for X_batch, y_batch in test_loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device).float()
            outputs = model(X_batch).squeeze()

            y_true_final.extend(y_batch.cpu().numpy())
            y_pred_final.extend((outputs > 0.5).cpu().numpy())
            y_scores_final.extend(outputs.cpu().numpy())

    # Detailed metrics
    accuracy = accuracy_score(y_true_final, y_pred_final)
    auc_final = roc_auc_score(y_true_final, y_scores_final)

    print("\n" + "=" * 50)
    print("FINAL RESULTS")
    print("=" * 50)
    print(f"Accuracy: {accuracy:.4f}")
    print(f"AUC-ROC:  {auc_final:.4f}")
    print(f"Best AUC: {best_auc:.4f}")

    # Confusion matrix
    cm = confusion_matrix(y_true_final, y_pred_final)
    print(f"Confusion Matrix:\n{cm}")

    # Save model and scaler
    complete_path = output_dir / "walking_milestone_model_complete.pth"
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "scaler": scaler,
            "label_encoder": label_encoder,
            "history": history,
        },
        complete_path,
    )

    # Plot training curves
    plot_training_history(history, output_dir)

    return model, scaler, label_encoder, history


def plot_training_history(history, output_dir=None):
    """Plot training/validation curves"""
    output_dir = output_dir or Path(".")
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))

    ax1.plot(history["train_loss"], label="Train Loss")
    ax1.plot(history["val_loss"], label="Val Loss")
    ax1.set_title("Loss")
    ax1.legend()

    ax2.plot(history["val_auc"], label="Val AUC")
    ax2.set_title("AUC-ROC")
    ax2.legend()

    plt.tight_layout()
    plt.savefig(output_dir / "training_curves.png", dpi=300, bbox_inches="tight")
    plt.close()


def predict_walking_age(model_path, new_data):
    """Predict walking onset probability for new child data"""
    checkpoint = torch.load(model_path, map_location=device)
    model = WalkingMilestoneLSTM().to(device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    scaler = checkpoint["scaler"]
    feature_cols = [
        "age_months",
        "weight_z",
        "length_z",
        "headcirc_z",
        "rolls_over",
        "sits_no_support",
        "stands_support",
    ]
    X_scaled = scaler.transform(new_data[feature_cols])

    with torch.no_grad():
        # Add batch and sequence dims: (n, 7) -> (n, 1, 7)
        X_tensor = torch.FloatTensor(X_scaled).unsqueeze(1).to(device)
        prob = model(X_tensor).cpu().numpy()

    return prob


if __name__ == "__main__":
    model, scaler, le, history = train_model()
    print("\n✅ Training complete! Model saved as 'walking_milestone_model_complete.pth'")
