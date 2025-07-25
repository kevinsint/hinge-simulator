/**
 * FourBarLinkageCalculator - Calculation logic for the four-bar (cross-hinge) mechanism.
 * All geometric calculations follow the algorithm described in README.md.
 * No UI or rendering logic is included.
 */

export class FourBarLinkageCalculator {
    static distance(p1, p2) {
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }

    // Helper to find the intersection points of two circles.
    /**
     * Checks if a target position for the lid is reachable by the calculated four-bar linkage.
     * @param {Object} targetLidPos - The proposed new position { center, rotation }.
     * @param {Object} mechanism - The calculated mechanism object, including basePivots and linkageGeom.
     * @param {Object} floatingPoints - The local floating points { A, B }.
     * @returns {boolean} - True if the position is reachable, false otherwise.
     */
    static isPositionReachable(targetLidPos, mechanism, floatingPoints) {
        const { basePivots, linkageGeom } = mechanism;
        const { left: pivotA, right: pivotD } = basePivots;
        const { rockerA, rockerC } = linkageGeom;

        // Helper to transform a point
        const transform = (p, center, rotation) => {
            const rad = rotation * Math.PI / 180;
            const cos = Math.cos(rad), sin = Math.sin(rad);
            return {
                x: p.x * cos - p.y * sin + center.x,
                y: p.x * sin + p.y * cos + center.y
            };
        };

        const targetB = transform(floatingPoints.A, targetLidPos.center, targetLidPos.rotation);
        const targetC = transform(floatingPoints.B, targetLidPos.center, targetLidPos.rotation);

        const distAB = Math.hypot(targetB.x - pivotA.x, targetB.y - pivotA.y);
        const distDC = Math.hypot(targetC.x - pivotD.x, targetC.y - pivotD.y);

        const errorA = distAB - rockerA;
        const errorC = distDC - rockerC;

        const tolerance = 2.0; 
        const isReachable = Math.abs(errorA) < tolerance && Math.abs(errorC) < tolerance;

        return { isReachable, errorA, errorC, targetB };
    }

    static segmentsIntersect(p1, q1, p2, q2) {
        function onSegment(p, q, r) {
            return (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
                    q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y));
        }

        function orientation(p, q, r) {
            const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
            if (val === 0) return 0;  // Collinear
            return (val > 0) ? 1 : 2; // Clockwise or Counterclockwise
        }

        const o1 = orientation(p1, q1, p2);
        const o2 = orientation(p1, q1, q2);
        const o3 = orientation(p2, q2, p1);
        const o4 = orientation(p2, q2, q1);

        if (o1 !== o2 && o3 !== o4) {
            return true;
        }

        // Special Cases for collinear points
        if (o1 === 0 && onSegment(p1, p2, q1)) return true;
        if (o2 === 0 && onSegment(p1, q2, q1)) return true;
        if (o3 === 0 && onSegment(p2, p1, q2)) return true;
        if (o4 === 0 && onSegment(p2, q1, q2)) return true;

        return false;
    }

    static circleCircleIntersection(p1, r1, p2, r2) {
        const d = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);

        // Check for solvability
        if (d > r1 + r2 || d < Math.abs(r1 - r2) || (d === 0 && r1 !== r2)) {
            return null; // No solution, circles are separate, contained, or concentric.
        }

        const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
        const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));

        const x2 = p1.x + a * (p2.x - p1.x) / d;
        const y2 = p1.y + a * (p2.y - p1.y) / d;

        const intersection1 = {
            x: x2 + h * (p2.y - p1.y) / d,
            y: y2 - h * (p2.x - p1.x) / d
        };
        const intersection2 = {
            x: x2 - h * (p2.y - p1.y) / d,
            y: y2 + h * (p2.x - p1.x) / d
        };

        return { p1: intersection1, p2: intersection2 };
    }
}
