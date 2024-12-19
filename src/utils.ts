import * as vscode from "vscode";
import { FALLBACK_COORDINATES, GEOCODE_API_URL } from "./constants";
import { Coordinates, GeocodeResponse } from "./types";

export async function fetchCoordinatesForCity(
  city: string
): Promise<Coordinates> {
  try {
    const response = await fetch(
      `${GEOCODE_API_URL}/${encodeURIComponent(city)}?json=1`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch coordinates for city");
    }
    const data: GeocodeResponse = await response.json();
    if (!data.latt || !data.longt) {
      throw new Error("Incomplete coordinates data");
    }
    return {
      latitude: parseFloat(data.latt),
      longitude: parseFloat(data.longt),
      city: data?.standard?.city || city,
    };
  } catch (error) {
    vscode.window.showErrorMessage(
      `Could not fetch coordinates for ${city}. Using Makkah as default.`
    );
    return FALLBACK_COORDINATES;
  }
}

export function formatTimeLeft(timeLeftSeconds: number | null): string {
  if (timeLeftSeconds === null) {
    return "Next day's first prayer";
  }
  const hours = Math.floor(timeLeftSeconds / 3600);
  const minutes = Math.floor((timeLeftSeconds % 3600) / 60);
  const hoursText =
    hours > 0 ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "";
  const minutesText =
    minutes > 0 ? `${minutes} ${minutes === 1 ? "minute" : "minutes"}` : "";
  return [hoursText, minutesText].filter(Boolean).join(" and ");
}
