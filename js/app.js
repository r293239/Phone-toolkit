// ---- Theme Toggle ----
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  document.body.classList.add('light-mode');
  themeIcon.classList.replace('fa-moon', 'fa-sun');
}
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  if (document.body.classList.contains('light-mode')) {
    themeIcon.classList.replace('fa-moon', 'fa-sun');
    localStorage.setItem('theme', 'light');
  } else {
    themeIcon.classList.replace('fa-sun', 'fa-moon');
    localStorage.setItem('theme', 'dark');
  }
});

// ---- Navigation ----
document.querySelectorAll('.card').forEach(btn => {
  btn.addEventListener('click', () => {
    const tool = btn.dataset.tool;
    showView(tool + 'View');
    initTool(tool);
  });
});

document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', () => showView('dashboard'));
});

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
}

// ---- Tool Initializers ----
function initTool(tool) {
  switch(tool) {
    case 'thermometer': startThermometer(); break;
    case 'weather': startWeather(); break;
    case 'compass': startCompass(); break;
    case 'gps': startGPS(); break;
    case 'transit': startTransit(); break;
    case 'navigation': startNavigation(); break;
    case 'elevation': startElevation(); break;
    case 'camera': startCamera(); break;
    case 'features': showFeatures(); break;
    case 'cooling': startCooling(); break;
    case 'flashlight': startFlashlight(); break;
    case 'level': startLevel(); break;
    case 'airplane': startAirplane(); break;
  }
}

// ---------- THERMOMETER & WEATHER ----------
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&hourly=relativehumidity_2m`;
  const res = await fetch(url);
  return res.json();
}

function getWeatherDesc(code) {
  const desc = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
    55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
    85: 'Slight snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm',
    96: 'T-storm + hail', 99: 'T-storm + heavy hail'
  };
  return desc[code] || 'Unknown';
}

function startThermometer() {
  if (!navigator.geolocation) {
    document.getElementById('tempValue').textContent = 'No GPS';
    return;
  }
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;
    const data = await fetchWeather(latitude, longitude);
    const temp = data.current_weather.temperature;
    document.getElementById('tempValue').textContent = temp + '°C';
    const percent = Math.min(100, Math.max(0, ((temp + 10) / 50) * 100));
    document.querySelector('.mercury').style.height = percent + '%';
    const humidity = data.hourly.relativehumidity_2m[0];
    const wind = data.current_weather.windspeed;
    const desc = getWeatherDesc(data.current_weather.weathercode);
    document.getElementById('weatherExtra').innerHTML = `
      <p>${desc}</p>
      <p>Humidity: ${humidity}%</p>
      <p>Wind: ${wind} km/h</p>
    `;
  }, () => {
    document.getElementById('tempValue').textContent = 'Location denied';
  });
}

function startWeather() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;
    const data = await fetchWeather(latitude, longitude);
    const daily = data.daily;
    let html = `<p><strong>Now:</strong> ${data.current_weather.temperature}°C, ${getWeatherDesc(data.current_weather.weathercode)} (wind ${data.current_weather.windspeed} km/h)</p>`;
    html += '<h3>7-Day Forecast</h3><ul>';
    for(let i=0; i<7; i++) {
      const day = new Date(daily.time[i]).toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'});
      const wcode = daily.weathercode[i];
      const icon = getWeatherIcon(wcode);
      html += `<li>${day}: ${daily.temperature_2m_max[i]}° / ${daily.temperature_2m_min[i]}° ${icon} – ${getWeatherDesc(wcode)}</li>`;
    }
    html += '</ul>';
    document.getElementById('weatherContent').innerHTML = html;
  }, () => {
    document.getElementById('weatherContent').innerHTML = 'Location access needed for weather.';
  });
}

function getWeatherIcon(code) {
  if (code <= 3) return '☀️';
  if (code <= 48) return '☁️';
  if (code <= 57) return '🌧️';
  if (code <= 67) return '❄️';
  if (code <= 82) return '🌧️';
  return '⛈️';
}

// ---------- COMPASS ----------
function startCompass() {
  const arrow = document.querySelector('.compass-rose');
  const headingP = document.getElementById('compassHeading');
  const dirP = document.getElementById('compassDirection');
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (event) => {
      const heading = event.webkitCompassHeading || Math.abs(event.alpha - 360);
      arrow.style.transform = `rotate(${heading}deg)`;
      headingP.textContent = Math.round(heading) + '°';
      dirP.textContent = getCompassDirection(heading);
    });
  } else {
    headingP.textContent = 'Compass not supported';
  }
}

function getCompassDirection(deg) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}

// ---------- GPS ----------
function startGPS() {
  const div = document.getElementById('gpsData');
  if (!navigator.geolocation) {
    div.textContent = 'Geolocation not supported.';
    return;
  }
  navigator.geolocation.watchPosition(pos => {
    const c = pos.coords;
    div.innerHTML = `
      <p>Latitude: ${c.latitude.toFixed(6)}</p>
      <p>Longitude: ${c.longitude.toFixed(6)}</p>
      <p>Altitude: ${c.altitude ? c.altitude.toFixed(1) + ' m' : 'N/A'}</p>
      <p>Accuracy: ${c.accuracy.toFixed(1)} m</p>
      <p>Speed: ${c.speed ? (c.speed*3.6).toFixed(1) + ' km/h' : 'N/A'}</p>
    `;
  }, err => div.textContent = 'Error: ' + err.message);
}

// ---------- TRANSIT (with Leaflet map) ----------
let transitMap;
async function startTransit() {
  const div = document.getElementById('transitList');
  if (!navigator.geolocation) {
    div.textContent = 'Geolocation needed.';
    return;
  }
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;
    if (!transitMap) {
      transitMap = L.map('transitMap').setView([latitude, longitude], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(transitMap);
    } else {
      transitMap.setView([latitude, longitude], 15);
    }
    transitMap.eachLayer(layer => {
      if (layer instanceof L.Marker) transitMap.removeLayer(layer);
    });
    L.marker([latitude, longitude]).addTo(transitMap).bindPopup('You are here').openPopup();

    const radius = 500;
    const query = `[out:json];(node["highway"="bus_stop"](around:${radius},${latitude},${longitude});node["public_transport"="platform"](around:${radius},${latitude},${longitude}););out body;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.elements.length === 0) {
        div.innerHTML = 'No stops found nearby.';
        return;
      }
      let html = '<ul>';
      data.elements.forEach(el => {
        const name = el.tags?.name || 'Unnamed stop';
        html += `<li>${name}</li>`;
        if (el.lat && el.lon) {
          L.marker([el.lat, el.lon]).addTo(transitMap).bindPopup(name);
        }
      });
      html += '</ul>';
      div.innerHTML = html;
    } catch(e) {
      div.textContent = 'Failed to load transit data.';
    }
  });
}

