const getFilename = (url: string): string => {
  const cleanUrl = url.split(/[?#]/)[0];
  return cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
}

/** 
 * Load a model file from cache or URL.
 */ 
export const loadModel = async (url: string): Promise<ArrayBuffer> => {
  const root = await navigator.storage.getDirectory();

  const filename = getFilename(url);

  const handle = await root
    .getFileHandle(filename)
    .catch(() => { 
      // Do nothing - expected if the file hasn't 
      // yet been downloaded. 
    });

  if (handle) {
    console.log(`[annotorious-sam] Loading cached model: ${filename}`);
    const file = await handle.getFile();
    if (file.size > 0) return await file.arrayBuffer();
  }

  try {
    console.log(`[annotorious-sam] Downloading: ${filename}`);
    const buffer = await fetch(url).then(res => res.arrayBuffer());

    const fileHandle = await root.getFileHandle(filename, { create: true });

    console.log(`[annotorious-sam] Writing to cache`);
    const writable = await fileHandle.createWritable();
    await writable.write(buffer);
    await writable.close();

    return buffer;
  } catch (error) {
    console.error(error);
    throw new Error(`[annotorious-sam] Download failed: ${url}`);
  }
}