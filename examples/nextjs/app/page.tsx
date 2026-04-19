'use client';

import { useState } from 'react';

export default function Home() {
    const [result, setResult] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError('');
        setResult('');

        const form = new FormData();
        form.append('image', file);

        const res = await fetch('/api/ocr', { method: 'POST', body: form });
        const json = await res.json();

        if (res.ok) {
            setResult(json.text);
        } else {
            setError(json.error ?? 'Unknown error');
        }
        setLoading(false);
    }

    return (
        <main style={{ maxWidth: 640 }}>
            <h1>ddddocr-node · Next.js Example</h1>
            <p>Upload a captcha image to recognize it.</p>
            <input type="file" accept="image/*" onChange={handleUpload} disabled={loading} />
            {loading && <p>Recognizing…</p>}
            {result && (
                <pre style={{ background: '#f4f4f4', padding: 12, borderRadius: 8 }}>
                    Result: {result}
                </pre>
            )}
            {error && <p style={{ color: 'crimson' }}>{error}</p>}
        </main>
    );
}
