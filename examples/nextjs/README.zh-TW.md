# ddddocr-node · Next.js 最小範例

[English](./README.md)

重現並解決 [issue #3](https://github.com/renhaoyeh/ddddocr-node/issues/3)：

> Load model from /xx/.next/server/onnx/common_old.onnx failed: File doesn't exist

## 為什麼會在 Next.js 裡壞掉

`ddddocr-node` 透過 `path.resolve(__dirname, '../../../onnx')` 來定位內建的
ONNX 模型。當 Next.js 在 server build 時把套件追蹤並打包進 `.next/server/...`，
`__dirname` 就不再指向原本安裝在 `node_modules` 的套件目錄，解析出來的
ONNX 路徑自然不存在，導致模型載入失敗。

## 解法

三個檔案一起處理這件事：

1. **[next.config.mjs](next.config.mjs)** — 用 `serverExternalPackages`
   把 `ddddocr-node` 和 `onnxruntime-node` 標為外部套件，避免 Next
   去打包 native addon；再用 `outputFileTracingIncludes` 把專案根目錄的
   `./onnx` 納入 standalone build。
2. **[scripts/copy-onnx.mjs](scripts/copy-onnx.mjs)** — 在 `postinstall`
   時把 `node_modules/ddddocr-node/onnx` 的模型檔複製到專案根目錄
   `./onnx`，取得一個不依賴套件內部結構的穩定路徑。
3. **[app/api/ocr/route.ts](app/api/ocr/route.ts)** — 第一次呼叫
   `classification` 前，先用
   `ocr.setPath(path.join(process.cwd(), 'onnx') + path.sep)` 明確指定
   模型路徑，繞過套件內部基於 `__dirname` 的解析。

## 執行

```sh
npm install
npm run dev
# 開啟 http://localhost:3000，上傳一張驗證碼圖片
```

## 重點檔案

- [next.config.mjs](next.config.mjs)
- [app/api/ocr/route.ts](app/api/ocr/route.ts)
- [scripts/copy-onnx.mjs](scripts/copy-onnx.mjs)
