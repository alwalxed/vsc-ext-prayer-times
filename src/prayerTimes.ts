import * as vscode from "vscode";
import { calculatePrayerTimes } from "zero-deps-prayer-times";
import { UPDATE_INTERVAL } from "./constants";
import { ExtensionDependencies, PrayerData } from "./types";
import { getUserCity } from "./userSettings";
import { formatTimeLeft } from "./utils";

export async function updatePrayerTimes({
  statusBarItem,
  context,
}: ExtensionDependencies): Promise<PrayerData | null> {
  try {
    const coordinates = await getUserCity(context);
    const now = new Date();
    const { data, error } = calculatePrayerTimes(now, coordinates, {
      convention: "Umm al-Qura University, Makkah",
      hanafiAsr: false,
    });
    if (error || !data) {
      throw error || new Error("No prayer times data available");
    }

    const { name, remainingSeconds } = data.extras.nextPrayer;

    return { name, remainingSeconds, city: coordinates.city };
  } catch (error) {
    console.error("Prayer Times Extension Error:", error);
    statusBarItem.text = "⚠️ Prayer Times Unavailable";
    statusBarItem.show();
    return null;
  }
}

export function startCountdown(
  statusBarItem: vscode.StatusBarItem,
  prayerDate: Date,
  nextPrayer: string,
  city: string
): NodeJS.Timeout {
  return setInterval(() => {
    const now = new Date();
    const timeLeft = Math.floor((prayerDate.getTime() - now.getTime()) / 1000);
    if (timeLeft > 0) {
      statusBarItem.text = `${formatTimeLeft(
        timeLeft
      )} until ${nextPrayer.toUpperCase()} in ${city}`;
      statusBarItem.show();
    }
  }, UPDATE_INTERVAL);
}
