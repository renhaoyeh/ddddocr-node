/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['ddddocr-node', 'onnxruntime-node'],

    outputFileTracingIncludes: {
        '/api/ocr': ['./onnx/**/*']
    }
};

export default nextConfig;
