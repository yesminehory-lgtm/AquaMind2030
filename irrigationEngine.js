/**
 * Simple rule-based + weather-aware irrigation engine
 * Can later be replaced by a trained ML model (scikit-learn / TensorFlow)
 */

function computeIrrigationPlan(field, latestMoisture, weather, options = {}) {
  const target = field.target_moisture ?? 45;
  const moisture = latestMoisture ?? 35;
  const deficit = Math.max(0, target - moisture);

  // Base duration (minutes) proportional to moisture deficit and area
  let durationMin = Math.round(deficit * 1.8 * (field.area_ha || 1));

  // Weather adjustments
  const tomorrowRain = weather?.daily?.[1]?.rainSum ?? 0;
  const tomorrowProb = weather?.daily?.[1]?.rainProb ?? 0;
  const et0 = weather?.daily?.[0]?.et0 ?? 3.5;

  if (tomorrowRain > 5 || tomorrowProb > 60) {
    durationMin = Math.round(durationMin * 0.3); // reduce if rain expected
  } else if (et0 > 5) {
    durationMin = Math.round(durationMin * 1.15); // increase on high evaporative demand
  }

  // Safety bounds
  durationMin = Math.min(Math.max(durationMin, 0), 120);

  const volumeM3 = +(durationMin * 0.12 * (field.area_ha || 1)).toFixed(2); // rough flow assumption

  let reason;
  if (durationMin === 0) {
    reason = `Soil moisture (${moisture.toFixed(0)}%) is at or above target (${target}%). No irrigation needed.`;
  } else {
    reason = `Soil is ${(target - moisture).toFixed(0)} points below target. Irrigate to refill the root zone.`;
  }

  // Suggested start time – early morning
  const startTime = '06:00';

  return {
    field_id: field.id,
    field_name: field.name,
    crop: field.crop,
    plan_date: new Date().toISOString().slice(0, 10),
    start_time: startTime,
    duration_min: durationMin,
    volume_m3: volumeM3,
    reason,
    moisture_current: moisture,
    moisture_target: target,
    weather_adjustment: { tomorrowRain, tomorrowProb, et0 },
  };
}

module.exports = { computeIrrigationPlan };
