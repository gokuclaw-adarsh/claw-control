#!/bin/sh
# Generate runtime config from environment variables
# This runs at container startup, allowing Railway env vars to be injected

CONFIG_FILE="/app/config.js"

# Build the config object
echo "// Runtime config - generated at container startup" > $CONFIG_FILE
echo "window.__CLAW_CONFIG__ = {" >> $CONFIG_FILE

# API URL - required for connecting to backend
if [ -n "$VITE_API_URL" ]; then
  echo "  API_URL: \"$VITE_API_URL\"," >> $CONFIG_FILE
elif [ -n "$API_URL" ]; then
  echo "  API_URL: \"$API_URL\"," >> $CONFIG_FILE
fi

# API Key - required for authenticated write operations (POST/PUT/DELETE)
if [ -n "$VITE_API_KEY" ]; then
  echo "  API_KEY: \"$VITE_API_KEY\"," >> $CONFIG_FILE
elif [ -n "$API_KEY" ]; then
  echo "  API_KEY: \"$API_KEY\"," >> $CONFIG_FILE
fi

echo "};" >> $CONFIG_FILE

echo "Generated config.js:"
cat $CONFIG_FILE

# Start the production SPA server (no directory listing)
exec serve -s /app -l ${PORT:-8080}
