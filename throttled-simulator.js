/**
 * CrossHingeSimulator - Implementation of an antiparallelogram (crossing) four-bar mechanism
 * for simulating a box with a hinged lid using standard vanilla JavaScript
 * FIXED VERSION: Includes FPS limiting and removes duplicate methods
 */
class CrossHingeSimulator {
    /**
     * Constructor for the simulator
     * @param {HTMLCanvasElement} canvas - The canvas element to render on
     */
    constructor(canvas) {
        // Initialize canvas and context
        this.canvas = canvas;

        try {
            if (!canvas) {
                throw new Error('Canvas element is null or undefined');
            }
            this.ctx = canvas.getContext('2d');
            if (!this.ctx) {
                throw new Error('Failed to get 2D context from canvas');
            }
        } catch (error) {
            console.error('Error initializing canvas context:', error);
            return; // Exit constructor early
        }

        // Box and mechanism dimensions (mm)
        this.baseWidth = 300;      // Ground link length (L₄)
        this.baseHeight = 100;     // Base box height
        this.lidWidth = 300;       // Coupler link length (L₃)
        this.lidHeight = 80;       // Lid box height

        // Pivot positions
        this.pivotA = { x: 0, y: 0 };                   // Fixed base left pivot
        this.pivotD = { x: this.baseWidth, y: 0 };      // Fixed base right pivot

        // Bar lengths (crossing links)
        this.barLength = 150; // Combined parameter for L₁ and L₂

        // Control parameters
        this.hingeX = 150; // Horizontal position of the hinge center
        this.hingeY = 75;  // Vertical position of the hinge center
        this.lidAngle = 0; // Lid angle in degrees (driven by animation slider)
        this.lidDistance = 20; // Distance between base and lid when closed



        // Scale factor for rendering (pixels per mm)
        this.scale = 1.5;

        // Canvas offset for centering
        this.offsetX = this.canvas.width / 2 - (this.baseWidth * this.scale) / 2;
        this.offsetY = this.canvas.height / 2;

        // Initialize UI controls
        this.initControls();

        // Initial draw
        this.updateAndRender();
    }

    /**
     * Initialize UI controls for the mechanism
     */
    initControls() {
        // Box Dimensions
        this.createSlider("boxWidth", 100, 500, this.baseWidth, (value) => {
            this.baseWidth = value;
            this.lidWidth = value; // Keep base and lid same width
            this.updateAndRender();
        });

        this.createSlider("baseHeight", 50, 200, this.baseHeight, (value) => {
            this.baseHeight = value;
            this.updateAndRender();
        });

        this.createSlider("lidHeight", 30, 150, this.lidHeight, (value) => {
            this.lidHeight = value;
            this.updateAndRender();
        });

        // Hinge Configuration
        this.createSlider("hingeX", 50, 250, this.hingeX, (value) => {
            this.hingeX = value;
            this.updateAndRender();
        });

        this.createSlider("hingeY", 25, 150, this.hingeY, (value) => {
            this.hingeY = value;
            this.updateAndRender();
        });

        this.createSlider("barLength", 30, 150, this.barLength, (value) => {
            this.barLength = value;
            this.updateAndRender();
        });

        // Animation
        this.createSlider("lidAngle", 0, 180, this.lidAngle, (value) => {
            this.lidAngle = value;
            this.updateAndRender();
        });
    }

    /**
     * Helper method to create a slider control
     * @param {string} id - The ID of the slider element
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {number} value - Initial value
     * @param {Function} callback - Callback function when value changes
     */
    createSlider(id, min, max, value, callback) {
        const slider = document.getElementById(id);
        if (!slider) return;

        slider.min = min;
        slider.max = max;
        slider.value = value;

        const valueDisplay = document.getElementById(`${id}Value`);
        if (valueDisplay) {
            valueDisplay.textContent = value;
        }

        slider.addEventListener('input', (e) => {
            const newValue = parseInt(e.target.value);
            if (valueDisplay) {
                valueDisplay.textContent = newValue;
            }
            callback(newValue);
        });
    }

