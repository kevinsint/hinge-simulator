/**
 * FourBarLinkageCalculator - Calculation logic for the four-bar (cross-hinge) mechanism.
 * All geometric calculations follow the algorithm described in README.md.
 * No UI or rendering logic is included.
 */

export class FourBarLinkageCalculator {
    static distance(p1, p2) {
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }

    /**
     * Determines the orientation of the ordered triplet (p, q, r).
     * @returns {number} 0 if collinear, 1 if clockwise, 2 if counterclockwise.
     */
    static orientation(p, q, r) {
        const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
        if (Math.abs(val) < 1e-10) return 0; // Collinear
        return (val > 0) ? 1 : 2; // Clockwise or Counterclockwise
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
        // Helper function to check if point q lies on segment pr
        const onSegment = (p, q, r) => {
            return (
                q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
                q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y)
            );
        };

        // To find orientation of ordered triplet (p, q, r).
        // 0 --> p, q and r are collinear
        // 1 --> Clockwise
        // 2 --> Counterclockwise
        const orientation = (p, q, r) => {
            // See https://www.geeksforgeeks.org/orientation-3-ordered-points/ for details
            const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
            if (Math.abs(val) < 1e-10) return 0; // Collinear
            return (val > 0) ? 1 : 2; // Clockwise or Counterclockwise
        };

        const o1 = orientation(p1, q1, p2);
        const o2 = orientation(p1, q1, q2);
        const o3 = orientation(p2, q2, p1);
        const o4 = orientation(p2, q2, q1);

        // General case
        if (o1 !== o2 && o3 !== o4) {
            return true;
        }

        // Special Cases for collinear points
        if (o1 === 0 && onSegment(p1, p2, q1)) return true;
        if (o2 === 0 && onSegment(p1, q2, q1)) return true;
        if (o3 === 0 && onSegment(p2, p1, q2)) return true;
        if (o4 === 0 && onSegment(p2, q1, q2)) return true;

        return false; // Doesn't fall in any of the above cases
    }

    static getTransform(p1_from, p2_from, p1_to, p2_to) {
        const angle_from = Math.atan2(p2_from.y - p1_from.y, p2_from.x - p1_from.x);
        const angle_to = Math.atan2(p2_to.y - p1_to.y, p2_to.x - p1_to.x);
        
        const angle = angle_to - angle_from;
        
        const center_from = { x: (p1_from.x + p2_from.x) / 2, y: (p1_from.y + p2_from.y) / 2 };
        const center_to = { x: (p1_to.x + p2_to.x) / 2, y: (p1_to.y + p2_to.y) / 2 };

        return { angle, center_from, center_to };
    }

    static applyTransform(point, transform) {
        // First, rotate the point around the 'from' center
        const tempX = point.x - transform.center_from.x;
        const tempY = point.y - transform.center_from.y;
        
        const rotatedX = tempX * Math.cos(transform.angle) - tempY * Math.sin(transform.angle);
        const rotatedY = tempX * Math.sin(transform.angle) + tempY * Math.cos(transform.angle);
        
        // Then, translate the point to the new center
        const finalX = rotatedX + transform.center_to.x;
        const finalY = rotatedY + transform.center_to.y;
        
        return { x: finalX, y: finalY };
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

        if (d === r1 + r2 || d === Math.abs(r1 - r2)) {
            return [intersection1]; // Tangent, one solution
        }

        return [intersection1, intersection2];
    }
}
