"""Per-device Isolation Forest with a data-driven anomaly scale.

Calibration: a fixed threshold on the raw score makes low-variance devices (transformers)
alarm during normal operation. Instead we keep the p50 and p99.5 of the training data's
anomaly scores and map a new score s to clip((s - p99.5) / (p99.5 - p50), 0, 1).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from sklearn.ensemble import IsolationForest

N_ESTIMATORS = 100
EULER_GAMMA = 0.5772156649015329


def _avg_path_length(n: int) -> float:
    """c(n): average path length of an unsuccessful BST search (Liu et al. 2008)."""
    if n <= 1:
        return 0.0
    if n == 2:
        return 1.0
    return 2.0 * (math.log(n - 1.0) + EULER_GAMMA) - 2.0 * (n - 1.0) / n


class _CompiledForest:
    """Fast single-sample scorer equivalent to IsolationForest.score_samples.

    sklearn's score_samples costs ~4 ms per call because of input validation and chunking;
    walking the trees directly costs a fraction of that, which matters at 12 devices x 1 Hz
    and in long simulations.
    """

    def __init__(self, model: IsolationForest) -> None:
        self._trees: list[tuple[list[int], list[int], list[int], list[float], list[float]]] = []
        for est, feats in zip(model.estimators_, model.estimators_features_, strict=True):
            tree = est.tree_
            left = tree.children_left.tolist()
            right = tree.children_right.tolist()
            feature_local = tree.feature.tolist()
            feature = [int(feats[f]) if f >= 0 else -1 for f in feature_local]
            threshold = tree.threshold.tolist()
            depth = [0] * tree.node_count
            for node in range(tree.node_count):  # parents always precede children
                for child in (left[node], right[node]):
                    if child != -1:
                        depth[child] = depth[node] + 1
            # Path length credited when a sample lands in each leaf.
            leaf_len = [
                depth[i] + _avg_path_length(int(tree.n_node_samples[i]))
                for i in range(tree.node_count)
            ]
            self._trees.append((left, right, feature, threshold, leaf_len))
        self._norm = len(self._trees) * _avg_path_length(int(model.max_samples_))

    def score(self, x: list[float]) -> float:
        """Same value as -IsolationForest.score_samples([x])[0] (higher = more anomalous)."""
        total = 0.0
        for left, right, feature, threshold, leaf_len in self._trees:
            node = 0
            while left[node] != -1:
                node = left[node] if x[feature[node]] <= threshold[node] else right[node]
            total += leaf_len[node]
        return float(2.0 ** (-total / self._norm))


@dataclass(frozen=True, slots=True)
class ModelBundle:
    """Everything needed to score; swapped in as one object so readers never see a mix."""

    forest: _CompiledForest
    mean: NDArray[np.float64]
    std: NDArray[np.float64]
    p50: float
    p995: float
    trained_on: int

    def score(self, row: list[float]) -> float:
        """Calibrated anomaly score in [0, 1]."""
        x = [(row[i] - float(self.mean[i])) / float(self.std[i]) for i in range(len(row))]
        s = self.forest.score(x)
        spread = max(self.p995 - self.p50, 1e-9)
        return min(1.0, max(0.0, (s - self.p995) / spread))


def train(rows: NDArray[np.float64], seed: int = 0) -> ModelBundle:
    """Fit on normal samples only. CPU-bound: run it in an executor thread."""
    mean = rows.mean(axis=0)
    std = rows.std(axis=0)
    std = np.where(std < 1e-9, 1.0, std)
    z = (rows - mean) / std
    model = IsolationForest(n_estimators=N_ESTIMATORS, random_state=seed).fit(z)
    train_scores = -model.score_samples(z)
    p50, p995 = np.percentile(train_scores, [50.0, 99.5])
    return ModelBundle(
        forest=_CompiledForest(model),
        mean=mean,
        std=std,
        p50=float(p50),
        p995=float(p995),
        trained_on=len(rows),
    )
