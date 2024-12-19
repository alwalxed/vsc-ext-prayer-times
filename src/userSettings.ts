import * as vscode from "vscode";
import { FALLBACK_COORDINATES } from "./constants";
import { Coordinates } from "./types";
import { fetchCoordinatesForCity } from "./utils";

export async function getUserCity(
  context: vscode.ExtensionContext
): Promise<Coordinates> {
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
      return FALLBACK_COORDINATES;
    }

    const coordinates = await fetchCoordinatesForCity(city);
    context.globalState.update("userCity", coordinates.city);
    context.globalState.update("userCoordinates", coordinates);
    return coordinates;
  }

  const savedCoordinates =
    context.globalState.get<Coordinates>("userCoordinates");
  return savedCoordinates || FALLBACK_COORDINATES;
}

export async function changeCity(
  context: vscode.ExtensionContext
): Promise<void> {
  const newCity = await vscode.window.showInputBox({
    prompt: "Enter a new city for prayer times",
    placeHolder: "e.g., Makkah, London, New York",
  });

  if (newCity) {
    const newCoordinates = await fetchCoordinatesForCity(newCity);
    context.globalState.update("userCity", newCoordinates.city);
    context.globalState.update("userCoordinates", newCoordinates);
    vscode.window.showInformationMessage(`City updated to ${newCity}`);
  }
}
