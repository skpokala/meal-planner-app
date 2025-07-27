#!/usr/bin/env python3
"""
ML API Server for Meal Recommendations
Flask server that serves ML model predictions
"""

from flask import Flask, request, jsonify
from datetime import datetime
import os
import sys
import logging

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from recommend import get_meal_recommendations
from preprocess import MealDataPreprocessor
from train import MealRecommendationTrainer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['DEBUG'] = os.getenv('DEBUG', 'False').lower() == 'true'

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ml-recommendations',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/recommendations', methods=['GET'])
def get_recommendations():
    """Get personalized meal recommendations"""
    try:
        # Parse request parameters
        user_id = request.args.get('user_id')
        meal_id = request.args.get('meal_id')
        meal_type = request.args.get('meal_type')
        top_n = int(request.args.get('top_n', 5))
        
        # Parse context if provided
        context = {}
        if request.args.get('hour'):
            context['hour'] = int(request.args.get('hour'))
        if request.args.get('day_of_week'):
            context['day_of_week'] = request.args.get('day_of_week').lower()
        if request.args.get('month'):
            context['month'] = int(request.args.get('month'))
        
        # Validate parameters
        if top_n < 1 or top_n > 20:
            return jsonify({'error': 'top_n must be between 1 and 20'}), 400
        
        if meal_type and meal_type not in ['breakfast', 'lunch', 'dinner', 'snack']:
            return jsonify({'error': 'Invalid meal_type. Must be one of: breakfast, lunch, dinner, snack'}), 400
        
        # Get recommendations
        recommendations = get_meal_recommendations(
            user_id=user_id,
            meal_id=meal_id,
            meal_type=meal_type,
            context=context if context else None,
            top_n=top_n
        )
        
        # Return results
        if 'error' in recommendations:
            return jsonify(recommendations), 500
        
        return jsonify({
            'success': True,
            'data': recommendations,
            'timestamp': datetime.now().isoformat()
        })
        
    except ValueError as e:
        return jsonify({'error': f'Invalid parameter: {str(e)}'}), 400
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/recommendations', methods=['POST'])
def get_recommendations_post():
    """Get recommendations with POST request (for complex contexts)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        # Extract parameters
        user_id = data.get('user_id')
        meal_id = data.get('meal_id')
        meal_type = data.get('meal_type')
        context = data.get('context', {})
        top_n = data.get('top_n', 5)
        
        # Get recommendations
        recommendations = get_meal_recommendations(
            user_id=user_id,
            meal_id=meal_id,
            meal_type=meal_type,
            context=context,
            top_n=top_n
        )
        
        if 'error' in recommendations:
            return jsonify(recommendations), 500
        
        return jsonify({
            'success': True,
            'data': recommendations,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting recommendations (POST): {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/feedback', methods=['POST'])
def record_feedback():
    """Record user feedback on recommendations"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        required_fields = ['user_id', 'meal_id', 'feedback_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        user_id = data['user_id']
        meal_id = data['meal_id']
        feedback_type = data['feedback_type']  # 'like', 'dislike', 'neutral'
        rating = data.get('rating')  # Optional 1-5 rating
        
        if feedback_type not in ['like', 'dislike', 'neutral']:
            return jsonify({'error': 'feedback_type must be one of: like, dislike, neutral'}), 400
        
        # For now, just log the feedback (in production, you'd store this in database)
        logger.info(f"Feedback recorded: user={user_id}, meal={meal_id}, type={feedback_type}, rating={rating}")
        
        # TODO: Store feedback in database for model retraining
        
        return jsonify({
            'success': True,
            'message': 'Feedback recorded successfully',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error recording feedback: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/train', methods=['POST'])
def trigger_training():
    """Trigger model retraining"""
    try:
        data = request.get_json() or {}
        force_retrain = data.get('force', False)
        
        logger.info("Starting model training...")
        
        # Run preprocessing
        preprocessor = MealDataPreprocessor()
        meal_history = preprocessor.extract_meal_history()
        available_meals = preprocessor.extract_available_meals()
        user_preferences = preprocessor.extract_user_preferences()
        
        if meal_history.empty or available_meals.empty:
            return jsonify({
                'success': False,
                'error': 'Insufficient data for training',
                'details': {
                    'meal_history_count': len(meal_history),
                    'available_meals_count': len(available_meals)
                }
            }), 400
        
        # Save preprocessed data
        preprocessor.save_preprocessed_data(meal_history, available_meals, user_preferences)
        preprocessor.close_connection()
        
        # Train models
        trainer = MealRecommendationTrainer()
        if not trainer.load_data():
            return jsonify({
                'success': False,
                'error': 'Failed to load preprocessed data'
            }), 500
        
        success = trainer.train_all_models()
        
        return jsonify({
            'success': success,
            'message': 'Model training completed' if success else 'Model training failed',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error training models: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/status', methods=['GET'])
def get_status():
    """Get ML service status and model information"""
    try:
        # Try to load model metadata
        models_dir = os.path.join(os.path.dirname(__file__), 'models')
        metadata_path = os.path.join(models_dir, 'metadata.pkl')
        
        model_info = {}
        if os.path.exists(metadata_path):
            import pickle
            with open(metadata_path, 'rb') as f:
                metadata = pickle.load(f)
            model_info = {
                'last_training': metadata.get('training_timestamp', 'Unknown'),
                'models_available': metadata.get('models_trained', []),
                'num_meals': metadata.get('num_meals', 0),
                'num_users': metadata.get('num_users', 0),
                'num_history_records': metadata.get('num_history_records', 0)
            }
        
        return jsonify({
            'service': 'ml-recommendations',
            'status': 'running',
            'models': model_info,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting status: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.getenv('ML_SERVICE_PORT', 5003))
    host = os.getenv('ML_SERVICE_HOST', '0.0.0.0')
    
    logger.info(f"Starting ML API server on {host}:{port}")
    app.run(host=host, port=port, debug=app.config['DEBUG']) 