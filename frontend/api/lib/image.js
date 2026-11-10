const sharp = require('sharp');
const { MAX_IMAGE_SIZE, getImageType } = require('./r2');

const FORMAT_TYPES = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};
const MAX_IMAGE_PIXELS = 40_000_000;
const MAX_IMAGE_FRAMES = 1000;

const isValidImage = async (bytes, expectedType) => {
  if (
    !Buffer.isBuffer(bytes)
    || bytes.length < 1
    || bytes.length > MAX_IMAGE_SIZE
    || getImageType(bytes.subarray(0, 32)) !== expectedType
  ) {
    return false;
  }

  try {
    const options = {
      failOn: 'warning',
      limitInputPixels: MAX_IMAGE_PIXELS,
      animated: true,
    };
    const metadata = await sharp(bytes, options).metadata();
    const pages = metadata.pages || 1;
    const pageHeight = metadata.pageHeight || metadata.height;
    if (
      FORMAT_TYPES[metadata.format] !== expectedType
      || !Number.isSafeInteger(metadata.width)
      || !Number.isSafeInteger(pageHeight)
      || !Number.isSafeInteger(pages)
      || metadata.width < 1
      || pageHeight < 1
      || pages < 1
      || pages > MAX_IMAGE_FRAMES
      || metadata.width * pageHeight * pages > MAX_IMAGE_PIXELS
    ) {
      return false;
    }

    await sharp(bytes, options).resize(1, 1, { fit: 'inside' }).toBuffer();
    return true;
  } catch {
    return false;
  }
};

module.exports = { isValidImage, MAX_IMAGE_FRAMES, MAX_IMAGE_PIXELS };
