#!/bin/sh

# Frontend entrypoint script for runtime configuration

# If API_URL is provided as environment variable, inject it into the window object
if [ -n "$API_URL" ]; then
    echo "Configuring runtime API URL: $API_URL"
    # Create a configuration script that sets the API URL
    cat > /usr/share/nginx/html/runtime-config.js << EOF
window.API_URL = '$API_URL';
EOF
    
    # Inject the script into index.html
    sed -i 's|<head>|<head><script src="/runtime-config.js"></script>|' /usr/share/nginx/html/index.html
    
    echo "Runtime API URL configured successfully"
else
    echo "No runtime API URL configured, using default detection"
fi

# Start nginx
exec nginx -g 'daemon off;' 