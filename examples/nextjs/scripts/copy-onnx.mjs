import { cp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

// Copy onnx model files from node_modules/ddddocr-node/onnx into ./onnx
// at the project root so that a known, stable path can be handed to
// `DdddOcr#setPath()`. This avoids the bundling issue where Next.js
// places the package under `.next/server` and breaks the relative
// `__dirname`-based lookup inside ddddocr-node.
const require = createRequire(import.meta.url);
const pkgJson = require.resolve('ddddocr-node/package.json');
const src = path.join(path.dirname(pkgJson), 'onnx');
const dest = path.join(process.cwd(), 'onnx');

await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });

console.log(`[copy-onnx] copied ${src} -> ${dest}`);
