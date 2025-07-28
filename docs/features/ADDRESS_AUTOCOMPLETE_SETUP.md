# Address Autocomplete Setup

This application uses **Nominatim** (OpenStreetMap) API for address autocomplete functionality in the stores page.

## Features

- **Completely Free**: No API key required, unlimited requests
- **Open Source**: Powered by OpenStreetMap community data
- **No Registration**: Works out of the box without any setup
- **Reliable**: Stable service backed by the OpenStreetMap Foundation
- **Global Coverage**: Worldwide address data

## Why Nominatim?

After testing multiple geocoding services, we chose Nominatim because:
- **Zero cost**: No API keys, no rate limits, no billing
- **Privacy-friendly**: No tracking or data collection
- **Community-driven**: Powered by OpenStreetMap's collaborative data
- **Immediate availability**: Works instantly without setup

## No Setup Required!

Unlike other geocoding services, Nominatim requires **zero configuration**:

- ✅ **No API keys** to obtain or manage
- ✅ **No registration** or account creation needed
- ✅ **No rate limits** to worry about
- ✅ **No billing** or cost concerns
- ✅ **Works immediately** after deployment

The application is ready to use out of the box!

## API Usage

The address autocomplete component:
- Searches for US addresses only (`countrycodes=us`)
- Returns up to 5 suggestions (`limit=5`)
- Provides detailed address components (`addressdetails=1`)
- Uses proper User-Agent header for API compliance

## Testing

The component includes comprehensive tests that mock the Nominatim API responses. All tests pass and verify:
- Address suggestion display
- Selection functionality
- Loading states
- Error handling
- Input validation

## Reliable Performance

Nominatim provides:
- **Stable service**: Backed by the OpenStreetMap Foundation
- **Global infrastructure**: Multiple server locations worldwide
- **Regular updates**: Data updated continuously by OSM contributors
- **Graceful degradation**: Handles network issues elegantly

## Data Quality

- **Community-maintained**: Millions of contributors worldwide
- **Continuously updated**: Real-time updates from OSM community
- **Comprehensive coverage**: Detailed address data globally
- **Structured format**: Consistent, well-formatted address components

## Privacy & Ethics

- **No tracking**: Your searches are not stored or tracked
- **Open data**: Based on community-contributed OpenStreetMap data
- **Transparent**: Open-source service with public infrastructure
- **Ethical**: No data harvesting or user profiling

## Performance Optimization

The implementation includes:
- **Debounced requests**: 300ms delay to prevent excessive API calls
- **Minimum query length**: Only searches for 3+ character queries
- **Proper User-Agent**: Identifies the application to the API
- **Error handling**: Graceful fallback when API is unavailable

## Ready for Production

This Nominatim implementation is production-ready with:
- ✅ **Zero configuration** required
- ✅ **No API keys** to manage or expire
- ✅ **No rate limits** to monitor
- ✅ **No costs** to track or budget
- ✅ **Reliable uptime** backed by OSM Foundation
- ✅ **Privacy-friendly** with no user tracking 