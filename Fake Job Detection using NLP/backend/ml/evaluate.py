"""
Model evaluation utilities for fake job detection.
"""
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, classification_report, confusion_matrix
)


def evaluate_model(y_true, y_pred, model_name="Model", average="weighted"):
    """Evaluate predictions and return metrics dict + print report."""
    metrics = {
        "model": model_name,
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "precision": round(precision_score(y_true, y_pred, average=average, zero_division=0), 4),
        "recall": round(recall_score(y_true, y_pred, average=average, zero_division=0), 4),
        "f1_score": round(f1_score(y_true, y_pred, average=average, zero_division=0), 4),
    }
    conf_matrix = confusion_matrix(y_true, y_pred).tolist()
    metrics["confusion_matrix"] = conf_matrix
    
    print(f"\n{'='*50}")
    print(f"  {model_name} Evaluation")
    print(f"{'='*50}")
    print(f"  Accuracy:  {metrics['accuracy']}")
    print(f"  Precision: {metrics['precision']}")
    print(f"  Recall:    {metrics['recall']}")
    print(f"  F1 Score:  {metrics['f1_score']}")
    print(f"\nClassification Report:")
    print(classification_report(y_true, y_pred, target_names=["Real", "Fake"]))
    print(f"Confusion Matrix:")
    print(conf_matrix)
    
    return metrics


def evaluate_train_test(y_train, y_train_pred, y_test, y_test_pred, model_name="Model"):
    """Evaluate train/test split and diagnose fitting behavior."""
    train_accuracy = round(accuracy_score(y_train, y_train_pred), 4)
    test_metrics = evaluate_model(y_test, y_test_pred, model_name=model_name, average="weighted")
    test_accuracy = test_metrics["accuracy"]
    accuracy_gap = round(train_accuracy - test_accuracy, 4)

    if accuracy_gap > 0.10:
        diagnosis = "overfitting"
    elif train_accuracy < 0.80 and test_accuracy < 0.80:
        diagnosis = "underfitting"
    else:
        diagnosis = "balanced_or_good_fit"

    print(f"Train Accuracy: {train_accuracy}")
    print(f"Test Accuracy:  {test_accuracy}")
    print(f"Accuracy Gap:   {accuracy_gap}")
    print(f"Fit Diagnosis:  {diagnosis}")

    test_metrics["train_accuracy"] = train_accuracy
    test_metrics["test_accuracy"] = test_accuracy
    test_metrics["accuracy_gap"] = accuracy_gap
    test_metrics["fit_diagnosis"] = diagnosis
    return test_metrics


def compare_models(results):
    """Compare multiple model results and return the best one by F1."""
    print(f"\n{'='*60}")
    print(f"  Model Comparison Summary")
    print(f"{'='*60}")
    print(f"  {'Model':<25} {'Accuracy':<12} {'F1 Score':<12}")
    print(f"  {'-'*49}")
    
    best = None
    for r in results:
        print(f"  {r['model']:<25} {r['accuracy']:<12} {r['f1_score']:<12}")
        if best is None or r['f1_score'] > best['f1_score']:
            best = r
    
    print(f"\n  ★ Best Model: {best['model']} (F1: {best['f1_score']})")
    return best
