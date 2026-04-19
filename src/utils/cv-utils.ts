interface RgbaBitmap {
    data: Uint8Array | Buffer;
    width: number;
    height: number;
}

interface GrayImage {
    data: Uint8Array;
    width: number;
    height: number;
}

interface RgbImage {
    data: Uint8Array;
    width: number;
    height: number;
}

interface MatchResult {
    x: number;
    y: number;
    score: number;
}

interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

function bitmapToGray(bitmap: RgbaBitmap): GrayImage {
    const { width, height, data } = bitmap;
    const out = new Uint8Array(width * height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        out[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    return { data: out, width, height };
}

function bitmapToRgb(bitmap: RgbaBitmap): RgbImage {
    const { width, height, data } = bitmap;
    const out = new Uint8Array(width * height * 3);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
        out[j] = data[i];
        out[j + 1] = data[i + 1];
        out[j + 2] = data[i + 2];
    }
    return { data: out, width, height };
}

function absdiffRgb(a: RgbImage, b: RgbImage): RgbImage {
    if (a.width !== b.width || a.height !== b.height) {
        throw new Error('absdiff: image sizes do not match');
    }
    const out = new Uint8Array(a.data.length);
    for (let i = 0; i < a.data.length; i++) {
        out[i] = Math.abs(a.data[i] - b.data[i]);
    }
    return { data: out, width: a.width, height: a.height };
}

function rgbToGray(image: RgbImage): GrayImage {
    const { width, height, data } = image;
    const out = new Uint8Array(width * height);
    for (let i = 0, j = 0; i < data.length; i += 3, j++) {
        out[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    return { data: out, width, height };
}

function threshold(gray: GrayImage, thresh: number): GrayImage {
    const out = new Uint8Array(gray.data.length);
    for (let i = 0; i < gray.data.length; i++) {
        out[i] = gray.data[i] > thresh ? 255 : 0;
    }
    return { data: out, width: gray.width, height: gray.height };
}

function dilate3x3(binary: GrayImage): GrayImage {
    const { width, height, data } = binary;
    const out = new Uint8Array(data.length);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let max = 0;
            for (let dy = -1; dy <= 1 && max < 255; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= height) continue;
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    if (nx < 0 || nx >= width) continue;
                    const v = data[ny * width + nx];
                    if (v > max) max = v;
                    if (max === 255) break;
                }
            }
            out[y * width + x] = max;
        }
    }
    return { data: out, width, height };
}

function erode3x3(binary: GrayImage): GrayImage {
    const { width, height, data } = binary;
    const out = new Uint8Array(data.length);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let min = 255;
            for (let dy = -1; dy <= 1 && min > 0; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= height) {
                    min = 0;
                    break;
                }
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    if (nx < 0 || nx >= width) {
                        min = 0;
                        break;
                    }
                    const v = data[ny * width + nx];
                    if (v < min) min = v;
                    if (min === 0) break;
                }
            }
            out[y * width + x] = min;
        }
    }
    return { data: out, width, height };
}

function morphologyClose(binary: GrayImage): GrayImage {
    return erode3x3(dilate3x3(binary));
}

function morphologyOpen(binary: GrayImage): GrayImage {
    return dilate3x3(erode3x3(binary));
}

function gaussianBlur5(gray: GrayImage): GrayImage {
    const { width, height, data } = gray;
    const kernel = [1, 4, 6, 4, 1];
    const kSum = 16;
    const tmp = new Float32Array(data.length);
    const out = new Uint8Array(data.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            for (let k = -2; k <= 2; k++) {
                let nx = x + k;
                if (nx < 0) nx = 0;
                else if (nx >= width) nx = width - 1;
                sum += data[y * width + nx] * kernel[k + 2];
            }
            tmp[y * width + x] = sum / kSum;
        }
    }

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let sum = 0;
            for (let k = -2; k <= 2; k++) {
                let ny = y + k;
                if (ny < 0) ny = 0;
                else if (ny >= height) ny = height - 1;
                sum += tmp[ny * width + x] * kernel[k + 2];
            }
            out[y * width + x] = Math.round(sum / kSum);
        }
    }

    return { data: out, width, height };
}

