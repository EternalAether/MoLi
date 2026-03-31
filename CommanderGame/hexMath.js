// hexMath.js
// 六边形数学与坐标系系转换工具

export class Hex {
    constructor(q, r, s) {
        this.q = q;
        this.r = r;
        this.s = s;
        if (Math.round(q + r + s) !== 0) {
            console.warn("Hex坐标无效: q + r + s 必须等于 0");
        }
    }

    // 获取唯一标识符，用于作为 Map 的 Key
    toString() {
        return `${this.q},${this.r},${this.s}`;
    }
}

export const HexMath = {
    // 两个六边形之间的距离 (步数)
    distance(a, b) {
        return Math.max(
            Math.abs(a.q - b.q),
            Math.abs(a.r - b.r),
            Math.abs(a.s - b.s)
        );
    },

    // 坐标系转屏幕像素点 (Pointy-topped)
    hexToPixel(hex, size) {
        const x = size * Math.sqrt(3) * (hex.q + hex.r / 2);
        const y = size * 3 / 2 * hex.r;
        return { x, y };
    },

    // 六个相邻方向
    directions: [
        new Hex(1, 0, -1), new Hex(1, -1, 0), new Hex(0, -1, 1),
        new Hex(-1, 0, 1), new Hex(-1, 1, 0), new Hex(0, 1, -1)
    ],

    // 获取相邻坐标
    neighbor(hex, directionIndex) {
        const dir = this.directions[directionIndex];
        return new Hex(hex.q + dir.q, hex.r + dir.r, hex.s + dir.s);
    },

    // 获取以 center 为中心，radius 为半径的所有坐标
    getRange(center, radius) {
        let results = [];
        for (let q = -radius; q <= radius; q++) {
            let r1 = Math.max(-radius, -q - radius);
            let r2 = Math.min(radius, -q + radius);
            for (let r = r1; r <= r2; r++) {
                results.push(new Hex(center.q + q, center.r + r, center.s + (-q - r)));
            }
        }
        return results;
    }
};