    /**
     * Update the mechanism geometry based on current parameters
     */
    updateMechanismGeometry() {
        // 1. Set fixed pivot positions (A and D) based on hingeX and hingeY
        this.pivotA = {
            x: this.hingeX - this.baseWidth / 4, // Example positioning
            y: this.hingeY
        };
        this.pivotD = {
            x: this.hingeX + this.baseWidth / 4, // Example positioning
            y: this.hingeY
        };

        // 2. Calculate position of pivot B based on the lidAngle
        const angleRadians = (this.lidAngle * Math.PI) / 180;
        this.pivotB = {
            x: this.pivotA.x + this.barLength * Math.cos(angleRadians),
            y: this.pivotA.y + this.barLength * Math.sin(angleRadians)
        };

        // 3. Find the position of pivot C by finding the intersection of circles
        //    centered at B and D with radii equal to the coupler length and output link length
        
        // For a true antiparallelogram, the coupler length (L₃) must equal the ground link length (L₄)
        const groundLinkLength = this.pivotD.x - this.pivotA.x;
        const couplerLength = groundLinkLength;

        const result = this.findCircleIntersection(
            this.pivotB.x, this.pivotB.y, couplerLength,
            this.pivotD.x, this.pivotD.y, this.barLength
        );



        if (result) {
            // We need the intersection that is "above" the line from pivotB to pivotD
            // for an antiparallelogram configuration
            // Use the cross product to determine which point is "above" the line
            const dx = this.pivotD.x - this.pivotB.x;
            const dy = this.pivotD.y - this.pivotB.y;
            
            // Calculate cross product for both intersection points
            const cross1 = dx * (result.y1 - this.pivotB.y) - dy * (result.x1 - this.pivotB.x);
            const cross2 = dx * (result.y2 - this.pivotB.y) - dy * (result.x2 - this.pivotB.x);
            
            // The point with negative cross product is "above" the line for a standard coordinate system
            if (cross1 < 0) {
                this.pivotC = { x: result.x1, y: result.y1 };
            } else {
                this.pivotC = { x: result.x2, y: result.y2 };
            }

            // Lid position is determined by the coupler link (B-C)
            // We don't need to calculate a separate lidX/lidY here
            // The drawing function will handle the lid's position and rotation

            // Mark configuration as valid
            this.configurationValid = true;
            
            console.log('Valid configuration found. Pivot C:', this.pivotC);
        } else {
            // No intersection found - invalid configuration
            this.configurationValid = false;
            console.warn('Cannot form a valid configuration with current parameters!');
            
            // Still assign placeholder values for display purposes
            this.pivotC = {
                x: this.pivotB.x + couplerLength,
                y: this.pivotB.y
            };
        }

        // Calculate crossing point (intersection of links AB and CD)
        this.calculateCrossingPoint();
    }

    /**
     * Calculate the crossing point (intersection of links AB and CD)
     */
    calculateCrossingPoint() {
        if (!this.configurationValid) {
            this.crossingPoint = null;
            return;
        }

        // Line 1: from pivotA to pivotB
        const a1 = this.pivotB.y - this.pivotA.y;
        const b1 = this.pivotA.x - this.pivotB.x;
        const c1 = a1 * this.pivotA.x + b1 * this.pivotA.y;

        // Line 2: from pivotC to pivotD
        const a2 = this.pivotD.y - this.pivotC.y;
        const b2 = this.pivotC.x - this.pivotD.x;
        const c2 = a2 * this.pivotC.x + b2 * this.pivotC.y;

        // Calculate determinant
        const det = a1 * b2 - a2 * b1;

        if (Math.abs(det) < 1e-6) {
            // Lines are parallel, no crossing point
            this.crossingPoint = null;
            return;
        }

        // Calculate intersection point
        const x = (b2 * c1 - b1 * c2) / det;
        const y = (a1 * c2 - a2 * c1) / det;

        this.crossingPoint = { x, y };
    }

