# Annotorious SegmentAnything Plugin

A fully browser-based smart polygon selection tool for Annotorious based on the [sam2-hiera-tiny](https://huggingface.co/g-ronimo/sam2-tiny) SegmentAnything model. The basic approach is inspired by this [blog post](https://medium.com/@geronimo7/in-browser-image-segmentation-with-segment-anything-model-2-c72680170d92) and [demo code](https://github.com/geronimi73/next-sam). 

> At this time, this plugin only supports `@annotorious/openseadragon`. Support for 
> plain (JPEG, PNG,...) images is not yet available.**

## Using with OpenSeadragon

```ts
import OpenSeadragon from 'openseadragon';
import { createOSDAnnotator } from '@annotorious/openseadragon';
import { mountOpenSeadragonPlugin } from '@annotorious/plugin-segment-anything/openseadragon';

import '@annotorious/openseadragon/annotorious-openseadragon.css';

const viewer = OpenSeadragon({
  /** init your viewer **/
});

const anno = createOSDAnnotator(viewer, { /* options */ });

// Initialize the plugin
const plugin = mountOpenSeadragonPlugin(anno);

// This will start initializing the plugin, incl.
// download of the model (this may take a while).
plugin.init();

plugin.on('downloadStart', () => {
  console.log('downloading the model - this may take a while');
});

plugin.on('downloadProgress', progress => {
  if (progress.complete)
    console.log('downloading complete');
});

plugin.on('initialized', () => {
  console.log('plugin ready');
});

plugin.on('encodingStart', () => {
  console.log('busy - encoding viewport');
});

plugin.on('encodingFinished', () => {
  console.log('ready - click to create annotation!');
});
```

