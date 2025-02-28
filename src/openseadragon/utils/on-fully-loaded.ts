export const onFullyLoaded = (viewer: OpenSeadragon.Viewer, callback: () => void) => {

  viewer.addHandler('open', event => {
    const itemCount = viewer.world.getItemCount();

    const lastItem = viewer.world.getItemAt(itemCount - 1);
    lastItem.addOnceHandler('fully-loaded-change', event => {
      const { fullyLoaded } = event;
      if (fullyLoaded) {
        // The current image was fully loaded, all tiles rendered
        callback();
      }
    });
  });
  
}