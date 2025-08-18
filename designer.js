import { FourBarLinkageCalculator } from './simulator.js';

export class DesignerUI {
    constructor(canvas, onStateChange = () => {}) {
        this.canvas = canvas;
        this.onStateChange = onStateChange;
        this.ctx = canvas.getContext('2d');
        this.lastResult = null;
        this.dragState = { isDragging: false };
        this.animatedState = null;
        this.initialInputAngle = null;
        this.mechanism = { pivots: {} };
        this.angleLimits = { min: -Math.PI / 2, max: Math.PI / 2 };
        this.initialOrientations = {};
        this.lastValidC = null;
        this.hingeUnlocked = false;
        
        // Configurable box dimensions
        this.boxDimensions = {
            width: 900,
            baseHeight: 300,
            lidHeight: 100,
            lidGap: 20
        };

        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
    }

    reset() {
        const baseRect = this.getBaseRect();
        this.lidHeight = this.boxDimensions.lidHeight;
        this.lidDelta = this.boxDimensions.lidGap; // Space between the lid and the base
        this.lidWidth = baseRect.maxX - baseRect.minX;

        const lidCenterX = (baseRect.minX + baseRect.maxX) / 2;
        const lidCenterY = baseRect.minY - (this.lidHeight / 2) - this.lidDelta;
        this.initialLidTransform = {
            center: { x: lidCenterX, y: lidCenterY },
            angle: 0
        };

        this.mechanism.pivots = {
            A: { x: 250, y: 500 },
            D: { x: 550, y: 500 },
            B: { x: lidCenterX + 100, y: lidCenterY },
            C: { x: lidCenterX - 100, y: lidCenterY }
        };

        this.initialPivots = JSON.parse(JSON.stringify(this.mechanism.pivots));
        this.animatedState = null;

        // Store the initial offsets of B and C relative to the lid's center
        this.pivotOffsets = {
            B: { x: this.mechanism.pivots.B.x - this.initialLidTransform.center.x, y: this.mechanism.pivots.B.y - this.initialLidTransform.center.y },
            C: { x: this.mechanism.pivots.C.x - this.initialLidTransform.center.x, y: this.mechanism.pivots.C.y - this.initialLidTransform.center.y }
        };

        const { A, B } = this.mechanism.pivots;
        this.initialInputAngle = Math.atan2(B.y - A.y, B.x - A.x);
        
        this.storeInitialOrientations();
        this.lastValidC = this.mechanism.pivots.C;
        this.calculateAngleLimits();
        console.log('Mechanism reset with pivots:', this.mechanism.pivots);
        this.updateAndRender();
    }

    updateAndRender() {
        const { A, B, C, D } = this.mechanism.pivots;
        const baseRect = this.getBaseRect();
        // Defensive check: treat missing pivots as outside
        const isInside = (pivot, base) => {
            if (!pivot || typeof pivot.x === 'undefined' || typeof pivot.y === 'undefined') return false;
            return (
                pivot.x >= base.minX && pivot.x <= base.maxX &&
                pivot.y >= base.minY && pivot.y <= base.maxY
            );
        };
        const pivotsValid = isInside(A, baseRect) && isInside(D, baseRect);
        // Only test crossing when all pivots exist
        const hasAllPivots = A && B && C && D;
        const isCrossed = hasAllPivots ? FourBarLinkageCalculator.segmentsIntersect(A, B, C, D) : false;
        this.lastResult = {
            pivots: this.mechanism.pivots,
            isValid: pivotsValid && isCrossed,
            relativePivots: this.getRelativePivotPositions()
        };
        this.render();
        this.onStateChange(this.lastResult);
        return this.lastResult;
    }

    render() {
        console.log('[DesignerUI.render] Rendering mechanism. Animated state:', this.animatedState ? 'present' : 'none');
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const baseRect = this.getBaseRect();
        this.drawBoxBase(this.ctx, baseRect);

        const isAnimated = this.animatedState && this.lastResult && this.lastResult.isValid;
        const pivotsToDraw = isAnimated ? this.animatedState : this.mechanism.pivots;
        const color = isAnimated ? 'rgba(0, 100, 255, 0.7)' : 'rgba(0, 0, 0, 0.5)';

        if (this.lastResult && this.lastResult.isValid) {
            console.log('[DesignerUI.render] Drawing mechanism with pivots:', JSON.stringify(pivotsToDraw));
            this.drawMechanism(pivotsToDraw, color);
            if (isAnimated) {
                this.drawLid(pivotsToDraw); // Draw the moving lid
            } else {
                this.drawClosedLid(); // Draw the static, closed lid
            }
        } else {
            // If config is invalid, still show the static lid for reference
            this.drawClosedLid();
        }

        // Draw pivots on top of everything
        this.drawPivot(pivotsToDraw.A, 'blue', 'A');
        this.drawPivot(pivotsToDraw.D, 'blue', 'D');
        this.drawPivot(pivotsToDraw.B, 'red', 'B');
        this.drawPivot(pivotsToDraw.C, 'green', 'C');
    }

