const { networkInterfaces } = require('os');

// Detect local IP address
const getLocalIp = () => {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
};

const localIp = getLocalIp();
const BACKEND_PORT = 8787;
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;
const resolvedApiUrl = configuredApiUrl || `http://${localIp}:${BACKEND_PORT}`;

console.log(`[app.config] Detected local IP: ${localIp}`);
console.log(`[app.config] API URL will be: ${resolvedApiUrl}`);

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    // Dynamic API URL for local development only. Production overrides it
    // through EXPO_PUBLIC_API_URL in eas.json.
    localApiUrl: resolvedApiUrl,
  },
});
