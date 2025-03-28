import { fetchWithProgress, type Progress } from './fetch-with-progress';

const getFilename = (url: string): string => {
  const cleanUrl = url.split(/[?#]/)[0];
  return cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
}

export const isModelCached = async (url: string) => {
  const root = await navigator.storage.getDirectory();
  const filename = getFilename(url);
  const handle = await root
    .getFileHandle(filename)
    .catch(() => { 
      // Do nothing - expected if the file hasn't 
      // yet been downloaded. 
    });

  return Boolean(handle);
}

export const deleteModel = async (url: string) => {
  const root = await navigator.storage.getDirectory();
  const filename = getFilename(url);
  return root.removeEntry(filename);
}

/** 
 * Load a model file from cache or URL.
 */ 
export const loadModel = async (
  url: string,
  onProgress?: (progress: Progress) => void
): Promise<ArrayBuffer> => {
  const root = await navigator.storage.getDirectory();

  const filename = getFilename(url);

  const handle = await root
    .getFileHandle(filename)
    .catch(() => { 
      // Do nothing - expected if the file hasn't 
      // yet been downloaded. 
    });

  if (handle) {
    const file = await handle.getFile();
    console.log(`[a9s-sam] Cached: ${filename.substring(0, filename.indexOf('.'))}`);
    if (file.size > 10000000) 
      return await file.arrayBuffer();
    else 
      // Something's off - delete this file
      root.removeEntry(filename);
  }

  try {
    console.log(`[a9s-sam] Downloading ${filename}`);
    const buffer = await fetchWithProgress(url, onProgress);

    const fileHandle = await root.getFileHandle(filename, { create: true });

    console.log(`[a9s-sam] Writing to cache`);
    const writable = await fileHandle.createWritable();
    await writable.write(buffer);
    await writable.close();

    return buffer;
  } catch (error) {
    console.error(error);
    throw new Error(`Download failed: ${url}`);
  }
}