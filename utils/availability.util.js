export const dayKeys = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const defaultDay = {
  enabled: true,
  startTime: "08:00",
  endTime: "17:30",
};

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const normalizeTime = (value, fallback) => {
  if (typeof value === "string" && timePattern.test(value)) return value;
  return fallback;
};

const parseTimeToMinutes = (value) => {
  const [hour, minute] = normalizeTime(value, "00:00").split(":").map(Number);
  return hour * 60 + minute;
};

const normalizeDay = (value = {}) => ({
  enabled:
    typeof value.enabled === "boolean" ? value.enabled : defaultDay.enabled,
  startTime: normalizeTime(value.startTime, defaultDay.startTime),
  endTime: normalizeTime(value.endTime, defaultDay.endTime),
});

export const normalizeAvailability = (availability = {}) => {
  const mode = availability.mode === "schedule" ? "schedule" : "always";
  const inputDays = availability.days || {};
  const days = {};

  for (const key of dayKeys) {
    days[key] = normalizeDay(inputDays[key]);
  }

  return {
    mode,
    days,
    updatedAt: new Date(),
  };
};

export const isProviderAvailableNow = (provider, date = new Date()) => {
  const availability = provider?.availability;
  if (!availability || availability.mode !== "schedule") return true;

  const day = availability.days?.[dayKeys[date.getDay()]];
  if (!day || !day.enabled) return false;

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = parseTimeToMinutes(day.startTime);
  const endMinutes = parseTimeToMinutes(day.endTime);

  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
};
