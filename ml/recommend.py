#!/usr/bin/env python3
"""
ML Recommendation Engine for Meal Suggestions
Loads trained models and provides personalized meal recommendations
"""

import pandas as pd
import numpy as np
import pickle
import joblib
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MealRecommendationEngine:
    def __init__(self, models_dir='models', data_dir='data'):
        """Initialize the recommendation engine"""
        self.models_dir = models_dir
        self.data_dir = data_dir
        self.models_loaded = False
        
        # Model containers
        self.content_similarity_matrix = None
        self.meal_ids = None
        self.meal_names = None
        self.cf_model = None
        self.cf_dataset = None
        self.hybrid_model = None
        self.tfidf_vectorizer = None
        self.scaler = None
        self.available_meals_df = None
        self.meal_usage_counts = {}
        self.meal_usage_scores = {}
        self.recency_half_life_days = 30
        
    def load_models(self):
        """Load all trained models and preprocessors"""
        try:
            # Load available meals data
            meals_path = os.path.join(self.data_dir, 'available_meals.csv')
            if os.path.exists(meals_path):
                self.available_meals_df = pd.read_csv(meals_path)
                logger.info(f"Loaded {len(self.available_meals_df)} available meals")

            # Load meal usage history for popularity based on planner usage
            history_path = os.path.join(self.data_dir, 'meal_history.csv')
            if os.path.exists(history_path):
                try:
                    history_df = pd.read_csv(history_path, parse_dates=['date'], infer_datetime_format=True)
                    if 'meal_id' in history_df.columns:
                        self.meal_usage_counts = history_df['meal_id'].value_counts().to_dict()
                        logger.info(f"Loaded usage counts for {len(self.meal_usage_counts)} meals")
                        # Recency-weighted usage score with exponential decay
                        now = datetime.now()
                        if 'date' in history_df.columns:
                            # Clean invalid dates
                            history_df['date'] = pd.to_datetime(history_df['date'], errors='coerce')
                            history_df = history_df.dropna(subset=['date'])
                            # Limit to last 180 days to avoid ancient influence
                            cutoff = now - pd.Timedelta(days=180)
                            recent_df = history_df[history_df['date'] >= cutoff].copy()
                            if not recent_df.empty:
                                decay = np.log(2) / max(1, self.recency_half_life_days)
                                recent_df['age_days'] = (now - recent_df['date']).dt.days.clip(lower=0)
                                recent_df['weight'] = np.exp(-decay * recent_df['age_days'])
                                self.meal_usage_scores = recent_df.groupby('meal_id')['weight'].sum().to_dict()
                                logger.info(f"Computed recency-weighted usage scores for {len(self.meal_usage_scores)} meals")
                except Exception as e:
                    logger.warning(f"Failed to load meal history: {e}")
            
            # Load content-based model
            try:
                with open(os.path.join(self.models_dir, 'content_similarity_matrix.pkl'), 'rb') as f:
                    self.content_similarity_matrix = pickle.load(f)
                
                with open(os.path.join(self.models_dir, 'meal_ids.pkl'), 'rb') as f:
                    self.meal_ids = pickle.load(f)
                
                with open(os.path.join(self.models_dir, 'meal_names.pkl'), 'rb') as f:
                    self.meal_names = pickle.load(f)
                
                logger.info("✅ Content-based model loaded")
            except FileNotFoundError:
                logger.warning("⚠️  Content-based model not found")
            
            # Load collaborative filtering model
            try:
                with open(os.path.join(self.models_dir, 'cf_model.pkl'), 'rb') as f:
                    self.cf_model = pickle.load(f)
                
                with open(os.path.join(self.models_dir, 'cf_dataset.pkl'), 'rb') as f:
                    self.cf_dataset = pickle.load(f)
                
                logger.info("✅ Collaborative filtering model loaded")
            except FileNotFoundError:
                logger.warning("⚠️  Collaborative filtering model not found")
            
            # Load hybrid model
            try:
                self.hybrid_model = joblib.load(os.path.join(self.models_dir, 'hybrid_model.joblib'))
                logger.info("✅ Hybrid model loaded")
            except FileNotFoundError:
                logger.warning("⚠️  Hybrid model not found")
            
            # Load preprocessors
            try:
                self.tfidf_vectorizer = joblib.load(os.path.join(self.models_dir, 'tfidf_vectorizer.joblib'))
                self.scaler = joblib.load(os.path.join(self.models_dir, 'scaler.joblib'))
                logger.info("✅ Preprocessors loaded")
            except FileNotFoundError:
                logger.warning("⚠️  Preprocessors not found")
            
            self.models_loaded = True
            logger.info("🎉 ML models loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            return False
    
    def get_content_based_recommendations(self, meal_id, top_n=10, meal_type=None):
        """Get content-based recommendations for similar meals"""
        try:
            if self.content_similarity_matrix is None:
                logger.error("Content-based model not loaded")
                return []
            
            if self.meal_ids is None or meal_id not in self.meal_ids:
                logger.error(f"Meal ID {meal_id} not found")
                return []
            
            # Find meal index
            meal_idx = self.meal_ids.index(meal_id)
            
            # Get similarity scores
            similarity_scores = self.content_similarity_matrix[meal_idx]
            
            # Get top similar meals (excluding the meal itself)
            similar_indices = np.argsort(similarity_scores)[::-1][1:top_n+1]
            
            recommendations = []
            for idx in similar_indices:
                if self.meal_ids is not None and idx < len(self.meal_ids):
                    recommended_meal_id = self.meal_ids[idx]
                    meal_name = self.meal_names[idx] if self.meal_names is not None and idx < len(self.meal_names) else "Unknown"
                    similarity_score = similarity_scores[idx]
                    
                    # Filter by meal type if specified
                    if meal_type and self.available_meals_df is not None:
                        meal_info = self.available_meals_df[
                            self.available_meals_df['meal_id'] == recommended_meal_id
                        ]
                        if not meal_info.empty and meal_info.iloc[0]['meal_type'] != meal_type:
                            continue
                    
                    recommendations.append({
                        'meal_id': recommended_meal_id,
                        'meal_name': meal_name,
                        'similarity_score': float(similarity_score),
                        'recommendation_type': 'content_based'
                    })
            
            return recommendations[:top_n]
            
        except Exception as e:
            logger.error(f"Error getting content-based recommendations: {e}")
            return []
    
    def get_collaborative_recommendations(self, user_id, top_n=10, meal_type=None):
        """Get collaborative filtering recommendations for a user"""
        try:
            if self.cf_model is None or self.cf_dataset is None:
                logger.error("Collaborative filtering model not loaded")
                return []
            
            # Get user internal ID
            try:
                user_internal_id = self.cf_dataset.mapping()[0][user_id]
            except KeyError:
                logger.warning(f"User {user_id} not found in training data, falling back to popular items")
                return self.get_popular_recommendations(top_n, meal_type)
            
            # Get all item internal IDs
            item_ids = list(self.cf_dataset.mapping()[2].keys())
            
            # Get predictions for all items
            predictions = self.cf_model.predict(
                user_internal_id,
                np.array([self.cf_dataset.mapping()[2][item_id] for item_id in item_ids])
            )
            
            # Sort by prediction score
            top_items = np.argsort(predictions)[::-1][:top_n*2]  # Get more to allow filtering
            
            recommendations = []
            for item_idx in top_items:
                if len(recommendations) >= top_n:
                    break
                
                item_id = item_ids[item_idx]
                prediction_score = predictions[item_idx]
                
                # Get meal name
                meal_name = "Unknown"
                if self.available_meals_df is not None:
                    meal_info = self.available_meals_df[
                        self.available_meals_df['meal_id'] == item_id
                    ]
                    if not meal_info.empty:
                        meal_name = meal_info.iloc[0]['meal_name']
                        
                        # Filter by meal type if specified
                        if meal_type and meal_info.iloc[0]['meal_type'] != meal_type:
                            continue
                
                recommendations.append({
                    'meal_id': item_id,
                    'meal_name': meal_name,
                    'prediction_score': float(prediction_score),
                    'recommendation_type': 'collaborative_filtering'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting collaborative recommendations: {e}")
            return []
    
    def get_hybrid_recommendations(self, user_id, context=None, top_n=10, meal_type=None):
        """Get hybrid model recommendations combining content and collaborative features"""
        try:
            if self.hybrid_model is None:
                logger.error("Hybrid model not loaded")
                return []
            
            if self.available_meals_df is None:
                logger.error("Available meals data not loaded")
                return []
            
            # Default context
            if context is None:
                context = {
                    'hour': datetime.now().hour,
                    'day_of_week': datetime.now().strftime('%A').lower(),
                    'month': datetime.now().month
                }
            
            # Prepare features for all available meals
            recommendations = []
            
            for _, meal in self.available_meals_df.iterrows():
                # Skip if meal type doesn't match
                if meal_type and meal['meal_type'] != meal_type:
                    continue
                
                try:
                    # User temporal features
                    user_features = [
                        context.get('hour', 18),
                        1 if context.get('day_of_week', 'monday') in ['saturday', 'sunday'] else 0,
                        context.get('month', 1)
                    ]
                    
                    # Mock meal content features (would need actual content features in production)
                    meal_content_features = [
                        meal['ingredient_count'],
                        meal['prep_time'],
                        meal['rating'],
                        1 if meal['difficulty'] == 'easy' else 2 if meal['difficulty'] == 'medium' else 3
                    ]
                    
                    # Pad to match training feature size
                    while len(meal_content_features) < 20:
                        meal_content_features.append(0)
                    meal_content_features = meal_content_features[:20]
                    
                    # Combine features
                    combined_features = user_features + meal_content_features
                    
                    # Get prediction
                    prediction_prob = self.hybrid_model.predict_proba([combined_features])[0][1]
                    
                    recommendations.append({
                        'meal_id': meal['meal_id'],
                        'meal_name': meal['meal_name'],
                        'prediction_score': float(prediction_prob),
                        'recommendation_type': 'hybrid',
                        'meal_type': meal['meal_type'],
                        'prep_time': meal['prep_time'],
                        'difficulty': meal['difficulty'],
                        'rating': meal['rating']
                    })
                    
                except Exception as e:
                    logger.warning(f"Error processing meal {meal['meal_id']}: {e}")
                    continue
            
            # Sort by prediction score and return top N
            recommendations.sort(key=lambda x: x['prediction_score'], reverse=True)
            return recommendations[:top_n]
            
        except Exception as e:
            logger.error(f"Error getting hybrid recommendations: {e}")
            return []
    
    def get_popular_recommendations(self, top_n=10, meal_type=None):
        """Get popular meal recommendations based on recency-weighted planner usage"""
        try:
            if self.available_meals_df is None:
                logger.error("Available meals data not loaded")
                return []
            
            meals_df = self.available_meals_df.copy()
            # Weighted recency score; fallback to raw count when score missing
            meals_df['usage_score'] = meals_df['meal_id'].map(lambda m: float(self.meal_usage_scores.get(m, 0.0)))
            meals_df['usage_count'] = meals_df['meal_id'].map(lambda m: int(self.meal_usage_counts.get(m, 0)))
            if meals_df['usage_score'].sum() == 0 and meals_df['usage_count'].sum() > 0:
                meals_df['usage_score'] = meals_df['usage_count'].astype(float)

            # Filter by meal type if specified
            if meal_type:
                meals_df = meals_df[meals_df['meal_type'] == meal_type]

            # Popularity by usage_score; tie-break by usage_count then rating
            meals_df = meals_df.sort_values(['usage_score', 'usage_count', 'rating'], ascending=[False, False, False])
            
            recommendations = []
            for _, meal in meals_df.head(top_n).iterrows():
                recommendations.append({
                    'meal_id': meal['meal_id'],
                    'meal_name': meal['meal_name'],
                    'popularity_score': float(meal['usage_score']),
                    'recommendation_type': 'popular',
                    'meal_type': meal['meal_type'],
                    'prep_time': meal['prep_time'],
                    'difficulty': meal['difficulty'],
                    'rating': meal['rating']
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting popular recommendations: {e}")
            return []
    
    def get_recommendations(self, user_id=None, meal_id=None, meal_type=None, context=None, top_n=5):
        """Get personalized meal recommendations using best available model"""
        if not self.models_loaded:
            if not self.load_models():
                return {'error': 'Failed to load ML models'}
        
        all_recommendations = []
        
        try:
            # Try hybrid model first (best personalization)
            if user_id and self.hybrid_model is not None:
                hybrid_recs = self.get_hybrid_recommendations(user_id, context, top_n, meal_type)
                if hybrid_recs:
                    all_recommendations.extend(hybrid_recs)
                    logger.info(f"Got {len(hybrid_recs)} hybrid recommendations")
            
            # Try collaborative filtering
            if user_id and self.cf_model is not None and len(all_recommendations) < top_n:
                cf_recs = self.get_collaborative_recommendations(user_id, top_n - len(all_recommendations), meal_type)
                if cf_recs:
                    all_recommendations.extend(cf_recs)
                    logger.info(f"Got {len(cf_recs)} collaborative filtering recommendations")
            
            # Try content-based if we have a reference meal
            if meal_id and self.content_similarity_matrix is not None and len(all_recommendations) < top_n:
                content_recs = self.get_content_based_recommendations(meal_id, top_n - len(all_recommendations), meal_type)
                if content_recs:
                    all_recommendations.extend(content_recs)
                    logger.info(f"Got {len(content_recs)} content-based recommendations")
            
            # Fallback to popular recommendations
            if len(all_recommendations) < top_n:
                popular_recs = self.get_popular_recommendations(top_n - len(all_recommendations), meal_type)
                all_recommendations.extend(popular_recs)
                logger.info(f"Added {len(popular_recs)} popular recommendations as fallback")
            
            # Remove duplicates based on meal_id
            seen_meal_ids = set()
            unique_recommendations = []
            for rec in all_recommendations:
                if rec['meal_id'] not in seen_meal_ids:
                    seen_meal_ids.add(rec['meal_id'])
                    unique_recommendations.append(rec)
            
            # Limit to requested number
            final_recommendations = unique_recommendations[:top_n]
            
            return {
                'recommendations': final_recommendations,
                'total_count': len(final_recommendations),
                'recommendation_context': {
                    'user_id': user_id,
                    'meal_type': meal_type,
                    'requested_count': top_n,
                    'models_used': list(set([rec.get('recommendation_type', 'unknown') for rec in final_recommendations]))
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return {'error': f'Failed to generate recommendations: {str(e)}'}

# Global recommendation engine instance
recommendation_engine = MealRecommendationEngine()

def get_meal_recommendations(user_id=None, meal_id=None, meal_type=None, context=None, top_n=5):
    """Convenience function to get meal recommendations"""
    return recommendation_engine.get_recommendations(user_id, meal_id, meal_type, context, top_n)

def main():
    """Test the recommendation engine"""
    logger.info("Testing ML Recommendation Engine...")
    
    # Load models
    if not recommendation_engine.load_models():
        logger.error("Failed to load models")
        return
    
    # Test recommendations
    test_user_id = "test_user_123"
    recommendations = get_meal_recommendations(user_id=test_user_id, meal_type="dinner", top_n=5)
    
    if 'error' in recommendations:
        logger.error(f"Recommendation error: {recommendations['error']}")
    else:
        logger.info(f"Generated {recommendations['total_count']} recommendations:")
        for i, rec in enumerate(recommendations['recommendations'], 1):
            logger.info(f"{i}. {rec['meal_name']} (Type: {rec['recommendation_type']})")

if __name__ == "__main__":
    main() 