function sobel(gray: GrayImage): { mag: Float32Array; angle: Float32Array } {
    const { width, height, data } = gray;
    const mag = new Float32Array(width * height);
    const angle = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = y * width + x;
            const gx =
                -data[i - width - 1] + data[i - width + 1]
                - 2 * data[i - 1] + 2 * data[i + 1]
                - data[i + width - 1] + data[i + width + 1];
            const gy =
                -data[i - width - 1] - 2 * data[i - width] - data[i - width + 1]
                + data[i + width - 1] + 2 * data[i + width] + data[i + width + 1];
            mag[i] = Math.sqrt(gx * gx + gy * gy);
            angle[i] = Math.atan2(gy, gx);
        }
    }

    return { mag, angle };
}

function canny(gray: GrayImage, lowThresh = 50, highThresh = 150): GrayImage {
    const blurred = gaussianBlur5(gray);
    const { width, height } = blurred;
    const { mag, angle } = sobel(blurred);

    const suppressed = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = y * width + x;
            let a = angle[i] * 180 / Math.PI;
            if (a < 0) a += 180;

            let n1: number, n2: number;
            if ((a >= 0 && a < 22.5) || (a >= 157.5 && a <= 180)) {
                n1 = mag[i - 1];
                n2 = mag[i + 1];
            } else if (a >= 22.5 && a < 67.5) {
                n1 = mag[i - width + 1];
                n2 = mag[i + width - 1];
            } else if (a >= 67.5 && a < 112.5) {
                n1 = mag[i - width];
                n2 = mag[i + width];
            } else {
                n1 = mag[i - width - 1];
                n2 = mag[i + width + 1];
            }

            suppressed[i] = mag[i] >= n1 && mag[i] >= n2 ? mag[i] : 0;
        }
    }

    const out = new Uint8Array(width * height);
    const STRONG = 255;
    const WEAK = 75;
    for (let i = 0; i < suppressed.length; i++) {
        if (suppressed[i] >= highThresh) out[i] = STRONG;
        else if (suppressed[i] >= lowThresh) out[i] = WEAK;
    }

    const stack: number[] = [];
    for (let i = 0; i < out.length; i++) {
        if (out[i] === STRONG) stack.push(i);
    }
    while (stack.length > 0) {
        const i = stack.pop() as number;
        const y = Math.floor(i / width);
        const x = i - y * width;
        for (let dy = -1; dy <= 1; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                if (nx < 0 || nx >= width) continue;
                const j = ny * width + nx;
                if (out[j] === WEAK) {
                    out[j] = STRONG;
                    stack.push(j);
                }
            }
        }
    }
    for (let i = 0; i < out.length; i++) {
        if (out[i] !== STRONG) out[i] = 0;
    }

    return { data: out, width, height };
}

