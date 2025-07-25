import { FourBarLinkageCalculator } from './simulator.js';

/**
 * Main UI controller for the simulator.
 * This class handles all rendering and user interaction on the canvas.
 * It is decoupled from the DOM except for the canvas element itself.
 */
class DesignerUI {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.lastResult = null;
        this.dragState = { isDragging: false };
        this.animatedState = null;
        this.initialInputAngle = null;

        this.mechanism = { pivots: {} };

        // Event listeners are bound once in the constructor
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
    }

    reset() {
        this.mechanism.pivots = {
            A: { x: 250, y: 500 },
            D: { x: 550, y: 500 },
            B: { x: 500, y: 450 },
            C: { x: 300, y: 450 }
        };
        this.animatedState = null;
        const { A, B } = this.mechanism.pivots;
        this.initialInputAngle = Math.atan2(B.y - A.y, B.x - A.x);
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

    animate(percentage) {
        this.animatedState = this.calculateAnimatedState(percentage);
        this.render();
    }

    calculateAnimatedState(percentage) {
        if (this.initialInputAngle === null) return null;

        const { A, B, C, D } = this.mechanism.pivots;
        const l_ab = FourBarLinkageCalculator.distance(A, B);
        const l_cd = FourBarLinkageCalculator.distance(C, D);
        const l_bc = FourBarLinkageCalculator.distance(B, C);

        const animationAngle = percentage * Math.PI;
        const newAngle = this.initialInputAngle + animationAngle;

        const newB = { x: A.x + l_ab * Math.cos(newAngle), y: A.y + l_ab * Math.sin(newAngle) };

        const intersections = FourBarLinkageCalculator.circleCircleIntersection(newB, l_bc, D, l_cd);

        if (!intersections || intersections.length === 0) return null;

        const validSolutions = intersections.filter(p => FourBarLinkageCalculator.segmentsIntersect(A, newB, p, D));

        if (validSolutions.length === 0) return null;
        if (validSolutions.length === 1) return { A, B: newB, C: validSolutions[0], D };
        
        const prevC = this.animatedState ? this.animatedState.C : C;
        const dist1 = FourBarLinkageCalculator.distance(prevC, validSolutions[0]);
        const dist2 = FourBarLinkageCalculator.distance(prevC, validSolutions[1]);
        return { A, B: newB, C: dist1 <= dist2 ? validSolutions[0] : validSolutions[1], D };
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

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const hitTestResult = this.hitTest(mouseX, mouseY);
        if (hitTestResult.hit) {
            this.dragState = { isDragging: true, pivotName: hitTestResult.pivotName };
            this.canvas.style.cursor = 'grabbing';
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
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('hingeCanvas');
    const animationSlider = document.getElementById('lidAngle');
    const animationSliderValue = document.getElementById('lidAngleValue');
    const resetButton = document.getElementById('resetPositions');
    const analysisText = document.getElementById('analysisText');
    const statusIndicator = document.getElementById('statusIndicator');

    const designerUI = new DesignerUI(canvas);

    const updateAnalysisUI = (result) => {
        if (!result || !result.isValid) {
            analysisText.textContent = 'Invalid mechanism configuration. Ensure base pivots are inside the box and links are crossed.';
            statusIndicator.textContent = 'Invalid Configuration';
            statusIndicator.className = 'status-indicator status-error';
            return;
        }
        statusIndicator.textContent = 'Valid Configuration';
        statusIndicator.className = 'status-indicator status-good';
        const { A, B, C, D } = result.pivots;
        analysisText.innerHTML = `
            <b>Base Pivots:</b> A: (${A.x.toFixed(1)}, ${A.y.toFixed(1)}), D: (${D.x.toFixed(1)}, ${D.y.toFixed(1)})<br>
            <b>Floating Pivots:</b> B: (${B.x.toFixed(1)}, ${B.y.toFixed(1)}), C: (${C.x.toFixed(1)}, ${C.y.toFixed(1)})<br>
            <b>Link Lengths:</b> Input(A-B): ${FourBarLinkageCalculator.distance(A, B).toFixed(1)}, 
            Coupler(B-C): ${FourBarLinkageCalculator.distance(B, C).toFixed(1)}, 
            Output(C-D): ${FourBarLinkageCalculator.distance(C, D).toFixed(1)}, 
            Ground(A-D): ${FourBarLinkageCalculator.distance(A, D).toFixed(1)}
        `;
    };

    designerUI.updateAndRender = function() {
        const result = Object.getPrototypeOf(this).updateAndRender.call(this);
        updateAnalysisUI(result);
    };

    animationSlider.addEventListener('input', () => {
        const value = animationSlider.value;
        const percentage = value / 180;
        animationSliderValue.textContent = `${value}°`;
        designerUI.animate(percentage);
    });

    resetButton.addEventListener('click', () => {
        designerUI.reset();
        animationSlider.value = 0;
        animationSliderValue.textContent = '0°';
    });

    designerUI.reset();
    animationSlider.value = 0;
    animationSliderValue.textContent = '0°';
});
