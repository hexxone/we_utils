/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2026 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import { WEAI_TENSOR_BINS, WEAI_TENSOR_CHANNELS, WEAI_TENSOR_FRAMES } from './WEAITypes';

const CHANNEL_LEFT = 0;
const CHANNEL_RIGHT = 1;
const CHANNEL_DELTA_LEFT = 2;
const CHANNEL_DELTA_RIGHT = 3;
const CHANNEL_SALIENT_LEFT = 4;
const CHANNEL_SALIENT_RIGHT = 5;

export class SpectrumTensorBuffer {

    private readonly channels = Array.from(
        {
            length: WEAI_TENSOR_CHANNELS
        },
        () => {
            return new Float32Array(WEAI_TENSOR_FRAMES * WEAI_TENSOR_BINS);
        }
    );
    private readonly previousLeft = new Float32Array(WEAI_TENSOR_BINS);
    private readonly previousRight = new Float32Array(WEAI_TENSOR_BINS);
    private frameCount = 0;
    private writeIndex = 0;

    public reset(): void {
        this.channels.forEach((channel) => {
            channel.fill(0);
        });
        this.previousLeft.fill(0);
        this.previousRight.fill(0);
        this.frameCount = 0;
        this.writeIndex = 0;
    }

    public pushFrame(data: ArrayLike<number>): void {
        const frameOffset = this.writeIndex * WEAI_TENSOR_BINS;
        const nextLeft = new Float32Array(WEAI_TENSOR_BINS);
        const nextRight = new Float32Array(WEAI_TENSOR_BINS);

        for (let index = 0; index < WEAI_TENSOR_BINS; index++) {
            const left = this.normalizeValue(data[index]);
            const right = this.normalizeValue(data[WEAI_TENSOR_BINS + index]);
            const deltaLeft = Math.max(0, left - this.previousLeft[index]);
            const deltaRight = Math.max(0, right - this.previousRight[index]);
            const salientLeft = this.computeSalience(data, index, 0, left);
            const salientRight = this.computeSalience(
                data,
                index,
                WEAI_TENSOR_BINS,
                right
            );

            this.channels[CHANNEL_LEFT][frameOffset + index] = left;
            this.channels[CHANNEL_RIGHT][frameOffset + index] = right;
            this.channels[CHANNEL_DELTA_LEFT][frameOffset + index] = deltaLeft;
            this.channels[CHANNEL_DELTA_RIGHT][frameOffset + index] = deltaRight;
            this.channels[CHANNEL_SALIENT_LEFT][frameOffset + index] = salientLeft;
            this.channels[CHANNEL_SALIENT_RIGHT][frameOffset + index] = salientRight;

            nextLeft[index] = left;
            nextRight[index] = right;
        }

        this.previousLeft.set(nextLeft);
        this.previousRight.set(nextRight);
        this.writeIndex = (this.writeIndex + 1) % WEAI_TENSOR_FRAMES;
        this.frameCount = Math.min(this.frameCount + 1, WEAI_TENSOR_FRAMES);
    }

    public hasFullContext(): boolean {
        return this.frameCount >= WEAI_TENSOR_FRAMES;
    }

    public snapshot(): Float32Array {
        const tensor = new Float32Array(
            WEAI_TENSOR_CHANNELS * WEAI_TENSOR_FRAMES * WEAI_TENSOR_BINS
        );
        const missingFrames = WEAI_TENSOR_FRAMES - this.frameCount;

        for (let channelIndex = 0; channelIndex < WEAI_TENSOR_CHANNELS; channelIndex++) {
            const channel = this.channels[channelIndex];
            const tensorChannelOffset = channelIndex * WEAI_TENSOR_FRAMES * WEAI_TENSOR_BINS;

            for (let frame = 0; frame < WEAI_TENSOR_FRAMES; frame++) {
                if (frame < missingFrames) {
                    continue;
                }

                const logicalFrame = frame - missingFrames;
                const sourceFrame = this.frameCount < WEAI_TENSOR_FRAMES
                    ? logicalFrame
                    : (this.writeIndex + frame) % WEAI_TENSOR_FRAMES;
                const sourceOffset = sourceFrame * WEAI_TENSOR_BINS;
                const targetOffset = tensorChannelOffset + frame * WEAI_TENSOR_BINS;

                tensor.set(
                    channel.subarray(sourceOffset, sourceOffset + WEAI_TENSOR_BINS),
                    targetOffset
                );
            }
        }

        return tensor;
    }

    private normalizeValue(value: number): number {
        if (!Number.isFinite(value) || value <= 0) {
            return 0;
        }

        return Math.log1p(Math.min(value, 1.5) * 8);
    }

    private computeSalience(
        data: ArrayLike<number>,
        index: number,
        offset: number,
        current: number
    ): number {
        const left = this.normalizeValue(
            data[offset + Math.max(0, index - 1)]
        );
        const right = this.normalizeValue(
            data[offset + Math.min(WEAI_TENSOR_BINS - 1, index + 1)]
        );
        const neighborMean = (left + right) * 0.5;
        const localContrast = Math.max(0, current - neighborMean * 1.04);

        return localContrast / Math.max(0.045, neighborMean + 0.03);
    }

}
