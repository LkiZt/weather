'use strict';

// import { fetchData, url } from "api.js";
// import * as module from "module.js";

/**
 * @param {NodeList} elements 
 * @param {string} eventType 
 * @param {Function} callback 
 */
const addEventOnElemenents = function (elements, eventType, callback) {
    for (const element of elements) element.addEventListener(eventType, callback);
}

const searchView = document.querySelector("[data-search-view]");
const searchTogglers = document.querySelectorAll("[data-search-toggler]");

const toggleSearch = () => searchView.classList.toggle("active");
addEventOnElemenents(searchTogglers, "click", toggleSearch);

const searchField = document.querySelector("[data-search-field]");
const searchResult = document.querySelector("[data-search-result]");

let searchTimeout = null;
const searchTimeoutDuration = 500;




let dadataToken = "b4281e99a96ac708f79de576b9bca0cc338d7b0b";

searchField.addEventListener("input", function () {
    searchTimeout ?? clearTimeout(searchTimeout);
    if (!searchField.value) {
        searchResult.classList.remove("active");
        searchResult.innerHTML = "";
        searchField.classList.remove("searching");
    } else {
        searchField.classList.add("searching");
    }

    if (searchField.value) {
        searchTimeout = setTimeout(() => {
            // Сначала отображаем сохраненные города
            const cities = JSON.parse(localStorage.getItem('selectedCities')) || [];
            searchResult.innerHTML = `<ul class="view-list" data-search-list></ul>`;
            const searchList = searchResult.querySelector("[data-search-list]");

            cities.forEach(city => {
                const searchItem = document.createElement("li");
                searchItem.classList.add("view-item");
                searchItem.innerHTML = `
                    <span class="m-icon saved-icon">star</span>
                    <div>
                        <p class="item-title">${city.name}</p>
                        <p class="label-2 item-subtitle">${city.coordinates.lat}, ${city.coordinates.lng}</p>
                    </div>
                    <a href="#/weather?lat=${city.coordinates.lat}&lon=${city.coordinates.lng}" class="item-link has-state" aria-label="${city.name} weather" data-search-toggler></a>
                `;
                searchList.appendChild(searchItem);

                searchItem.querySelector("[data-search-toggler]").addEventListener("click", function() {
                    toggleSearch();
                    searchResult.classList.remove("active");
                    searchField.value = ""; // Очищаем поле ввода
                    searchResult.innerHTML = ""; // Очищаем результаты
                });
            });

            // Теперь выполняем AJAX-запрос
            var search = searchField.value;

            var xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader("Authorization", "Token " + dadataToken);

            xhr.send(JSON.stringify({"query": search}));

            xhr.onload = function () {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    var jsonResponse = JSON.parse(xhr.responseText);
                    if (jsonResponse.suggestions) {
                        searchField.classList.remove("searching");
                        searchResult.classList.add("active");

                        jsonResponse.suggestions.forEach(suggestion => {
                            const { value, data } = suggestion;
                            const searchItem = document.createElement("li");
                            searchItem.classList.add("view-item");
                            searchItem.innerHTML = `
                                <span class="m-icon">location_on</span> <!-- Обычная иконка для новых городов -->
                                <div>
                                    <p class="item-title">${value}</p>
                                    <p class="label-2 item-subtitle">${data.region || ""} ${data.country || ""}</p>
                                </div>
                                <a href="#/weather?lat=${data.geo_lat || ""}&lon=${data.geo_lon || ""}" class="item-link has-state" aria-label="${value} weather" data-search-toggler></a>
                            `;
                            searchList.appendChild(searchItem);

                            searchItem.querySelector("[data-search-toggler]").addEventListener("click", function() {
                                // Создаем новый объект с городом и координатами
                                const cityData = {
                                    name: value,
                                    coordinates: {
                                        lat: data.geo_lat,
                                        lng: data.geo_lon
                                    }
                                };

                                // Проверяем, есть ли уже этот город
                                const cityExists = cities.some(city => city.name === cityData.name);

                                if (!cityExists) {
                                    // Добавляем новый город
                                    cities.unshift(cityData); // Добавляем в начало массива

                                    // Удаляем, если больше 3 городов
                                    if (cities.length > 3) {
                                        cities.pop(); // Удаляем последний (старый) город
                                    }

                                    // Сохраняем обновленный массив в localStorage
                                    localStorage.setItem('selectedCities', JSON.stringify(cities));

                                    // Выводим в консоль
                                    console.log('Выбранный город:', cityData.name);
                                    console.log('Координаты:', cityData.coordinates);
                                } else {
                                    console.log('Этот город уже сохранен:', cityData.name);
                                }

                                toggleSearch();
                                searchResult.classList.remove("active");
                                searchField.value = ""; // Очищаем поле ввода
                                searchResult.innerHTML = ""; // Очищаем результаты
                            });
                        });
                    }
                }
            };
        }, searchTimeoutDuration);
    }
});



