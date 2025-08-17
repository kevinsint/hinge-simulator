import { DesignerUI } from './designer.js';
import { CrossHingeSimulator } from './simulation_ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('hingeCanvas');
    const lidAngleSlider = document.getElementById('lidAngle');
    const lidAngleValue = document.getElementById('lidAngleValue');

    let activeSimulator = null;

    let lidAngleSliderRef = lidAngleSlider;
    // Track last valid slider percentage (0..100)
    let lastValidPct = 0;
    function attachSliderListener() {
        // Clean up any existing listeners by cloning
        const oldListeners = lidAngleSliderRef.cloneNode(true);
        lidAngleSliderRef.parentNode.replaceChild(oldListeners, lidAngleSliderRef);
        lidAngleSliderRef = oldListeners;
        
        console.log('Attaching slider listener to:', lidAngleSliderRef);

        // Always use full slider range 0..100 mapped to [min,max] radians
        lidAngleSliderRef.min = '0';
        lidAngleSliderRef.max = '100';
        lidAngleSliderRef.step = '1';


        const pctToAngle = (pct) => {
            const min = activeSimulator.angleLimits.min;
            const max = activeSimulator.angleLimits.max;
            return min + (pct / 100) * (max - min);
        };

        const clampToValidPct = (targetPct) => {
            // Binary search from lastValidPct toward targetPct to find boundary
            const savedLastValidC = activeSimulator.lastValidC;
            const isValidPct = (p) => !!activeSimulator.calculateAnimatedStateForAngle(pctToAngle(p));
            let pct = Math.max(0, Math.min(100, targetPct));
            if (isValidPct(pct)) {
                activeSimulator.lastValidC = savedLastValidC; // restore
                return Math.round(pct);
            }
            let lo = Math.min(pct, lastValidPct);
            let hi = Math.max(pct, lastValidPct);
            // Ensure at least one side valid; if not, stick to lastValidPct
            let loValid = isValidPct(lo);
            let hiValid = isValidPct(hi);
            if (!loValid && !hiValid) {
                activeSimulator.lastValidC = savedLastValidC;
                return lastValidPct;
            }
            // Ensure 'left' is valid
            let left = hiValid && !loValid ? hi : lo;
            let right = hiValid && !loValid ? lo : hi;
            if (!isValidPct(left) && isValidPct(right)) { const t = left; left = right; right = t; }
            for (let i = 0; i < 25; i++) {
                const mid = (left + right) / 2;
                if (isValidPct(mid)) left = mid; else right = mid;
                if (Math.abs(right - left) < 0.01) break;
            }
            activeSimulator.lastValidC = savedLastValidC;
            return Math.round(left);
        };

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
                // Interpret slider value as percentage 0..100 and clamp to nearest valid
                let pct = Number(lidAngleSliderRef.value);
                if (Number.isNaN(pct)) pct = lastValidPct;
                pct = clampToValidPct(pct);
                lidAngleSliderRef.value = String(pct);
                const angleOffset = pctToAngle(pct);
                console.log(`[Slider Event] Calculated angleOffset for DesignerUI (clamped): ${angleOffset}`);
                activeSimulator.animate(angleOffset);
                lidAngleValue.textContent = `${(angleOffset * 180 / Math.PI).toFixed(0)}°`;
                if (activeSimulator.animatedState) lastValidPct = pct;
            } else {
                // Use direct radian value for simulation mode
                const angleInRadians = (Number(lidAngleSliderRef.value) / 100) * Math.PI; // 0..100 -> 0..π
                console.log(`[Slider Event] Calculated angleInRadians for Simulation: ${angleInRadians}`);
                activeSimulator.animate(angleInRadians);
                lidAngleValue.textContent = `${(angleInRadians * 180 / Math.PI).toFixed(0)}°`;
            }
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
        const syncUI = () => {
            if (!(activeSimulator instanceof DesignerUI)) return;

            const minDeg = (activeSimulator.angleLimits.min * 180 / Math.PI).toFixed(1);
            const maxDeg = (activeSimulator.angleLimits.max * 180 / Math.PI).toFixed(1);
            const validRange = activeSimulator.angleLimits.max > activeSimulator.angleLimits.min;
            const statusDiv = document.getElementById('angleLimitsStatus');

            if (statusDiv) {
                statusDiv.textContent = `Angle limits: min ${minDeg}°, max ${maxDeg}° – linkage is ${validRange ? 'animatable' : 'locked'}.`;
            }
        };

        activeSimulator = new DesignerUI(canvas, syncUI);

        // Initial UI sync
        syncUI();
        if (activeSimulator instanceof DesignerUI) {
            if (typeof activeSimulator.reset === 'function') {
                activeSimulator.reset();
            }

            // Set slider to the minimum position (lid closed) upon initialization.
            lastValidPct = 0;
            lidAngleSliderRef.value = String(lastValidPct);

            // Trigger a slider input event to apply the initial state.
            const event = new Event('input');
            lidAngleSliderRef.dispatchEvent(event);
        }
        
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
