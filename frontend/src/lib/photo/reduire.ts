/** Réduit une photo sur l'appareil (1024 px de côté, JPEG 0,7) avant l'envoi : moins de données mobiles. */
export async function reduire(fichier: Blob, cote = 1024, qualite = 0.7): Promise<string> {
  const image = await createImageBitmap(fichier);
  const echelle = Math.min(1, cote / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * echelle);
  canvas.height = Math.round(image.height * echelle);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  return canvas.toDataURL("image/jpeg", qualite);
}
