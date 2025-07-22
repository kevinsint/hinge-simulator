/**
 * MechanismCalculator - Calculates four-bar linkage mechanism based on three lid positions
 * Implements the SolidWorks method described in the video transcript
 */
class MechanismCalculator {
    constructor() {
        this.positions = [];
        this.couplerPoints = { A: null, B: null };
        this.pivotPoints = { left: null, right: null };
        this.isValid = false;
    }

    /**
     * Set the three lid positions (closed, intermediate, open)
     * @param {Array} positions - Array of 3 position objects, each with center and rotation
     */
    setLidPositions(positions) {
        if (positions.length !== 3) {
            throw new Error('Exactly 3 positions required: closed, intermediate, open');
        }
        
        this.positions = positions.map((pos, index) => ({
            id: ['closed', 'intermediate', 'open'][index],
            center: { x: pos.center.x, y: pos.center.y },
            rotation: pos.rotation || 0,
            ...pos
        }));
        
        this.isValid = false;
        return this;
    }

    /**
     * Set the coupler link points on the closed lid
     * @param {Object} pointA - First coupler point {x, y}
     * @param {Object} pointB - Second coupler point {x, y}
     */
    setCouplerPoints(pointA, pointB) {
        this.couplerPoints.A = { x: pointA.x, y: pointA.y };
        this.couplerPoints.B = { x: pointB.x, y: pointB.y };
        
        // Calculate coupler length
        this.couplerLength = this.calculateDistance(pointA, pointB);
        
        this.isValid = false;
        return this;
    }

    /**
     * Calculate the mechanism pivot points using the SolidWorks method
     * @returns {Object} Object containing pivot points and mechanism data
     */
    calculateMechanism() {
        if (this.positions.length !== 3) {
            throw new Error('Three lid positions must be set first');
        }
        
        if (!this.couplerPoints.A || !this.couplerPoints.B) {
            throw new Error('Coupler points must be set first');
        }

        // Step 1: Transform coupler points to all three positions
        const transformedPoints = this.transformCouplerToAllPositions();
        
        // Step 2: Connect the positions and find midpoints
        const connectionLines = this.createConnectionLines(transformedPoints);
        
        // Step 3: Create perpendicular lines from midpoints
        const perpendiculars = this.createPerpendicularLines(connectionLines);
        
        // Step 4: Find convergence points (pivot points)
        const pivots = this.findConvergencePoints(perpendiculars);
        
        // Step 5: Validate the mechanism
        const validation = this.validateMechanism(pivots, transformedPoints);
        
        this.pivotPoints = pivots;
        this.isValid = validation.isValid;
        
        return {
            pivotPoints: pivots,
            transformedPoints,
            connectionLines,
            perpendiculars,
            validation,
            couplerLength: this.couplerLength,
            linkLengths: this.calculateLinkLengths(pivots, transformedPoints)
        };
    }

    /**
     * Transform coupler points to all three lid positions
     * @returns {Object} Transformed points for all positions
     */
    transformCouplerToAllPositions() {
        const transformed = {
            A: [],  // A1, A2, A3
            B: []   // B1, B2, B3
        };

        this.positions.forEach((position, index) => {
            // Transform coupler points based on lid position and rotation
            const transformedA = this.transformPoint(
                this.couplerPoints.A, 
                position.center, 
                position.rotation
            );
            const transformedB = this.transformPoint(
                this.couplerPoints.B, 
                position.center, 
                position.rotation
            );

            transformed.A.push({
                ...transformedA,
                position: index + 1,
                id: position.id
            });
            transformed.B.push({
                ...transformedB,
                position: index + 1,
                id: position.id
            });
        });

        return transformed;
    }

    /**
     * Transform a point based on center position and rotation
     * @param {Object} point - Original point {x, y}
     * @param {Object} center - Center of transformation {x, y}
     * @param {number} rotation - Rotation in degrees
     * @returns {Object} Transformed point
     */
    transformPoint(point, center, rotation) {
        const rad = (rotation || 0) * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        // Translate to origin, rotate, then translate to center
        const relativeX = point.x;
        const relativeY = point.y;
        
        return {
            x: center.x + (relativeX * cos - relativeY * sin),
            y: center.y + (relativeX * sin + relativeY * cos)
        };
    }

    /**
     * Create connection lines between consecutive positions
     * @param {Object} transformedPoints - Points transformed to all positions
     * @returns {Object} Connection lines with midpoints
     */
    createConnectionLines(transformedPoints) {
        const lines = {
            A: [],  // A1-A2, A2-A3
            B: []   // B1-B2, B2-B3
        };

        // Create lines for side A
        for (let i = 0; i < 2; i++) {
            const start = transformedPoints.A[i];
            const end = transformedPoints.A[i + 1];
            const midpoint = this.calculateMidpoint(start, end);
            
            lines.A.push({
                start,
                end,
                midpoint,
                id: `A${i + 1}-A${i + 2}`
            });
        }

        // Create lines for side B
        for (let i = 0; i < 2; i++) {
            const start = transformedPoints.B[i];
            const end = transformedPoints.B[i + 1];
            const midpoint = this.calculateMidpoint(start, end);
            
            lines.B.push({
                start,
                end,
                midpoint,
                id: `B${i + 1}-B${i + 2}`
            });
        }

        return lines;
    }

    /**
     * Create perpendicular lines from midpoints
     * @param {Object} connectionLines - Connection lines with midpoints
     * @returns {Object} Perpendicular lines
     */
    createPerpendicularLines(connectionLines) {
        const perpendiculars = {
            A: [],
            B: []
        };

        // Create perpendiculars for side A
        connectionLines.A.forEach(line => {
            const perpendicular = this.createPerpendicular(line);
            perpendiculars.A.push(perpendicular);
        });

        // Create perpendiculars for side B
        connectionLines.B.forEach(line => {
            const perpendicular = this.createPerpendicular(line);
            perpendiculars.B.push(perpendicular);
        });

        return perpendiculars;
    }

