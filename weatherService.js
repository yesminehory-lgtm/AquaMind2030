const axios = require('axios');

const OPEN_METEO = process.env.OPEN_METEO_URL || 'https://api.open-meteo.com/v1';

/**
 * Fetch current + daily weather for a location (Open-Meteo – free, no key)
 */
async function getWeather(lat, lon) {
  const url = `${OPEN_METEO}/forecast`;
  const params = {
    latitude: lat,
    longitude: lon,
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation',
      'wind_speed_10m',
      'et0_fao_evapotranspiration',
    ].join(','),
    hourly: 'temperature_2m,precipitation_probability,et0_fao_evapotranspiration',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration',
    timezone: 'Africa/Tunis',
    forecast_days: 5,
  };

  const { data } = await axios.get(url, { params, timeout: 10000 });

  return {
    current: {
      temperature: data.current?.temperature_2m,
      humidity: data.current?.relative_humidity_2m,
      precipitation: data.current?.precipitation,
      wind: data.current?.wind_speed_10m,
      et0: data.current?.et0_fao_evapotranspiration,
      time: data.current?.time,
    },
    daily: (data.daily?.time || []).map((t, i) => ({
      date: t,
      tempMax: data.daily.temperature_2m_max?.[i],
      tempMin: data.daily.temperature_2m_min?.[i],
      rainSum: data.daily.precipitation_sum?.[i],
      rainProb: data.daily.precipitation_probability_max?.[i],
      et0: data.daily.et0_fao_evapotranspiration?.[i],
    })),
    hourly: data.hourly,
  };
}

module.exports = { getWeather };
