const VENUE_TIME_ZONES: Record<string, string> = {
  // USA — Eastern (UTC-5/UTC-4)
  "new york": "America/New_York",
  "east rutherford": "America/New_York", // MetLife Stadium
  miami: "America/New_York",
  "miami gardens": "America/New_York", // Hard Rock Stadium
  atlanta: "America/New_York",
  boston: "America/New_York",
  foxborough: "America/New_York", // Gillette Stadium
  philadelphia: "America/New_York",

  // USA — Central (UTC-6/UTC-5)
  dallas: "America/Chicago",
  arlington: "America/Chicago", // AT&T Stadium
  houston: "America/Chicago",
  "kansas city": "America/Chicago",

  // USA — Pacific (UTC-8/UTC-7)
  "los angeles": "America/Los_Angeles",
  inglewood: "America/Los_Angeles", // SoFi Stadium
  "san francisco": "America/Los_Angeles",
  "santa clara": "America/Los_Angeles", // Levi's Stadium
  seattle: "America/Los_Angeles",

  // Canada
  toronto: "America/Toronto",
  vancouver: "America/Vancouver",

  // Mexico
  "mexico city": "America/Mexico_City",
  guadalajara: "America/Mexico_City",
  monterrey: "America/Monterrey",
};

export function formatInTimeZone(utcDate: string, timeZone: string): string {
  const date = new Date(utcDate);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function getVenueTimeZone(city: string, _country: string): string {
  const key = city.trim().toLowerCase();
  return VENUE_TIME_ZONES[key] ?? "UTC";
}