// ---------- NAVIGATION ----------
let navMap = null;
let currentLatLng = null;

function startNavigation() {
  if (!navMap) {
    navMap = L.map('navigationMap').setView([0, 0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(navMap);
    document.getElementById('startNavBtn').addEventListener('click', handleNavigationRoute);
  }
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      currentLatLng = { lat: latitude, lng: longitude };
      navMap.setView([latitude, longitude], 14);
      navMap.eachLayer(layer => {
        if (layer instanceof L.Marker) navMap.removeLayer(layer);
      });
      L.marker([latitude, longitude])
        .addTo(navMap)
        .bindPopup('You are here')
        .openPopup();
    }, err => {
      alert('Could not get location: ' + err.message);
    });
  } else {
    alert('Geolocation not supported');
  }
}

async function handleNavigationRoute() {
  const input = document.getElementById('destinationInput').value.trim();
  if (!input) {
    alert('Please enter a destination');
    return;
  }
  if (!currentLatLng) {
    alert('Your location is not yet available. Please wait or grant permission.');
    return;
  }
  const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}`;
  const geoRes = await fetch(nomUrl).then(r => r.json());
  if (geoRes.length === 0) {
    alert('Place not found');
    return;
  }
  const dest = geoRes[0];
  const destLatLng = [parseFloat(dest.lat), parseFloat(dest.lon)];
  L.marker(destLatLng).addTo(navMap).bindPopup(dest.display_name);
  const { lat, lng } = currentLatLng;
  const routeUrl = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${dest.lon},${dest.lat}?overview=full&geometries=geojson`;
  const routeRes = await fetch(routeUrl).then(r => r.json());
  if (routeRes.code !== 'Ok') {
    alert('No route found');
    return;
  }
  const routeCoords = routeRes.routes[0].geometry.coordinates;
  const polyline = L.polyline(
    routeCoords.map(c => [c[1], c[0]]),
    { color: '#38bdf8', weight: 5 }
  ).addTo(navMap);
  navMap.fitBounds(polyline.getBounds());
  const dist = (routeRes.routes[0].distance / 1000).toFixed(1);
  const dur = Math.round(routeRes.routes[0].duration / 60);
  document.getElementById('navigationInfo').textContent = `Distance: ${dist} km, Duration: ${dur} min`;
}

