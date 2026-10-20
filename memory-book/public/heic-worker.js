// Decodes an iPhone photo (HEIC) into plain pixels, for browsers that can't open HEIC.
// Runs on its own, with no network access (see next.config.ts), and only when needed.
importScripts("/vendor/libheif/libheif.js");
const lib = self.libheif();

self.onmessage = async (event) => {
  try {
    const decoder = new lib.HeifDecoder();
    const images = decoder.decode(new Uint8Array(event.data));
    if (!images.length) throw new Error("No image in this file");
    const image = images[0];
    const width = image.get_width();
    const height = image.get_height();
    const pixels = new ImageData(width, height);
    await new Promise((resolve, reject) => image.display(pixels, (done) => (done ? resolve(done) : reject(new Error("Couldn't decode")))));
    self.postMessage({ ok: true, width, height, data: pixels.data.buffer }, [pixels.data.buffer]);
  } catch (error) {
    self.postMessage({ ok: false, error: String(error) });
  }
};