const container = document.querySelector("[data-container]");
const loading = document.querySelector("[data-loading]");
const currentLocationBtn = document.querySelector("[data-current-location-btn]");
const errorContent = document.querySelector("[data-error-content]");

const updateWeather = function (lat, lon) {
    loading.style.display = "grid";
    container.style.overflowY = "hidden";
    container.classList.remove("fade-in");
    errorContent.style.display = "none";

    const currentWeatherSection = document.querySelector("[data-current-weather]");
    const highlightSection = document.querySelector("[data-highlights]");
    const hourlySection = document.querySelector("[data-hourly-forecast]");
    const forecastSection = document.querySelector("[data-5-day-forecast]");

    currentWeatherSection.innerHTML = "";
    highlightSection.innerHTML = "";
    hourlySection.innerHTML = "";
    forecastSection.innerHTML = "";

    if (window.location.hash === '#/current-location') {
        currentLocationBtn.setAttribute("disabled" , "");
    } else {
        currentLocationBtn.removeAttribute("disabled");
    }


    fetchData(url.currentWeather(lat, lon), function (currentWeather) {
        const {
            weather,
            dt: dateUnix,
            sys: {sunrise: sunriseUnixUTC, sunset: sunsetUnixUTC},
            main: {temp, feels_like, pressure, humidity},
            visibility,
            timezone
        } = currentWeather
        const [{description, icon}] = weather;

        const card = document.createElement("div");
        card.classList.add("card", "card-lg", "current-weather-card");

        card.innerHTML = `
        <h2 class="title-2 card-title">Сейчас</h2>
        <div class="wrapper">
            <p class="heading">${parseInt(temp)}&deg;<sup>c</sup></p>
            <img src="./assets/images/icons/${icon}.png" width="64" height="64" alt="${description}" class="weather-icon">
        </div>
        <p class="body-3">${description}</p>
        <ul class="meta-list">
            <li class="meta-item">
                <span class="m-icon">calendar_today</span>
                <p class="title-3 meta-text">${getDate(dateUnix, timezone)}</p>
            </li>
            <li class="meta-item">
                <span class="m-icon">location_on</span>
                <p class="title-3 meta-text" data-location></p>
            </li>
        </ul>
        `;

        fetchData(url.reverseGeo(lat, lon), function ([{ name, country}]) {
            card.querySelector("[data-location]").innerHTML = `${name}, ${country}`
        });
        


        fetchData(url.currentWeather(lat, lon), function (map) {
        initMap();

            async function initMap() {
                // Промис `ymaps3.ready` будет зарезолвлен, когда загрузятся все компоненты основного модуля API
                await ymaps3.ready;

                const {YMap, YMapDefaultSchemeLayer} = ymaps3;

                // Иницилиазируем карту
                const map = new YMap(
                    // Передаём ссылку на HTMLElement контейнера
                    document.getElementById('map'),

                    // Передаём параметры инициализации карты
                    {
                        location: {
                            // Координаты центра карты
                            center: [37.588144, 55.733842],

                            // Уровень масштабирования
                            zoom: 10
                        }
                    }
                );

                // Добавляем слой для отображения схематической карты
                map.addChild(new YMapDefaultSchemeLayer());
            }
        });





        currentWeatherSection.appendChild(card);

        fetchData(url.airPollution(lat, lon), function (airPollution) {
            const [{
                main: {aqi},
                components: {no2, o3, so2, pm2_5}
            }] = airPollution.list;
            const card = document.createElement("div");
            card.classList.add("card", "card-lg");

            card.innerHTML = `
            <h2 class="title-2" id="highlights-label">Today Highlights</h2>
            <div class="highlight-list">
                <div class="card card-sm highlight-card one">
                    <h3 class="title-3">Air Quality Index</h3>
                    <div class="wrapper">
                        <span class="m-icon">air</span>
                        <ul class="card-list">
                            <li class="card-item">
                                <p class="title-1">${pm2_5.toPrecision(3)}</p>
                                <p class="label-1">PM<sub>2.5</sub></p>
                            </li>
                            <li class="card-item">
                                <p class="title-1">${so2.toPrecision(3)}</p>
                                <p class="label-1">SO<sub>2</sub></p>
                            </li>
                            <li class="card-item">
                                <p class="title-1">${no2.toPrecision(3)}</p>
                                <p class="label-1">NO<sub>2</sub></p>
                            </li>
                            <li class="card-item">
                                <p class="title-1">${o3.toPrecision(3)}</p>
                                <p class="label-1">O<sub>3</sub></p>
                            </li>
                        </ul>
                    </div>
                    <span class="badge aqi-${aqi} label-${aqi}" title="${aqiText[aqi].message}">${aqiText[aqi].level}</span>
                </div>
                <div class="card card-sm highlight-card two">
                    <h3 class="title-3">Sunrise & Sunset</h3>
                    <div class="card-list">
                        <div class="card-item">
                            <span class="m-icon">clear_day</span>
                            <div>
                                <p class="label-1">Sunrise</p>
                                <p class="title-1">${getTime(sunriseUnixUTC, timezone)}</p>
                            </div>
                        </div>
                        <div class="card-item">
                            <span class="m-icon">clear_night</span>
                            <div>
                                <p class="label-1">Sunset</p>
                                <p class="title-1">${getTime(sunriseUnixUTC, timezone)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card card-sm highlight-card">
                    <h3 class="title-3">Humidity</h3>
                    <div class="wrapper">
                        <span class="m-icon">humidity_percentage</span>
                        <p class="title-1">${humidity}<sub>%</sub></p>
                    </div>
                </div>
                <div class="card card-sm highlight-card">
                    <h3 class="title-3">Pressure</h3>
                    <div class="wrapper">
                        <span class="m-icon">airwave</span>
                        <p class="title-1">${pressure}<sub>hPa</sub></p>
                    </div>
                </div>
                <div class="card card-sm highlight-card">
                    <h3 class="title-3">Visibility</h3>
                    <div class="wrapper">
                        <span class="m-icon">visibility</span>
                        <p class="title-1">${visibility / 1000}<sub>km</sub></p>
                    </div>
                </div>
                <div class="card card-sm highlight-card">
                    <h3 class="title-3">Feels like</h3>
                    <div class="wrapper">
                        <span class="m-icon">thermostat</span>
                        <p class="title-1">${parseInt(feels_like)}&deg;<sup>c</sup></p>
                    </div>
                </div>
            </div>
            `;

            highlightSection.appendChild(card);
        });

        fetchData(url.forecast(lat, lon), function (forecast) {
            const {
                list: forecastList,
                city: {timezone}
            } = forecast;
            hourlySection.innerHTML = `
            <h2 class="title-2">Today at</h2>
            <div class="slider-container">
                <ul class="slider-list" data-temp></ul>
                <ul class="slider-list" data-wind></ul>
            </div>
            `;

            for (const [index, data] of forecastList.entries()) {
                if (index > 7) break;
                const {
                    dt: dateTimeUnix,
                    main: {temp},
                    weather,
                    wind: { deg: windDirection, speed: windSpeed }
                } = data
                const [{icon, description}] = weather;

                const tempLi = document.createElement("li");
                tempLi.classList.add("slider-item");

                tempLi.innerHTML = `
                <div class="card card-sm slider-card">
                    <p class="body-3">${getHours(dateTimeUnix, timezone)}</p>
                    <img src="./assets/images/icons/${icon}.png" width="48" height="48" loading="lazy" alt="${description}" class="weather-icon" title="${description}">
                    <p class="body-3">${parseInt(temp)}&deg;</p>
                </div>
                `;
                hourlySection.querySelector("[data-temp]").appendChild(tempLi);

                const windLi = document.createElement("li");
                windLi.classList.add("slider-item");

                windLi.innerHTML = `
                <div class="card card-sm slider-card">
                    <p class="body-3">${getHours(dateTimeUnix, timezone)}</p>
                    <img src="./assets/images/icons/direction.png" width="48" height="48" loading="lazy" alt="direction" class="weather-icon" style="transform: rotate(${windDirection - 180}deg)">
                    <p class="body-3">${parseInt(mps_to_kmh(windSpeed))} km/h</p>
                </div>
                `;
                hourlySection.querySelector("[data-wind]").appendChild(windLi);
            }

            forecastSection.innerHTML = `
            <h2 class="title-2" id="forecast-label">5 Days Forecast</h2>
            <div class="card card-lg forecast-card">
                <ul data-forecast-li ></ul>
            </div>
            `;

            for (let i = 7, len = forecastList.length; i < len; i+=8) {
                const {
                    main: {temp_max},
                    weather,
                    dt_txt
                } = forecastList[i];
                const [{icon, description}] = weather
                const date = new Date(dt_txt);

                const li = document.createElement("li");
                li.classList.add("card-item");

                li.innerHTML = `
                    <div class="icon-wrapper">
                        <img src="./assets/images/icons/${icon}.png" class="weather-icon" width="36" height="36" alt="${description}" title="${description}">
                        <span class="span">
                            <p class="title-2">${parseInt(temp_max)}&deg;</p>
                        </span>
                    </div>
                    <p class="label-1">${date.getDate()} ${monthNames[date.getUTCMonth()]}</p>
                    <p class="label-1">${weekDayNames[date.getUTCDay()]}</p>
                `;
                forecastSection.querySelector("[data-forecast-li]").appendChild(li);
            }

            loading.style.display = "none";
            container.style.overflowY = "overlay";
            container.classList.add("fade-in");
        });
    });
}

