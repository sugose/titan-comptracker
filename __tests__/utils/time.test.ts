import { formatInTimeZone, getVenueTimeZone } from "../../src/utils/time";

describe("formatInTimeZone", () => {
  it("formats a UTC date into the requested IANA time zone", () => {
    const result = formatInTimeZone("2026-06-11T19:00:00Z", "UTC");
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/Jun/i);
    expect(result).toMatch(/19:00/);
  });

  it("adjusts the hour correctly for America/New_York (UTC-4 in June)", () => {
    const result = formatInTimeZone("2026-06-11T19:00:00Z", "America/New_York");
    expect(result).toMatch(/15:00/);
  });

  it("adjusts the hour correctly for America/Los_Angeles (UTC-7 in June)", () => {
    const result = formatInTimeZone("2026-06-11T19:00:00Z", "America/Los_Angeles");
    expect(result).toMatch(/12:00/);
  });

  it("adjusts the hour correctly for America/Mexico_City (permanently UTC-6 since 2023)", () => {
    const result = formatInTimeZone("2026-06-11T19:00:00Z", "America/Mexico_City");
    expect(result).toMatch(/13:00/);
  });
});

describe("getVenueTimeZone", () => {
  it("returns America/New_York for New York", () => {
    expect(getVenueTimeZone("New York", "United States")).toBe("America/New_York");
  });

  it("returns America/New_York for East Rutherford (MetLife stadium city)", () => {
    expect(getVenueTimeZone("East Rutherford", "United States")).toBe("America/New_York");
  });

  it("returns America/Los_Angeles for Los Angeles", () => {
    expect(getVenueTimeZone("Los Angeles", "United States")).toBe("America/Los_Angeles");
  });

  it("returns America/Los_Angeles for Inglewood (SoFi stadium city)", () => {
    expect(getVenueTimeZone("Inglewood", "United States")).toBe("America/Los_Angeles");
  });

  it("returns America/Chicago for Dallas", () => {
    expect(getVenueTimeZone("Dallas", "United States")).toBe("America/Chicago");
  });

  it("returns America/Chicago for Arlington (AT&T stadium city)", () => {
    expect(getVenueTimeZone("Arlington", "United States")).toBe("America/Chicago");
  });

  it("returns America/Los_Angeles for San Francisco", () => {
    expect(getVenueTimeZone("San Francisco", "United States")).toBe("America/Los_Angeles");
  });

  it("returns America/Los_Angeles for Santa Clara (Levi's stadium city)", () => {
    expect(getVenueTimeZone("Santa Clara", "United States")).toBe("America/Los_Angeles");
  });

  it("returns America/New_York for Miami", () => {
    expect(getVenueTimeZone("Miami", "United States")).toBe("America/New_York");
  });

  it("returns America/New_York for Miami Gardens (Hard Rock stadium city)", () => {
    expect(getVenueTimeZone("Miami Gardens", "United States")).toBe("America/New_York");
  });

  it("returns America/New_York for Atlanta", () => {
    expect(getVenueTimeZone("Atlanta", "United States")).toBe("America/New_York");
  });

  it("returns America/Los_Angeles for Seattle", () => {
    expect(getVenueTimeZone("Seattle", "United States")).toBe("America/Los_Angeles");
  });

  it("returns America/New_York for Boston", () => {
    expect(getVenueTimeZone("Boston", "United States")).toBe("America/New_York");
  });

  it("returns America/New_York for Foxborough (Gillette stadium city)", () => {
    expect(getVenueTimeZone("Foxborough", "United States")).toBe("America/New_York");
  });

  it("returns America/Chicago for Houston", () => {
    expect(getVenueTimeZone("Houston", "United States")).toBe("America/Chicago");
  });

  it("returns America/New_York for Philadelphia", () => {
    expect(getVenueTimeZone("Philadelphia", "United States")).toBe("America/New_York");
  });

  it("returns America/Chicago for Kansas City", () => {
    expect(getVenueTimeZone("Kansas City", "United States")).toBe("America/Chicago");
  });

  it("returns America/Toronto for Toronto", () => {
    expect(getVenueTimeZone("Toronto", "Canada")).toBe("America/Toronto");
  });

  it("returns America/Vancouver for Vancouver", () => {
    expect(getVenueTimeZone("Vancouver", "Canada")).toBe("America/Vancouver");
  });

  it("returns America/Mexico_City for Mexico City", () => {
    expect(getVenueTimeZone("Mexico City", "Mexico")).toBe("America/Mexico_City");
  });

  it("returns America/Mexico_City for Guadalajara", () => {
    expect(getVenueTimeZone("Guadalajara", "Mexico")).toBe("America/Mexico_City");
  });

  it("returns America/Monterrey for Monterrey", () => {
    expect(getVenueTimeZone("Monterrey", "Mexico")).toBe("America/Monterrey");
  });

  it("returns UTC for an unknown city", () => {
    expect(getVenueTimeZone("Unknown City", "Unknown Country")).toBe("UTC");
  });

  it("returns UTC for an empty city string", () => {
    expect(getVenueTimeZone("", "")).toBe("UTC");
  });
});
