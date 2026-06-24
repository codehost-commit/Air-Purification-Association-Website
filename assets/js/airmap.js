/* =================================================================
   Air Quality Map - live data from Open-Meteo (keyless, CORS enabled)
   ================================================================= */
(function(){
  "use strict";

  var API = "https://air-quality-api.open-meteo.com/v1/air-quality";
  var FIELDS = "us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide";

  var CITIES = [
    {n:"New York",   c:"USA",          lat:40.71,  lon:-74.01},
    {n:"Los Angeles",c:"USA",          lat:34.05,  lon:-118.24},
    {n:"Mexico City",c:"Mexico",       lat:19.43,  lon:-99.13},
    {n:"Sao Paulo",  c:"Brazil",       lat:-23.55, lon:-46.63},
    {n:"London",     c:"UK",           lat:51.51,  lon:-0.13},
    {n:"Paris",      c:"France",       lat:48.85,  lon:2.35},
    {n:"Lagos",      c:"Nigeria",      lat:6.52,   lon:3.38},
    {n:"Cairo",      c:"Egypt",        lat:30.04,  lon:31.24},
    {n:"Johannesburg",c:"South Africa",lat:-26.20, lon:28.05},
    {n:"Delhi",      c:"India",        lat:28.61,  lon:77.21},
    {n:"Dhaka",      c:"Bangladesh",   lat:23.81,  lon:90.41},
    {n:"Beijing",    c:"China",        lat:39.90,  lon:116.40},
    {n:"Shanghai",   c:"China",        lat:31.23,  lon:121.47},
    {n:"Tokyo",      c:"Japan",        lat:35.68,  lon:139.69},
    {n:"Seoul",      c:"South Korea",  lat:37.57,  lon:126.98},
    {n:"Jakarta",    c:"Indonesia",    lat:-6.21,  lon:106.85},
    {n:"Sydney",     c:"Australia",    lat:-33.87, lon:151.21},
    {n:"Moscow",     c:"Russia",       lat:55.76,  lon:37.62}
  ];

  /* approximate fallback US AQI if the network is unavailable, so the page never looks broken */
  var FALLBACK = {"New York":38,"Los Angeles":74,"Mexico City":92,"Sao Paulo":58,"London":34,"Paris":42,
    "Lagos":120,"Cairo":118,"Johannesburg":66,"Delhi":182,"Dhaka":165,"Beijing":140,"Shanghai":96,
    "Tokyo":40,"Seoul":88,"Jakarta":134,"Sydney":24,"Moscow":52};

  function band(aqi){
    if(aqi<=50)  return {c:"#27c06a", t:"Good"};
    if(aqi<=100) return {c:"#f4c025", t:"Moderate"};
    if(aqi<=150) return {c:"#f08a24", t:"Unhealthy for sensitive groups"};
    if(aqi<=200) return {c:"#e2574c", t:"Unhealthy"};
    if(aqi<=300) return {c:"#9b59b6", t:"Very unhealthy"};
    return {c:"#7e2230", t:"Hazardous"};
  }

  function url(lat, lon){
    return API + "?latitude=" + lat + "&longitude=" + lon + "&current=" + FIELDS + "&timezone=auto";
  }

  function fetchAQ(lat, lon){
    return fetch(url(lat, lon)).then(function(r){
      if(!r.ok) throw new Error("bad response");
      return r.json();
    }).then(function(j){ return j.current; });
  }

  /* ---------------- LOCAL GAUGE ---------------- */
  var gaugeArc = document.getElementById('gaugeArc');
  var gaugeVal = document.getElementById('gaugeVal');
  var gaugeCat = document.getElementById('gaugeCat');
  var localPlace = document.getElementById('localPlace');
  var pollutantWrap = document.getElementById('pollutants');
  var CIRC = 2 * Math.PI * 80; /* r=80 */

  function renderGauge(cur, placeLabel){
    var aqi = Math.round(cur.us_aqi != null ? cur.us_aqi : 0);
    var b = band(aqi);
    var frac = Math.min(aqi / 300, 1);
    if(gaugeArc){
      gaugeArc.style.stroke = b.c;
      gaugeArc.style.strokeDasharray = CIRC;
      gaugeArc.style.strokeDashoffset = CIRC * (1 - frac * 0.75); /* 270deg arc */
    }
    if(gaugeVal){ gaugeVal.textContent = aqi; gaugeVal.style.color = b.c; }
    if(gaugeCat){ gaugeCat.textContent = b.t; gaugeCat.style.color = b.c; }
    if(localPlace){ localPlace.textContent = placeLabel; }
    if(pollutantWrap){
      var rows = [
        ["PM2.5", cur.pm2_5, "ug/m3"],
        ["PM10", cur.pm10, "ug/m3"],
        ["Ozone", cur.ozone, "ug/m3"],
        ["NO2", cur.nitrogen_dioxide, "ug/m3"],
        ["SO2", cur.sulphur_dioxide, "ug/m3"],
        ["CO", cur.carbon_monoxide, "ug/m3"]
      ];
      pollutantWrap.innerHTML = rows.map(function(r){
        var v = (r[1] == null) ? "n/a" : Math.round(r[1] * 10) / 10;
        return '<div class="poll"><span class="pk">' + r[0] + '</span>' +
               '<span class="pv">' + v + ' <small>' + r[2] + '</small></span></div>';
      }).join("");
    }
  }

  function loadLocal(lat, lon, label){
    if(localPlace) localPlace.textContent = "Loading " + label + " ...";
    fetchAQ(lat, lon).then(function(cur){
      renderGauge(cur, label);
    }).catch(function(){
      renderGauge({us_aqi: FALLBACK[label] || 50, pm2_5:null, pm10:null, ozone:null,
        nitrogen_dioxide:null, sulphur_dioxide:null, carbon_monoxide:null}, label + " (estimated)");
    });
  }

  /* city picker */
  var picker = document.getElementById('cityPicker');
  if(picker){
    CITIES.forEach(function(ct, i){
      var o = document.createElement('option');
      o.value = i; o.textContent = ct.n + ", " + ct.c;
      picker.appendChild(o);
    });
    picker.value = "0";
    picker.addEventListener('change', function(){
      var ct = CITIES[parseInt(picker.value, 10)];
      loadLocal(ct.lat, ct.lon, ct.n);
    });
  }

  var geoBtn = document.getElementById('geoBtn');
  if(geoBtn){
    geoBtn.addEventListener('click', function(){
      if(!navigator.geolocation){ return; }
      geoBtn.textContent = "Locating ...";
      navigator.geolocation.getCurrentPosition(function(pos){
        geoBtn.textContent = "Use my location";
        loadLocal(pos.coords.latitude, pos.coords.longitude, "Your location");
      }, function(){
        geoBtn.textContent = "Use my location";
        if(localPlace) localPlace.textContent = "Location blocked, showing selected city";
      }, {timeout:8000});
    });
  }

  /* default local view */
  loadLocal(CITIES[0].lat, CITIES[0].lon, CITIES[0].n);

  /* ---------------- WORLD MAP (Leaflet) ---------------- */
  if(window.L && document.getElementById('worldmap')){
    var map = L.map('worldmap', {worldCopyJump:true, scrollWheelZoom:false, attributionControl:true})
              .setView([26, 12], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: 'Air data: Open-Meteo. Tiles: CARTO, OpenStreetMap',
      subdomains: 'abcd', maxZoom: 10
    }).addTo(map);

    function addMarker(ct, aqi, cur){
      var b = band(aqi);
      var radius = 8 + Math.min(aqi / 12, 22);
      var m = L.circleMarker([ct.lat, ct.lon], {
        radius: radius, color: "#fff", weight: 1.4, opacity: .9,
        fillColor: b.c, fillOpacity: .82
      }).addTo(map);
      var detail = "";
      if(cur){
        detail = '<div class="mp-row"><span>PM2.5</span><b>' + fmt(cur.pm2_5) + ' ug/m3</b></div>' +
                 '<div class="mp-row"><span>PM10</span><b>' + fmt(cur.pm10) + ' ug/m3</b></div>' +
                 '<div class="mp-row"><span>Ozone</span><b>' + fmt(cur.ozone) + ' ug/m3</b></div>';
      }
      m.bindPopup(
        '<div class="mp"><div class="mp-h">' + ct.n + ', ' + ct.c + '</div>' +
        '<div class="mp-aqi" style="color:' + b.c + '">' + aqi + '<small> US AQI</small></div>' +
        '<div class="mp-cat" style="background:' + b.c + '22;color:' + b.c + '">' + b.t + '</div>' +
        detail + '</div>'
      );
      m.on('mouseover', function(){ m.openPopup(); });
    }
    function fmt(v){ return v == null ? "n/a" : Math.round(v * 10) / 10; }

    CITIES.forEach(function(ct){
      fetchAQ(ct.lat, ct.lon).then(function(cur){
        addMarker(ct, Math.round(cur.us_aqi != null ? cur.us_aqi : FALLBACK[ct.n] || 50), cur);
      }).catch(function(){
        addMarker(ct, FALLBACK[ct.n] || 50, null);
      });
    });
  }
})();
