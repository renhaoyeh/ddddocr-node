import { Jimp } from 'jimp';

import {
    bitmapToGray,
    bitmapToRgb,
    rgbToGray,
    absdiffRgb,
    threshold,
    morphologyClose,
    morphologyOpen,
    canny,
    matchTemplateCcoeffNormed,
    largestContourBbox
} from './utils/cv-utils.js';

interface SlideMatchResult {
    target: [number, number];
    target_x: number;
    target_y: number;
    confidence?: number;
}

interface SlideComparisonResult {
    target: [number, number];
    target_x: number;
    target_y: number;
}

type ImageInput = string | Buffer | ArrayBuffer;

async function readImage(input: ImageInput) {
    if (typeof input === 'string') {
        return Jimp.read(input);
    }
    if (input instanceof ArrayBuffer) {
        return Jimp.read(Buffer.from(input));
    }
    return Jimp.read(input);
}

/**
 * @ignore
 */
class Slide {
    /**
     * Matches a slider puzzle piece against a background image.
     *
     * - When `simpleTarget` is `false` (default), the algorithm uses Canny edge
     *   detection on both images before template matching. This is suited for
     *   puzzle pieces with transparent backgrounds.
     * - When `simpleTarget` is `true`, grayscale template matching is used
     *   directly, which is suited for simple (opaque) puzzle pieces.
     *
     * @returns Bounding box `{ target: [x1, y1, x2, y2], target_x, target_y, confidence }`.
     */
    public async slideMatch(
        targetImage: ImageInput,
        backgroundImage: ImageInput,
        simpleTarget = false
    ): Promise<SlideMatchResult> {
        const targetJimp = await readImage(targetImage);
        const backgroundJimp = await readImage(backgroundImage);

        const targetGray = bitmapToGray(targetJimp.bitmap);
        const backgroundGray = bitmapToGray(backgroundJimp.bitmap);

        const source = simpleTarget ? backgroundGray : canny(backgroundGray, 50, 150);
        const template = simpleTarget ? targetGray : canny(targetGray, 50, 150);

        const { x, y, score } = matchTemplateCcoeffNormed(source, template);

        const centerX = x + Math.floor(template.width / 2);
        const centerY = y + Math.floor(template.height / 2);

        return {
            target: [centerX, centerY],
            target_x: centerX,
            target_y: centerY,
            confidence: score
        };
    }

    /**
     * Finds the slider gap position by comparing two images: one with the gap
     * shadow/highlight visible, and the full background image. Returns the
     * center coordinates of the largest connected difference region.
     *
     * @returns `{ target: [x, y], target_x, target_y }` of the gap center.
     */
    public async slideComparison(
        targetImage: ImageInput,
        backgroundImage: ImageInput
    ): Promise<SlideComparisonResult> {
        const targetJimp = await readImage(targetImage);
        const backgroundJimp = await readImage(backgroundImage);

        const targetRgb = bitmapToRgb(targetJimp.bitmap);
        const backgroundRgb = bitmapToRgb(backgroundJimp.bitmap);

        const diff = absdiffRgb(targetRgb, backgroundRgb);
        const diffGray = rgbToGray(diff);
        const binary = threshold(diffGray, 30);

        const closed = morphologyClose(binary);
        const opened = morphologyOpen(closed);

        const bbox = largestContourBbox(opened);
        if (!bbox) {
            return { target: [0, 0], target_x: 0, target_y: 0 };
        }

        const centerX = bbox.x + Math.floor(bbox.width / 2);
        const centerY = bbox.y + Math.floor(bbox.height / 2);

        return {
            target: [centerX, centerY],
            target_x: centerX,
            target_y: centerY
        };
    }
}

export { Slide };
export type { SlideMatchResult, SlideComparisonResult, ImageInput };
