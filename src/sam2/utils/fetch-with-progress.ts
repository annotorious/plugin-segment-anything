export interface Progress {
  
  loaded: number;

  total?: number;

}

export const fetchWithProgress = async (
  url: string, 
  onProgress?: (progress: Progress) => void
): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  
  const contentLength = response.headers.get('Content-Length');
  const total = contentLength ? parseInt(contentLength, 10) : undefined;

  const reader = response.body?.getReader();
  
  if (!reader)
    throw new Error('Could not get reader from response body');

  const chunks: Uint8Array[] = [];

  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    if (value) {
      chunks.push(value);
      loaded += value.length;

      // Call progress callback if provided
      if (onProgress)
        onProgress({ loaded, total });
    }
  }

  // Combine chunks into a single ArrayBuffer
  const buffer = new ArrayBuffer(loaded);
  const uint8Array = new Uint8Array(buffer);
  
  let position = 0;

  for (const chunk of chunks) {
    uint8Array.set(chunk, position);
    position += chunk.length;
  }

  return buffer;
}