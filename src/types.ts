import * as vscode from "vscode";

export interface Coordinates {
  latitude: number;
  longitude: number;
  city: string;
}

export interface GeocodeResponse {
  latt?: string;
  longt?: string;
  standard?: {
    city?: string;
  };
}

export interface PrayerData {
  name: string;
  remainingSeconds: number;
  city: string;
}

export interface ExtensionDependencies {
  context: vscode.ExtensionContext;
  statusBarItem: vscode.StatusBarItem;
}
