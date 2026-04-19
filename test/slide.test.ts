import { describe, test, expect, beforeAll } from 'vitest';

import { DdddOcr } from '../dist/esm/index.js';

describe('DdddOcr Slide Tests', () => {
    let ddddOcr: DdddOcr;

    beforeAll(() => {
        ddddOcr = new DdddOcr();
    });

    // Real slider-captcha samples from the original Python ddddocr README:
    //   滑块图:       https://cdn.wenanzhe.com/img/b.png
    //   背景图:       https://cdn.wenanzhe.com/img/a.png
    //   带缺口阴影图: https://cdn.wenanzhe.com/img/bg.jpg
    //   完整图片:     https://cdn.wenanzhe.com/img/fullpage.jpg
    // Reference values produced by Python ddddocr 1.6.1 (OpenCV) on the same
    // sample images:
    //   slide_match default:   target=[237, 77]  (center x, center y)
    //   slide_match simple:    target=[29,  77]
    //   slide_comparison:      target=[171, 91]
    test('slideMatch default (Canny) matches Python reference', async () => {
        const result = await ddddOcr.slideMatch(
            './test/slide-target.png',
            './test/slide-background.png'
        );

        console.log('slideMatch default:', result);

        // allow ±2 px drift between our Canny and OpenCV's Canny
        expect(Math.abs(result.target_x - 237)).toBeLessThanOrEqual(2);
        expect(Math.abs(result.target_y - 77)).toBeLessThanOrEqual(2);
        expect(result.target).toEqual([result.target_x, result.target_y]);
    });

    test('slideMatch simple matches Python reference', async () => {
        const result = await ddddOcr.slideMatch(
            './test/slide-target.png',
            './test/slide-background.png',
            true
        );

        console.log('slideMatch simple:', result);

        expect(Math.abs(result.target_x - 29)).toBeLessThanOrEqual(2);
        expect(Math.abs(result.target_y - 77)).toBeLessThanOrEqual(2);
    });

    test('slideComparison matches Python reference exactly', async () => {
        const result = await ddddOcr.slideComparison(
            './test/slide-gap.jpg',
            './test/slide-full.jpg'
        );

        console.log('slideComparison:', result);

        expect(result.target_x).toBe(171);
        expect(result.target_y).toBe(91);
        expect(result.target).toEqual([171, 91]);
    });
});