const error404 = () => errorContent.style.display ="flex"

// API

const api_key = 'd8803850f05b040ae3b722f65c2990a8'

/**
 * 
 * @param {string} URL 
 * @param {Function} callback 
 */
 const fetchData = function(URL, callback) {
    fetch(`${URL}&appid=${api_key}`)
        .then(res => res.json())
        .then(data => callback(data));
}

 const url = {
    currentWeather(lat, lon) {
        return `https://api.openweathermap.org/data/2.5/weather?${lat}&${lon}&units=metric`
    },
    forecast(lat, lon) {
        return `https://api.openweathermap.org/data/2.5/forecast?${lat}&${lon}&units=metric`
    },
    airPollution(lat, lon) {
        return `https://api.openweathermap.org/data/2.5/air_pollution?${lat}&${lon}`
    },
    reverseGeo(lat, lon) {
        return `https://api.openweathermap.org/geo/1.0/reverse?${lat}&${lon}&limit=5`
    },
    /**
     * 
     * @param {string} query 
     */
    geo(query) {
        return `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5` 
    }
}

// route
const defaultLocation = "#/weather?lat=51.5073219&lon=-0.1276474";

const currentLocation = async function () {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            res => {
                const { latitude, longitude } = res.coords;
                updateWeather(`lat=${latitude}`, `lon=${longitude}`);
            },
            async () => {
                // Попытка получить местоположение по IP
                try {
                    const response = await fetch('http://ip-api.com/json/');
                    if (!response.ok) {
                        throw new Error('Failed to fetch IP location');
                    }
                    const data = await response.json();
                    const { lat, lon } = data;
                    updateWeather(`lat=${lat}`, `lon=${lon}`);
                } catch {
                    window.location.hash = defaultLocation;
                }
            }
        );
    } else {
        window.location.hash = defaultLocation;
    }
};
/**
 * @param {string} quety 
 */

