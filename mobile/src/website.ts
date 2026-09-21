import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { API_URL } from "@/src/api";

export function websitePath(path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${clean}`;
}

export async function openOnWebsite(path: string) {
  const url = websitePath(path);
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}