// ---------- ELEVATION ----------
function startElevation() {
  const div = document.getElementById('elevationData');
  if (!navigator.geolocation) {
    div.textContent = 'Geolocation not supported';
    return;
  }
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude, altitude } = pos.coords;
    let gpsAlt = altitude ? `${altitude.toFixed(1)} m (GPS)` : 'GPS altitude unavailable';
    try {
      const res = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${latitude},${longitude}`);
      const data = await res.json();
      const demAlt = data.results[0].elevation.toFixed(1);
      div.innerHTML = `DEM elevation: ${demAlt} m<br>${gpsAlt}`;
    } catch {
      div.textContent = gpsAlt;
    }
  });
}

// ---------- CAMERA ----------
let cameraStream;
async function startCamera() {
  const video = document.getElementById('cameraPreview');
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = cameraStream;
  } catch (e) {
    alert('Camera access denied');
  }
  document.getElementById('captureBtn').onclick = () => {
    const canvas = document.getElementById('cameraCanvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const img = document.getElementById('capturedImage');
    img.src = canvas.toDataURL('image/png');
    img.style.display = 'block';
  };
}

document.querySelectorAll('.back-btn').forEach(b => {
  b.addEventListener('click', () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }
  });
});

// ---------- DEVICE FEATURES ----------
function showFeatures() {
  const features = [];
  features.push(`Screen: ${screen.width}x${screen.height} (colorDepth: ${screen.colorDepth})`);
  features.push(`Touch: ${('ontouchstart' in window) ? 'Yes' : 'No'}`);
  features.push(`Platform: ${navigator.platform}`);
  
  // Device model detection (improved)
  let model = 'Not detected';
  if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
    navigator.userAgentData.getHighEntropyValues(['model']).then(ua => {
      if (ua.model) {
        features.splice(3, 0, `Device Model: ${ua.model}`);
      } else {
        features.splice(3, 0, `Device Model: ${guessModel()}`);
      }
      updateFeaturesList();
    });
  } else {
    model = guessModel();
    features.splice(3, 0, `Device Model: ${model}`);
  }
  
  features.push(`Vibration: ${('vibrate' in navigator) ? 'Supported' : 'No'}`);
  if ('connection' in navigator) {
    const conn = navigator.connection;
    features.push(`Network: ${conn.effectiveType} (downlink: ${conn.downlink} Mbps)`);
  }
  if ('getBattery' in navigator) {
    navigator.getBattery().then(b => {
      features.push(`Battery: ${Math.round(b.level*100)}% ${b.charging ? '(charging)' : ''}`);
      updateFeaturesList();
    });
  }
  features.push(`Device Memory: ${navigator.deviceMemory || 'unknown'} GB`);
  features.push(`Languages: ${navigator.languages.join(', ')}`);
  
  function guessModel() {
    const ua = navigator.userAgent;
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) {
      const match = ua.match(/\(Android.*?;\s*([^;)]+?)\s*(?:Build|;)/);
      if (match) return match[1].trim();
    }
    return 'Unknown';
  }
  
  function updateFeaturesList() {
    document.getElementById('featuresList').innerHTML = features.map(f => `<p>${f}</p>`).join('');
  }
  updateFeaturesList();
}

// ---------- COOLING ----------
let coolingInterval;
let coolingActive = false;

function startCooling() {
  const btn = document.getElementById('startCoolingBtn');
  const fan = document.getElementById('coolingFan');
  const tempEl = document.getElementById('coolingTemp');
  
  btn.onclick = () => {
    if (coolingActive) {
      clearInterval(coolingInterval);
      if (navigator.vibrate) navigator.vibrate(0);
      fan.classList.remove('spinning');
      btn.textContent = 'Start Cooling';
      coolingActive = false;
      return;
    }
    
    coolingActive = true;
    btn.textContent = 'Stop Cooling';
    fan.classList.add('spinning');
    
    let temp = 40;
    tempEl.textContent = temp + '°C';
    
    if (navigator.vibrate) {
      navigator.vibrate([100, 400]);
      coolingInterval = setInterval(() => {
        navigator.vibrate([100, 400]);
        temp -= 1;
        if (temp <= 35) {
          temp = 35;
          clearInterval(coolingInterval);
          navigator.vibrate(0);
          fan.classList.remove('spinning');
          btn.textContent = 'Start Cooling';
          coolingActive = false;
        }
        tempEl.textContent = temp + '°C';
      }, 1000);
    } else {
      coolingInterval = setInterval(() => {
        temp -= 1;
        if (temp <= 35) {
          temp = 35;
          clearInterval(coolingInterval);
          fan.classList.remove('spinning');
          btn.textContent = 'Start Cooling';
          coolingActive = false;
        }
        tempEl.textContent = temp + '°C';
      }, 1000);
    }
  };
}

// ---------- FLASHLIGHT ----------
let torchTrack;
async function startFlashlight() {
  const btn = document.getElementById('torchToggle');
  btn.onclick = async () => {
    if (torchTrack) {
      torchTrack.applyConstraints({ advanced: [{ torch: false }] });
      btn.textContent = 'Turn On';
      torchTrack = null;
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const track = stream.getVideoTracks()[0];
      await track.applyConstraints({ advanced: [{ torch: true }] });
      torchTrack = track;
      btn.textContent = 'Turn Off';
    } catch (e) {
      alert('Torch not available: ' + e.message);
    }
  };
}

// ---------- LEVEL (replaces old gyroscope) ----------
let levelActive = false;
function startLevel() {
  if (levelActive) return;
  
  const bubble = document.querySelector('.level-bubble');
  const pitchSpan = document.getElementById('pitchValue');
  const rollSpan = document.getElementById('rollValue');
  
  // iOS permission request
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(state => {
        if (state === 'granted') enableLevel();
        else alert('Motion permission denied');
      })
      .catch(console.error);
  } else {
    enableLevel();
  }
  
  function enableLevel() {
    levelActive = true;
    window.addEventListener('deviceorientation', handleOrientation);
  }
  
  function handleOrientation(e) {
    const beta  = e.beta  || 0;  // pitch (forward/back tilt)
    const gamma = e.gamma || 0;  // roll (left/right tilt)
    
    // Update numbers
    pitchSpan.textContent = beta.toFixed(1) + '°';
    rollSpan.textContent = gamma.toFixed(1) + '°';
    
    // Bubble movement: translate based on gamma (X) and beta (Y)
    // Max movement: 50px from center (half the dial radius minus bubble radius)
    const maxMove = 70; // pixels
    const moveX = Math.max(-maxMove, Math.min(maxMove, gamma * (maxMove / 45)));
    const moveY = Math.max(-maxMove, Math.min(maxMove, -beta * (maxMove / 45))); // negative because beta goes opposite
    bubble.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
  }
}

// ---------- AIRPLANE MODE ----------
function startAirplane() {
  const btn = document.getElementById('airplaneToggle');
  const status = document.getElementById('airplaneStatus');
  let isOn = false;
  
  btn.onclick = () => {
    isOn = !isOn;
    if (isOn) {
      btn.innerHTML = '<i class="fa-solid fa-plane"></i> Disable Airplane Mode';
      btn.style.background = '#ef4444';
      status.textContent = 'Airplane mode is ON (simulated – no actual change)';
    } else {
      btn.innerHTML = '<i class="fa-solid fa-plane"></i> Enable Airplane Mode';
      btn.style.background = '';
      status.textContent = 'Airplane mode is OFF';
    }
  };
}
