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

        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
    }

    reset() {
        const baseRect = this.getBaseRect();
        this.lidHeight = 20;
        this.lidWidth = baseRect.maxX - baseRect.minX;

        const lidCenterX = (baseRect.minX + baseRect.maxX) / 2;
        const lidCenterY = baseRect.minY - (this.lidHeight / 2);
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
        this.calculateAngleLimits();
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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const baseRect = this.getBaseRect();
        this.drawBoxBase(this.ctx, baseRect);

        const isAnimated = this.animatedState && this.lastResult && this.lastResult.isValid;
        const pivotsToDraw = isAnimated ? this.animatedState : this.mechanism.pivots;
        const color = isAnimated ? 'rgba(0, 100, 255, 0.7)' : 'rgba(0, 0, 0, 0.5)';

        if (this.lastResult && this.lastResult.isValid) {
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

    animate(percentage) {
        const totalRange = this.angleLimits.max - this.angleLimits.min;
        const animationAngle = this.angleLimits.min + (percentage * totalRange);
        this.animatedState = this.calculateAnimatedStateForAngle(animationAngle);
        this.render();
    }

    calculateAnimatedStateForAngle(angleOffset) {
        if (this.initialInputAngle === null) return null;

        const { A, B, C, D } = this.mechanism.pivots;
        const l_ab = FourBarLinkageCalculator.distance(A, B);
        const l_cd = FourBarLinkageCalculator.distance(C, D);
        const l_bc = FourBarLinkageCalculator.distance(B, C);
        const newAngle = this.initialInputAngle + angleOffset;
        const newB = { x: A.x + l_ab * Math.cos(newAngle), y: A.y + l_ab * Math.sin(newAngle) };
        const intersections = FourBarLinkageCalculator.circleCircleIntersection(newB, l_bc, D, l_cd);
        if (!intersections || intersections.length === 0) return null;
        const validSolutions = intersections.filter(p => {
            const isCrossed = FourBarLinkageCalculator.segmentsIntersect(A, newB, p, D);
            if (!isCrossed) return false;

            const orientationADB = FourBarLinkageCalculator.orientation(A, D, newB);
            const orientationCDA = FourBarLinkageCalculator.orientation(p, A, D);

            // Check if orientation has flipped from the initial state, which means a link crossed a pivot.
            // We allow collinear (0) states as they are valid limits.
            const adbFlipped = this.initialOrientations.adb !== 0 && orientationADB !== 0 && this.initialOrientations.adb !== orientationADB;
            const cdaFlipped = this.initialOrientations.cda !== 0 && orientationCDA !== 0 && this.initialOrientations.cda !== orientationCDA;

            return !adbFlipped && !cdaFlipped;
        });
        if (validSolutions.length === 0) return null;
        if (validSolutions.length === 1) return { A, B: newB, C: validSolutions[0], D };
        const initialOrientation = FourBarLinkageCalculator.orientation(D, C, B);
        const correctSolution = validSolutions.find(p => FourBarLinkageCalculator.orientation(D, p, newB) === initialOrientation);
        if (correctSolution) {
            return { A, B: newB, C: correctSolution, D };
        } else {
            const prevC = this.animatedState ? this.animatedState.C : C;
            const dist1 = FourBarLinkageCalculator.distance(prevC, validSolutions[0]);
            const dist2 = FourBarLinkageCalculator.distance(prevC, validSolutions[1]);
            return { A, B: newB, C: dist1 <= dist2 ? validSolutions[0] : validSolutions[1], D };
        }
    }

    drawPivot(p, color, label) {
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
        this.calculateAngleLimits();
        this.animatedState = null; // Reset animation to show the static view
        // The final render call is handled by the override
    }

    storeInitialOrientations() {
        const { A, B, C, D } = this.mechanism.pivots;
        this.initialOrientations = {
            adb: FourBarLinkageCalculator.orientation(A, D, B),
            cda: FourBarLinkageCalculator.orientation(C, A, D)
        };
    }

    calculateAngleLimits() {
        const step = Math.PI / 180; // 1 degree
        let minAngle = 0;
        let maxAngle = 0;

        // Test positive rotation
        for (let angle = 0; angle < Math.PI * 2; angle += step) {
            const state = this.calculateAnimatedStateForAngle(angle);
            if (!state) break;
            maxAngle = angle;
        }

        // Test negative rotation
        for (let angle = 0; angle > -Math.PI * 2; angle -= step) {
            const state = this.calculateAnimatedStateForAngle(angle);
            if (!state) break;
            minAngle = angle;
        }

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
    const animationSlider = document.getElementById('lidAngle');
    const animationSliderValue = document.getElementById('lidAngleValue');
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
        const range = designerUI.angleLimits.max - designerUI.angleLimits.min;
        const zeroPoint = -designerUI.angleLimits.min;
        const percentage = zeroPoint / range;
        animationSlider.value = percentage * 180;
        animationSliderValue.textContent = '0°';
        designerUI.animate(percentage);
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
        const originalMethod = Object.getPrototypeOf(this).handleMouseUp;
        originalMethod.call(this, e);

        // After the state is updated, re-render and apply the animation to the slider
        if (!this.dragState.isDragging) { // Ensure drag has ended
            this.updateAndRender();
            applyAnimation();
        }
    };

    animationSlider.addEventListener('input', () => {
        const percentage = animationSlider.value / 180;
        const totalRange = designerUI.angleLimits.max - designerUI.angleLimits.min;
        const angle = designerUI.angleLimits.min + (percentage * totalRange);
        animationSliderValue.textContent = `${(angle * 180 / Math.PI).toFixed(0)}°`;
        designerUI.animate(percentage);
    });

    resetButton.addEventListener('click', resetAndCenterSlider);

    resetAndCenterSlider();
});
