// designer.js
// UI logic for Cross Hinge Simulator
// Handles rendering, user interaction, and data transfer to simulator.js

import { FourBarLinkageCalculator } from './simulator.js';

/**
 * Main UI controller for the simulator.
 */
class DesignerUI {
    constructor(canvas, analysisCallback) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.analysisCallback = analysisCallback;
        this.lastResult = null;
        this.dragState = { isDragging: false };
        this.animatedState = null;

        this.mechanism = { pivots: {} };

        this.animationSlider = document.getElementById('animationSlider');
        this.animationSlider.addEventListener('input', () => this.handleAnimationSlider());

        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
    }

    reset() {
        this.mechanism.pivots = {
            A: { x: 250, y: 500 }, // Base pivot
            D: { x: 550, y: 500 }, // Base pivot
            B: { x: 500, y: 450 }, // Floating pivot
            C: { x: 300, y: 450 }  // Floating pivot
        };
        this.animatedState = null;
        this.animationSlider.value = 0;
        document.getElementById('animationSliderValue').textContent = '0%';
        this.updateAndRender();
    }

    init() {
        this.reset();
    }

    updateAndRender() {
        const { A, B, C, D } = this.mechanism.pivots;
        const baseRect = this.getBaseRect();

        const isInside = (pivot, base) => 
            pivot.x >= base.minX && pivot.x <= base.maxX &&
            pivot.y >= base.minY && pivot.y <= base.maxY;

        const pivotsValid = isInside(A, baseRect) && isInside(D, baseRect);
        const isCrossed = FourBarLinkageCalculator.segmentsIntersect(A, B, C, D);

        const result = {
            pivots: this.mechanism.pivots,
            isValid: pivotsValid && isCrossed
        };
        this.lastResult = result;

        const animationControl = document.getElementById('animationControl');
        if (result.isValid) {
            animationControl.style.display = 'block';
        } else {
            animationControl.style.display = 'none';
        }

        this.analysisCallback(result);
        this.render();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const baseRect = this.getBaseRect();
        this.drawBoxBase(this.ctx, {
            x: baseRect.minX,
            y: baseRect.minY,
            width: baseRect.maxX - baseRect.minX,
            height: baseRect.maxY - baseRect.minY
        });

        if (this.lastResult && this.lastResult.isValid) {
            if (this.animatedState) {
                this.drawMechanism(this.animatedState, 'rgba(0, 100, 255, 0.7)');
            } else {
                this.drawMechanism(this.mechanism.pivots);
            }
        }

        this.drawPivot(this.mechanism.pivots.A, 'blue', 'A');
        this.drawPivot(this.mechanism.pivots.D, 'blue', 'D');
        this.drawPivot(this.mechanism.pivots.B, 'red', 'B');
        this.drawPivot(this.mechanism.pivots.C, 'green', 'C');
    }

    drawBoxBase(ctx, base) {
        if (!base) return;
        const { x, y, width, height } = base;
        ctx.save();
        ctx.fillStyle = 'rgba(220, 220, 220, 0.7)';
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        ctx.restore();
    }

    drawMechanism(pivots, color = 'rgba(0, 0, 0, 0.5)') {
        const { A, B, C, D } = pivots;
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(A.x, A.y);
        this.ctx.lineTo(B.x, B.y);
        this.ctx.lineTo(C.x, C.y);
        this.ctx.lineTo(D.x, D.y);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(A.x, A.y);
        this.ctx.lineTo(D.x, D.y);
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.8)';
        this.ctx.stroke();

        this.ctx.restore();
    }

    handleAnimationSlider() {
        const percentage = this.animationSlider.value / 100;
        document.getElementById('animationSliderValue').textContent = `${this.animationSlider.value}%`;
        if (percentage === 0) {
            this.animatedState = null;
        } else {
            this.animatedState = this.calculateAnimatedState(percentage);
        }
        this.render();
    }

    calculateAnimatedState(percentage) {
        const { A, B, C, D } = this.mechanism.pivots;
        const l_ab = FourBarLinkageCalculator.distance(A, B);
        const l_cd = FourBarLinkageCalculator.distance(C, D);
        const l_bc = FourBarLinkageCalculator.distance(B, C);

        // Define a stable animation range, e.g., 180 degrees starting from horizontal
        const angleRange = Math.PI; // 180 degrees
        const startAngle = -Math.PI / 2; // Start from -90 degrees (pointing up)
        const newAngle = startAngle + (percentage * angleRange);

        const newB = {
            x: A.x + l_ab * Math.cos(newAngle),
            y: A.y + l_ab * Math.sin(newAngle)
        };

        const intersections = FourBarLinkageCalculator.circleCircleIntersection(newB, l_bc, D, l_cd);

        if (intersections && intersections.length > 0) {
            let newC = intersections[0];
            if (intersections.length > 1) {
                // Choose the intersection that maintains the crossed linkage (A-B intersects C-D)
                const c1_is_crossed = FourBarLinkageCalculator.segmentsIntersect(A, newB, intersections[0], D);
                const c2_is_crossed = FourBarLinkageCalculator.segmentsIntersect(A, newB, intersections[1], D);

                if (c1_is_crossed) {
                    newC = intersections[0];
                } else if (c2_is_crossed) {
                    newC = intersections[1];
                } else {
                    // If neither solution is crossed, the geometry is likely invalid for this angle
                    // We'll default to the first but ideally this case should be handled gracefully
                    newC = intersections[0]; 
                }
            }
            return { A, B: newB, C: newC, D };
        }
        return null; // No solution found for this angle
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
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const hitTestResult = this.hitTest(mouseX, mouseY);
        if (hitTestResult.hit) {
            this.dragState = {
                isDragging: true,
                pivotName: hitTestResult.pivotName
            };
            this.canvas.style.cursor = 'grabbing';
        }
    }

    handleMouseMove(e) {
        if (this.dragState.isDragging) {
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
        } else {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const hitTestResult = this.hitTest(mouseX, mouseY);
            this.canvas.style.cursor = hitTestResult.hit ? 'grab' : 'default';
        }
    }

    handleMouseUp(e) {
        if (this.dragState.isDragging) {
            this.dragState.isDragging = false;
            this.canvas.style.cursor = 'default';
        }
    }

    hitTest(x, y) {
        const tolerance = 10;
        for (const name in this.mechanism.pivots) {
            const pivot = this.mechanism.pivots[name];
            if (FourBarLinkageCalculator.distance({x, y}, pivot) < tolerance) {
                return { hit: true, pivotName: name };
            }
        }
        return { hit: false };
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('hingeCanvas');
    const analysisText = document.getElementById('analysisText');
    let designerUI = null;

    function updateAnalysis(result) {
        const statusIndicator = document.getElementById('statusIndicator');
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
            <b>Base Pivots:</b><br>
            A: (${A.x.toFixed(1)}, ${A.y.toFixed(1)})<br>
            D: (${D.x.toFixed(1)}, ${D.y.toFixed(1)})<br>
            <b>Floating Pivots:</b><br>
            B: (${B.x.toFixed(1)}, ${B.y.toFixed(1)})<br>
            C: (${C.x.toFixed(1)}, ${C.y.toFixed(1)})<br>
            <b>Link Lengths:</b><br>
            Input (A-B): ${FourBarLinkageCalculator.distance(A, B).toFixed(1)}<br>
            Floating (B-C): ${FourBarLinkageCalculator.distance(B, C).toFixed(1)}<br>
            Output (C-D): ${FourBarLinkageCalculator.distance(C, D).toFixed(1)}<br>
            Ground (A-D): ${FourBarLinkageCalculator.distance(A, D).toFixed(1)}
        `;
    }

    if (canvas) {
        designerUI = new DesignerUI(canvas, updateAnalysis);
        designerUI.init(); // Initialize the UI
        document.getElementById('resetPositions').addEventListener('click', () => designerUI.reset());
    }
});
