/** Photo du champ prise avec l'appareil natif, réduite à 1024 px (JPEG 0,7) avant d'être confiée à la page. */
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const COTE = 1024;

export type ReponsePhoto = { type: "photo"; image: string } | { type: "photo"; erreur: "refus" | "annule" };

export async function prendrePhoto(): Promise<ReponsePhoto> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { type: "photo", erreur: "refus" };
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
  if (r.canceled || !r.assets[0]) return { type: "photo", erreur: "annule" };
  const { uri, width, height } = r.assets[0];
  const contexte = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > COTE) contexte.resize(width >= height ? { width: COTE, height: null } : { width: null, height: COTE });
  const image = await contexte.renderAsync();
  const sortie = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!sortie.base64) return { type: "photo", erreur: "annule" };
  return { type: "photo", image: `data:image/jpeg;base64,${sortie.base64}` };
}
