#!/usr/bin/env python3
"""
Data Preprocessing and Feature Engineering for Meal Recommendations
Extracts and preprocesses data from MongoDB for ML model training
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import pymongo
import os
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MealDataPreprocessor:
    def __init__(self, mongo_uri=None, db_name="meal_planner"):
        """Initialize the preprocessor with database connection"""
        self.mongo_uri = mongo_uri or os.getenv('MONGODB_URI', 'mongodb://mongo:27017/meal_planner')
        self.db_name = db_name
        self.client = None
        self.db = None
        
        # Encoders and scalers
        self.meal_type_encoder = LabelEncoder()
        self.day_encoder = LabelEncoder()
        self.ingredient_vectorizer = TfidfVectorizer(max_features=500, stop_words='english')
        self.scaler = StandardScaler()
        
    def connect_db(self):
        """Connect to MongoDB"""
        try:
            self.client = pymongo.MongoClient(self.mongo_uri)
            self.db = self.client[self.db_name]
            logger.info(f"Connected to MongoDB: {self.db_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            return False
    
    def extract_meal_history(self, days_back=90):
        """Extract meal history from database"""
        if not self.connect_db():
            return pd.DataFrame()
        
        try:
            # Get recent meal plans
            cutoff_date = datetime.now() - timedelta(days=days_back)
            
            # Extract meal plans with populated meal data
            pipeline = [
                {"$match": {"date": {"$gte": cutoff_date}}},
                {"$lookup": {
                    "from": "meals",
                    "localField": "meals",
                    "foreignField": "_id",
                    "as": "meal_details"
                }},
                {"$unwind": "$meal_details"},
                {"$lookup": {
                    "from": "ingredients",
                    "localField": "meal_details.ingredients",
                    "foreignField": "_id",
                    "as": "ingredient_details"
                }},
                {"$lookup": {
                    "from": "users",
                    "localField": "userId",
                    "foreignField": "_id",
                    "as": "user_details"
                }}
            ]
            
            meal_data = list(self.db.mealplans.aggregate(pipeline))
            
            if not meal_data:
                logger.warning("No meal history found")
                return pd.DataFrame()
            
            # Convert to DataFrame
            processed_meals = []
            
            for record in meal_data:
                meal = record['meal_details']
                ingredients = record.get('ingredient_details', [])
                user = record.get('user_details', [{}])[0]
                
                processed_meals.append({
                    'user_id': str(record['userId']),
                    'meal_id': str(meal['_id']),
                    'meal_name': meal.get('name', ''),
                    'meal_type': meal.get('type', 'dinner'),
                    'date': record['date'],
                    'day_of_week': record['date'].strftime('%A').lower(),
                    'hour': record['date'].hour if hasattr(record['date'], 'hour') else 18,
                    'ingredients': [ing.get('name', '') for ing in ingredients],
                    'ingredient_count': len(ingredients),
                    'cuisine_type': meal.get('cuisine', ''),
                    'prep_time': meal.get('prepTime', 0),
                    'difficulty': meal.get('difficulty', 'medium'),
                    'rating': meal.get('rating', 0),
                    'user_dietary_restrictions': user.get('dietaryRestrictions', [])
                })
            
            df = pd.DataFrame(processed_meals)
            logger.info(f"Extracted {len(df)} meal records")
            return df
            
        except Exception as e:
            logger.error(f"Error extracting meal history: {e}")
            return pd.DataFrame()
    
    def extract_available_meals(self):
        """Extract all available meals from database"""
        if not self.connect_db():
            return pd.DataFrame()
        
        try:
            # Get all meals with their ingredients
            pipeline = [
                {"$lookup": {
                    "from": "ingredients",
                    "localField": "ingredients",
                    "foreignField": "_id",
                    "as": "ingredient_details"
                }}
            ]
            
            meals = list(self.db.meals.aggregate(pipeline))
            
            processed_meals = []
            for meal in meals:
                ingredients = meal.get('ingredient_details', [])
                
                processed_meals.append({
                    'meal_id': str(meal['_id']),
                    'meal_name': meal.get('name', ''),
                    'meal_type': meal.get('type', 'dinner'),
                    'ingredients': [ing.get('name', '') for ing in ingredients],
                    'ingredient_count': len(ingredients),
                    'cuisine_type': meal.get('cuisine', ''),
                    'prep_time': meal.get('prepTime', 0),
                    'difficulty': meal.get('difficulty', 'medium'),
                    'rating': meal.get('rating', 0),
                    'instructions': meal.get('instructions', ''),
                    'created_at': meal.get('createdAt', datetime.now())
                })
            
            df = pd.DataFrame(processed_meals)
            logger.info(f"Extracted {len(df)} available meals")
            return df
            
        except Exception as e:
            logger.error(f"Error extracting available meals: {e}")
            return pd.DataFrame()
    
    def extract_user_preferences(self):
        """Extract user preferences and dietary restrictions"""
        if not self.connect_db():
            return pd.DataFrame()
        
        try:
            users = list(self.db.users.find({}, {
                'email': 1,
                'dietaryRestrictions': 1,
                'preferences': 1,
                'createdAt': 1
            }))
            
            processed_users = []
            for user in users:
                processed_users.append({
                    'user_id': str(user['_id']),
                    'email': user.get('email', ''),
                    'dietary_restrictions': user.get('dietaryRestrictions', []),
                    'preferences': user.get('preferences', {}),
                    'created_at': user.get('createdAt', datetime.now())
                })
            
            df = pd.DataFrame(processed_users)
            logger.info(f"Extracted {len(df)} user profiles")
            return df
            
        except Exception as e:
            logger.error(f"Error extracting user preferences: {e}")
            return pd.DataFrame()
    
    def create_features(self, meal_history_df, available_meals_df):
        """Create features for ML models"""
        if meal_history_df.empty or available_meals_df.empty:
            logger.error("Cannot create features: missing data")
            return None, None
        
        try:
            # Temporal features
            meal_history_df['month'] = pd.to_datetime(meal_history_df['date']).dt.month
            meal_history_df['is_weekend'] = pd.to_datetime(meal_history_df['date']).dt.dayofweek >= 5
            
            # Encode categorical features
            meal_types = list(set(meal_history_df['meal_type'].tolist() + available_meals_df['meal_type'].tolist()))
            days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            
            self.meal_type_encoder.fit(meal_types)
            self.day_encoder.fit(days)
            
            # Process ingredients for TF-IDF
            all_ingredients = []
            for ingredients_list in meal_history_df['ingredients']:
                if isinstance(ingredients_list, list):
                    all_ingredients.append(' '.join(ingredients_list))
                else:
                    all_ingredients.append('')
            
            for ingredients_list in available_meals_df['ingredients']:
                if isinstance(ingredients_list, list):
                    all_ingredients.append(' '.join(ingredients_list))
                else:
                    all_ingredients.append('')
            
            # Fit TF-IDF vectorizer
            if all_ingredients:
                self.ingredient_vectorizer.fit(all_ingredients)
            
            # Create feature matrices
            history_features = self._create_feature_matrix(meal_history_df, is_history=True)
            available_features = self._create_feature_matrix(available_meals_df, is_history=False)
            
            logger.info(f"Created features: history shape {history_features.shape}, available shape {available_features.shape}")
            return history_features, available_features
            
        except Exception as e:
            logger.error(f"Error creating features: {e}")
            return None, None
    
    def _create_feature_matrix(self, df, is_history=True):
        """Create feature matrix from DataFrame"""
        features = []
        
        for _, row in df.iterrows():
            feature_vector = []
            
            # Categorical features
            meal_type_encoded = self.meal_type_encoder.transform([row['meal_type']])[0]
            feature_vector.append(meal_type_encoded)
            
            if is_history:
                day_encoded = self.day_encoder.transform([row['day_of_week']])[0]
                feature_vector.append(day_encoded)
                feature_vector.append(row['hour'])
                feature_vector.append(row['month'])
                feature_vector.append(int(row['is_weekend']))
            else:
                # For available meals, use default values
                feature_vector.extend([0, 18, datetime.now().month, 0])
            
            # Numerical features
            feature_vector.extend([
                row['ingredient_count'],
                row['prep_time'],
                row['rating']
            ])
            
            # Difficulty encoding
            difficulty_map = {'easy': 1, 'medium': 2, 'hard': 3}
            feature_vector.append(difficulty_map.get(row['difficulty'], 2))
            
            # Ingredient TF-IDF features
            ingredients_text = ' '.join(row['ingredients']) if isinstance(row['ingredients'], list) else ''
            if hasattr(self.ingredient_vectorizer, 'vocabulary_'):
                ingredient_features = self.ingredient_vectorizer.transform([ingredients_text]).toarray()[0]
                feature_vector.extend(ingredient_features)
            
            features.append(feature_vector)
        
        return np.array(features)
    
    def save_preprocessed_data(self, meal_history_df, available_meals_df, user_preferences_df):
        """Save preprocessed data to files"""
        try:
            data_dir = os.path.join(os.path.dirname(__file__), 'data')
            os.makedirs(data_dir, exist_ok=True)
            
            meal_history_df.to_csv(os.path.join(data_dir, 'meal_history.csv'), index=False)
            available_meals_df.to_csv(os.path.join(data_dir, 'available_meals.csv'), index=False)
            user_preferences_df.to_csv(os.path.join(data_dir, 'user_preferences.csv'), index=False)
            
            logger.info("Preprocessed data saved successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error saving preprocessed data: {e}")
            return False
    
    def close_connection(self):
        """Close database connection"""
        if self.client:
            self.client.close()
            logger.info("Database connection closed")

def main():
    """Main preprocessing function"""
    logger.info("Starting data preprocessing...")
    
    preprocessor = MealDataPreprocessor()
    
    try:
        # Extract data
        meal_history = preprocessor.extract_meal_history()
        available_meals = preprocessor.extract_available_meals()
        user_preferences = preprocessor.extract_user_preferences()
        
        if not meal_history.empty and not available_meals.empty:
            # Create features
            history_features, available_features = preprocessor.create_features(meal_history, available_meals)
            
            # Save data
            preprocessor.save_preprocessed_data(meal_history, available_meals, user_preferences)
            
            logger.info("Data preprocessing completed successfully")
        else:
            logger.warning("Insufficient data for preprocessing")
    
    except Exception as e:
        logger.error(f"Preprocessing failed: {e}")
    
    finally:
        preprocessor.close_connection()

if __name__ == "__main__":
    main() 