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
        
        this.initControls();
        this.updateHingeGeometry();
        this.animate();
    }

    initControls() {
        const self = this;
        
        // Hinge position controls
        document.getElementById('hingeX').addEventListener('input', (e) => {
            self.hinge.x = parseInt(e.target.value);
            document.getElementById('hingeXValue').textContent = e.target.value;
            self.updateHingePoints();
        });

        document.getElementById('hingeY').addEventListener('input', (e) => {
            self.hinge.y = parseInt(e.target.value);
            document.getElementById('hingeYValue').textContent = e.target.value;
            self.updateHingePoints();
        });

        // Bar length control
        document.getElementById('barLength').addEventListener('input', (e) => {
            self.hinge.barLength = parseInt(e.target.value);
            document.getElementById('barLengthValue').textContent = e.target.value;
            self.updateHingePoints();
        });

        // Angle control
        document.getElementById('hingeAngle').addEventListener('input', (e) => {
            self.hinge.currentAngle = parseInt(e.target.value);
            document.getElementById('hingeAngleValue').textContent = e.target.value;
            self.updateHingePoints();
        });
    }

    updateHingePoints() {
        const scale = 2;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Calculate base attachment point
        this.hinge.points.baseAttach.x = centerX + (this.hinge.x - 50) * scale;
        this.hinge.points.baseAttach.y = centerY + (this.hinge.y - 50) * scale;

        // Calculate lid attachment point based on angle
        const angleRad = (this.hinge.currentAngle * Math.PI) / 180;
        const lidOffset = this.lidHeight * scale;
        
        this.hinge.points.lidAttach.x = centerX + (this.hinge.x - 50) * scale;
        this.hinge.points.lidAttach.y = centerY + (this.hinge.y - 50) * scale - lidOffset * Math.cos(angleRad);

        // Calculate hinge bar endpoints
        const angleOffset = Math.PI / 4; // 45 degrees
        const barLength = this.hinge.barLength * scale;

        // Calculate optimal hinge points
        const baseAngle = angleRad + angleOffset;
        const lidAngle = angleRad - angleOffset;

        // Base hinge points
        this.hinge.points.base.x = this.hinge.points.baseAttach.x + barLength * Math.cos(baseAngle);
        this.hinge.points.base.y = this.hinge.points.baseAttach.y + barLength * Math.sin(baseAngle);

        // Lid hinge points
        this.hinge.points.lid.x = this.hinge.points.lidAttach.x + barLength * Math.cos(lidAngle);
        this.hinge.points.lid.y = this.hinge.points.lidAttach.y + barLength * Math.sin(lidAngle);

        // Calculate additional metrics
        this.hinge.metrics = {
            baseAngle: (baseAngle * 180) / Math.PI,
            lidAngle: (lidAngle * 180) / Math.PI,
            baseLength: Math.sqrt(
                Math.pow(this.hinge.points.base.x - this.hinge.points.baseAttach.x, 2) +
                Math.pow(this.hinge.points.base.y - this.hinge.points.baseAttach.y, 2)
            ),
            lidLength: Math.sqrt(
                Math.pow(this.hinge.points.lid.x - this.hinge.points.lidAttach.x, 2) +
                Math.pow(this.hinge.points.lid.y - this.hinge.points.lidAttach.y, 2)
            )
        };
    }

    drawBox() {
        const scale = 2;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Draw base
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.fillRect(
            centerX - (this.boxWidth / 2) * scale,
            centerY - (this.boxHeight / 2) * scale,
            this.boxWidth * scale,
            this.boxHeight * scale
        );

        // Draw lid
        this.ctx.fillStyle = '#d0d0d0';
        this.ctx.fillRect(
            centerX - (this.boxWidth / 2) * scale,
            centerY - (this.boxHeight / 2) * scale - this.lidHeight * scale,
            this.boxWidth * scale,
            this.lidHeight * scale
        );
    }

    drawHinge() {
        const scale = 2;
        
        // Draw hinge bars with proper angles
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;

        // Draw base attachment point
        this.ctx.beginPath();
        this.ctx.arc(
            this.hinge.points.baseAttach.x,
            this.hinge.points.baseAttach.y,
            3,
            0,
            Math.PI * 2
        );
        this.ctx.fillStyle = '#000';
        this.ctx.fill();

        // Draw lid attachment point
        this.ctx.beginPath();
        this.ctx.arc(
            this.hinge.points.lidAttach.x,
            this.hinge.points.lidAttach.y,
            3,
            0,
            Math.PI * 2
        );
        this.ctx.fillStyle = '#000';
        this.ctx.fill();

        // Draw optimal position indicator
        const optimalX = (this.boxWidth / 2) * (100 / this.boxWidth);
        const optimalY = (this.boxHeight / 2) * (100 / this.boxHeight);
        const optimalScale = 2;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        this.ctx.beginPath();
        this.ctx.arc(
            centerX + (optimalX - 50) * optimalScale,
            centerY + (optimalY - 50) * optimalScale,
            5,
            0,
            Math.PI * 2
        );
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fill();

        // Draw hinge bars
        // Base bar
        this.ctx.beginPath();
        this.ctx.moveTo(this.hinge.points.baseAttach.x, this.hinge.points.baseAttach.y);
        this.ctx.lineTo(this.hinge.points.base.x, this.hinge.points.base.y);
        this.ctx.stroke();

        // Lid bar
        this.ctx.beginPath();
        this.ctx.moveTo(this.hinge.points.lidAttach.x, this.hinge.points.lidAttach.y);
        this.ctx.lineTo(this.hinge.points.lid.x, this.hinge.points.lid.y);
        this.ctx.stroke();

        // Cross bar
        this.ctx.beginPath();
        this.ctx.moveTo(this.hinge.points.base.x, this.hinge.points.base.y);
        this.ctx.lineTo(this.hinge.points.lid.x, this.hinge.points.lid.y);
        this.ctx.stroke();

        // Draw hinge points
        this.ctx.fillStyle = '#f00';
        this.ctx.beginPath();
        this.ctx.arc(this.hinge.points.base.x, this.hinge.points.base.y, 3, 0, Math.PI * 2);
        this.ctx.arc(this.hinge.points.lid.x, this.hinge.points.lid.y, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw angle indicators
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 1;
        
        // Draw base angle indicator
        const baseAngleRad = (this.hinge.metrics.baseAngle * Math.PI) / 180;
        const indicatorLength = 20;
        this.ctx.beginPath();
        this.ctx.arc(
            this.hinge.points.baseAttach.x,
            this.hinge.points.baseAttach.y,
            indicatorLength,
            0,
            baseAngleRad
        );
        this.ctx.stroke();

        // Draw lid angle indicator
        const lidAngleRad = (this.hinge.metrics.lidAngle * Math.PI) / 180;
        this.ctx.beginPath();
        this.ctx.arc(
            this.hinge.points.lidAttach.x,
            this.hinge.points.lidAttach.y,
            indicatorLength,
            Math.PI,
            lidAngleRad
        );
        this.ctx.stroke();

        // Draw optimal bar length indicator
        const optimalBarLength = (lidHeight / 2) / Math.sin(minAngle * Math.PI / 180);
        const optimalBarScale = optimalBarLength * scale;

        // Draw base optimal length
        this.ctx.beginPath();
        this.ctx.moveTo(this.hinge.points.baseAttach.x, this.hinge.points.baseAttach.y);
        this.ctx.lineTo(
            this.hinge.points.baseAttach.x + optimalBarScale * Math.cos(baseAngleRad),
            this.hinge.points.baseAttach.y + optimalBarScale * Math.sin(baseAngleRad)
        );
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.stroke();

        // Draw lid optimal length
        this.ctx.beginPath();
        this.ctx.moveTo(this.hinge.points.lidAttach.x, this.hinge.points.lidAttach.y);
        this.ctx.lineTo(
            this.hinge.points.lidAttach.x + optimalBarScale * Math.cos(lidAngleRad),
            this.hinge.points.lidAttach.y + optimalBarScale * Math.sin(lidAngleRad)
        );
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.stroke();
    }
    }

    updateGuidance() {
        const guidanceElement = document.getElementById('guidance');
        const barLength = this.hinge.barLength;
        const lidHeight = this.lidHeight;
        const currentAngle = this.hinge.currentAngle;

        // Calculate hinge limits
        const minAngle = Math.asin(lidHeight / (2 * barLength)) * (180 / Math.PI);
        const maxAngle = 180 - minAngle;

        // Calculate optimal hinge position
        const optimalX = (this.boxWidth / 2) * (100 / this.boxWidth);
        const optimalY = (this.boxHeight / 2) * (100 / this.boxHeight);
        const distanceFromOptimal = Math.sqrt(
            Math.pow(this.hinge.x - optimalX, 2) +
            Math.pow(this.hinge.y - optimalY, 2)
        );

        // Calculate optimal bar length for current configuration
        const optimalBarLength = (lidHeight / 2) / Math.sin(minAngle * Math.PI / 180);

        // Detailed guidance
        let guidance = '';
        guidance += 'Current Angle: ' + currentAngle + '°\n\n';
        guidance += 'Hinge Limits:\n\n';
        guidance += 'Minimum Angle: ' + minAngle.toFixed(1) + '°\n\n';
        guidance += 'Maximum Angle: ' + maxAngle.toFixed(1) + '°\n\n';
        guidance += 'Bar Length: ' + barLength + 'px\n\n';
        guidance += 'Optimal Bar Length: ' + optimalBarLength.toFixed(1) + 'px\n\n';
        guidance += 'Lid Height: ' + lidHeight + 'px\n\n';
        guidance += 'Box Width: ' + this.boxWidth + 'px\n\n';
        guidance += 'Box Height: ' + this.boxHeight + 'px\n\n';
        guidance += 'Hinge Metrics:\n\n';
        guidance += 'Base Angle: ' + this.hinge.metrics.baseAngle.toFixed(1) + '°\n\n';
        guidance += 'Lid Angle: ' + this.hinge.metrics.lidAngle.toFixed(1) + '°\n\n';
        guidance += 'Base Bar Length: ' + this.hinge.metrics.baseLength.toFixed(1) + 'px\n\n';
        guidance += 'Lid Bar Length: ' + this.hinge.metrics.lidLength.toFixed(1) + 'px\n\n';
        guidance += 'Position Metrics:\n\n';
        guidance += 'Distance from Optimal Position: ' + distanceFromOptimal.toFixed(1) + ' units\n\n';
        guidance += 'Optimal X Position: ' + optimalX.toFixed(1) + ' units\n\n';
        guidance += 'Optimal Y Position: ' + optimalY.toFixed(1) + ' units';

        // Check for potential issues
        const issues = [];
        
        if (barLength < lidHeight) {
            issues.push('Warning: Bar length is shorter than lid height. This may cause interference with the lid movement.');
        }

        if (currentAngle < minAngle || currentAngle > maxAngle) {
            issues.push('Warning: Current angle is outside the hinge's operational range.');
        }

        // Check bar lengths
        if (Math.abs(this.hinge.metrics.baseLength - barLength * 2) > 5) {
            issues.push('Warning: Base bar length is significantly different from configured length.');
        }

        if (Math.abs(this.hinge.metrics.lidLength - barLength * 2) > 5) {
            issues.push('Warning: Lid bar length is significantly different from configured length.');
        }

        // Check position
        if (distanceFromOptimal > 10) {
            issues.push('Warning: Hinge position is far from optimal. Consider moving closer to center.');
        }

        // Check bar length vs optimal
        if (Math.abs(barLength - optimalBarLength) > 5) {
            issues.push('Warning: Current bar length is significantly different from optimal length.');
        }

        if (issues.length > 0) {
            guidance += '\n\nPotential Issues:\n' + issues.join('\n');
            guidanceElement.style.color = 'red';
        } else {
            guidance += '\n\nOptimal Configuration:\n';
            guidance += 'The current hinge configuration is optimal for the given box dimensions.\n';
            guidance += 'The hinge is properly positioned and sized for smooth operation.';
            guidanceElement.style.color = 'green';
        }

        guidanceElement.textContent = guidance;
    }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBox();
        this.drawHinge();
        this.updateGuidance();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize the simulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('hingeCanvas');
    new CrossHingeSimulator(canvas);
});
