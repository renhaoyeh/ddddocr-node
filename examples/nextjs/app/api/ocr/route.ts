import { NextResponse } from 'next/server';
import path from 'node:path';
import { writeFile, mkdir, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

import { DdddOcr } from 'ddddocr-node';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The bug: when Next.js bundles the server code, `__dirname` inside
// ddddocr-node resolves to `.next/server/...`, so the built-in ONNX_DIR
// becomes `.next/server/onnx/...` which does not exist.
//
// Fix: point `setPath()` at a stable location under `process.cwd()`.
// We keep a copy of the model files in `./onnx` at the project root
// (populated by scripts/copy-onnx.mjs at install time), and configure
// `next.config.mjs` so the files are traced into the standalone build.
const ONNX_ROOT = path.join(process.cwd(), 'onnx') + path.sep;

let ocrPromise: Promise<DdddOcr> | null = null;

function getOcr(): Promise<DdddOcr> {
    if (!ocrPromise) {
        ocrPromise = (async () => {
            const ocr = new DdddOcr();
            ocr.setPath(ONNX_ROOT);
            return ocr;
        })();
    }
    return ocrPromise;
}

export async function POST(req: Request) {
    const form = await req.formData();
    const file = form.get('image');

    if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No image uploaded under field "image"' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const tmpPath = path.join(tmpdir(), `ddddocr-${randomUUID()}`);
    await mkdir(tmpdir(), { recursive: true });
    await writeFile(tmpPath, buf);

    try {
        const ocr = await getOcr();
        const text = await ocr.classification(tmpPath);
        return NextResponse.json({ text });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message }, { status: 500 });
    } finally {
        unlink(tmpPath).catch(() => {});
    }
}
