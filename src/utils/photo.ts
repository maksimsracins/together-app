// Mirrors the server's limit (server/src/routes/entries.ts and users.ts) so
// an oversized photo is caught the instant it's picked -- no native
// downscaling happens on this end (ImagePicker's `quality` only affects JPEG
// compression, not pixel dimensions), so a high-megapixel source photo can
// still exceed this even at quality 0.5-0.8.
export const MAX_PHOTO_DATA_URI_LENGTH = 5 * 1024 * 1024;

export function isPhotoTooLarge(dataUri: string): boolean {
  return dataUri.length > MAX_PHOTO_DATA_URI_LENGTH;
}