    /**
     * Create a perpendicular line from a connection line's midpoint
     * @param {Object} line - Connection line with start, end, midpoint
     * @returns {Object} Perpendicular line data
     */
    createPerpendicular(line) {
        const dx = line.end.x - line.start.x;
        const dy = line.end.y - line.start.y;
        
        // Perpendicular direction (rotate 90 degrees)
        const perpDx = -dy;
        const perpDy = dx;
        
        // Normalize the perpendicular direction
        const length = Math.sqrt(perpDx * perpDx + perpDy * perpDy);
        const unitX = perpDx / length;
        const unitY = perpDy / length;
        
        // Create perpendicular line extending in both directions
        const extensionLength = 1000; // Large enough to ensure intersection
        
        return {
            midpoint: line.midpoint,
            direction: { x: unitX, y: unitY },
            start: {
                x: line.midpoint.x - unitX * extensionLength,
                y: line.midpoint.y - unitY * extensionLength
            },
            end: {
                x: line.midpoint.x + unitX * extensionLength,
                y: line.midpoint.y + unitY * extensionLength
            },
            originalLine: line.id
        };
    }

    /**
     * Find convergence points of perpendicular lines
     * @param {Object} perpendiculars - Perpendicular lines
     * @returns {Object} Pivot points
     */
    findConvergencePoints(perpendiculars) {
        // Find intersection of perpendiculars for side A
        const pivotA = this.findLineIntersection(
            perpendiculars.A[0],
            perpendiculars.A[1]
        );

        // Find intersection of perpendiculars for side B
        const pivotB = this.findLineIntersection(
            perpendiculars.B[0],
            perpendiculars.B[1]
        );

        return {
            left: pivotA,
            right: pivotB,
            A: pivotA,  // Alias for compatibility
            D: pivotB   // Alias for compatibility
        };
    }

    /**
     * Find intersection point of two lines
     * @param {Object} line1 - First line
     * @param {Object} line2 - Second line
     * @returns {Object|null} Intersection point or null if parallel
     */
    findLineIntersection(line1, line2) {
        const x1 = line1.start.x, y1 = line1.start.y;
        const x2 = line1.end.x, y2 = line1.end.y;
        const x3 = line2.start.x, y3 = line2.start.y;
        const x4 = line2.end.x, y4 = line2.end.y;

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        
        if (Math.abs(denom) < 1e-10) {
            return null; // Lines are parallel
        }

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        
        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1)
        };
    }

    /**
     * Calculate link lengths for the mechanism
     * @param {Object} pivots - Pivot points
     * @param {Object} transformedPoints - Transformed coupler points
     * @returns {Object} Link lengths
     */
    calculateLinkLengths(pivots, transformedPoints) {
        // Use first position for length calculation
        const A1 = transformedPoints.A[0];
        const B1 = transformedPoints.B[0];

        return {
            inputLink: this.calculateDistance(pivots.left, A1),    // Link 2 (AB)
            couplerLink: this.couplerLength,                      // Link 3 (BC)
            outputLink: this.calculateDistance(B1, pivots.right), // Link 4 (CD)
            groundLink: this.calculateDistance(pivots.left, pivots.right) // Link 1 (AD)
        };
    }

    /**
     * Validate the calculated mechanism
     * @param {Object} pivots - Calculated pivot points
     * @param {Object} transformedPoints - Transformed points
     * @returns {Object} Validation results
     */
    validateMechanism(pivots, transformedPoints) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Check if pivots were found
        if (!pivots.left || !pivots.right) {
            validation.isValid = false;
            validation.errors.push('Could not find pivot points - perpendicular lines may be parallel');
            return validation;
        }

        // Check if all positions can be reached
        const linkLengths = this.calculateLinkLengths(pivots, transformedPoints);
        
        transformedPoints.A.forEach((pointA, index) => {
            const pointB = transformedPoints.B[index];
            
            // Check if distances are consistent
            const distanceA = this.calculateDistance(pivots.left, pointA);
            const distanceB = this.calculateDistance(pivots.right, pointB);
            
            const tolerance = 0.1; // mm
            
            if (Math.abs(distanceA - linkLengths.inputLink) > tolerance) {
                validation.warnings.push(`Position ${index + 1}: Input link length inconsistent`);
            }
            
            if (Math.abs(distanceB - linkLengths.outputLink) > tolerance) {
                validation.warnings.push(`Position ${index + 1}: Output link length inconsistent`);
            }
        });

        return validation;
    }

    /**
     * Utility: Calculate distance between two points
     * @param {Object} p1 - First point {x, y}
     * @param {Object} p2 - Second point {x, y}
     * @returns {number} Distance
     */
    calculateDistance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Utility: Calculate midpoint between two points
     * @param {Object} p1 - First point {x, y}
     * @param {Object} p2 - Second point {x, y}
     * @returns {Object} Midpoint {x, y}
     */
    calculateMidpoint(p1, p2) {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };
    }

    /**
     * Get the current mechanism state
     * @returns {Object} Current mechanism data
     */
    getMechanismData() {
        return {
            positions: this.positions,
            couplerPoints: this.couplerPoints,
            pivotPoints: this.pivotPoints,
            couplerLength: this.couplerLength,
            isValid: this.isValid
        };
    }

    /**
     * Reset the calculator
     */
    reset() {
        this.positions = [];
        this.couplerPoints = { A: null, B: null };
        this.pivotPoints = { left: null, right: null };
        this.isValid = false;
        this.couplerLength = 0;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MechanismCalculator;
}
