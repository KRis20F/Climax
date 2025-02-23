document.addEventListener("DOMContentLoaded", function () {
  const ccaaSelect = document.getElementById("ccaa");
  const provinciaSelect = document.getElementById("provincia");
  const poblacionSelect = document.getElementById("poblacion");
  const imageContainer = document.getElementById("image-container");
  const formulario = document.getElementById("searchForm");
  const geoButton = document.getElementById("geoButton");
  const voiceButtonCCAA = document.getElementById("voiceSearchCCAA");
  const voiceButtonProvincia = document.getElementById("voiceSearchProvincia");
  const voiceButtonPoblacion = document.getElementById("voiceSearchPoblacion");

  let map; // Variable global para el mapa
  const WEATHER_API_KEY = 'e26c34c78bfb76f3a1567c6638c171e1'; // Reemplaza con tu API key de OpenWeatherMap

  async function getComunidadesAutonomas() {
    try {
      const response = await fetch(
        "https://raw.githubusercontent.com/frontid/ComunidadesProvinciasPoblaciones/refs/heads/master/ccaa.json"
      );
      const data = await response.json();
      data.forEach((comunidad) => {
        let option = document.createElement("option");
        option.value = comunidad.code;
        option.textContent = comunidad.label;
        ccaaSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error obteniendo comunidades autónomas:", error);
    }
  }

  async function getProvincias() {
    try {
      const response = await fetch(
        "https://raw.githubusercontent.com/frontid/ComunidadesProvinciasPoblaciones/refs/heads/master/provincias.json"
      );
      const data = await response.json();
      provinciaSelect.innerHTML =
        "<option value='' disabled selected>Selecciona una Provincia</option>";
      data
        .filter((provincia) => provincia.parent_code === ccaaSelect.value)
        .forEach((provincia) => {
          let option = document.createElement("option");
          option.value = provincia.code;
          option.textContent = provincia.label;
          provinciaSelect.appendChild(option);
        });
    } catch (error) {
      console.error("Error obteniendo provincias:", error);
    }
  }

  async function getPoblaciones() {
    try {
      const response = await fetch(
        "https://raw.githubusercontent.com/frontid/ComunidadesProvinciasPoblaciones/refs/heads/master/poblaciones.json"
      );
      const data = await response.json();
      poblacionSelect.innerHTML =
        "<option value='' disabled selected>Selecciona una Población</option>";
      data
        .filter((poblacion) => poblacion.parent_code === provinciaSelect.value)
        .forEach((poblacion) => {
          let option = document.createElement("option");
          option.value = poblacion.code;
          option.textContent = poblacion.label;
          poblacionSelect.appendChild(option);
        });
    } catch (error) {
      console.error("Error obteniendo poblaciones:", error);
    }
  }

  formulario.addEventListener("submit", async (event) => {
    event.preventDefault();
    const poblacion =
      poblacionSelect.options[poblacionSelect.selectedIndex].text;
    if (!poblacion) {
      alert("Selecciona una población");
      return;
    }

    try {
      // Obtener el clima
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
          poblacion
        )},ES&units=metric&lang=es&appid=${WEATHER_API_KEY}`
      );
      const weatherData = await weatherResponse.json();

      // Crear o actualizar el contenedor del clima
      let weatherContainer = document.getElementById('weather-container');
      if (!weatherContainer) {
        weatherContainer = document.createElement('div');
        weatherContainer.id = 'weather-container';
        document.querySelector('.container-default').appendChild(weatherContainer);
      }

      // Mostrar la información del clima
      if (weatherData.cod === 200) {
        weatherContainer.innerHTML = `
          <div class="weather-card">
            <h3>Clima en ${poblacion}</h3>
            <img src="http://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png" 
                 alt="${weatherData.weather[0].description}">
            <p class="temperature">${Math.round(weatherData.main.temp)}°C</p>
            <p class="description">${weatherData.weather[0].description}</p>
            <div class="weather-details">
              <p>Humedad: ${weatherData.main.humidity}%</p>
              <p>Viento: ${Math.round(weatherData.wind.speed * 3.6)} km/h</p>
            </div>
          </div>
        `;
      } else {
        weatherContainer.innerHTML = `<p>No se pudo obtener la información del clima para ${poblacion}</p>`;
      }

      // Continuar con la obtención de imágenes...
      const response = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=images&titles=${encodeURIComponent(
          poblacion
        )}&gimlimit=10&prop=imageinfo&iiprop=url`
      );
      const data = await response.json();
      imageContainer.innerHTML = "";
      if (data.query && data.query.pages) {
        Object.values(data.query.pages).forEach((page) => {
          if (page.imageinfo && page.imageinfo[0].url) {
            const imgContainer = document.createElement("div");
            imgContainer.classList.add("image-wrapper");

            const img = document.createElement("img");
            img.src = page.imageinfo[0].url;
            img.classList.add("img-poblacion");
            img.style.width = "200px";
            img.style.margin = "10px";
            img.style.borderRadius = "10px";

            imgContainer.appendChild(img);
            imageContainer.appendChild(imgContainer);
          }
        });
      } else {
        imageContainer.innerHTML =
          "<p>No se encontraron imágenes para esta población.</p>";
      }
    } catch (error) {
      console.error("Error:", error);
    }
  });

  ccaaSelect.addEventListener("change", getProvincias);
  provinciaSelect.addEventListener("change", getPoblaciones);
  geoButton.addEventListener("click", getLocation);
  voiceButtonCCAA.addEventListener("click", () =>
    startVoiceRecognition("ccaa")
  );
  voiceButtonProvincia.addEventListener("click", () =>
    startVoiceRecognition("provincia")
  );
  voiceButtonPoblacion.addEventListener("click", () =>
    startVoiceRecognition("poblacion")
  );

  getComunidadesAutonomas();

  function getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
      alert("La geolocalización no es soportada por este navegador.");
    }
  }

  function showPosition(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    )
      .then((response) => response.json())
      .then((data) => {
        const city = data.address.city || data.address.town || "Desconocida";
        document.getElementById("location").innerText = `Imágenes de ${city}`;
        showMap(lat, lon);
      })
      .catch((error) => console.error("Error obteniendo la ciudad:", error));
  }

  function showError(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        alert("El usuario denegó la solicitud de geolocalización.");
        break;
      case error.POSITION_UNAVAILABLE:
        alert("Información de ubicación no disponible.");
        break;
      case error.TIMEOUT:
        alert("Tiempo de espera agotado para obtener ubicación.");
        break;
      default:
        alert("Ocurrió un error desconocido.");
    }
  }

  function showMap(lat, lon) {
    if (!map) {
      map = L.map("map").setView([lat, lon], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
    } else {
      map.setView([lat, lon], 13);
    }
    L.marker([lat, lon]).addTo(map);
  }

  function toPascalCase(str) {
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function normalizeText(text) {
    return text
      .normalize("NFD") // Elimina tildes
      .replace(/[\u0300-\u036f]/g, "") // Quita diacríticos
      .replace(/\s+/g, " ") // Reemplaza múltiples espacios por uno solo
      .trim(); // Quita espacios extra al inicio y final
  }

  function startVoiceRecognition(type) {
    const recognition = new (window.SpeechRecognition ||
      window.webkitSpeechRecognition)();
    recognition.lang = "es-ES";
    recognition.start();

    // Seleccionar el elemento correcto basado en el tipo
    const select = document.getElementById(type);

    recognition.onresult = function (event) {
      const transcript = normalizeText(
        toPascalCase(event.results[0][0].transcript)
      );

      let found = false;
      for (let option of select.options) {
        const normalizedOption = normalizeText(option.textContent);

        if (normalizedOption.includes(transcript)) {
          // Establecer el valor del select
          select.value = option.value;

          // Forzar la actualización visual
          select.selectedIndex = option.index;

          // Disparar el evento change para actualizar los selects dependientes
          select.dispatchEvent(new Event("change", { bubbles: true }));

          console.log("✅ Seleccionado:", option.textContent);
          found = true;

          // Solo enviar el formulario si es una selección de población
          if (type === "poblacion") {
            formulario.dispatchEvent(
              new Event("submit", { bubbles: true, cancelable: true })
            );
          }
          break;
        }
      }

      if (!found) {
        alert(
          `❌ No se encontró la ${
            type === "ccaa"
              ? "comunidad autónoma"
              : type === "provincia"
              ? "provincia"
              : "población"
          }: ${transcript}`
        );
      }
    };

    recognition.onerror = function (event) {
      console.error("❌ Error en reconocimiento de voz:", event.error);
    };
  }

  // Asegurar que las poblaciones estén cargadas antes de iniciar la búsqueda por voz
  async function iniciarBusquedaVoz() {
    await getPoblaciones(); // Esperar que las opciones se carguen
    setTimeout(() => {
      startVoiceRecognition("poblacion"); // Iniciar reconocimiento después de asegurar que el select está listo
    }, 500);
  }

  window.addEventListener("offline", () => {
    alert("⚠️ Estás sin conexión a internet.");
  });

  window.addEventListener("online", () => {
    alert("✅ Conexión restaurada.");
  });
});
