# ddddocr-node · Next.js Minimal Example

[中文](./README.zh-TW.md)

Reproduces and resolves [issue #3](https://github.com/renhaoyeh/ddddocr-node/issues/3):

> Load model from /xx/.next/server/onnx/common_old.onnx failed: File doesn't exist

## Why it breaks in Next.js

`ddddocr-node` locates its bundled ONNX models via
`path.resolve(__dirname, '../../../onnx')`. When Next.js traces and bundles
the server code, the compiled output of the package ends up under
`.next/server/...`, so `__dirname` no longer points to the installed
package folder, and the resolved ONNX path does not exist.

## Fix

Three pieces work together:

1. **`next.config.mjs`** — mark `ddddocr-node` and `onnxruntime-node` as
   external via `serverExternalPackages` so Next does not bundle the
   native addon. Use `outputFileTracingIncludes` to ship `./onnx` with the
   standalone build.
2. **`scripts/copy-onnx.mjs`** — copy the model files out of
   `node_modules/ddddocr-node/onnx` into `./onnx` at the project root on
   `postinstall`. This gives you a stable path that does not depend on
   the package layout.
3. **`app/api/ocr/route.ts`** — call
   `ocr.setPath(path.join(process.cwd(), 'onnx') + path.sep)` before the
   first classification so the model loader uses the copied files.

## Run

```sh
npm install
npm run dev
# open http://localhost:3000 and upload a captcha image
```

## Files of interest

- [next.config.mjs](next.config.mjs)
- [app/api/ocr/route.ts](app/api/ocr/route.ts)
- [scripts/copy-onnx.mjs](scripts/copy-onnx.mjs)
