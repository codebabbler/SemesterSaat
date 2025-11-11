from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import ComplementNB
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report
import pickle
import os

app_nb = FastAPI(title="Naive Bayes Text Classification API")

MODEL_PATH = "nb_model.pkl"
FEEDBACK_PATH = "feedback_data.csv"
RETRAIN_THRESHOLD = 1

def train_nb_model():
    fname = 'nepal_expenses.csv'
    df = None
    
    # Try to load original dataset
    if os.path.exists(fname):
        try:
            df = pd.read_csv(fname, parse_dates=['Date'], dayfirst=True, sep=',', on_bad_lines='skip')
            df = df.dropna(subset=['Note', 'Category'])
            print(f"Loaded {len(df)} samples from original dataset")
        except Exception as e:
            print(f"Warning: Could not load original dataset: {e}")
            df = None
    
    # Load feedback data
    feedback_df = None
    if os.path.exists(FEEDBACK_PATH):
        try:
            feedback_df = pd.read_csv(FEEDBACK_PATH)
            feedback_df = feedback_df.dropna(subset=['text', 'category'])
            feedback_df = feedback_df.rename(columns={'text': 'Note', 'category': 'Category'})
            print(f"Loaded {len(feedback_df)} samples from feedback data")
        except Exception as e:
            print(f"Warning: Could not load feedback data: {e}")
            feedback_df = None
    
    # Combine datasets
    if df is not None and feedback_df is not None:
        df = pd.concat([df, feedback_df], ignore_index=True)
    elif feedback_df is not None:
        df = feedback_df
        print("Training with feedback data only")
    elif df is not None:
        print("Training with original data only")
    else:
        raise ValueError("No training data available. Need either original dataset or feedback data.")
    
    # Validate minimum data requirements
    if len(df) < 4:
        raise ValueError(f"Insufficient training data: {len(df)} samples. Need at least 4 samples.")
    
    counts = df['Category'].value_counts()
    valid = counts[counts >= 2].index
    df = df[df['Category'].isin(valid)]
    
    if len(df) < 4:
        raise ValueError(f"Insufficient valid categories after filtering: {len(df)} samples remaining.")
    
    X = df['Note']
    y = df['Category']
    print(f"Training with {len(X)} samples across {len(y.unique())} categories")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(stop_words='english', lowercase=True)),
        ('nb', ComplementNB())
    ])
    param_grid = {
        'tfidf__ngram_range': [(1,2), (1,3)],
        'nb__alpha': [0.1, 0.5, 1.0]
    }
    grid = GridSearchCV(pipeline, param_grid, cv=5, n_jobs=-1, scoring='f1_weighted')
    grid.fit(X_train, y_train)
    print("Best params:", grid.best_params_)
    print(classification_report(y_test, grid.best_estimator_.predict(X_test)))
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(grid.best_estimator_, f)
    return grid.best_estimator_

if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, 'rb') as f:
        nb_model = pickle.load(f)
else:
    nb_model = train_nb_model()

class TextInput(BaseModel):
    text: str

class FeedbackInput(BaseModel):
    text: str
    category: str


@app_nb.post("/predict")
async def predict_category(input: TextInput):
    try:
        prediction_proba = nb_model.predict_proba([input.text])
        predicted_category_index = prediction_proba.argmax()
        predicted_category = nb_model.classes_[predicted_category_index]
        confidence = prediction_proba[0][predicted_category_index]
        print(f"Predicted category: {predicted_category}, Confidence: {confidence}")
        if confidence < 0.4:
            return {"category": "Unknown", "confidence": float(confidence)}
        return {"category": predicted_category, "confidence": float(confidence)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

def save_feedback(text: str, category: str):
    """Store feedback data to CSV file for incremental learning"""
    feedback_data = pd.DataFrame([[text, category]], columns=['text', 'category'])
    if os.path.exists(FEEDBACK_PATH):
        feedback_data.to_csv(FEEDBACK_PATH, mode='a', header=False, index=False)
    else:
        feedback_data.to_csv(FEEDBACK_PATH, index=False)

def get_feedback_count():
    """Get current number of feedback entries"""
    if os.path.exists(FEEDBACK_PATH):
        return len(pd.read_csv(FEEDBACK_PATH))
    return 0

def should_retrain():
    """Check if model should be retrained based on feedback count"""
    return get_feedback_count() >= RETRAIN_THRESHOLD

@app_nb.post("/feedback")
async def feedback(input: FeedbackInput):
    """
    Store feedback and retrain model when threshold is reached
    """
    global nb_model
    try:
        save_feedback(input.text, input.category)
        
        if should_retrain():
            try:
                print(f"Retraining model with {get_feedback_count()} feedback samples...")
                nb_model = train_nb_model()
                print("Model retrained successfully!")
                return {"message": f"Model retrained with feedback data. Total feedback: {get_feedback_count()}", "category": input.category}
            except ValueError as ve:
                return {"message": f"Cannot retrain yet: {str(ve)}", "category": input.category, "feedback_count": get_feedback_count()}
            except Exception as te:
                print(f"Training error: {te}")
                return {"message": f"Training failed: {str(te)}", "category": input.category, "feedback_count": get_feedback_count()}
        else:
            remaining = RETRAIN_THRESHOLD - get_feedback_count()
            return {"message": f"Feedback saved. {remaining} more needed for retraining.", "category": input.category, "feedback_count": get_feedback_count()}
    except Exception as e:
        print(f"Feedback processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Feedback error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app_nb", host="0.0.0.0", port=8080, reload=True)