from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import ComplementNB
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report
import pickle
import numpy as np
import os

app_nb = FastAPI(title="Naive Bayes Text Classification API")
app_rl = FastAPI(title="Reinforcement Learning Q-Learning API")

MODEL_PATH = "nb_model.pkl"

def train_nb_model():
    fname = 'nepal_synthetic_expenses.csv'
    if not os.path.exists(fname):
        raise FileNotFoundError(f"{fname} not found. Please ensure the dataset is available.")
    df = pd.read_csv(fname, parse_dates=['Date'], dayfirst=True, sep=',', on_bad_lines='skip')
    df = df.dropna(subset=['Note', 'Category'])
    counts = df['Category'].value_counts()
    valid = counts[counts >= 3].index
    df = df[df['Category'].isin(valid)]
    X = df['Note']
    y = df['Category']
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

@app_nb.post("/predict")
async def predict_category(input: TextInput):
    try:
        prediction_proba = nb_model.predict_proba([input.text])
        predicted_category_index = prediction_proba.argmax()
        predicted_category = nb_model.classes_[predicted_category_index]
        confidence = prediction_proba[0][predicted_category_index]
        return {"category": predicted_category, "confidence": float(confidence)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

class GridWorld:
    def __init__(self, size=4, goal_state=15):
        self.size = size
        self.goal_state = goal_state

    def step(self, state: int, action: str):
        row, col = divmod(state, self.size)
        if action == 'up' and row > 0:
            next_state = state - self.size
        elif action == 'right' and col < self.size - 1:
            next_state = state + 1
        elif action == 'down' and row < self.size - 1:
            next_state = state + self.size
        elif action == 'left' and col > 0:
            next_state = state - 1
        else:
            next_state = state

        # Penalize invalid or no-op moves heavily, small step penalty otherwise, reward on goal
        if next_state == state:
            reward = -0.1
        else:
            reward = 1.0 if next_state == self.goal_state else -0.01

        done = next_state == self.goal_state
        return next_state, reward, done

class QLearningAgent:
    def __init__(self, states=16, actions=4, alpha=0.1, gamma=0.9, epsilon=0.1):
        self.q_table = np.zeros((states, actions))
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.actions = ['up', 'right', 'down', 'left']
        self.state = 0
        self.goal_state = 15

    def choose_action(self, state):
        if np.random.uniform(0, 1) < self.epsilon:
            return np.random.randint(0, len(self.actions))
        return np.argmax(self.q_table[state])

    def update(self, state, action, reward, next_state):
        best_next_action = np.argmax(self.q_table[next_state])
        self.q_table[state, action] += self.alpha * (
            reward + self.gamma * self.q_table[next_state, best_next_action] - self.q_table[state, action]
        )

    def get_state(self):
        return self.state

    def set_state(self, state):
        self.state = state

    def is_terminal(self):
        return self.state == self.goal_state

agent = QLearningAgent()
grid_env = GridWorld()

class RLActionInput(BaseModel):
    action: str

class RLStateInput(BaseModel):
    state: int

@app_rl.post("/rl/step")
async def take_step(input: RLActionInput):
    try:
        current_state = agent.get_state()
        if input.action not in agent.actions:
            raise HTTPException(status_code=400, detail="Invalid action. Choose from 'up', 'right', 'down', 'left'.")
        action_idx = agent.actions.index(input.action)

        # Use environment to compute next state and reward
        next_state, reward, done = grid_env.step(current_state, input.action)

        # Update Q-table and agent state
        agent.update(current_state, action_idx, reward, next_state)
        agent.set_state(next_state)

        # Decay exploration rate
        agent.epsilon = max(agent.epsilon * 0.995, 0.01)

        return {
            "current_state": current_state,
            "action": input.action,
            "next_state": next_state,
            "reward": reward,
            "is_terminal": done
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RL step error: {str(e)}")

@app_rl.post("/rl/reset")
async def reset_agent():
    agent.set_state(0)
    return {"message": "Agent reset to initial state (0)."}

@app_rl.post("/rl/best_action")
async def get_best_action(input: RLStateInput):
    try:
        if not 0 <= input.state < 16:
            raise HTTPException(status_code=400, detail="Invalid state. Must be between 0 and 15.")
        action_idx = np.argmax(agent.q_table[input.state])
        return {"state": input.state, "best_action": agent.actions[action_idx]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Best action error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app_nb", host="0.0.0.0", port=8080, reload=True)