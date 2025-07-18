/**
 * Cross Hinge Simulator
 * A tool to help design and visualize cross (X-shaped) hinges for boxes
 * Features:
 * - Real-time hinge simulation
 * - Adjustable hinge lengths and positions
 * - Box dimension customization
 * - Optimal hinge placement suggestions
 * - Detailed status and metrics display
 */

// Canvas setup
const canvas = document.getElementById('hingeCanvas');
const ctx = canvas.getContext('2d');

/**
 * Box dimensions configuration
 * @type {Object}
 * @property {number} width - Width of the box base
 * @property {number} height - Height of the box base
 * @property {number} lidHeight - Height of the box lid
 */
let boxDimensions = {
    width: 200,
    height: 100,
    lidHeight: 50
};

/**
 * Hinge configuration object
 * @type {Object}
 * @property {number} baseBarLength - Length of the base hinge bar
 * @property {number} lidBarLength - Length of the lid hinge bar
 * @property {number} baseX - X position of base attachment point (0-100%)
 * @property {number} baseY - Y position of base attachment point (0-100%)
 * @property {number} lidX - X position of lid attachment point (0-100%)
 * @property {number} lidY - Y position of lid attachment point (0-100%)
 * @property {number} angle - Current hinge angle (0-180 degrees)
 * @property {boolean} animationRunning - Whether animation is running
 */
let config = {
    baseBarLength: 50,
    lidBarLength: 50,
    baseX: 50,
    baseY: 50,
    lidX: 50,
    lidY: 50,
    angle: 0,
    animationRunning: true
};

// DOM elements
const statusText = document.getElementById('statusText');

/**
 * Update function for slider inputs
 * @param {HTMLInputElement} slider - The slider input element
 * @param {HTMLElement} valueElement - The element to display the slider value
 * @param {string} configKey - The key in the configuration object to update
 * @returns {Function} Event handler function for slider input
 */
function updateSliderValue(slider, valueElement, configKey) {
    return function() {
        const value = this.value;
        valueElement.textContent = value;
        
        if (configKey.startsWith('box')) {
            boxDimensions[configKey.replace('box', '')] = parseInt(value);
        } else {
            config[configKey] = parseInt(value);
        }
        
        updateStatus();
        redraw();
    };
}

// Initialize sliders
document.querySelectorAll('input[type="range"]').forEach(slider => {
    const valueElement = document.getElementById(`${slider.id}Value`);
    const configKey = slider.id;
    slider.addEventListener('input', updateSliderValue(slider, valueElement, configKey));
});

// Button handlers
document.getElementById('play').addEventListener('click', () => {
    config.animationRunning = true;
    animate();
});

document.getElementById('pause').addEventListener('click', () => {
    config.animationRunning = false;
});

document.getElementById('reset').addEventListener('click', () => {
    config.angle = 0;
    config.baseBarLength = 50;
    config.lidBarLength = 50;
    config.baseX = 50;
    config.baseY = 50;
    config.lidX = 50;
    config.lidY = 50;
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.value = config[slider.id];
        document.getElementById(`${slider.id}Value`).textContent = config[slider.id];
    });
    updateStatus();
    redraw();
});

/**
 * Draw the box and lid on the canvas
 */
function drawBox() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Draw base
    ctx.fillStyle = '#888';
    ctx.fillRect(centerX - boxDimensions.width/2, 
                centerY - (boxDimensions.height + boxDimensions.lidHeight)/2 + boxDimensions.height,
                boxDimensions.width, 
                boxDimensions.height);
    
    // Draw lid
    ctx.fillStyle = '#aaa';
    ctx.fillRect(centerX - boxDimensions.width/2, 
                centerY - (boxDimensions.height + boxDimensions.lidHeight)/2,
                boxDimensions.width, 
                boxDimensions.lidHeight);
}

function drawHinge() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Base attachment point
    const baseX = centerX + config.baseX - boxDimensions.width/2;
    const baseY = centerY + config.baseY - (boxDimensions.height + boxDimensions.lidHeight)/2 + boxDimensions.height;
    
    // Lid attachment point
    const lidX = centerX + config.lidX - boxDimensions.width/2;
    const lidY = centerY + config.lidY - (boxDimensions.height + boxDimensions.lidHeight)/2;
    
    // Calculate hinge positions
    const angleRad = config.angle * Math.PI / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    
    // Draw base bar
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(baseX + config.baseBarLength * cosA, baseY + config.baseBarLength * sinA);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw lid bar
    ctx.beginPath();
    ctx.moveTo(lidX, lidY);
    ctx.lineTo(lidX + config.lidBarLength * cosA, lidY + config.lidBarLength * sinA);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw attachment points
    ctx.fillStyle = '#f00';
    ctx.beginPath();
    ctx.arc(baseX, baseY, 3, 0, Math.PI * 2);
    ctx.arc(lidX, lidY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw hinge intersection point
    const intersectionX = (baseX + config.baseBarLength * cosA + lidX + config.lidBarLength * cosA) / 2;
    const intersectionY = (baseY + config.baseBarLength * sinA + lidY + config.lidBarLength * sinA) / 2;
    ctx.fillStyle = '#00f';
    ctx.beginPath();
    ctx.arc(intersectionX, intersectionY, 3, 0, Math.PI * 2);
    ctx.fill();
}

