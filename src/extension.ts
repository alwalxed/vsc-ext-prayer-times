import * as vscode from "vscode";
import { HOURLY_UPDATE_INTERVAL } from "./constants";
import { startCountdown, updatePrayerTimes } from "./prayerTimes";
import { ExtensionDependencies } from "./types";
import { changeCity } from "./userSettings";

function createPrayerTimesStatusBar(
  context: vscode.ExtensionContext
): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  context.subscriptions.push(statusBarItem);
  return statusBarItem;
}

export function activate(context: vscode.ExtensionContext) {
  const statusBarItem = createPrayerTimesStatusBar(context);
  const dependencies: ExtensionDependencies = { context, statusBarItem };

  let countdownInterval: NodeJS.Timeout | null = null;

  async function refreshPrayerTimes() {
    const prayerData = await updatePrayerTimes(dependencies);
    if (prayerData) {
      const { name, remainingSeconds, city } = prayerData;
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      const prayerDate = new Date(Date.now() + remainingSeconds * 1000);
      countdownInterval = startCountdown(statusBarItem, prayerDate, name, city);
    }
  }

  refreshPrayerTimes();

  const hourlyUpdateInterval = setInterval(
    refreshPrayerTimes,
    HOURLY_UPDATE_INTERVAL
  );

  const changeCityCommand = vscode.commands.registerCommand(
    "extension.changeCity",
    async () => {
      await changeCity(context);
      refreshPrayerTimes();
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

export function deactivate() {}