    drawBoxBase(ctx, base) {
        ctx.save();
        ctx.fillStyle = 'rgba(220, 220, 220, 0.7)';
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.fillRect(base.minX, base.minY, base.maxX - base.minX, base.maxY - base.minY);
        ctx.strokeRect(base.minX, base.minY, base.maxX - base.minX, base.maxY - base.minY);
        ctx.restore();
    }

    drawClosedLid() {
        this.ctx.save();
        this.ctx.translate(this.initialLidTransform.center.x, this.initialLidTransform.center.y);
        this.ctx.rotate(this.initialLidTransform.angle);

        this.ctx.fillStyle = 'rgba(180, 180, 180, 0.8)';
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 1;
        this.ctx.fillRect(-this.lidWidth / 2, -this.lidHeight / 2, this.lidWidth, this.lidHeight);
        this.ctx.strokeRect(-this.lidWidth / 2, -this.lidHeight / 2, this.lidWidth, this.lidHeight);
        
        this.ctx.restore();
    }

    drawLid(animatedPivots) {
        const { B: B0, C: C0 } = this.initialPivots;
        const { B: B1, C: C1 } = animatedPivots;

        const transform = FourBarLinkageCalculator.getTransform(B0, C0, B1, C1);

        const newLidCenter = FourBarLinkageCalculator.applyTransform(this.initialLidTransform.center, transform);
        const newLidAngle = this.initialLidTransform.angle + transform.angle;

        this.ctx.save();
        this.ctx.translate(newLidCenter.x, newLidCenter.y);
        this.ctx.rotate(newLidAngle);

        this.ctx.fillStyle = 'rgba(180, 180, 180, 0.8)';
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 1;
        this.ctx.fillRect(-this.lidWidth / 2, -this.lidHeight / 2, this.lidWidth, this.lidHeight);
        this.ctx.strokeRect(-this.lidWidth / 2, -this.lidHeight / 2, this.lidWidth, this.lidHeight);
        
        this.ctx.restore();
    }

    drawMechanism(pivots, color) {
        const { A, B, C, D } = pivots;
        this.ctx.beginPath();
        this.ctx.moveTo(A.x, A.y);
        this.ctx.lineTo(B.x, B.y);
        this.ctx.lineTo(C.x, C.y);
        this.ctx.lineTo(D.x, D.y);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 5;
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(A.x, A.y);
        this.ctx.lineTo(D.x, D.y);
        this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.8)';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }

    animate(angleOffset) {
        console.log('[DesignerUI.animate] Animation requested with angleOffset:', angleOffset);
        console.log('[DesignerUI.animate] Current pivots:', JSON.stringify(this.mechanism.pivots));
        console.log('[DesignerUI.animate] Current angleLimits:', JSON.stringify(this.angleLimits));
        
        // Only reset if any pivot is truly missing (null or undefined)
        const pivots = this.mechanism && this.mechanism.pivots;
        const missingPivot = !pivots || !pivots.A || !pivots.B || !pivots.C || !pivots.D;
        if (missingPivot) {
            console.warn('[DesignerUI.animate] Mechanism pivots missing, resetting...');
            this.reset();
        } else {
            console.log('[DesignerUI.animate] Pivots present, not resetting.');
        }
        
        // Set the initial input angle if not already set
        if (this.initialInputAngle === null) {
            console.log('[DesignerUI.animate] Setting initial input angle to 0');
            this.initialInputAngle = 0;
        }
        
        this.animatedState = this.calculateAnimatedStateForAngle(angleOffset);
        console.log('[DesignerUI.animate] Animation state calculated:', this.animatedState ? 'Valid state' : 'No valid state');
        this.render();
    }