    /**
     * Find intersection points of two circles
     * @param {number} x1 - Center x of first circle
     * @param {number} y1 - Center y of first circle
     * @param {number} r1 - Radius of first circle
     * @param {number} x2 - Center x of second circle
     * @param {number} y2 - Center y of second circle
     * @param {number} r2 - Radius of second circle
     * @returns {Object|null} Object with intersection points or null if no intersection
     */
    findCircleIntersection(x1, y1, r1, x2, y2, r2) {
        // Calculate distance between centers
        const dx = x2 - x1;
        const dy = y2 - y1;
        const d = Math.sqrt(dx * dx + dy * dy);
        
        // Check if circles are too far apart or one is contained within the other
        if (d > r1 + r2 || d < Math.abs(r1 - r2)) {
            console.log('No intersection - circles too far apart or one inside the other:', {
                d: d,
                r1: r1,
                r2: r2,
                r1_plus_r2: r1 + r2,
                abs_r1_minus_r2: Math.abs(r1 - r2)
            });
            return null;
        }

        // Check if circles are coincident
        if (d === 0 && r1 === r2) {
            console.log('Circles are coincident - infinite solutions');
            return null;
        }

        // Find the intersections (see: http://paulbourke.net/geometry/circlesphere/)
        const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
        const h = Math.sqrt(r1 * r1 - a * a);
        
        const x3 = x1 + a * (x2 - x1) / d;
        const y3 = y1 + a * (y2 - y1) / d;
        
        // Calculate both intersection points
        const x4_1 = x3 + h * (y2 - y1) / d;
        const y4_1 = y3 - h * (x2 - x1) / d;
        
        const x4_2 = x3 - h * (y2 - y1) / d;
        const y4_2 = y3 + h * (x2 - x1) / d;
        
        console.log('Found circle intersection points:', {
            p1: {x: x4_1, y: y4_1},
            p2: {x: x4_2, y: y4_2}
        });
        
        return {
            x1: x4_1, y1: y4_1,
            x2: x4_2, y2: y4_2
        };
    }

    /**
     * Main animation/update loop with FPS limiting
     * @param {DOMHighResTimeStamp} timestamp - Current timestamp from requestAnimationFrame
     */
    updateAndRender() {
        this.updateMechanismGeometry();
        this.render();
    }

    /**
     * Draw the current state of the mechanism
     */
    drawMechanism() {


        // ALWAYS draw the base elements
        this.drawBaseBox();
        this.drawFixedPivots();

        // ALWAYS draw debug visualization to aid troubleshooting
        this.drawDebugCircles();

        // CRITICAL FIX: Always attempt to draw the mechanism, whether valid or not
        // This will help identify what parts are being calculated correctly
        this.drawInputLink();
        this.drawCouplerLink();
        this.drawOutputLink();
        this.drawLidBox();
        this.drawCrossingPoint();

        this.drawStatusIndicator();
    }

    /**
     * Draw the status indicator showing if configuration is valid
     */
    drawStatusIndicator() {
        const statusElement = document.getElementById('statusIndicator');
        if (!statusElement) return;

        if (this.configurationValid) {
            statusElement.textContent = 'Configuration Valid';
            statusElement.className = 'status-indicator status-good';
        } else {
            statusElement.textContent = 'Invalid mechanism configuration!';
            statusElement.className = 'status-indicator status-bad';
        }
    }

    /**
     * Convert from model coordinates (mm) to canvas pixels
     * @param {Object} point - Point with x,y in mm
     * @returns {Object} Point with x,y in pixels
     */
    toPixel(point) {
        return {
            x: (point.x * this.scale) + this.offsetX,
            y: this.canvas.height - ((point.y * this.scale) + this.offsetY)
        };
    }

