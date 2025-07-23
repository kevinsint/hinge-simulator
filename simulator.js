/**
 * CrossHingeSimulator - Main class for the mechanism simulator.
 * Handles rendering, state management, and UI controls for both simulation and design modes.
 */
class CrossHingeSimulator {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Simulation mode properties
        this.baseWidth = 300;
        this.baseHeight = 100;
        this.lidWidth = 300;
        this.lidHeight = 80;
        this.barLength = 150;
        this.hingeX = 150;
        this.hingeY = 75;
        this.lidAngle = 0;
        this.lidDistance = 20;
        this.scale = 1.5;
        this.offsetX = this.canvas.width / 2 - (this.baseWidth * this.scale) / 2;
        this.offsetY = this.canvas.height / 2;
        this.pivotA = { x: 0, y: 0 };
        this.pivotD = { x: this.baseWidth, y: 0 };
        this.p_B = { x: 0, y: 0 }; // Initialize to prevent errors
        this.p_C = { x: 0, y: 0 }; // Initialize to prevent errors
        this.lidPos = { x: 0, y: 0 }; // Initialize to prevent errors
        this.configurationValid = false;

        // Design mode properties
        this.isDesignMode = false;
        this.mechanismCalculator = null;
        this.lidPositionManager = null;
        this.calculatedMechanism = null;

        // Animation properties
        this.animatedMechanismState = null;
        this.minAngle = 0;
        this.maxAngle = Math.PI;

