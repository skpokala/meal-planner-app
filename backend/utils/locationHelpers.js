const User = require('../models/User');

/**
 * Default location structure
 */
const getDefaultLocation = () => ({
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  },
  coordinates: {
    latitude: null,
    longitude: null
  },
  timezone: 'America/New_York'
});

/**
 * Get user's location information
 * @param {String} userId - The user ID
 * @returns {Object} User's location or default location
 */
const getUserLocation = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (user && user.location && hasValidLocationData(user.location)) {
      return user.location;
    }
    return getDefaultLocation();
  } catch (error) {
    console.error('Error fetching user location:', error);
    return getDefaultLocation();
  }
};

/**
 * Check if location data has valid information
 * @param {Object} location - Location object to validate
 * @returns {Boolean} True if location has some valid data
 */
const hasValidLocationData = (location) => {
  if (!location) return false;
  
  const hasAddress = location.address && (
    location.address.street ||
    location.address.city ||
    location.address.state ||
    location.address.zipCode
  );
  
  const hasCoordinates = location.coordinates &&
    location.coordinates.latitude !== null &&
    location.coordinates.longitude !== null;
  
  return hasAddress || hasCoordinates;
};

/**
 * Validate coordinates
 * @param {Number} latitude - Latitude value
 * @param {Number} longitude - Longitude value
 * @returns {Boolean} True if coordinates are valid
 */
const validateCoordinates = (latitude, longitude) => {
  if (latitude === null || longitude === null) return true; // Allow null values
  
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  
  return !isNaN(lat) && !isNaN(lng) &&
         lat >= -90 && lat <= 90 &&
         lng >= -180 && lng <= 180;
};

/**
 * Format full address string
 * @param {Object} address - Address object
 * @returns {String} Formatted address string
 */
const formatFullAddress = (address) => {
  if (!address) return '';
  
  const parts = [
    address.street,
    address.city,
    address.state,
    address.zipCode,
    address.country
  ].filter(part => part && part.trim());
  
  return parts.join(', ');
};

/**
 * Inherit location from user for new documents
 * @param {String} userId - The user ID
 * @param {Object} providedLocation - Optional location provided in request
 * @returns {Object} Final location to use
 */
const inheritLocationFromUser = async (userId, providedLocation = null) => {
  // If location is explicitly provided and has valid data, use it
  if (providedLocation && hasValidLocationData(providedLocation)) {
    return providedLocation;
  }
  
  // Otherwise, inherit from user
  return await getUserLocation(userId);
};

/**
 * Resolve family member location (either own location or parent location)
 * @param {Object} familyMember - FamilyMember document
 * @returns {Object} Resolved location
 */
const resolveFamilyMemberLocation = async (familyMember) => {
  // If family member has their own location and doesn't use parent location
  if (!familyMember.useParentLocation && hasValidLocationData(familyMember.location)) {
    return familyMember.location;
  }
  
  // Use parent (creator) location
  return await getUserLocation(familyMember.createdBy);
};

/**
 * Calculate distance between two coordinate points (in miles)
 * Uses Haversine formula
 * @param {Number} lat1 - Latitude of first point
 * @param {Number} lng1 - Longitude of first point
 * @param {Number} lat2 - Latitude of second point
 * @param {Number} lng2 - Longitude of second point
 * @returns {Number} Distance in miles
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  if (!validateCoordinates(lat1, lng1) || !validateCoordinates(lat2, lng2)) {
    return null;
  }
  
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Filter items by location proximity
 * @param {Array} items - Array of items with location data
 * @param {Object} referenceLocation - Reference location to compare against
 * @param {Number} maxDistance - Maximum distance in miles (default: 50)
 * @returns {Array} Filtered items within distance
 */
const filterByLocationProximity = (items, referenceLocation, maxDistance = 50) => {
  if (!referenceLocation || !referenceLocation.coordinates) {
    return items; // Return all items if no reference location
  }
  
  const refLat = referenceLocation.coordinates.latitude;
  const refLng = referenceLocation.coordinates.longitude;
  
  if (!validateCoordinates(refLat, refLng)) {
    return items;
  }
  
  return items.filter(item => {
    if (!item.location || !item.location.coordinates) {
      return true; // Include items without coordinates
    }
    
    const itemLat = item.location.coordinates.latitude;
    const itemLng = item.location.coordinates.longitude;
    
    if (!validateCoordinates(itemLat, itemLng)) {
      return true; // Include items with invalid coordinates
    }
    
    const distance = calculateDistance(refLat, refLng, itemLat, itemLng);
    return distance === null || distance <= maxDistance;
  });
};

module.exports = {
  getDefaultLocation,
  getUserLocation,
  hasValidLocationData,
  validateCoordinates,
  formatFullAddress,
  inheritLocationFromUser,
  resolveFamilyMemberLocation,
  calculateDistance,
  filterByLocationProximity
}; 