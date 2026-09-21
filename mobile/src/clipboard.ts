import * as Clipboard from "expo-clipboard";
import { Share } from "react-native";

export async function copyText(text: string) {
  try {
    await Clipboard.setStringAsync(text);
    return "copied" as const;
  } catch {
    await Share.share({ message: text });
    return "shared" as const;
  }
}