const searchedLocation = query => updateWeather(...query.split("&"));

const routes = new Map([
    ["/current-location", currentLocation],
    ["/weather", searchedLocation]
])

const checkHash = function () {
    const requestURL = window.location.hash.slice(1);
    const [route, query] = requestURL.includes("?") ? requestURL.split("?") : [requestURL];

    if (route === "/weather") {
        const urlParams = new URLSearchParams(query);
        const lat = urlParams.get('lat');
        const lon = urlParams.get('lon');

        // Проверка на null
        if (lat === 'null' && lon === 'null') {
            error404(); // Показываем контент ошибки
            return;
        }

        searchedLocation(query);
    } else if (routes.has(route)) {
        routes.get(route)(query);
    } else {
        error404();
    }
}

window.addEventListener("hashchange", checkHash);

window.addEventListener("load", function () {
    if (!window.location.hash) {
        window.location.hash = '#/current-location';
    } else {
        checkHash();
    }
})

// // module

 const weekDayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

 const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
];

const getDate = function (dateUnix, timezone) {
    const date = new Date((dateUnix + timezone) * 1000);
    const weekDayName = weekDayNames[date.getUTCDay()];
    const monthName = monthNames[date.getUTCMonth()];

    return `${weekDayName} ${date.getUTCDate()}, ${monthName}`
}


 const getTime = function (timeUnix, timezone) {
    const date = new Date((timeUnix + timezone) * 1000);
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const period = hours >= 12 ? "PM" : "AM";

    return `${hours % 12 || 12}:${minutes} ${period}`;
}


 const getHours = function (timeUnix, timezone) {
    const date = new Date((timeUnix + timezone) * 1000);
    const hours = date.getUTCHours();
    const period = hours >= 12 ? "PM" : "AM";

    return `${hours % 12 || 12} ${period}`;
}

 const mps_to_kmh = mps => {
    const mph = mps * 3600;
    return mph / 1000;
}


 const aqiText = {
    1: {
        level: "Good",
        message: "Air quality is considered satisfactory, and air pollution poses little or no risk"
    },
    2: {
        level: "Fair",
        message: "Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution"
    },
    3: {
        level: "Moderate",
        message: "Members of sensitive groups may expertience health effects. The general public is not likely to be affected"
    },
    4: {
        level: "Poor",
        message: "Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects"
    },
    5: {
        level: "Very Poor",
        message: "Health warnings of emergency conditions. The entire population is more likely to be affected"
    }
}
