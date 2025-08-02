# Location Support for Master Data

## Overview

All master data in the Meal Planner application now includes comprehensive location information to enable location-aware meal planning, ingredient sourcing, and personalized recommendations based on user geography.

## Features Added

### 1. Universal Location Schema

A standardized location schema has been implemented across all master data models:

```javascript
{
  address: {
    street: String,      // Street address
    city: String,        // City name
    state: String,       // State/Province
    zipCode: String,     // ZIP/Postal code
    country: String      // Country (default: 'USA')
  },
  coordinates: {
    latitude: Number,    // GPS latitude (-90 to 90)
    longitude: Number    // GPS longitude (-180 to 180)
  },
  timezone: String       // Timezone (default: 'America/New_York')
}
```

### 2. Enhanced Models

#### User Model
- **Location**: Primary user location for inheritance by other entities
- **Usage**: Default location source for all user-created content

#### FamilyMember Model
- **Location**: Individual family member location
- **useParentLocation**: Boolean flag to inherit from creating user (default: true)
- **Usage**: Supports family members in different locations

#### Meal Model
- **Location**: Where the meal is created/popular
- **Cuisine**: Cuisine type (e.g., "Italian", "Mexican")
- **Region**: Regional context (e.g., "Southern USA", "Mediterranean")
- **Usage**: Enable location-based meal recommendations and cultural context

#### MealPlan Model
- **Location**: Where the meal plan will be executed
- **Usage**: Support for vacation planning, business trips, or family visits

#### Ingredient Model
- **Location**: Direct location information (in addition to store location)
- **Seasonality**: 
  - `availableMonths`: Array of months (1-12) when ingredient is available
  - `notes`: Additional seasonality information
- **Usage**: Track seasonal availability and regional ingredient variations

### 3. Location Utilities

A comprehensive set of utilities in `backend/utils/locationHelpers.js`:

#### Core Functions
- `getDefaultLocation()`: Returns default location structure
- `getUserLocation(userId)`: Retrieves user's location
- `hasValidLocationData(location)`: Validates location completeness
- `validateCoordinates(lat, lng)`: Validates GPS coordinates
- `formatFullAddress(address)`: Formats address as string

#### Inheritance Functions
- `inheritLocationFromUser(userId, providedLocation)`: Smart location inheritance
- `resolveFamilyMemberLocation(familyMember)`: Resolves family member location

#### Geographic Functions
- `calculateDistance(lat1, lng1, lat2, lng2)`: Calculate distance in miles using Haversine formula
- `filterByLocationProximity(items, referenceLocation, maxDistance)`: Filter items by proximity

### 4. Database Migration

Automatic migration script (`backend/scripts/add-location-fields-migration.js`):
- Adds location fields to all existing documents
- Preserves existing data integrity
- Provides verification of successful migration
- Can be run safely multiple times (idempotent)

## Usage Examples

### Creating Location-Aware Meals

```javascript
const meal = new Meal({
  name: "Texas BBQ Brisket",
  location: {
    address: {
      city: "Austin",
      state: "Texas",
      country: "USA"
    },
    coordinates: {
      latitude: 30.2672,
      longitude: -97.7431
    }
  },
  cuisine: "American BBQ",
  region: "Southern USA"
});
```

### Family Member Location Inheritance

```javascript
// Family member using parent location
const familyMember1 = new FamilyMember({
  firstName: "John",
  lastName: "Doe",
  useParentLocation: true,
  createdBy: userId
});

// Family member with custom location
const familyMember2 = new FamilyMember({
  firstName: "Jane",
  lastName: "Doe",
  useParentLocation: false,
  location: {
    address: {
      city: "New York",
      state: "NY",
      country: "USA"
    }
  },
  createdBy: userId
});
```

### Seasonal Ingredient Tracking

```javascript
const ingredient = new Ingredient({
  name: "Fresh Strawberries",
  location: {
    address: {
      city: "Salinas",
      state: "California",
      country: "USA"
    }
  },
  seasonality: {
    availableMonths: [4, 5, 6, 7, 8], // April to August
    notes: "Peak season June-July in California"
  }
});
```

### Location-Based Filtering

```javascript
const userLocation = await getUserLocation(userId);
const nearbyMeals = filterByLocationProximity(meals, userLocation, 50); // Within 50 miles
```

## API Integration

### Automatic Location Inheritance
When creating new entities, the system can automatically inherit location from the user:

```javascript
// In route handlers
const location = await inheritLocationFromUser(req.user.id, req.body.location);
const meal = new Meal({
  ...req.body,
  location,
  createdBy: req.user.id
});
```

### Distance-Based Queries
Support for proximity-based recommendations and filtering:

```javascript
const nearbyStores = stores.filter(store => {
  const distance = calculateDistance(
    userLat, userLng,
    store.location.coordinates.latitude,
    store.location.coordinates.longitude
  );
  return distance <= 25; // Within 25 miles
});
```

## Benefits

### For Users
1. **Personalized Recommendations**: Location-aware meal suggestions
2. **Seasonal Awareness**: Ingredient availability based on location and season
3. **Travel Support**: Meal planning for different locations
4. **Local Discovery**: Find meals popular in specific regions

### For Developers
1. **Standardized Schema**: Consistent location handling across all models
2. **Rich Utilities**: Comprehensive helper functions for location operations
3. **Migration Support**: Safe upgrade path for existing data
4. **Extensible Design**: Easy to add new location-based features

### For Machine Learning
1. **Geographic Context**: Enhanced recommendation accuracy
2. **Seasonal Patterns**: Better ingredient and meal suggestions
3. **Cultural Preferences**: Region-based cuisine recommendations
4. **Supply Chain Optimization**: Location-aware ingredient sourcing

## Migration Instructions

### For Existing Installations

1. **Run Migration**:
   ```bash
   cd backend
   node scripts/add-location-fields-migration.js
   ```

2. **Verify Results**:
   - Check console output for successful migration
   - All existing documents will have default location structure
   - No data loss or corruption

3. **Update User Locations**:
   - Encourage users to update their profile with location information
   - Location data will be inherited by new meals, plans, and ingredients

### For New Installations
- Location fields are automatically included in all new documents
- Default location structure is applied when no specific location is provided

## Technical Notes

### Performance Considerations
- Location fields are optional in most contexts
- Coordinates allow for efficient geographic queries
- Indexes can be added on location fields for large datasets

### Data Privacy
- Location data is stored per-user and per-entity
- No automatic location detection (user must provide)
- Location sharing is controlled by user preferences

### Backwards Compatibility
- All existing API endpoints continue to work unchanged
- Location fields are optional in API requests
- Default values ensure no breaking changes

## Future Enhancements

### Planned Features
1. **Geocoding Integration**: Automatic coordinate lookup from addresses
2. **Weather Integration**: Weather-aware meal suggestions
3. **Local Store API**: Integration with local grocery store APIs
4. **Route Optimization**: Efficient shopping trip planning
5. **Delivery Integration**: Location-based delivery options

### Extension Points
- Custom location providers
- Third-party mapping services integration
- Advanced geographic analytics
- Multi-location user support 