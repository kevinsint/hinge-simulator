class CrossHingeSimulator {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Box dimensions in mm
        this.boxWidth = 300;
        this.baseHeight = 100;
        this.lidHeight = 80;
        
        // Hinge configuration in mm
        this.hingeX = 150;
        this.hingeY = 75;
        this.barLength = 80;
        this.lidAngle = 0; // degrees
        
        // Scale factor for rendering (pixels per mm)
        this.scale = 1.5;
        
        // Canvas offset for centering
        this.offsetX = this.canvas.width / 2;
        this.offsetY = this.canvas.height / 2;
        
        // Hinge geometry points
        this.hingePoints = {
            baseLeft: { x: 0, y: 0 },
            baseRight: { x: 0, y: 0 },
            lidLeft: { x: 0, y: 0 },
            lidRight: { x: 0, y: 0 },
            crossCenter: { x: 0, y: 0 }
        };
        
        this.initControls();
        this.updateHingeGeometry();
        this.animate();
    }

    initControls() {
        const self = this;
        
        // Box width control
        document.getElementById('boxWidth').addEventListener('input', (e) => {
            self.boxWidth = parseInt(e.target.value);
            document.getElementById('boxWidthValue').textContent = e.target.value;
            self.updateHingeGeometry();
        });

        // Base height control
        document.getElementById('baseHeight').addEventListener('input', (e) => {
            self.baseHeight = parseInt(e.target.value);
            document.getElementById('baseHeightValue').textContent = e.target.value;
            self.updateHingeGeometry();
        });

        // Lid height control
        document.getElementById('lidHeight').addEventListener('input', (e) => {
            self.lidHeight = parseInt(e.target.value);
            document.getElementById('lidHeightValue').textContent = e.target.value;
            self.updateHingeGeometry();
        });

        // Hinge X position control
        document.getElementById('hingeX').addEventListener('input', (e) => {
            self.hingeX = parseInt(e.target.value);
            document.getElementById('hingeXValue').textContent = e.target.value;
            self.updateHingeGeometry();
        });

        // Hinge Y position control
        document.getElementById('hingeY').addEventListener('input', (e) => {
            self.hingeY = parseInt(e.target.value);
            document.getElementById('hingeYValue').textContent = e.target.value;
            self.updateHingeGeometry();
        });

        // Bar length control
        document.getElementById('barLength').addEventListener('input', (e) => {
            self.barLength = parseInt(e.target.value);
            document.getElementById('barLengthValue').textContent = e.target.value;
            self.updateHingeGeometry();
        });

        // Lid angle control
        document.getElementById('lidAngle').addEventListener('input', (e) => {
            self.lidAngle = parseInt(e.target.value);
            document.getElementById('lidAngleValue').textContent = e.target.value;
            self.updateHingeGeometry();
        });
    }

    updateHingeGeometry() {
        const angleRad = (this.lidAngle * Math.PI) / 180;
        
        // Calculate hinge attachment points on base (two points for cross hinge)
        this.hingePoints.baseLeft = {
            x: this.hingeX - this.barLength / 2,
            y: this.hingeY
        };
        
        this.hingePoints.baseRight = {
            x: this.hingeX + this.barLength / 2,
            y: this.hingeY
        };
        
        // Calculate hinge attachment points on lid based on angle
        const lidCenterX = this.hingeX;
        const lidCenterY = this.hingeY - this.lidHeight * Math.cos(angleRad);
        
        this.hingePoints.lidLeft = {
            x: lidCenterX - (this.barLength / 2) * Math.cos(angleRad),
            y: lidCenterY - (this.barLength / 2) * Math.sin(angleRad)
        };
        
        this.hingePoints.lidRight = {
            x: lidCenterX + (this.barLength / 2) * Math.cos(angleRad),
            y: lidCenterY + (this.barLength / 2) * Math.sin(angleRad)
        };
        
        // Calculate cross center point
        this.hingePoints.crossCenter = {
            x: (this.hingePoints.baseLeft.x + this.hingePoints.baseRight.x + 
                this.hingePoints.lidLeft.x + this.hingePoints.lidRight.x) / 4,
            y: (this.hingePoints.baseLeft.y + this.hingePoints.baseRight.y + 
                this.hingePoints.lidLeft.y + this.hingePoints.lidRight.y) / 4
        };
        
        this.updateAnalysis();
    }

    drawBox() {
        const ctx = this.ctx;
        const scale = this.scale;
        const angleRad = (this.lidAngle * Math.PI) / 180;
        
        // Draw base box (3D-like perspective)
        ctx.fillStyle = '#e0e0e0';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        
        // Base rectangle
        const baseX = this.offsetX - (this.boxWidth * scale) / 2;
        const baseY = this.offsetY;
        const baseWidth = this.boxWidth * scale;
        const baseHeight = this.baseHeight * scale;
        
        ctx.fillRect(baseX, baseY, baseWidth, baseHeight);
        ctx.strokeRect(baseX, baseY, baseWidth, baseHeight);
        
        // Draw lid (rotated based on angle)
        ctx.save();
        ctx.fillStyle = '#d0d0d0';
        
        const lidX = this.offsetX - (this.boxWidth * scale) / 2;
        const lidY = this.offsetY - this.lidHeight * scale * Math.cos(angleRad);
        const lidWidth = this.boxWidth * scale;
        const lidHeight = this.lidHeight * scale;
        
        // Rotate lid around hinge point
        const hingePixelX = this.offsetX + (this.hingeX - this.boxWidth / 2) * scale;
        const hingePixelY = this.offsetY;
        
        ctx.translate(hingePixelX, hingePixelY);
        ctx.rotate(-angleRad);
        ctx.translate(-hingePixelX, -hingePixelY);
        
        ctx.fillRect(lidX, lidY, lidWidth, lidHeight);
        ctx.strokeRect(lidX, lidY, lidWidth, lidHeight);
        
        ctx.restore();
    }

    drawHinge() {
        const ctx = this.ctx;
        const scale = this.scale;
        
        // Convert mm coordinates to pixel coordinates
        const toPixel = (point) => ({
            x: this.offsetX + (point.x - this.boxWidth / 2) * scale,
            y: this.offsetY + (point.y - this.hingeY) * scale
        });
        
        const baseLeft = toPixel(this.hingePoints.baseLeft);
        const baseRight = toPixel(this.hingePoints.baseRight);
        const lidLeft = toPixel(this.hingePoints.lidLeft);
        const lidRight = toPixel(this.hingePoints.lidRight);
        const crossCenter = toPixel(this.hingePoints.crossCenter);
        
        // Draw hinge bars
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 3;
        
        // Cross bars
        ctx.beginPath();
        ctx.moveTo(baseLeft.x, baseLeft.y);
        ctx.lineTo(lidRight.x, lidRight.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(baseRight.x, baseRight.y);
        ctx.lineTo(lidLeft.x, lidLeft.y);
        ctx.stroke();
        
        // Draw attachment points
        ctx.fillStyle = '#333';
        const pointRadius = 4;
        
        [baseLeft, baseRight, lidLeft, lidRight].forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw cross center
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(crossCenter.x, crossCenter.y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    updateAnalysis() {
        const analysisText = document.getElementById('analysisText');
        const statusIndicator = document.getElementById('statusIndicator');
        
        // Calculate hinge metrics
        const maxAngle = this.calculateMaxAngle();
        const isValid = this.validateConfiguration();
        
        let analysis = '';
        analysis += 'Box Dimensions: ' + this.boxWidth + 'mm × ' + this.baseHeight + 'mm (base) × ' + this.lidHeight + 'mm (lid)\\n';
        analysis += 'Hinge Position: (' + this.hingeX + ', ' + this.hingeY + ') mm\\n';
        analysis += 'Bar Length: ' + this.barLength + 'mm\\n';
        analysis += 'Current Lid Angle: ' + this.lidAngle + '°\\n';
        analysis += 'Maximum Safe Angle: ' + maxAngle.toFixed(1) + '°\\n';
        
        if (isValid) {
            analysis += '\\nConfiguration is valid for smooth operation.';
            statusIndicator.className = 'status-indicator status-good';
            statusIndicator.textContent = 'Configuration Valid';
        } else {
            analysis += '\\nWarning: Current configuration may cause interference.';
            statusIndicator.className = 'status-indicator status-warning';
            statusIndicator.textContent = 'Configuration Warning';
        }
        
        analysisText.textContent = analysis;
    }

    calculateMaxAngle() {
        // Calculate maximum angle based on box dimensions and hinge position
        const maxAngle = Math.acos(this.lidHeight / (2 * this.barLength)) * (180 / Math.PI);
        return Math.min(maxAngle, 180);
    }

    validateConfiguration() {
        // Check if current configuration is valid
        const maxAngle = this.calculateMaxAngle();
        return this.lidAngle <= maxAngle && this.barLength > this.lidHeight / 2;
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid for reference
        this.drawGrid();
        
        // Draw box and hinge
        this.drawBox();
        this.drawHinge();
        
        requestAnimationFrame(() => this.animate());
    }

    drawGrid() {
        const ctx = this.ctx;
        const gridSize = 50; // 50mm grid
        const gridPixels = gridSize * this.scale;
        
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x < this.canvas.width; x += gridPixels) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y < this.canvas.height; y += gridPixels) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
    }
}

// Initialize the simulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('hingeCanvas');
    new CrossHingeSimulator(canvas);
});
