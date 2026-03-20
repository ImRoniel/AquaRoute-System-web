const axios = require('axios');
// const admin = require('../config/firebase');
const Bottleneck = require('bottleneck');
const { db } = require('../config/firebase');  


// Rate limiter: 1 call per second = 60 per minute
const limiter = new Bottleneck({
  minTime: 1000,      // 1 second between calls
  maxConcurrent: 1
});

// Convert OpenWeather response to your WeatherCondition model
function mapToWeatherCondition(data, locationName) {
  const weather = data.weather[0];
  const main = data.main;
  const wind = data.wind;

  const iconMap = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '⛅',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌦️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '🌨️', '13n': '🌨️',
    '50d': '🌫️', '50n': '🌫️'
  };
  const icon = iconMap[weather.icon] || '☀️';

  const hasAdvisory = wind.speed > 15 || weather.main === 'Thunderstorm';
  let advisoryMessage = null;
  if (wind.speed > 20) advisoryMessage = 'High wind warning';
  else if (wind.speed > 15) advisoryMessage = 'Strong wind advisory';
  else if (weather.main === 'Thunderstorm') advisoryMessage = 'Thunderstorm warning';

  return {
    location: locationName,
    condition: weather.description,
    icon: icon,
    temperature: main.temp,
    feelsLike: main.feels_like,
    humidity: main.humidity,
    waves: estimateWaveHeight(wind.speed),
    windSpeed: `${wind.speed} m/s`,
    windDirection: degToCompass(wind.deg),
    visibility: data.visibility ? `${(data.visibility / 1000).toFixed(1)} km` : '10 km',
    pressure: `${main.pressure} hPa`,
    hasAdvisory: hasAdvisory,
    advisoryMessage: advisoryMessage,
    updatedAt: Date.now()
  };
}

function estimateWaveHeight(windSpeed) {
  if (windSpeed < 3) return '0.2m';
  if (windSpeed < 6) return '0.5m';
  if (windSpeed < 10) return '1.0m';
  if (windSpeed < 14) return '1.8m';
  if (windSpeed < 18) return '2.5m';
  return '3.5m+';
}

function degToCompass(deg) {
  const val = Math.floor((deg / 22.5) + 0.5);
  const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return arr[(val % 16)];
}

// The actual update function (rate limited)
async function updateWeatherForPort(portId) {
  try {
    // Get port details from Firestore
    const portDoc = await db.collection('ports').doc(portId).get();
    if (!portDoc.exists) {
      console.error(`Port ${portId} not found`);
      return;
    }
    const port = portDoc.data();

    // Build OpenWeather URL using lat and lng (coordinates only — name-based queries cause 404 errors)
    if (!port.lat || !port.lng) {
      console.warn(`⚠️ Skipping port "${port.name}" (${portId}): missing lat/lng coordinates.`);
      return;
    }
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${port.lat}&lon=${port.lng}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;

    const response = await axios.get(url);
    const weatherCondition = mapToWeatherCondition(response.data, port.name);

    // Update Firestore
    await db.collection('weather').doc(portId).set(weatherCondition, { merge: true });
    console.log(`✅ Updated weather for ${port.name} (${portId})`);
  } catch (error) {
    // If port exists, log its name; otherwise just log portId
    const portName = port?.name || portId;
    console.error(`OpenWeather error for ${portName}:`, error.response?.data || error.message);
  }
}
// Wrapped with rate limiter
const updateWeatherForPortLimited = limiter.wrap(updateWeatherForPort);

// Public function: given an array of port IDs, queue updates for stale ones
async function refreshWeatherForPorts(portIds) {
  const now = Date.now();
  const STALE_THRESHOLD = 60 * 60 * 1000; // 1 hour

  const stalePorts = [];

  for (const portId of portIds) {
    const weatherDoc = await db.collection('weather').doc(portId).get();
    if (!weatherDoc.exists) {
      stalePorts.push(portId); // no data → definitely stale
    } else {
      const lastUpdated = weatherDoc.data().updatedAt;
      if (now - lastUpdated > STALE_THRESHOLD) {
        stalePorts.push(portId);
      }
    }
  }

  // Queue each stale port update (rate limited)
  stalePorts.forEach(portId => {
    updateWeatherForPortLimited(portId).catch(err => console.error(err));
  });

  return { queued: stalePorts.length };
}

module.exports = { refreshWeatherForPorts };