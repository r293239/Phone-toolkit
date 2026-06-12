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
    case 'cooling': break; // purely CSS animation
    case 'flashlight': startFlashlight(); break;
    case 'gyroscope': startGyroscope(); break;
  }
}

// ---------- THERMOMETER & WEATHER ----------
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
  const res = await fetch(url);
  return res.json();
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
    // adjust mercury height (mocked range -10 to 40°C)
    const percent = Math.min(100, Math.max(0, ((temp + 10) / 50) * 100));
    document.querySelector('.mercury').style.height = percent + '%';
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
    let html = `<p><strong>Now:</strong> ${data.current_weather.temperature}°C (wind ${data.current_weather.windspeed} km/h)</p>`;
    html += '<h3>7-Day Forecast</h3><ul>';
    for(let i=0; i<7; i++) {
      const day = new Date(daily.time[i]).toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'});
      const wcode = daily.weathercode[i];
      const icon = getWeatherIcon(wcode);
      html += `<li>${day}: ${daily.temperature_2m_max[i]}° / ${daily.temperature_2m_min[i]}° ${icon}</li>`;
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
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (event) => {
      const heading = event.webkitCompassHeading || Math.abs(event.alpha - 360);
      arrow.style.transform = `rotate(${heading}deg)`;
      headingP.textContent = Math.round(heading) + '°';
    });
  } else {
    headingP.textContent = 'Compass not supported';
  }
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

// ---------- TRANSIT (Overpass) ----------
async function startTransit() {
  const div = document.getElementById('transitList');
  if (!navigator.geolocation) {
    div.textContent = 'Geolocation needed.';
    return;
  }
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;
    const radius = 500; // meters
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
      });
      html += '</ul>';
      div.innerHTML = html;
    } catch(e) {
      div.textContent = 'Failed to load transit data.';
    }
  });
}

// ---------- NAVIGATION (Leaflet + OSRM) ----------
let navMap;
function startNavigation() {
  if (!navMap) {
    navMap = L.map('navigationMap').setView([0, 0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(navMap);
  }
  // locate user
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    navMap.setView([lat, lng], 14);
    L.marker([lat, lng]).addTo(navMap).bindPopup('You are here').openPopup();
    window.currentLatLng = { lat, lng };
  });

  document.getElementById('startNavBtn').onclick = async () => {
    const input = document.getElementById('destinationInput').value;
    if (!input) return;
    // Geocode destination with Nominatim
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}`;
    const geoRes = await fetch(nomUrl).then(r => r.json());
    if (geoRes.length === 0) return alert('Place not found');
    const dest = geoRes[0];
    const destLatLng = [parseFloat(dest.lat), parseFloat(dest.lon)];
    L.marker(destLatLng).addTo(navMap).bindPopup(dest.display_name);

    // Route via OSRM
    const { lat, lng } = window.currentLatLng;
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${dest.lon},${dest.lat}?overview=full&geometries=geojson`;
    const routeRes = await fetch(routeUrl).then(r => r.json());
    if (routeRes.code !== 'Ok') return alert('No route found');
    const routeCoords = routeRes.routes[0].geometry.coordinates;
    const polyline = L.polyline(routeCoords.map(c => [c[1], c[0]]), {color: '#38bdf8'}).addTo(navMap);
    navMap.fitBounds(polyline.getBounds());
    const dist = (routeRes.routes[0].distance / 1000).toFixed(1);
    const dur = Math.round(routeRes.routes[0].duration / 60);
    document.getElementById('navigationInfo').textContent = `Distance: ${dist} km, Duration: ${dur} min`;
  };
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
    // Open-Elevation lookup
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

// cleanup camera when leaving view
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
  features.push(`Vibration: ${('vibrate' in navigator) ? 'Supported' : 'No'}`);
  if ('connection' in navigator) {
    const conn = navigator.connection;
    features.push(`Network: ${conn.effectiveType} (downlink: ${conn.downlink} Mbps)`);
  }
  if ('getBattery' in navigator) {
    navigator.getBattery().then(b => {
      features.push(`Battery: ${Math.round(b.level*100)}% ${b.charging ? '(charging)' : ''}`);
    });
  }
  features.push(`Device Memory: ${navigator.deviceMemory || 'unknown'} GB`);
  features.push(`Languages: ${navigator.languages.join(', ')}`);
  document.getElementById('featuresList').innerHTML = features.map(f => `<p>${f}</p>`).join('');
}

// ---------- FLASHLIGHT / TORCH ----------
let torchTrack;
async function startFlashlight() {
  const btn = document.getElementById('torchToggle');
  btn.onclick = async () => {
    if (torchTrack) {
      // turn off
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

// ---------- GYROSCOPE ----------
function startGyroscope() {
  const div = document.getElementById('gyroData');
  window.addEventListener('deviceorientation', (e) => {
    div.innerHTML = `alpha: ${e.alpha?.toFixed(1)}<br>beta: ${e.beta?.toFixed(1)}<br>gamma: ${e.gamma?.toFixed(1)}`;
  });
                                                            }