function matchTemplateCcoeffNormed(image: GrayImage, template: GrayImage): MatchResult {
    const iw = image.width;
    const ih = image.height;
    const tw = template.width;
    const th = template.height;

    if (tw > iw || th > ih) {
        throw new Error('Template is larger than source image');
    }

    const tSize = tw * th;
    let tMean = 0;
    for (let i = 0; i < tSize; i++) tMean += template.data[i];
    tMean /= tSize;

    const tCentered = new Float32Array(tSize);
    let tNormSq = 0;
    for (let i = 0; i < tSize; i++) {
        const v = template.data[i] - tMean;
        tCentered[i] = v;
        tNormSq += v * v;
    }
    const tNorm = Math.sqrt(tNormSq);

    const integral = new Float64Array((iw + 1) * (ih + 1));
    const integralSq = new Float64Array((iw + 1) * (ih + 1));
    for (let y = 0; y < ih; y++) {
        let rowSum = 0;
        let rowSumSq = 0;
        for (let x = 0; x < iw; x++) {
            const v = image.data[y * iw + x];
            rowSum += v;
            rowSumSq += v * v;
            integral[(y + 1) * (iw + 1) + x + 1] = integral[y * (iw + 1) + x + 1] + rowSum;
            integralSq[(y + 1) * (iw + 1) + x + 1] = integralSq[y * (iw + 1) + x + 1] + rowSumSq;
        }
    }

    const resultW = iw - tw + 1;
    const resultH = ih - th + 1;
    let bestScore = -Infinity;
    let bestX = 0;
    let bestY = 0;

    for (let y = 0; y < resultH; y++) {
        for (let x = 0; x < resultW; x++) {
            const sum =
                integral[(y + th) * (iw + 1) + x + tw]
                - integral[y * (iw + 1) + x + tw]
                - integral[(y + th) * (iw + 1) + x]
                + integral[y * (iw + 1) + x];
            const sumSq =
                integralSq[(y + th) * (iw + 1) + x + tw]
                - integralSq[y * (iw + 1) + x + tw]
                - integralSq[(y + th) * (iw + 1) + x]
                + integralSq[y * (iw + 1) + x];
            const iMean = sum / tSize;
            const iNormSq = sumSq - sum * iMean;
            const denom = tNorm * Math.sqrt(iNormSq);

            let corr = 0;
            for (let ty = 0; ty < th; ty++) {
                const imgOffset = (y + ty) * iw + x;
                const tplOffset = ty * tw;
                for (let tx = 0; tx < tw; tx++) {
                    corr += tCentered[tplOffset + tx] * image.data[imgOffset + tx];
                }
            }

            const score = denom > 0 ? corr / denom : 0;
            if (score > bestScore) {
                bestScore = score;
                bestX = x;
                bestY = y;
            }
        }
    }

    return { x: bestX, y: bestY, score: bestScore };
}

function largestContourBbox(binary: GrayImage): BoundingBox | null {
    const { width, height, data } = binary;
    const visited = new Uint8Array(width * height);
    let best: BoundingBox | null = null;
    let bestArea = 0;

    const queue = new Int32Array(width * height);
    for (let y0 = 0; y0 < height; y0++) {
        for (let x0 = 0; x0 < width; x0++) {
            const start = y0 * width + x0;
            if (data[start] === 0 || visited[start]) continue;

            let head = 0;
            let tail = 0;
            queue[tail++] = start;
            visited[start] = 1;

            let minX = x0, maxX = x0, minY = y0, maxY = y0, area = 0;
            while (head < tail) {
                const idx = queue[head++];
                const y = Math.floor(idx / width);
                const x = idx - y * width;
                area++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;

                if (x > 0) {
                    const n = idx - 1;
                    if (data[n] !== 0 && !visited[n]) { visited[n] = 1; queue[tail++] = n; }
                }
                if (x < width - 1) {
                    const n = idx + 1;
                    if (data[n] !== 0 && !visited[n]) { visited[n] = 1; queue[tail++] = n; }
                }
                if (y > 0) {
                    const n = idx - width;
                    if (data[n] !== 0 && !visited[n]) { visited[n] = 1; queue[tail++] = n; }
                }
                if (y < height - 1) {
                    const n = idx + width;
                    if (data[n] !== 0 && !visited[n]) { visited[n] = 1; queue[tail++] = n; }
                }
            }

            if (area > bestArea) {
                bestArea = area;
                best = {
                    x: minX,
                    y: minY,
                    width: maxX - minX + 1,
                    height: maxY - minY + 1
                };
            }
        }
    }

    return best;
}

export {
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
};

export type { GrayImage, RgbImage, MatchResult, BoundingBox, RgbaBitmap };