        this.initControls();
        this.initDesignMode();
        this.toggleMode(false); // Start in simulation mode
        this.updateAndRender(); // Initial render
    }

    initDesignMode() {
        this.mechanismCalculator = new MechanismCalculator();
        this.lidPositionManager = new LidPositionManager(this.canvas, this.mechanismCalculator, 1, { x: 0, y: 0 });

        this.lidPositionManager.setUpdateCallback((result) => {
            this.calculatedMechanism = result;
            this.updateMechanismStatus(result);
            this.render();
        });

        this.lidPositionManager.setRedrawCallback(() => {
            this.render();
        });
    }

    initControls() {
        // Animation controls
        this.animationControl = document.getElementById('animationControl');
        this.animationSlider = document.getElementById('animationSlider');
        this.animationSliderValue = document.getElementById('animationSliderValue');
        if (this.animationSlider) {
            this.animationSlider.addEventListener('input', (e) => this.handleAnimationSlider(e));
        }

        // Simulation controls
        this.createSlider("boxWidth", 100, 500, this.baseWidth, (v) => { this.baseWidth = v; this.pivotD.x = v; this.lidWidth = v; this.updateAndRender(); });
        this.createSlider("boxHeight", 50, 300, this.baseHeight, (v) => { this.baseHeight = v; this.updateAndRender(); });
        this.createSlider("barLength", 50, 400, this.barLength, (v) => { this.barLength = v; this.updateAndRender(); });
        this.createSlider("hingeX", 0, 300, this.hingeX, (v) => { this.hingeX = v; this.updateAndRender(); });
        this.createSlider("hingeY", 0, 200, this.hingeY, (v) => { this.hingeY = v; this.updateAndRender(); });
        this.createSlider("lidAngle", -90, 90, this.lidAngle, (v) => { this.lidAngle = v; this.updateAndRender(); });
        this.createSlider("lidDistance", 0, 100, this.lidDistance, (v) => { this.lidDistance = v; this.updateAndRender(); });

        // Mode switching
        const designModeToggle = document.getElementById('designModeToggle');
        if (designModeToggle) {
            designModeToggle.addEventListener('change', (e) => this.toggleMode(e.target.checked));
        }
    }

    createSlider(id, min, max, value, callback) {
        const slider = document.getElementById(id);
        const valueLabel = document.getElementById(`${id}Value`);
        if (slider) {
            slider.min = min;
            slider.max = max;
            slider.value = value;
            if (valueLabel) valueLabel.textContent = value;
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (valueLabel) valueLabel.textContent = val;
                callback(val);
            });
        }
    }

    calculateMechanism() {
        if (!this.isDesignMode) return;
        console.log('Calculating mechanism...');
        const result = this.mechanismCalculator.calculateMechanism();
        this.calculatedMechanism = result;
        this.updateMechanismStatus();
        this.render();

        if (result.validation.isValid) {
            document.getElementById('animationControl').style.display = 'block';
            const { p1, p2, p3 } = this.lidPositionManager.getPositions();
            const angle1 = p1.rotation;
            const angle3 = p3.rotation;
            this.minAngle = Math.min(angle1, angle3);
            this.maxAngle = Math.max(angle1, angle3);
        }
    }

    resetLidPositions() {
        if (!this.isDesignMode) return;
        this.lidPositionManager.resetPositions(); // Assuming this method exists or will be added
        this.calculatedMechanism = null;
        this.animatedMechanismState = null;
        document.getElementById('animationControl').style.display = 'none';
        this.updateMechanismStatus();
        this.render();
    }

    toggleMode(isDesign) {
        this.isDesignMode = isDesign;
        document.getElementById('simulationControls').style.display = isDesign ? 'none' : 'block';
        document.getElementById('designControls').style.display = isDesign ? 'block' : 'none';
        if (isDesign) {
            this.lidPositionManager.setupEventListeners();
        } else {
            this.lidPositionManager.removeEventListeners();
        }
        this.updateAndRender();
    }

    updateAndRender() {
        if (!this.isDesignMode) {
            this.updateMechanismGeometry();
        }
        this.render();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();

        if (this.isDesignMode) {
            if (this.animatedMechanismState) {
                // If animating, draw the animation state
                this.drawAnimatedMechanism(this.animatedMechanismState);
            } else if (this.lidPositionManager) {
                // Otherwise, draw the interactive lids for design
                this.lidPositionManager.render(this.ctx);
            }

            // Always draw the calculated pivots if they exist
            if (this.calculatedMechanism && this.calculatedMechanism.validation.isValid) {
                this.drawCalculatedPivots();
            }
        } else {
            // In simulation mode, draw the mechanism with scale and offset
            this.ctx.translate(this.offsetX, this.offsetY);
            this.ctx.scale(this.scale, this.scale);
            this.drawMechanism();
        }

        this.ctx.restore();
    }

    updateMechanismGeometry() {
        const angleRad = this.lidAngle * Math.PI / 180;
        const d = this.lidDistance;
        const p_A = this.pivotA;
        const p_D = this.pivotD;
        const p_B_rel = { x: -this.hingeX, y: -this.hingeY };
        const p_C_rel = { x: this.lidWidth - this.hingeX, y: -this.hingeY };
        const hingePos = { x: (this.baseWidth - this.lidWidth) / 2, y: -d };
        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);
        const p_B_rotated = { x: p_B_rel.x * cosA - p_B_rel.y * sinA, y: p_B_rel.x * sinA + p_B_rel.y * cosA };
        const p_C_rotated = { x: p_C_rel.x * cosA - p_C_rel.y * sinA, y: p_C_rel.x * sinA + p_C_rel.y * cosA };
        this.p_B = { x: hingePos.x + p_B_rotated.x, y: hingePos.y + p_B_rotated.y };
        this.p_C = { x: hingePos.x + p_C_rotated.x, y: hingePos.y + p_C_rotated.y };
        this.lidPos = hingePos;
        const len_AB = Math.hypot(this.p_B.x - p_A.x, this.p_B.y - p_A.y);
        const len_CD = Math.hypot(this.p_C.x - p_D.x, this.p_C.y - p_D.y);
        this.configurationValid = Math.abs(len_AB - this.barLength) < 1 && Math.abs(len_CD - this.barLength) < 1;
    }

    drawMechanism() {
        const p_A = this.pivotA;
        const p_D = this.pivotD;
        const p_B = this.p_B;
        const p_C = this.p_C;

        // Draw base
        this.ctx.fillStyle = '#ddd';
        this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);
        this.ctx.strokeStyle = '#aaa';
        this.ctx.strokeRect(0, 0, this.baseWidth, this.baseHeight);

        // Draw lid
        this.ctx.save();
        this.ctx.translate(this.lidPos.x, this.lidPos.y);
        this.ctx.rotate(this.lidAngle * Math.PI / 180);
        this.ctx.fillStyle = this.configurationValid ? 'lightblue' : 'lightcoral';
        this.ctx.fillRect(0, -this.hingeY, this.lidWidth, this.lidHeight);
        this.ctx.strokeStyle = this.configurationValid ? 'blue' : 'red';
        this.ctx.strokeRect(0, -this.hingeY, this.lidWidth, this.lidHeight);
        this.ctx.restore();

        // Draw bars
        this.drawLine(p_A, p_B, this.configurationValid ? 'green' : 'grey', 5);
        this.drawLine(p_D, p_C, this.configurationValid ? 'green' : 'grey', 5);

        // Draw pivots
        [p_A, p_D, p_B, p_C].forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
            this.ctx.fillStyle = 'black';
            this.ctx.fill();
        });
    }

    updateMechanismStatus(result) {
        const statusElement = document.getElementById('mechanismStatus');
        if (!statusElement) return;

        this.animatedMechanismState = null;
        this.animationControl.style.display = 'none';

        if (result && result.validation && result.validation.isValid) {
            statusElement.className = 'status-indicator status-good';
            statusElement.innerHTML = `
                <strong>✅ Valid Mechanism</strong><br>
                Base: ${result.linkLengths.base.toFixed(1)}mm<br>
                Input Link: ${result.linkLengths.inputLink.toFixed(1)}mm<br>
                Output Link: ${result.linkLengths.outputLink.toFixed(1)}mm
            `;
            this.animationControl.style.display = 'block';

            const { pivotPoints, transformedPoints } = result;
            const p_A = pivotPoints.left;
            const A1 = transformedPoints.A[0];
            const A3 = transformedPoints.A[2];

            this.minAngle = Math.atan2(A1.y - p_A.y, A1.x - p_A.x);
            this.maxAngle = Math.atan2(A3.y - p_A.y, A3.x - p_A.x);

            if (this.maxAngle < this.minAngle) {
                this.maxAngle += 2 * Math.PI;
            }

            this.animationSlider.value = 0;
            this.handleAnimationSlider({ target: this.animationSlider });
        } else {
            statusElement.className = 'status-indicator status-bad';
            statusElement.innerHTML = `
                <strong>❌ Invalid Mechanism</strong><br>
                ${result.validation.errors.join('<br>')}<br>
                ${result.validation.warnings.join('<br>')}
            `;
        }
    }

    handleAnimationSlider(e) {
        if (!this.mechanismCalculator || !this.calculatedMechanism || !this.calculatedMechanism.validation.isValid) return;

        const sliderValue = e.target.value;
        const percent = sliderValue / 100;
        const angle = this.minAngle + (this.maxAngle - this.minAngle) * percent;

        this.animatedMechanismState = this.mechanismCalculator.getMechanismStateAtAngle(angle);
        this.animationSliderValue.textContent = `${sliderValue}%`;
        this.render();
    }

    drawAnimatedMechanism(state) {
        if (!state) return;
        const { couplerA, couplerB, lid } = state;
        const pivotA = this.calculatedMechanism.pivotPoints.left;
        const pivotB = this.calculatedMechanism.pivotPoints.right;

        this.ctx.save();
        this.drawLine(pivotA, couplerA, 'red', 3);
        this.drawLine(couplerA, couplerB, 'green', 3);
        this.drawLine(pivotB, couplerB, 'blue', 3);
        this.drawLid(lid.center.x, lid.center.y, lid.width, lid.height, lid.rotation, 'rgba(0, 100, 200, 0.7)');
        this.ctx.restore();
    }

    drawCalculatedPivots() {
        if (!this.calculatedMechanism || !this.calculatedMechanism.pivotPoints) return;

        const leftPivot = this.calculatedMechanism.pivotPoints.left;
        const rightPivot = this.calculatedMechanism.pivotPoints.right;

        if (!leftPivot || !rightPivot) return;

        this.ctx.save();

        this.ctx.beginPath();
        this.ctx.arc(leftPivot.x, leftPivot.y, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = 'purple';
        this.ctx.fill();
        this.ctx.strokeStyle = 'darkmagenta';
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(rightPivot.x, rightPivot.y, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = 'orange';
        this.ctx.fill();
        this.ctx.strokeStyle = 'darkorange';
        this.ctx.stroke();
        
        this.ctx.fillStyle = 'black';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('A (Pivot)', leftPivot.x, leftPivot.y - 15);
        this.ctx.fillText('D (Pivot)', rightPivot.x, rightPivot.y - 15);
        
        this.ctx.restore();
    }

    drawLine(p1, p2, color, width) {
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.stroke();
    }

    drawLid(x, y, width, height, angle, color) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        this.ctx.fillStyle = color;
        this.ctx.fillRect(-width / 2, -height / 2, width, height);
        this.ctx.restore();
    }
}