    /**
     * Draw a grid for reference
     */
    drawGrid() {
        const gridSpacing = 50; // mm
        const gridColor = '#f0f0f0';
        
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 0.5;
        
        // Draw horizontal grid lines
        for (let y = 0; y < this.canvas.height; y += gridSpacing * this.scale) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Draw vertical grid lines
        for (let x = 0; x < this.canvas.width; x += gridSpacing * this.scale) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
    }

    /**
     * Draw circles to debug mechanism geometry
     */
    drawDebugCircles() {
        // Draw circle around pivot A with radius = input link length
        const pivotAPx = this.toPixel(this.pivotA);
        this.ctx.beginPath();
        this.ctx.arc(pivotAPx.x, pivotAPx.y, this.barLength * this.scale, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Draw circle around pivot D with radius = output link length
        const pivotDPx = this.toPixel(this.pivotD);
        this.ctx.beginPath();
        this.ctx.arc(pivotDPx.x, pivotDPx.y, this.barLength * this.scale, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(0, 0, 255, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // If we have a valid position for pivot B, draw circle with radius = coupler length
        if (this.pivotB) {
            const pivotBPx = this.toPixel(this.pivotB);
            this.ctx.beginPath();
            this.ctx.arc(pivotBPx.x, pivotBPx.y, this.lidWidth * this.scale, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
    }

    /**
     * Helper drawing methods
     * These are used by the main drawMechanism() method above
     */

    /**
     * Draw the base box
     */
    drawBaseBox() {
        this.drawBox(0, 0, this.baseWidth, this.baseHeight, 'lightblue', 'base');
    }

    /**
     * Draw fixed pivots (A and D)
     */
    drawFixedPivots() {
        this.drawPivot(this.pivotA.x, this.pivotA.y, 'red', 'A');
        this.drawPivot(this.pivotD.x, this.pivotD.y, 'blue', 'D');
    }

    /**
     * Draw input link (from A to B)
     */
    drawInputLink() {
        this.drawLink(this.pivotA.x, this.pivotA.y, this.pivotB.x, this.pivotB.y, 'red', 3, 'inputLink');
        this.drawPivot(this.pivotB.x, this.pivotB.y, 'green', 'B');
    }

    /**
     * Draw output link (from C to D)
     */
    drawOutputLink() {
        if (!this.configurationValid) return;
        
        this.drawLink(this.pivotC.x, this.pivotC.y, this.pivotD.x, this.pivotD.y, 'blue', 3, 'outputLink');
        this.drawPivot(this.pivotC.x, this.pivotC.y, 'green', 'C');
    }
    
    /**
     * Draw coupler link (from B to C)
     */
    drawCouplerLink() {
        if (!this.configurationValid) return;
        
        this.drawLink(this.pivotB.x, this.pivotB.y, this.pivotC.x, this.pivotC.y, 'green', 3, 'couplerLink');
        
        // If we have a crossing point, draw it
        if (this.crossingPoint) {
            this.drawCrossingPoint();
        }
    }

    /**
     * Draw lid box
     */
    drawLidBox() {
        if (!this.configurationValid) return;

        // The lid is attached to the coupler link (B-C)
        const angle = Math.atan2(this.pivotC.y - this.pivotB.y, this.pivotC.x - this.pivotB.x);

        const pivotBPx = this.toPixel(this.pivotB);

        this.ctx.save();
        this.ctx.translate(pivotBPx.x, pivotBPx.y);
        this.ctx.rotate(angle);

        // Draw the lid rectangle, aligned with the coupler link
        const lidWidthPx = this.lidWidth * this.scale;
        const lidHeightPx = this.lidHeight * this.scale;

        this.ctx.fillStyle = 'lightgray';
        this.ctx.fillRect(0, -lidHeightPx, lidWidthPx, lidHeightPx);
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(0, -lidHeightPx, lidWidthPx, lidHeightPx);

        this.ctx.restore();
    }

    /**
     * Draw the crossing point of links AB and CD
     * @param {Object} point - Optional point to draw instead of the calculated crossing point
     * @param {string} label - Optional label for the point
     */
    drawCrossingPoint(point = null, label = "X") {
        const crossingPoint = point || this.crossingPoint;
        if (!crossingPoint) return;

        const pointPx = this.toPixel(crossingPoint);
        
        // Draw crossing point as a red circle
        this.ctx.beginPath();
        this.ctx.arc(pointPx.x, pointPx.y, 5, 0, Math.PI * 2);
        this.ctx.fillStyle = 'red';
        this.ctx.fill();
        
        // Draw "X" symbol for crossing
        const size = 7;
        this.ctx.beginPath();
        this.ctx.moveTo(pointPx.x - size, pointPx.y - size);
        this.ctx.lineTo(pointPx.x + size, pointPx.y + size);
        this.ctx.moveTo(pointPx.x + size, pointPx.y - size);
        this.ctx.lineTo(pointPx.x - size, pointPx.y + size);
        this.ctx.strokeStyle = 'purple';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Draw point label
        this.ctx.font = "14px Arial";
        this.ctx.fillStyle = "black";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(label, pointPx.x, pointPx.y - 15);
    }
    
    /**
     * Draw a pivot point
     * @param {number} x - X position in mm
     * @param {number} y - Y position in mm
     * @param {string} color - Fill color
     * @param {string} label - Label for the pivot
     */
    drawPivot(x, y, color, label) {
        const pointPx = this.toPixel({x, y});
        
        // Draw pivot point
        this.ctx.beginPath();
        this.ctx.arc(pointPx.x, pointPx.y, 5, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();

        // Draw pivot label
        this.ctx.font = "14px Arial";
        this.ctx.fillStyle = "black";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(label, pointPx.x, pointPx.y - 15);
    }
    
    /**
     * Draw a box (rectangle)
     * @param {number} x - X position in mm
     * @param {number} y - Y position in mm
     * @param {number} width - Width in mm
     * @param {number} height - Height in mm
     * @param {string} color - Fill color
     * @param {string} id - Optional ID for the box
     */
    drawBox(x, y, width, height, color, id = '') {
        const topLeft = this.toPixel({x, y});
        const bottomRight = this.toPixel({x: x + width, y: y + height});
        
        const boxWidth = bottomRight.x - topLeft.x;
        const boxHeight = bottomRight.y - topLeft.y;
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(topLeft.x, topLeft.y, boxWidth, boxHeight);
        
        // Draw outline
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(topLeft.x, topLeft.y, boxWidth, boxHeight);
    }
    
    /**
     * Draw a line between two points
     * @param {number} x1 - Start X in mm
     * @param {number} y1 - Start Y in mm
     * @param {number} x2 - End X in mm
     * @param {number} y2 - End Y in mm
     * @param {string} color - Stroke color
     * @param {number} width - Line width in pixels
     * @param {string} id - Optional ID for the link
     */
    drawLink(x1, y1, x2, y2, color = 'black', width = 2, id = '') {
        const start = this.toPixel({x: x1, y: y1});
        const end = this.toPixel({x: x2, y: y2});
        
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.stroke();
        this.ctx.closePath();
    }
    
    /**
     * Backward compatibility: Maps drawRectangle to drawBox for older code references
     */
    drawRectangle(x, y, width, height, color, id = '') {
        this.drawBox(x, y, width, height, color, id);
    }
    
    /**
     * Render the mechanism on the canvas
     */
    render() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();

        // Scale and translate to match our mm-based coordinate system
        this.ctx.scale(this.scale, this.scale);

        // Draw debug visualization first so it's behind everything else
        this.drawDebugCircles();

        // Draw the mechanism components
        this.drawMechanism();

        this.ctx.restore();
    }
}


