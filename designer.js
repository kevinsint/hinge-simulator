import { FourBarLinkageCalculator } from './simulator.js';

class DesignerUI {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.lastResult = null;
        this.dragState = { isDragging: false };
        this.animatedState = null;
        this.initialInputAngle = null;
        this.mechanism = { pivots: {} };
        this.angleLimits = { min: -Math.PI / 2, max: Math.PI / 2 };
        this.initialOrientations = {};
        this.lastValidC = null;

        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
    }

    reset() {
        console.log('Resetting DesignerUI mechanism');
        this.mechanism.pivots = {
            A: { x: 250, y: 500 },
            D: { x: 550, y: 500 },
            B: { x: 500, y: 450 },
            C: { x: 300, y: 450 }
        };
        this.animatedState = null;
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
        const isInside = (pivot, base) => 
            pivot.x >= base.minX && pivot.x <= base.maxX &&
            pivot.y >= base.minY && pivot.y <= base.maxY;
        const pivotsValid = isInside(A, baseRect) && isInside(D, baseRect);
        const isCrossed = FourBarLinkageCalculator.segmentsIntersect(A, B, C, D);
        this.lastResult = {
            pivots: this.mechanism.pivots,
            isValid: pivotsValid && isCrossed
        };
        this.render();
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
        } else if (!isAnimated) {
            // Draw error message if no valid state
            console.warn('[DesignerUI.render] No valid configuration for this angle.');
            this.ctx.save();
            this.ctx.font = '28px Arial';
            this.ctx.fillStyle = 'red';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('No valid configuration for this angle', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.restore();
        }
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
        if (this.initialInputAngle === null) {
            console.log('Animation failed: initialInputAngle is null');
            return null;
        }

        console.log('Current mechanism pivots:', this.mechanism.pivots);
        console.log('Initial input angle:', this.initialInputAngle);

        const { A, B, C, D } = this.mechanism.pivots;
        const l_ab = FourBarLinkageCalculator.distance(A, B);
        const l_cd = FourBarLinkageCalculator.distance(C, D);
        const l_bc = FourBarLinkageCalculator.distance(B, C);
        
        console.log('Link lengths:', { l_ab, l_cd, l_bc });

        const newAngle = this.initialInputAngle + angleOffset;
        const newB = { x: A.x + l_ab * Math.cos(newAngle), y: A.y + l_ab * Math.sin(newAngle) };
        const intersections = FourBarLinkageCalculator.circleCircleIntersection(newB, l_bc, D, l_cd);
        if (!intersections || intersections.length === 0) return null;
        const validSolutions = intersections.filter(p => {
            // A valid crossed linkage requires the coupler (BC) and ground (AD) links to intersect.
            return FourBarLinkageCalculator.segmentsIntersect(newB, p, A, D);
        });

        if (validSolutions.length === 0) return null;

        let chosenSolution;
        if (validSolutions.length === 1) {
            chosenSolution = validSolutions[0];
        } else {
            // To ensure continuity, choose the solution closest to the last known valid position of C.
            if (this.lastValidC) {
                validSolutions.sort((a, b) => {
                    const distA = FourBarLinkageCalculator.distance(a, this.lastValidC);
                    const distB = FourBarLinkageCalculator.distance(b, this.lastValidC);
                    return distA - distB;
                });
                chosenSolution = validSolutions[0];
            } else {
                // Fallback for the very first frame if needed. This case should be rare.
                const initialOrientation = FourBarLinkageCalculator.orientation(D, C, B);
                chosenSolution = validSolutions.find(p => FourBarLinkageCalculator.orientation(D, p, newB) === initialOrientation) || validSolutions[0];
            }
        }

        if (chosenSolution) {
            this.lastValidC = chosenSolution;
            return { A, B: newB, C: chosenSolution, D };
        }

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
        const boxWidth = 900;
        const baseHeight = 300;
        return {
            minX: (this.canvas.width - boxWidth) / 2,
            minY: this.canvas.height - baseHeight - 20,
            maxX: (this.canvas.width + boxWidth) / 2,
            maxY: this.canvas.height - 20
        };
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const hitTestResult = this.hitTest(mouseX, mouseY);
        if (hitTestResult.hit) {
            this.dragState = { isDragging: true, pivotName: hitTestResult.pivotName };
            this.canvas.style.cursor = 'grabbing';
            this.animatedState = null;
            this.updateAndRender();
        }
    }

    handleMouseMove(e) {
        if (!this.dragState.isDragging) return;
        const rect = this.canvas.getBoundingClientRect();
        let mouseX = e.clientX - rect.left;
        let mouseY = e.clientY - rect.top;
        const { pivotName } = this.dragState;
        if (pivotName === 'A' || pivotName === 'D') {
            const baseRect = this.getBaseRect();
            mouseX = Math.max(baseRect.minX, Math.min(baseRect.maxX, mouseX));
            mouseY = Math.max(baseRect.minY, Math.min(baseRect.maxY, mouseY));
        }
        this.mechanism.pivots[pivotName] = { x: mouseX, y: mouseY };
        this.updateAndRender();
    }

    handleMouseUp(e) {
        if (!this.dragState.isDragging) return;
        this.dragState.isDragging = false;
        this.canvas.style.cursor = 'default';
        const { A, B } = this.mechanism.pivots;
        this.initialInputAngle = Math.atan2(B.y - A.y, B.x - A.x);
        this.storeInitialOrientations();
        this.lastValidC = this.mechanism.pivots.C;
        this.calculateAngleLimits();
    }

    storeInitialOrientations() {
        const { A, B, C, D } = this.mechanism.pivots;
        this.initialOrientations = {
            adb: FourBarLinkageCalculator.orientation(A, D, B),
            cda: FourBarLinkageCalculator.orientation(C, A, D)
        };
    }

    calculateAngleLimits() {
        // Helper function to find the limit in one direction using binary search for high precision.
        const findLimit = (direction) => {
            let low = 0;
            let high = Math.PI * 2 * direction;
            let best = 0;

            // Perform binary search for a fixed number of iterations to find the limit with high precision.
            for (let i = 0; i < 100; i++) {
                const mid = low + (high - low) / 2;
                if (mid === best) break; // Converged

                if (this.calculateAnimatedStateForAngle(mid)) {
                    best = mid; // This angle is valid, try for a larger one (in magnitude)
                    low = mid;
                } else {
                    high = mid; // This angle is invalid, the limit is in the lower half
                }
            }
            return best;
        };

        const maxAngle = findLimit(1);
        const minAngle = findLimit(-1);

        this.angleLimits = { min: minAngle, max: maxAngle };
    }

    hitTest(x, y) {
        const tolerance = 10;
        for (const name in this.mechanism.pivots) {
            const pivot = this.mechanism.pivots[name];
            if (FourBarLinkageCalculator.distance({ x, y }, pivot) < tolerance) {
                return { hit: true, pivotName: name };
            }
        }
        return { hit: false };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('hingeCanvas');
    const lidAngleSlider = document.getElementById('lidAngle');
    const lidAngleValue = document.getElementById('lidAngleValue');
    const resetButton = document.getElementById('resetPositions');
    const analysisText = document.getElementById('analysisText');
    const statusIndicator = document.getElementById('statusIndicator');
    const animationControl = document.getElementById('animationControl');

    const designerUI = new DesignerUI(canvas);

    const updateAnalysisUI = (result) => {
        if (!result || !result.isValid) {
            analysisText.textContent = 'Invalid mechanism configuration. Ensure base pivots are inside the box and links are crossed.';
            statusIndicator.textContent = 'Invalid Configuration';
            statusIndicator.className = 'status-indicator status-error';
            animationControl.style.display = 'none';
        } else {
            statusIndicator.textContent = 'Valid Configuration';
            statusIndicator.className = 'status-indicator status-good';
            animationControl.style.display = 'block';
            const { A, B, C, D } = result.pivots;
            analysisText.innerHTML = `
                <b>Base Pivots:</b> A: (${A.x.toFixed(1)}, ${A.y.toFixed(1)}), D: (${D.x.toFixed(1)}, ${D.y.toFixed(1)})<br>
                <b>Floating Pivots:</b> B: (${B.x.toFixed(1)}, ${B.y.toFixed(1)}), C: (${C.x.toFixed(1)}, ${C.y.toFixed(1)})<br>
                <b>Link Lengths:</b> Input(A-B): ${FourBarLinkageCalculator.distance(A, B).toFixed(1)}, 
                Coupler(B-C): ${FourBarLinkageCalculator.distance(B, C).toFixed(1)}, 
                Output(C-D): ${FourBarLinkageCalculator.distance(C, D).toFixed(1)}, 
                Ground(A-D): ${FourBarLinkageCalculator.distance(A, D).toFixed(1)}
            `;
        }
    };

    const applyAnimation = () => {
        designerUI.calculateAngleLimits();
        const range = designerUI.angleLimits.max - designerUI.angleLimits.min;
        let percentage = 0.5; // Default to the middle if no range
        if (range > 0) {
            percentage = -designerUI.angleLimits.min / range;
        }
        const angleOffset = designerUI.angleLimits.min + (percentage * range);
        designerUI.animate(angleOffset);
    };

    const resetAndCenterSlider = () => {
        designerUI.reset();
        applyAnimation();
    };

    designerUI.updateAndRender = function() {
        const result = Object.getPrototypeOf(this).updateAndRender.call(this);
        updateAnalysisUI(result);
    };

    designerUI.handleMouseUp = function(e) {
        if (!this.dragState.isDragging) return;
        Object.getPrototypeOf(this).handleMouseUp.call(this, e);
        applyAnimation();
    };

    // Initialize the mechanism
    resetAndCenterSlider();
    
    // NOTE: The main animation slider listener is now moved to main.js
    // to properly handle both design and simulation modes
    

    resetButton.addEventListener('click', resetAndCenterSlider);

    resetAndCenterSlider();
});