function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBox();
    drawHinge();
    drawOptimalHinge();
}

// Optimization calculations
function calculateOptimalHinge() {
        /**
     * Calculate optimal hinge points based on box dimensions
     * @returns {Object} Optimal hinge configuration
     */
    const optimalConfig = {
        baseX: boxDimensions.width / 4,
        baseY: boxDimensions.height / 4,
        lidX: boxDimensions.width / 4,
        lidY: boxDimensions.lidHeight / 2,
        baseBarLength: boxDimensions.width / 3,
        lidBarLength: boxDimensions.width / 3
    };
    
    return optimalConfig;
}

function drawOptimalHinge() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const optimal = calculateOptimalHinge();
    
    // Base attachment point
    const baseX = centerX + optimal.baseX - boxDimensions.width/2;
    const baseY = centerY + optimal.baseY - (boxDimensions.height + boxDimensions.lidHeight)/2 + boxDimensions.height;
    
    // Lid attachment point
    const lidX = centerX + optimal.lidX - boxDimensions.width/2;
    const lidY = centerY + optimal.lidY - (boxDimensions.height + boxDimensions.lidHeight)/2;
    
    // Calculate hinge positions
    const angleRad = config.angle * Math.PI / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    
    // Draw optimal base bar (dashed line)
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(baseX + optimal.baseBarLength * cosA, baseY + optimal.baseBarLength * sinA);
    ctx.strokeStyle = '#008000';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw optimal lid bar (dashed line)
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(lidX, lidY);
    ctx.lineTo(lidX + optimal.lidBarLength * cosA, lidY + optimal.lidBarLength * sinA);
    ctx.strokeStyle = '#008000';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw optimal attachment points
    ctx.fillStyle = '#008000';
    ctx.beginPath();
    ctx.arc(baseX, baseY, 2, 0, Math.PI * 2);
    ctx.arc(lidX, lidY, 2, 0, Math.PI * 2);
    ctx.fill();
}

// Animation loop
function animate() {
    if (!config.animationRunning) return;
    
    // Calculate smooth angle change
    const angleStep = 1; // degrees per frame
    const maxAngle = 180; // maximum angle
    
    config.angle += angleStep;
    if (config.angle >= maxAngle) {
        config.angle = maxAngle;
        // Reverse direction
        angleStep = -angleStep;
    } else if (config.angle <= 0) {
        config.angle = 0;
        // Reverse direction
        angleStep = -angleStep;
    }
    
    // Update status
    updateStatus();
    
    redraw();
    requestAnimationFrame(animate);
}

// Status update
function updateStatus() {
    // Calculate hinge metrics
    const baseLength = Math.sqrt(config.baseBarLength**2 + config.lidBarLength**2);
    const maxReach = boxDimensions.width / 2;
    const currentReach = Math.sqrt((config.baseX - config.lidX)**2 + (config.baseY - config.lidY)**2);
    
    // Calculate angle range
    const optimal = calculateOptimalHinge();
    const optimalBaseLength = Math.sqrt(optimal.baseBarLength**2 + optimal.lidBarLength**2);
    const optimalMaxReach = boxDimensions.width / 2;
    const optimalCurrentReach = Math.sqrt((optimal.baseX - optimal.lidX)**2 + (optimal.baseY - optimal.lidY)**2);
    
    // Update status text
    if (baseLength > maxReach) {
        statusText.textContent = 'Warning: Hinge bars are too long for the box width';
        statusText.style.color = 'red';
    } else if (currentReach > optimalCurrentReach) {
        statusText.textContent = 'Warning: Hinge placement may be suboptimal';
        statusText.style.color = '#ff9900';
    } else {
        statusText.textContent = 'Hinge configuration is valid';
        statusText.style.color = 'black';
    }

    // Update status values
    document.getElementById('maxReach').textContent = `${maxReach.toFixed(1)} units`;
    document.getElementById('currentReach').textContent = `${currentReach.toFixed(1)} units`;
    document.getElementById('angleRange').textContent = `${Math.round(Math.acos(currentReach / baseLength) * (180/Math.PI))}°`;
    
    // Calculate optimal placement
    const optimalPlacement = `Base: (${optimal.baseX}, ${optimal.baseY}) | Lid: (${optimal.lidX}, ${optimal.lidY})`;
    document.getElementById('optimalPlacement').textContent = optimalPlacement;
}

/**
 * Initialize the simulator
 * Sets up event listeners and starts the animation
 */
function initialize() {
    // Initialize status
    updateStatus();
    redraw();
    
    // Start animation
    animate();
}
