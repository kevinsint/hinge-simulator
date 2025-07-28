import { DesignerUI } from './designer.js';
import { CrossHingeSimulator } from './simulation_ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('hingeCanvas');
    const lidAngleSlider = document.getElementById('lidAngle');
    const lidAngleValue = document.getElementById('lidAngleValue');

    let activeSimulator = null;

    let lidAngleSliderRef = lidAngleSlider;
    function attachSliderListener() {
        // Clean up any existing listeners by cloning
        const oldListeners = lidAngleSliderRef.cloneNode(true);
        lidAngleSliderRef.parentNode.replaceChild(oldListeners, lidAngleSliderRef);
        lidAngleSliderRef = oldListeners;
        
        console.log('Attaching slider listener to:', lidAngleSliderRef);

        lidAngleSliderRef.addEventListener('input', () => {
            console.log('SLIDER EVENT TRIGGERED');
            // Visual debug: flash slider background
            lidAngleSliderRef.style.background = '#fffd7f';
            setTimeout(() => { lidAngleSliderRef.style.background = ''; }, 150);
            if (!activeSimulator || typeof activeSimulator.animate !== 'function') {
                console.error('[Slider Event] No active simulator or animation method available');
                return;
            }

            const mode = (activeSimulator instanceof DesignerUI) ? 'design' : 'simulation';
            console.log(`[Slider Event] Mode: ${mode}`);
            console.log(`[Slider Event] Slider value: ${lidAngleSliderRef.value}`);

            // Handle differently based on simulator type
            if (activeSimulator instanceof DesignerUI) {
                // Always recalculate angle limits after pivots move
                if (typeof activeSimulator.calculateAngleLimits === 'function') {
                    activeSimulator.calculateAngleLimits();
                }
                console.log('[Slider Event] DesignerUI angleLimits:', JSON.stringify(activeSimulator.angleLimits));
                const minDeg = (activeSimulator.angleLimits.min * 180 / Math.PI).toFixed(1);
                const maxDeg = (activeSimulator.angleLimits.max * 180 / Math.PI).toFixed(1);
                const validRange = (activeSimulator.angleLimits.max > activeSimulator.angleLimits.min);
                const statusDiv = document.getElementById('angleLimitsStatus');
                if (statusDiv) {
                    if (validRange) {
                        statusDiv.textContent = `Angle limits: min ${minDeg}°, max ${maxDeg}° – linkage is animatable.`;
                    } else {
                        statusDiv.textContent = `Angle limits: min ${minDeg}°, max ${maxDeg}° – linkage is locked (not animatable).`;
                    }
                }
                const percentage = lidAngleSliderRef.value / 180;
                const angleOffset = activeSimulator.angleLimits.min + (percentage * (activeSimulator.angleLimits.max - activeSimulator.angleLimits.min));
                console.log(`[Slider Event] Calculated angleOffset for DesignerUI: ${angleOffset}`);
                activeSimulator.animate(angleOffset);
            } else {
                // Use direct radian value for simulation mode
                const angleInRadians = (lidAngleSliderRef.value / 180) * Math.PI;
                console.log(`[Slider Event] Calculated angleInRadians for Simulation: ${angleInRadians}`);
                activeSimulator.animate(angleInRadians);
            }

            lidAngleValue.textContent = `${lidAngleSliderRef.value}\u00b0`;
        });

        // Trigger the slider once to set initial state
        const event = new Event('input');
        lidAngleSliderRef.dispatchEvent(event);
    }

    function switchMode(mode = 'design') {
        if (activeSimulator && typeof activeSimulator.destroy === 'function') {
            activeSimulator.destroy();
        }

        // Since we don't have mode switching elements, always use DesignerUI
        activeSimulator = new DesignerUI(canvas);
        
        // Always (re-)attach the slider listener after switching mode
        attachSliderListener();
    }

    console.log('Initializing application with DesignerUI');
    // Initialize with design mode
    switchMode();
    
    // Double-check if slider is properly initialized
    setTimeout(() => {
        console.log('Active simulator:', activeSimulator);
        console.log('Lid angle slider:', lidAngleSlider);
        console.log('Slider listener reference:', lidAngleSliderRef);
    }, 500);

});
