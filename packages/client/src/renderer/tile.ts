import type { ProcessedAnimation } from '@kaetram/common/types/map';

export default class Tile {
    public animationIndex = 0;

    // WebGL rendering functions.
    public uploaded = true;

    private lastTime = 0;

    public constructor(
        public id: number, // The tileId
        public index: number, // Index position of the tile.
        public animationInfo: ProcessedAnimation[],
        public isFlipped = false,
        public isHighTile = false
    ) {}

    /**
     * Animates a tile when the time elapsed since the last update is
     * greater than the duration of the animation. We change the tileId
     * when this update occurs and increment the animationIndex. Once
     * we exhaust all the animations in the tile, we reset the animationIndex.
     * @param time The current time in milliseconds (sent from the client updater).
     */

    public animate(time: number): void {
        if (time - this.lastTime > this.animationInfo[this.animationIndex].duration) {
            this.id = this.animationInfo[this.animationIndex].tileId;

            this.lastTime = time;

            this.uploaded = false;

            if (this.animationIndex >= Object.keys(this.animationInfo).length - 1)
                this.animationIndex = 0;
            else this.animationIndex++;
        }
    }
}
