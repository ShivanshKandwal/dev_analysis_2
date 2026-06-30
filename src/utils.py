import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin


class SemicolonMultiLabelBinarizer(BaseEstimator, TransformerMixin):
    """Custom transformer to binarize semicolon-delimited multi-select string columns."""

    def __init__(self, max_features=None):
        self.max_features = max_features
        self.classes_ = {}

    def fit(self, X, y=None):
        # Expects X to be a DataFrame or Series of string values
        X_filled = pd.DataFrame(X).fillna("Missing")

        for col in X_filled.columns:
            # Extract all unique individual entries split by semicolon
            all_entries = (
                X_filled[col]
                .astype(str)
                .str.split(";")
                .explode()
                .str.strip()
                .unique()
            )
            # Remove artifacts or empty values
            all_entries = [
                x for x in all_entries if x and x != "Missing" and x != "nan"
            ]

            if self.max_features:
                # Limit to top N most frequent items if max_features is set
                top_features = (
                    X_filled[col]
                    .astype(str)
                    .str.split(";")
                    .explode()
                    .str.strip()
                    .value_counts()
                )
                top_features = top_features.drop(
                    index=["Missing", "nan"], errors="ignore"
                )
                all_entries = top_features.head(self.max_features).index.tolist()

            self.classes_[col] = all_entries
        return self

    def transform(self, X):
        X_filled = pd.DataFrame(X).fillna("Missing")
        output_dfs = []

        for col in X_filled.columns:
            unique_classes = self.classes_.get(col, [])
            col_dict = {}

            # Convert string rows into individual token lists
            split_series = X_filled[col].astype(str).str.split(";")

            for cls in unique_classes:
                # Generate a binary column for every distinct tool/language item discovered
                col_name = f"{col}_{cls.replace(' ', '_').replace('.', '_')}"
                col_dict[col_name] = (
                    split_series.apply(
                        lambda x: 1 if isinstance(x, list) and cls in x else 0
                    )
                ).astype("int8")

            output_dfs.append(pd.DataFrame(col_dict, index=X_filled.index))

        return pd.concat(output_dfs, axis=1)
