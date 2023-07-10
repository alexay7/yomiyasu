import * as fs from 'fs';
import { dirname, join } from 'path';

function extractFirstFileNameFromFolder(folderPath: string): string | null {
  const files = fs.readdirSync(folderPath);

  if (files.length > 0) {
    const firstFileName = files[0];
    return firstFileName;
  }

  return null; // Return null if no files found
}

export function extractUrlFromHtml(
  bookPath: string,
): { folderName: string; thumbnailPath: string } | null {
  const htmlContent = fs.readFileSync(bookPath, 'utf8');
  const urlRegex = /url\("([^/]+)\/[^/]+\.[a-z]+\"\)/i;
  const match = htmlContent.match(urlRegex);

  if (match && match[1]) {
    const imagesName = match[1];
    const imagesPath = join(dirname(bookPath), imagesName);
    const firstImage = extractFirstFileNameFromFolder(imagesPath);

    if (!firstImage) return null;

    return {
      folderName: imagesName,
      thumbnailPath: firstImage,
    };
  }

  return null; // Return null if no match found
}
