import * as vscode from "vscode";
import { calculatePrayerTimes } from "zero-deps-prayer-times";

type GeocodeResponse = {
  latt?: string;
  longt?: string;
  standard?: {
    city?: string;
  };
};

const fallbackCoordinates = {
  latitude: 21.42251,
  longitude: 39.826168,
  city: "Makkah",
};

async function fetchCoordinatesForCity(city: string) {
  try {
    const response = await fetch(
      `https://geocode.xyz/${encodeURIComponent(city)}?json=1`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch coordinates for city");
    }
    const data: GeocodeResponse = (await response.json()) as GeocodeResponse;
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
    return fallbackCoordinates;
  }
}

async function getUserCity(context: vscode.ExtensionContext) {
  let city = context.globalState.get<string>("userCity");

  if (!city) {
    city = await vscode.window.showInputBox({
      prompt: "Enter your city for prayer times",
      placeHolder: "e.g., Makkah, London, New York",
    });

    if (!city) {
      vscode.window.showWarningMessage(
        "No city provided. Using Makkah as default."
      );
      return fallbackCoordinates;
    }

    const coordinates = await fetchCoordinatesForCity(city);
    context.globalState.update("userCity", coordinates.city);
    context.globalState.update("userCoordinates", coordinates);
    return coordinates;
  }

  const savedCoordinates =
    context.globalState.get<typeof fallbackCoordinates>("userCoordinates");
  return savedCoordinates || fallbackCoordinates;
}

function findNextPrayer(prayers: Record<string, string>, currentTime: Date) {
  const prayerOrder = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  for (const prayerName of prayerOrder) {
    const prayerTime = prayers[prayerName];
    const [time, period] = prayerTime.split(" ");
    const prayerDate = new Date(
      `${currentTime.toDateString()} ${time} ${period}`
    );
    if (prayerDate.getTime() > currentTime.getTime()) {
      return { nextPrayer: prayerName, prayerDate };
    }
  }
  return { nextPrayer: prayerOrder[0], prayerDate: null };
}

function formatTimeLeft(timeLeftSeconds: number | null) {
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

function createPrayerTimesStatusBar(context: vscode.ExtensionContext) {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  context.subscriptions.push(statusBarItem);
  return statusBarItem;
}

async function updatePrayerTimes(
  statusBarItem: vscode.StatusBarItem,
  context: vscode.ExtensionContext
) {
  try {
    const coordinates = await getUserCity(context);
    const now = new Date();
    const { data, error } = calculatePrayerTimes(now, coordinates);
    if (error || !data) {
      throw error || new Error("No prayer times data available");
    }
    const { nextPrayer, prayerDate } = findNextPrayer(data.prayers, now);
    return { nextPrayer, prayerDate, city: coordinates.city };
  } catch (error) {
    console.error("Prayer Times Extension Error:", error);
    statusBarItem.text = "⚠️ Prayer Times Unavailable";
    statusBarItem.show();
    return null;
  }
}

function startCountdown(
  statusBarItem: vscode.StatusBarItem,
  prayerDate: Date,
  nextPrayer: string,
  city: string
) {
  const countdownInterval = setInterval(() => {
    const now = new Date();
    const timeLeft = Math.floor((prayerDate.getTime() - now.getTime()) / 1000);
    if (timeLeft > 0) {
      statusBarItem.text = `${formatTimeLeft(
        timeLeft
      )} until ${nextPrayer.toUpperCase()} in ${city}`;
      statusBarItem.show();
    } else {
      clearInterval(countdownInterval);
    }
  }, 5000);
  return countdownInterval;
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context: vscode.ExtensionContext) {
  const statusBarItem = createPrayerTimesStatusBar(context);

  let countdownInterval: NodeJS.Timeout | null = null;

  async function refreshPrayerTimes() {
    const prayerData = await updatePrayerTimes(statusBarItem, context);
    if (prayerData) {
      const { nextPrayer, prayerDate, city } = prayerData;
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      if (prayerDate) {
        countdownInterval = startCountdown(
          statusBarItem,
          prayerDate,
          nextPrayer,
          city
        );
      } else {
        statusBarItem.text = `Next prayer: ${nextPrayer.toUpperCase()} in ${city}`;
        statusBarItem.show();
      }
    }
  }

  refreshPrayerTimes();

  const hourlyUpdateInterval = setInterval(refreshPrayerTimes, 60 * 60 * 1000);

  const changeCityCommand = vscode.commands.registerCommand(
    "extension.changeCity",
    async () => {
      const newCity = await vscode.window.showInputBox({
        prompt: "Enter a new city for prayer times",
        placeHolder: "e.g., Makkah, London, New York",
      });

      if (newCity) {
        const newCoordinates = await fetchCoordinatesForCity(newCity);
        context.globalState.update("userCity", newCoordinates.city);
        context.globalState.update("userCoordinates", newCoordinates);
        vscode.window.showInformationMessage(`City updated to ${newCity}`);
        refreshPrayerTimes();
      }
    }
  );

  context.subscriptions.push(changeCityCommand);

  context.subscriptions.push({
    dispose: () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      clearInterval(hourlyUpdateInterval);
    },
  });
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
