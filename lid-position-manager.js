/**
 * LidPositionManager - Manages the three virtual lid positions for mechanism design.
 * Handles user interaction for positioning and rotating lids.
 */
class LidPositionManager {
    constructor(canvas, mechanismCalculator, scale, offset) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.calculator = mechanismCalculator;
        this.scale = scale;
        this.offset = offset;

        this.lidWidth = 120;
        this.lidHeight = 30;

        this.positions = [
            { id: 'closed', name: 'Closed', center: { x: 200, y: 300 }, rotation: 0, color: 'rgba(100, 150, 255, 0.7)' },
            { id: 'intermediate', name: 'Intermediate', center: { x: 300, y: 200 }, rotation: 30, color: 'rgba(255, 150, 100, 0.7)' },
            { id: 'open', name: 'Open', center: { x: 400, y: 150 }, rotation: 60, color: 'rgba(150, 255, 100, 0.7)' }
        ];

        this.couplerPoints = { A: { x: -40, y: 0 }, B: { x: 40, y: 0 } };
        this.dragState = { isDragging: false };
        this.eventsSetup = false;
        this.redrawCallback = null;
        this.onMechanismUpdate = null;
    }

    setupEventListeners() {
        if (this.eventsSetup) return;
        console.log('LidPositionManager: Setting up event listeners.');
        this.boundMouseDown = (e) => this.handleMouseDown(e);
        this.boundMouseMove = (e) => this.handleMouseMove(e);
        this.boundMouseUp = (e) => this.handleMouseUp(e);
        this.canvas.addEventListener('mousedown', this.boundMouseDown);
        this.canvas.addEventListener('mousemove', this.boundMouseMove);
        this.canvas.addEventListener('mouseup', this.boundMouseUp);
        this.canvas.addEventListener('mouseleave', this.boundMouseUp);
        this.eventsSetup = true;
    }

    removeEventListeners() {
        if (!this.eventsSetup) return;
        console.log('LidPositionManager: Removing event listeners.');
        this.canvas.removeEventListener('mousedown', this.boundMouseDown);
        this.canvas.removeEventListener('mousemove', this.boundMouseMove);
        this.canvas.removeEventListener('mouseup', this.boundMouseUp);
        this.canvas.removeEventListener('mouseleave', this.boundMouseUp);
        this.eventsSetup = false;
    }

    canvasToWorld(canvasX, canvasY) {
        return { x: (canvasX - this.offset.x) / this.scale, y: (canvasY - this.offset.y) / this.scale };
    }

    handleMouseDown(e) {
        console.log('--- Mouse Down ---');
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldPos = this.canvasToWorld(mouseX, mouseY);
        console.log(`Mouse Pos: (Canvas: ${mouseX.toFixed(2)}, ${mouseY.toFixed(2)}), (World: ${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)})`);

        const hitTest = this.hitTest(worldPos);
        console.log('Hit Test Result:', hitTest);

        if (hitTest.type !== 'none') {
            this.dragState = {
                isDragging: true,
                dragType: hitTest.type,
                targetIndex: hitTest.index,
                startMouse: { x: mouseX, y: mouseY },
                startValue: this.getStartValue(hitTest)
            };
            this.canvas.style.cursor = 'grabbing';
            console.log('Drag Started:', this.dragState);
        } else {
            console.log('No hit detected.');
        }
    }

    handleMouseMove(e) {
        if (!this.dragState.isDragging) {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const worldPos = this.canvasToWorld(mouseX, mouseY);
            const hitTest = this.hitTest(worldPos);
            this.canvas.style.cursor = hitTest.type !== 'none' ? 'grab' : 'default';
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldPos = this.canvasToWorld(mouseX, mouseY);
        this.handleDrag(mouseX, mouseY, worldPos);
    }

    handleMouseUp(e) {
        if (this.dragState.isDragging) {
            console.log('--- Mouse Up: Drag Ended ---');
            try {
                this.updateMechanism();
            } catch (error) {
                console.error('Error updating mechanism on mouse up:', error);
            }
        }
        this.dragState.isDragging = false;
        this.canvas.style.cursor = 'default';
    }

    hitTest(worldPos) {
        const tolerance = 25 / this.scale;
        console.log(`Hit Test @ World: (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}), Tolerance: ${tolerance.toFixed(2)}`);

        // Test coupler points first (they are on top)
        const closedPos = this.positions[0];
        const couplerAWorld = this.transformPoint(this.couplerPoints.A, closedPos.center, closedPos.rotation);
        let dist = this.distance(worldPos, couplerAWorld);
        console.log(`  - Checking Coupler A @ (${couplerAWorld.x.toFixed(2)}, ${couplerAWorld.y.toFixed(2)}), Dist: ${dist.toFixed(2)}`);
        if (dist < tolerance) return { type: 'couplerA', index: 0 };

        const couplerBWorld = this.transformPoint(this.couplerPoints.B, closedPos.center, closedPos.rotation);
        dist = this.distance(worldPos, couplerBWorld);
        console.log(`  - Checking Coupler B @ (${couplerBWorld.x.toFixed(2)}, ${couplerBWorld.y.toFixed(2)}), Dist: ${dist.toFixed(2)}`);
        if (dist < tolerance) return { type: 'couplerB', index: 0 };

        // Test lids from top to bottom (open to closed)
        for (let i = this.positions.length - 1; i >= 0; i--) {
            const pos = this.positions[i];
            dist = this.distance(worldPos, pos.center);
            console.log(`  - Checking Lid '${pos.name}' Center @ (${pos.center.x.toFixed(2)}, ${pos.center.y.toFixed(2)}), Dist: ${dist.toFixed(2)}`);
            if (dist < tolerance) return { type: 'position', index: i };

            const rotationHandle = this.getRotationHandlePosition(pos);
            dist = this.distance(worldPos, rotationHandle);
            console.log(`  - Checking Lid '${pos.name}' Rotator @ (${rotationHandle.x.toFixed(2)}, ${rotationHandle.y.toFixed(2)}), Dist: ${dist.toFixed(2)}`);
            if (dist < tolerance) return { type: 'rotation', index: i };
        }

        return { type: 'none' };
    }

    getStartValue(hitTest) {
        switch (hitTest.type) {
            case 'position': return { ...this.positions[hitTest.index].center };
            case 'rotation': return this.positions[hitTest.index].rotation;
            case 'couplerA': return { ...this.couplerPoints.A };
            case 'couplerB': return { ...this.couplerPoints.B };
            default: return null;
        }
    }

    handleDrag(mouseX, mouseY, worldPos) {
        if (!this.dragState.isDragging) return;
        // console.log('Dragging...'); // This can be too noisy

        const { dragType, targetIndex, startValue } = this.dragState;
        const mouseDeltaX = (mouseX - this.dragState.startMouse.x) / this.scale;
        const mouseDeltaY = (mouseY - this.dragState.startMouse.y) / this.scale;

        switch (dragType) {
            case 'position':
                this.positions[targetIndex].center.x = startValue.x + mouseDeltaX;
                this.positions[targetIndex].center.y = startValue.y + mouseDeltaY;
                break;
            case 'rotation':
                const center = this.positions[targetIndex].center;
                const angle = Math.atan2(worldPos.y - center.y, worldPos.x - center.x);
                this.positions[targetIndex].rotation = angle * 180 / Math.PI;
                break;
            case 'couplerA':
            case 'couplerB':
                const closedPos = this.positions[0];
                const localPos = this.worldToLocal(worldPos, closedPos);
                this.couplerPoints[dragType === 'couplerA' ? 'A' : 'B'] = localPos;
                break;
        }

        if (this.redrawCallback) this.redrawCallback();
    }

    worldToLocal({ x: worldX, y: worldY }, { center, rotation }) {
        const dx = worldX - center.x;
        const dy = worldY - center.y;
        const rad = -rotation * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rotatedX = dx * cos - dy * sin;
        const rotatedY = dx * sin + dy * cos;
        return { x: rotatedX, y: rotatedY };
    }

    getRotationHandlePosition(position) {
        const handleDistance = this.lidWidth / 2 + 20;
        const rad = position.rotation * Math.PI / 180;
        return { x: position.center.x + handleDistance * Math.cos(rad), y: position.center.y + handleDistance * Math.sin(rad) };
    }

    transformPoint(point, center, rotation) {
        const rad = rotation * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rotatedX = point.x * cos - point.y * sin;
        const rotatedY = point.x * sin + point.y * cos;
        return { x: rotatedX + center.x, y: rotatedY + center.y };
    }

    distance(p1, p2) {
        if (!p1 || !p2) return Infinity;
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    updateMechanism() {
        if (this.onMechanismUpdate) {
            console.log('Updating mechanism calculation...');
            const positions = this.getPositions();
            const couplerPoints = this.getCouplerPoints();

            // Set the state on the calculator before calculating
            this.calculator.setLidPositions(positions);
            this.calculator.setCouplerPoints(couplerPoints.A, couplerPoints.B);

            // Now, call the correct calculation method
            const result = this.calculator.calculateMechanism();
            this.onMechanismUpdate(result);
        }
    }

    render(ctx) {
        this.positions.forEach((pos, index) => this.drawLid(ctx, pos, index));
        if (this.positions[0]) this.drawCouplerPoints(ctx, this.positions[0]);
    }

    drawLid(ctx, position, index) {
        ctx.save();
        ctx.translate(position.center.x, position.center.y);
        ctx.rotate(position.rotation * Math.PI / 180);
        ctx.fillStyle = position.color;
        ctx.fillRect(-this.lidWidth / 2, -this.lidHeight / 2, this.lidWidth, this.lidHeight);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.lidWidth / 2, -this.lidHeight / 2, this.lidWidth, this.lidHeight);
        ctx.fillStyle = 'black';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(position.name, 0, 0);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(position.center.x, position.center.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.strokeStyle = 'darkred';
        ctx.lineWidth = 3;
        ctx.stroke();

        const rotHandle = this.getRotationHandlePosition(position);
        ctx.beginPath();
        ctx.arc(rotHandle.x, rotHandle.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'blue';
        ctx.fill();
        ctx.strokeStyle = 'darkblue';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(position.center.x, position.center.y);
        ctx.lineTo(rotHandle.x, rotHandle.y);
        ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawCouplerPoints(ctx, closedPosition) {
        const pointA = this.transformPoint(this.couplerPoints.A, closedPosition.center, closedPosition.rotation);
        const pointB = this.transformPoint(this.couplerPoints.B, closedPosition.center, closedPosition.rotation);

        ctx.beginPath();
        ctx.moveTo(pointA.x, pointA.y);
        ctx.lineTo(pointB.x, pointB.y);
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 3;
        ctx.stroke();

        ['A', 'B'].forEach(p => {
            const point = p === 'A' ? pointA : pointB;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'green';
            ctx.fill();
            ctx.strokeStyle = 'darkgreen';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = 'black';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p, point.x, point.y - 15);
        });
    }

    getPositions() {
        return JSON.parse(JSON.stringify(this.positions));
    }

    resetPositions() {
        this.positions = [
            { id: 'closed', name: 'Closed', center: { x: 200, y: 300 }, rotation: 0, color: 'rgba(100, 150, 255, 0.7)' },
            { id: 'intermediate', name: 'Intermediate', center: { x: 300, y: 200 }, rotation: 30, color: 'rgba(255, 150, 100, 0.7)' },
            { id: 'open', name: 'Open', center: { x: 400, y: 150 }, rotation: 60, color: 'rgba(150, 255, 100, 0.7)' }
        ];
        if (this.redrawCallback) {
            this.redrawCallback();
        }
        this.updateMechanism();
    }

    getCouplerPoints() {
        return JSON.parse(JSON.stringify(this.couplerPoints));
    }

    setUpdateCallback(callback) {
        this.onMechanismUpdate = callback;
    }

    setRedrawCallback(callback) {
        this.redrawCallback = callback;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LidPositionManager;
}
