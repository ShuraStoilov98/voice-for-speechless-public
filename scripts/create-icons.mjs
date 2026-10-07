import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

// A code-native speaker mark; no patient imagery or original private app assets.
const mark = '<path d="M352 440h104l120-104v352L456 584H352z" fill="none" stroke="#14745c" stroke-width="32" stroke-linejoin="round"/><path d="M636 414q80 98 0 196m64-254q134 156 0 312" fill="none" stroke="#14745c" stroke-width="28" stroke-linecap="round"/>';
await mkdir('assets', { recursive: true });
for (const [name, size, background] of [['icon', 1024, '#f7f9f8'], ['adaptive-icon', 1024, 'none'], ['splash-icon', 1024, 'none'], ['favicon', 64, '#f7f9f8']]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="${background}"/>${mark}</svg>`;
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`assets/${name}.png`);
}
