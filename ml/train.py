#!/usr/bin/env python3
"""
ML Model Training for Meal Recommendations
Trains content-based filtering and collaborative filtering models
"""

import pandas as pd
import numpy as np
import pickle
import joblib
import os
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from lightfm import LightFM
from lightfm.data import Dataset
import xgboost as xgb
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MealRecommendationTrainer:
    def __init__(self, data_dir='data', models_dir='models'):
        """Initialize the trainer with data and model directories"""
        self.data_dir = data_dir
        self.models_dir = models_dir
        self.models = {}
        self.preprocessors = {}
        
        # Ensure directories exist
        os.makedirs(self.models_dir, exist_ok=True)
        os.makedirs(self.data_dir, exist_ok=True)
    
    def load_data(self):
        """Load preprocessed data"""
        try:
            self.meal_history = pd.read_csv(os.path.join(self.data_dir, 'meal_history.csv'))
            self.available_meals = pd.read_csv(os.path.join(self.data_dir, 'available_meals.csv'))
            self.user_preferences = pd.read_csv(os.path.join(self.data_dir, 'user_preferences.csv'))
            
            logger.info(f"Loaded data: {len(self.meal_history)} history records, {len(self.available_meals)} available meals")
            return True
            
        except FileNotFoundError as e:
            logger.error(f"Data files not found: {e}")
            return False
        except Exception as e:
            logger.error(f"Error loading data: {e}")
            return False
    
    def prepare_content_based_features(self):
        """Prepare features for content-based filtering"""
        try:
            # Combine meal ingredients and metadata for TF-IDF
            meals_text = []
            meal_features = []
            
            for _, meal in self.available_meals.iterrows():
                # Create text representation
                ingredients_text = ' '.join(eval(meal['ingredients']) if isinstance(meal['ingredients'], str) else meal['ingredients'])
                cuisine_text = meal.get('cuisine_type', '')
                difficulty_text = meal.get('difficulty', '')
                
                combined_text = f"{ingredients_text} {cuisine_text} {difficulty_text}"
                meals_text.append(combined_text)
                
                # Numerical features
                meal_features.append([
                    meal['ingredient_count'],
                    meal['prep_time'],
                    meal['rating'],
                    1 if meal['difficulty'] == 'easy' else 2 if meal['difficulty'] == 'medium' else 3
                ])
            
            # TF-IDF for text features
            self.tfidf_vectorizer = TfidfVectorizer(max_features=500, stop_words='english')
            tfidf_features = self.tfidf_vectorizer.fit_transform(meals_text).toarray()
            
            # Combine with numerical features
            numerical_features = np.array(meal_features)
            
            # Scale numerical features
            self.scaler = StandardScaler()
            numerical_features_scaled = self.scaler.fit_transform(numerical_features)
            
            # Combine all features
            self.content_features = np.hstack([tfidf_features, numerical_features_scaled])
            
            logger.info(f"Content-based features shape: {self.content_features.shape}")
            return True
            
        except Exception as e:
            logger.error(f"Error preparing content-based features: {e}")
            return False
    
    def train_content_based_model(self):
        """Train content-based filtering model using cosine similarity"""
        try:
            if not hasattr(self, 'content_features'):
                logger.error("Content features not prepared")
                return False
            
            # Calculate similarity matrix
            self.content_similarity_matrix = cosine_similarity(self.content_features)
            
            # Store meal IDs for reference
            self.meal_ids = self.available_meals['meal_id'].tolist()
            self.meal_names = self.available_meals['meal_name'].tolist()
            
            logger.info("Content-based model trained successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error training content-based model: {e}")
            return False
    
    def prepare_collaborative_filtering_data(self):
        """Prepare data for collaborative filtering"""
        try:
            if self.meal_history.empty:
                logger.warning("No meal history for collaborative filtering")
                return False
            
            # Create user-item interaction matrix
            # Use implicit feedback (meal consumption = positive interaction)
            interactions = self.meal_history.groupby(['user_id', 'meal_id']).size().reset_index(name='count')
            
            # Create LightFM dataset
            self.cf_dataset = Dataset()
            self.cf_dataset.fit(
                users=interactions['user_id'].unique(),
                items=interactions['meal_id'].unique()
            )
            
            # Build interaction matrix
            (interactions_matrix, weights) = self.cf_dataset.build_interactions(
                [(row['user_id'], row['meal_id'], row['count']) for _, row in interactions.iterrows()]
            )
            
            self.cf_interactions = interactions_matrix
            self.cf_weights = weights
            
            logger.info(f"Collaborative filtering data prepared: {interactions_matrix.shape}")
            return True
            
        except Exception as e:
            logger.error(f"Error preparing collaborative filtering data: {e}")
            return False
    
    def train_collaborative_filtering_model(self):
        """Train collaborative filtering model using LightFM"""
        try:
            if not hasattr(self, 'cf_interactions'):
                logger.error("Collaborative filtering data not prepared")
                return False
            
            # Train LightFM model
            self.cf_model = LightFM(loss='warp')  # WARP is good for implicit feedback
            self.cf_model.fit(self.cf_interactions, epochs=20, num_threads=2)
            
            logger.info("Collaborative filtering model trained successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error training collaborative filtering model: {e}")
            return False
    
    def train_hybrid_model(self):
        """Train hybrid model combining content and collaborative features"""
        try:
            if self.meal_history.empty:
                logger.warning("Insufficient data for hybrid model")
                return False
            
            # Prepare training data for meal preference prediction
            X_train = []
            y_train = []
            
            # Create positive and negative samples
            for _, row in self.meal_history.iterrows():
                user_id = row['user_id']
                meal_id = row['meal_id']
                
                # Find meal features
                meal_idx = None
                try:
                    meal_idx = self.available_meals[self.available_meals['meal_id'] == meal_id].index[0]
                except IndexError:
                    continue
                
                # User temporal features
                user_features = [
                    row.get('hour', 18),
                    1 if row.get('day_of_week', 'monday') in ['saturday', 'sunday'] else 0,
                    row.get('month', 1)
                ]
                
                # Meal content features (subset)
                if hasattr(self, 'content_features') and meal_idx < len(self.content_features):
                    meal_content_features = self.content_features[meal_idx][:20]  # Use first 20 features
                else:
                    meal_content_features = [0] * 20
                
                # Combine features
                combined_features = user_features + meal_content_features.tolist()
                X_train.append(combined_features)
                y_train.append(1)  # Positive sample
                
                # Create negative samples (randomly sample meals not eaten)
                negative_meals = self.available_meals[~self.available_meals['meal_id'].isin([meal_id])]
                if len(negative_meals) > 0:
                    neg_meal = negative_meals.sample(1).iloc[0]
                    neg_meal_idx = negative_meals.sample(1).index[0]
                    
                    # Use same user features but different meal features
                    if hasattr(self, 'content_features') and neg_meal_idx < len(self.content_features):
                        neg_meal_content_features = self.content_features[neg_meal_idx][:20]
                    else:
                        neg_meal_content_features = [0] * 20
                    
                    neg_combined_features = user_features + neg_meal_content_features.tolist()
                    X_train.append(neg_combined_features)
                    y_train.append(0)  # Negative sample
            
            if len(X_train) == 0:
                logger.warning("No training data for hybrid model")
                return False
            
            X_train = np.array(X_train)
            y_train = np.array(y_train)
            
            # Train XGBoost model
            self.hybrid_model = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42
            )
            
            # Split data for validation
            X_train_split, X_val, y_train_split, y_val = train_test_split(
                X_train, y_train, test_size=0.2, random_state=42
            )
            
            self.hybrid_model.fit(X_train_split, y_train_split)
            
            # Evaluate
            train_score = self.hybrid_model.score(X_train_split, y_train_split)
            val_score = self.hybrid_model.score(X_val, y_val)
            
            logger.info(f"Hybrid model trained - Train score: {train_score:.3f}, Val score: {val_score:.3f}")
            return True
            
        except Exception as e:
            logger.error(f"Error training hybrid model: {e}")
            return False
    
    def save_models(self):
        """Save all trained models and preprocessors"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Save content-based model
            if hasattr(self, 'content_similarity_matrix'):
                with open(os.path.join(self.models_dir, 'content_similarity_matrix.pkl'), 'wb') as f:
                    pickle.dump(self.content_similarity_matrix, f)
                
                with open(os.path.join(self.models_dir, 'meal_ids.pkl'), 'wb') as f:
                    pickle.dump(self.meal_ids, f)
                
                with open(os.path.join(self.models_dir, 'meal_names.pkl'), 'wb') as f:
                    pickle.dump(self.meal_names, f)
            
            # Save collaborative filtering model
            if hasattr(self, 'cf_model'):
                with open(os.path.join(self.models_dir, 'cf_model.pkl'), 'wb') as f:
                    pickle.dump(self.cf_model, f)
                
                with open(os.path.join(self.models_dir, 'cf_dataset.pkl'), 'wb') as f:
                    pickle.dump(self.cf_dataset, f)
            
            # Save hybrid model
            if hasattr(self, 'hybrid_model'):
                joblib.dump(self.hybrid_model, os.path.join(self.models_dir, 'hybrid_model.joblib'))
            
            # Save preprocessors
            if hasattr(self, 'tfidf_vectorizer'):
                joblib.dump(self.tfidf_vectorizer, os.path.join(self.models_dir, 'tfidf_vectorizer.joblib'))
            
            if hasattr(self, 'scaler'):
                joblib.dump(self.scaler, os.path.join(self.models_dir, 'scaler.joblib'))
            
            # Save metadata
            metadata = {
                'training_timestamp': timestamp,
                'num_meals': len(self.available_meals),
                'num_users': len(self.user_preferences),
                'num_history_records': len(self.meal_history),
                'models_trained': []
            }
            
            if hasattr(self, 'content_similarity_matrix'):
                metadata['models_trained'].append('content_based')
            if hasattr(self, 'cf_model'):
                metadata['models_trained'].append('collaborative_filtering')
            if hasattr(self, 'hybrid_model'):
                metadata['models_trained'].append('hybrid')
            
            with open(os.path.join(self.models_dir, 'metadata.pkl'), 'wb') as f:
                pickle.dump(metadata, f)
            
            logger.info(f"Models saved successfully with timestamp {timestamp}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving models: {e}")
            return False
    
    def train_all_models(self):
        """Train all available models"""
        logger.info("Starting model training process...")
        
        success_count = 0
        
        # Content-based filtering
        if self.prepare_content_based_features():
            if self.train_content_based_model():
                success_count += 1
                logger.info("✅ Content-based model trained successfully")
            else:
                logger.error("❌ Content-based model training failed")
        
        # Collaborative filtering
        if self.prepare_collaborative_filtering_data():
            if self.train_collaborative_filtering_model():
                success_count += 1
                logger.info("✅ Collaborative filtering model trained successfully")
            else:
                logger.error("❌ Collaborative filtering model training failed")
        
        # Hybrid model
        if self.train_hybrid_model():
            success_count += 1
            logger.info("✅ Hybrid model trained successfully")
        else:
            logger.error("❌ Hybrid model training failed")
        
        if success_count > 0:
            self.save_models()
            logger.info(f"Training completed: {success_count} models trained successfully")
            return True
        else:
            logger.error("All model training failed")
            return False

def main():
    """Main training function"""
    logger.info("Starting ML model training...")
    
    trainer = MealRecommendationTrainer()
    
    if not trainer.load_data():
        logger.error("Failed to load data. Run preprocess.py first.")
        return
    
    success = trainer.train_all_models()
    
    if success:
        logger.info("🎉 Model training completed successfully!")
    else:
        logger.error("❌ Model training failed!")

if __name__ == "__main__":
    main() 