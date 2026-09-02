/**
 * Urban camo – szerves, foltos minta. A foltok determinisztikus véletlennel
 * készülnek (fix seed), és a csempe szélein átfordulnak (seamless).
 */
import { rng, blobPoints, smoothClosedPath, wrapTile } from './_helpers.js';

const W = 180;
const H = 180;
const random = rng(20240917);
const layers = [
  { color: '#4b5259', count: 6, r: 42 },
  { color: '#767d85', count: 5, r: 30 },
  { color: '#15181b', count: 5, r: 26 },
];

let blobs = '';
for (const layer of layers) {
  for (let i = 0; i < layer.count; i++) {
    const pts = blobPoints(random() * W, random() * H, layer.r, 7, random);
    blobs += `<path d="${smoothClosedPath(pts)}" fill="${layer.color}"/>`;
  }
}

export default {
  id: 'urban-camo',
  name: 'Urban camo',
  category: 'organic',
  type: 'tile',
  tile: {
    width: W,
    height: H,
    markup: `<rect width="${W}" height="${H}" fill="#2c3136"/>` + wrapTile(blobs, W, H),
  },
};