    calculateAnimatedStateForAngle(angleOffset) {
    console.log(`[calculateAnimatedStateForAngle] Testing angle offset: ${angleOffset.toFixed(4)}`);
    
    if (this.initialInputAngle === null) {
        console.log('[calculateAnimatedStateForAngle] Animation failed: initialInputAngle is null');
        return null;
    }

    if (!this.mechanism || !this.mechanism.pivots) {
        console.log('[calculateAnimatedStateForAngle] Error: mechanism or pivots is null/undefined');
        return null;
    }

    const { A, B, C, D } = this.mechanism.pivots;
    
    // Validate pivot points
    if (!A || !B || !C || !D) {
        console.log('[calculateAnimatedStateForAngle] Error: One or more pivots missing', { A, B, C, D });
        return null;
    }
    
    const l_ab = FourBarLinkageCalculator.distance(A, B);
    const l_cd = FourBarLinkageCalculator.distance(C, D);
    const l_bc = FourBarLinkageCalculator.distance(B, C);
    
    // Check for degenerate linkage (zero or very small lengths)
    if (l_ab < 1 || l_cd < 1 || l_bc < 1) {
        console.log('[calculateAnimatedStateForAngle] Error: Degenerate linkage detected', { l_ab, l_cd, l_bc });
        return null;
    }

    const newAngle = this.initialInputAngle + angleOffset;
    console.log(`[calculateAnimatedStateForAngle] New angle: ${newAngle.toFixed(4)} (${(newAngle * 180 / Math.PI).toFixed(1)}°)`);
    
    const newB = { x: A.x + l_ab * Math.cos(newAngle), y: A.y + l_ab * Math.sin(newAngle) };
    console.log(`[calculateAnimatedStateForAngle] New B position: (${newB.x.toFixed(1)}, ${newB.y.toFixed(1)})`);
    
    const intersections = FourBarLinkageCalculator.circleCircleIntersection(newB, l_bc, D, l_cd);
    
    if (!intersections || intersections.length === 0) {
        console.log('[calculateAnimatedStateForAngle] No intersections found between circles');
        return null;
    }
    
    console.log(`[calculateAnimatedStateForAngle] Found ${intersections.length} intersection(s):`, 
                intersections.map(p => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`))
    
    // Filter intersections based on hinge lock state
    const initialADB = this.initialOrientations && this.initialOrientations.adb;
    const initialCDA = this.initialOrientations && this.initialOrientations.cda;
    const validSolutions = intersections.filter(p => {
        const crossed = FourBarLinkageCalculator.segmentsIntersect(A, newB, p, D);
        
        if (this.hingeUnlocked) {
            // When unlocked, we still need to maintain continuity to prevent flipping
            // Accept both crossed and non-crossed, but prefer continuity
            return true; // Accept all geometric solutions, let continuity logic handle selection
        } else {
            // When locked, only accept crossed configurations
            if (!crossed) return false;
            
            // Enforce orientation continuity if we have a reference
            if (typeof initialADB !== 'undefined' && typeof initialCDA !== 'undefined') {
                const o_adb = FourBarLinkageCalculator.orientation(A, D, newB);
                const o_cda = FourBarLinkageCalculator.orientation(p, A, D);
                return o_adb === initialADB && o_cda === initialCDA;
            }
            return true;
        }
    });
    console.log(`[calculateAnimatedStateForAngle] ${validSolutions.length} intersection(s) keep crossed linkage and orientation continuity`);

    if (validSolutions.length === 0) {
        console.log('[calculateAnimatedStateForAngle] No valid crossed configurations found');
        return null;
    }
    
    console.log(`[calculateAnimatedStateForAngle] Found ${validSolutions.length} valid solution(s)`);

    let chosenSolution;
    if (validSolutions.length === 1) {
        chosenSolution = validSolutions[0];
        console.log('[calculateAnimatedStateForAngle] Using the only valid solution');
    } else {
        // To ensure continuity, choose the solution closest to the last known valid position of C.
        if (this.lastValidC) {
            validSolutions.sort((a, b) => {
                const distA = FourBarLinkageCalculator.distance(a, this.lastValidC);
                const distB = FourBarLinkageCalculator.distance(b, this.lastValidC);
                return distA - distB;
            });
            chosenSolution = validSolutions[0];
            console.log('[calculateAnimatedStateForAngle] Multiple solutions, chose closest to last valid');
        } else {
            // For initial position, prefer the solution that maintains the initial configuration
            const { C } = this.mechanism.pivots;
            if (C) {
                // Choose solution closest to initial C position
                validSolutions.sort((a, b) => {
                    const distA = FourBarLinkageCalculator.distance(a, C);
                    const distB = FourBarLinkageCalculator.distance(b, C);
                    return distA - distB;
                });
                chosenSolution = validSolutions[0];
                console.log('[calculateAnimatedStateForAngle] Multiple solutions, chose closest to initial C');
            } else {
                chosenSolution = validSolutions[0];
                console.log('[calculateAnimatedStateForAngle] Multiple solutions, chose first available');
            }
        }
    }

    if (chosenSolution) {
        // Allow full range of motion until mechanism reaches its natural crossed limits
        // The mechanism should be able to move until it physically cannot cross anymore

        console.log(`[calculateAnimatedStateForAngle] Final solution C: (${chosenSolution.x.toFixed(1)}, ${chosenSolution.y.toFixed(1)})`);
        this.lastValidC = chosenSolution;
        return { A, B: newB, C: chosenSolution, D };
    }

    console.log('[calculateAnimatedStateForAngle] Failed to find solution');
    return null;
}

    drawPivot(p, color, label) {
        // Safety check to prevent errors with undefined points
        if (!p || typeof p.x === 'undefined' || typeof p.y === 'undefined') {
            console.warn(`Cannot draw pivot ${label}: invalid point`, p);
            return;
        }
        
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = 'black';
        this.ctx.stroke();
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(label, p.x, p.y);
    }

    getBaseRect() {
        const boxWidth = this.boxDimensions.width;
        const baseHeight = this.boxDimensions.baseHeight;
        return {
            minX: (this.canvas.width - boxWidth) / 2,
            minY: this.canvas.height - baseHeight - 20,
            maxX: (this.canvas.width + boxWidth) / 2,
            maxY: this.canvas.height - 20
        };
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const hitResult = this.hitTest(x, y);

        if (hitResult.hit) {
            this.dragState = {
                isDragging: true,
                pivotName: hitResult.pivotName,
                startX: x,
                startY: y
            };
            this.canvas.style.cursor = 'grabbing';
        }
    }

    handleMouseMove(e) {
        if (!this.dragState.isDragging) return;
        const rect = this.canvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        const { pivotName } = this.dragState;

        if (pivotName === 'A' || pivotName === 'D') {
            const baseRect = this.getBaseRect();
            x = Math.max(baseRect.minX, Math.min(baseRect.maxX, x));
            y = Math.max(baseRect.minY, Math.min(baseRect.maxY, y));
        } else if (pivotName === 'B' || pivotName === 'C') {
            // Constrain B and C to the lid area
            const lidRect = {
                minX: this.initialLidTransform.center.x - this.lidWidth / 2,
                maxX: this.initialLidTransform.center.x + this.lidWidth / 2,
                minY: this.initialLidTransform.center.y - this.lidHeight / 2,
                maxY: this.initialLidTransform.center.y + this.lidHeight / 2
            };
            x = Math.max(lidRect.minX, Math.min(lidRect.maxX, x));
            y = Math.max(lidRect.minY, Math.min(lidRect.maxY, y));
        }

        this.mechanism.pivots[pivotName] = { x, y };
        this.updateAndRender();
    }

    handleMouseUp(e) {
        if (!this.dragState.isDragging) return;
        this.dragState.isDragging = false;
        this.canvas.style.cursor = 'default';

        // Lock in the new pivot positions as the starting point for the next animation
        this.initialPivots = JSON.parse(JSON.stringify(this.mechanism.pivots));

        const { A, B } = this.mechanism.pivots;
        this.initialInputAngle = Math.atan2(B.y - A.y, B.x - A.x);
        this.storeInitialOrientations();
        this.lastValidC = this.mechanism.pivots.C;
        this.calculateAngleLimits();
        this.animatedState = null; // Reset animation to show the static view
        this.updateAndRender(); // Explicitly re-render the final state
    }

    storeInitialOrientations() {
        const { A, B, C, D } = this.mechanism.pivots;
        this.initialOrientations = {
            adb: FourBarLinkageCalculator.orientation(A, D, B),
            cda: FourBarLinkageCalculator.orientation(C, A, D)
        };
    }

    calculateAngleLimits() {
        console.log('[calculateAngleLimits] Starting angle limit calculation');
        console.log('[calculateAngleLimits] Current mechanism:', this.mechanism);
        console.log('[calculateAngleLimits] Initial input angle:', this.initialInputAngle);
        
        // Helper function to find the limit in one direction using binary search for high precision.
        const findLimit = (direction, startAngle = 0) => {
            console.log(`[findLimit] Starting search in direction: ${direction} from angle: ${startAngle}, unlocked: ${this.hingeUnlocked}`);
            let low = startAngle;
            let high = startAngle + Math.PI * 2 * direction;
            let best = startAngle;
            let validFound = false;

            // When unlocked, extend search range to find straight line configuration
            if (this.hingeUnlocked) {
                high = startAngle + Math.PI * 4 * direction; // Extend search range
            }

            // Perform binary search for a fixed number of iterations to find the limit with high precision.
            for (let i = 0; i < 100; i++) {
                const mid = low + (high - low) / 2;
                if (Math.abs(mid - best) < 0.0001) {
                    console.log(`[findLimit] Converged at iteration ${i}, best: ${best}`);
                    break; // Converged
                }

                const result = this.calculateAnimatedStateForAngle(mid);
                console.log(`[findLimit] Iteration ${i}, angle: ${mid.toFixed(4)}, valid: ${!!result}`);
                
                if (result) {
                    validFound = true;
                    best = mid; // This angle is valid, try for a larger one (in magnitude)
                    if (direction > 0) {
                        low = mid;
                    } else {
                        high = mid;
                    }
                } else {
                    if (direction > 0) {
                        high = mid; // This angle is invalid, the limit is in the lower half
                    } else {
                        low = mid;
                    }
                }
                
                // Break early if we've narrowed down enough
                if (Math.abs(high - low) < 0.0001) {
                    console.log(`[findLimit] Precision threshold reached at iteration ${i}`);
                    break;
                }
            }
            
            console.log(`[findLimit] Final result for direction ${direction}: ${best.toFixed(4)}, valid found: ${validFound}`);
            return best;
        };

        // Min position: lid closed (starting position = 0 offset)
        const minAngle = 0;
        
        // Max position: find the maximum angle in both positive and negative directions
        // and use the one with the larger absolute value to get the full range
        const maxPositive = findLimit(1, 0);
        const maxNegative = findLimit(-1, 0);
        
        // Choose the direction that gives us the larger range
        const maxAngle = Math.abs(maxPositive) > Math.abs(maxNegative) ? maxPositive : maxNegative;
        
        console.log(`[calculateAngleLimits] Results: min=${minAngle.toFixed(4)}, max=${maxAngle.toFixed(4)}`);
        this.angleLimits = { min: minAngle, max: maxAngle };
    }

    setHingeUnlocked(unlocked) {
        const wasUnlocked = this.hingeUnlocked;
        this.hingeUnlocked = unlocked;
        
        // When switching modes, preserve the current state to maintain continuity
        if (wasUnlocked !== unlocked && this.animatedState) {
            // Store the current animated position as the new reference
            this.lastValidC = this.animatedState.C;
        }
        
        this.calculateAngleLimits();
        this.updateAndRender();
    }

    updateBoxDimensions(dimensions) {
        // Update box dimensions and reset the mechanism to apply changes
        this.boxDimensions = { ...this.boxDimensions, ...dimensions };
        this.reset();
    }

    getConfiguration() {
        return {
            boxDimensions: { ...this.boxDimensions },
            pivots: JSON.parse(JSON.stringify(this.mechanism.pivots))
        };
    }

    getRelativePivotPositions() {
        const baseRect = this.getBaseRect();
        const { A, B, C, D } = this.mechanism.pivots;
        
        // Base pivots relative to box left and base top
        const relativeA = {
            x: Math.round(A.x - baseRect.minX),
            y: Math.round(A.y - baseRect.minY)
        };
        const relativeD = {
            x: Math.round(D.x - baseRect.minX),
            y: Math.round(D.y - baseRect.minY)
        };
        
        // Lid pivots relative to box left and lid bottom
        const lidBottom = baseRect.minY - this.boxDimensions.lidGap;
        const relativeB = {
            x: Math.round(B.x - baseRect.minX),
            y: Math.round(lidBottom - B.y)
        };
        const relativeC = {
            x: Math.round(C.x - baseRect.minX),
            y: Math.round(lidBottom - C.y)
        };
        
        return { A: relativeA, B: relativeB, C: relativeC, D: relativeD };
    }

    setConfiguration(config) {
        if (config.boxDimensions) {
            this.boxDimensions = { ...this.boxDimensions, ...config.boxDimensions };
        }
        if (config.pivots) {
            this.mechanism.pivots = JSON.parse(JSON.stringify(config.pivots));
            this.initialPivots = JSON.parse(JSON.stringify(this.mechanism.pivots));
            
            const { A, B } = this.mechanism.pivots;
            this.initialInputAngle = Math.atan2(B.y - A.y, B.x - A.x);
            this.storeInitialOrientations();
            this.lastValidC = this.mechanism.pivots.C;
            this.calculateAngleLimits();
        }
        this.updateAndRender();
    }

    hitTest(x, y) {
        const tolerance = 10;
        for (const name in this.mechanism.pivots) {
            const pivot = this.mechanism.pivots[name];
            if (!pivot || typeof pivot.x === 'undefined' || typeof pivot.y === 'undefined') continue;
            if (FourBarLinkageCalculator.distance({ x, y }, pivot) < tolerance) {
                return { hit: true, pivotName: name };
            }
        }
        return { hit: false };
    }
}

