import { DesignerUI } from './designer.js';
import { CrossHingeSimulator } from './simulation_ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('hingeCanvas');
    const lidAngleSlider = document.getElementById('lidAngle');
    const lidAngleValue = document.getElementById('lidAngleValue');
    const unlockHingeCheckbox = document.getElementById('unlockHinge');
    
    // Box dimension controls
    const boxWidthInput = document.getElementById('boxWidth');
    const lidHeightInput = document.getElementById('lidHeight');
    const baseHeightInput = document.getElementById('baseHeight');
    const lidGapInput = document.getElementById('lidGap');
    
    // Units toggle controls
    const mmRadio = document.querySelector('input[name="units"][value="mm"]');
    const inchesRadio = document.querySelector('input[name="units"][value="inches"]');
    
    // Conversion factor: 1 inch = 25.4 mm
    const MM_PER_INCH = 25.4;
    let currentUnit = 'mm'; // Default unit is mm
    
    // Export/Import controls
    const exportButton = document.getElementById('exportConfig');
    const importButton = document.getElementById('importConfig');
    const importFile = document.getElementById('importFile');

    let activeSimulator = null;
    
    // Track if we're currently updating values to avoid triggering change events
    let isUpdatingUnits = false;

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
                // Store last valid percentage when we have a valid position
                lastValidPct = pct;
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
            // Store the result as the new lastValidPct
            lastValidPct = Math.round(left);
            return lastValidPct;
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
                
                // Clamp to nearest valid percentage
                const clampedPct = clampToValidPct(pct);
                
                // Update the slider to reflect the valid position
                lidAngleSliderRef.value = String(clampedPct);
                
                // Calculate and apply the angle offset
                const angleOffset = pctToAngle(clampedPct);
                console.log(`[Slider Event] Calculated angleOffset for DesignerUI (clamped): ${angleOffset}`);
                activeSimulator.animate(angleOffset);
                lidAngleValue.textContent = `${(angleOffset * 180 / Math.PI).toFixed(0)}°`;
                // Don't update lastValidPct here since it's already updated in clampToValidPct
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
        const syncUI = (result) => {
            if (!(activeSimulator instanceof DesignerUI)) return;

            const minDeg = (activeSimulator.angleLimits.min * 180 / Math.PI).toFixed(1);
            const maxDeg = (activeSimulator.angleLimits.max * 180 / Math.PI).toFixed(1);
            const validRange = activeSimulator.angleLimits.max > activeSimulator.angleLimits.min;
            const statusDiv = document.getElementById('angleLimitsStatus');

            if (statusDiv) {
                statusDiv.textContent = `Angle limits: min ${minDeg}°, max ${maxDeg}° – linkage is ${validRange ? 'animatable' : 'locked'}.`;
            }

            // Update pivot positions if available
            if (result && result.relativePivots) {
                const { A, B, C, D } = result.relativePivots;
                
                const pivotAElement = document.getElementById('pivotA');
                const pivotBElement = document.getElementById('pivotB');
                const pivotCElement = document.getElementById('pivotC');
                const pivotDElement = document.getElementById('pivotD');
                
                if (pivotAElement) pivotAElement.textContent = `x: ${A.x}, y: ${A.y}`;
                if (pivotBElement) pivotBElement.textContent = `x: ${B.x}, y: ${B.y}`;
                if (pivotCElement) pivotCElement.textContent = `x: ${C.x}, y: ${C.y}`;
                if (pivotDElement) pivotDElement.textContent = `x: ${D.x}, y: ${D.y}`;
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

    // Add checkbox event listener for unlocking hinge
    if (unlockHingeCheckbox) {
        unlockHingeCheckbox.addEventListener('change', () => {
            if (activeSimulator && typeof activeSimulator.setHingeUnlocked === 'function') {
                console.log('Hinge unlock state changed:', unlockHingeCheckbox.checked);
                activeSimulator.setHingeUnlocked(unlockHingeCheckbox.checked);
                
                // Reset slider to minimum position when toggling unlock state
                lastValidPct = 0;
                lidAngleSliderRef.value = '0';
                
                // Trigger slider update to recalculate limits and position
                const event = new Event('input');
                lidAngleSliderRef.dispatchEvent(event);
            }
        });
    }

    // Add event listeners for box dimension controls
    function setupDimensionControl(input, dimensionKey) {
        if (input) {
            input.addEventListener('input', () => {
                const value = parseInt(input.value);
                
                if (activeSimulator && typeof activeSimulator.updateBoxDimensions === 'function') {
                    const dimensions = {};
                    dimensions[dimensionKey] = value;
                    activeSimulator.updateBoxDimensions(dimensions);
                    
                    // Reset animation state after dimension change
                    lastValidPct = 0;
                    lidAngleSliderRef.value = '0';
                    
                    // Trigger slider update to recalculate limits
                    const event = new Event('input');
                    lidAngleSliderRef.dispatchEvent(event);
                }
            });
        }
    }

    setupDimensionControl(boxWidthInput, 'width');
    setupDimensionControl(lidHeightInput, 'lidHeight');
    setupDimensionControl(baseHeightInput, 'baseHeight');
    setupDimensionControl(lidGapInput, 'lidGap');

    // Export/Import functionality
    function exportConfiguration() {
        const simulatorConfig = activeSimulator && typeof activeSimulator.getConfiguration === 'function' 
            ? activeSimulator.getConfiguration() 
            : {};
            
        const config = {
            boxWidth: parseInt(boxWidthInput.value),
            lidHeight: parseInt(lidHeightInput.value),
            baseHeight: parseInt(baseHeightInput.value),
            lidGap: parseInt(lidGapInput.value),
            pivots: simulatorConfig.pivots || null,
            exportDate: new Date().toISOString(),
            version: "2.0"
        };
        
        const dataStr = JSON.stringify(config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `hinge-config-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function importConfiguration(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const config = JSON.parse(e.target.result);
                
                // Update input fields
                if (typeof config.boxWidth === 'number') boxWidthInput.value = config.boxWidth;
                if (typeof config.lidHeight === 'number') lidHeightInput.value = config.lidHeight;
                if (typeof config.baseHeight === 'number') baseHeightInput.value = config.baseHeight;
                if (typeof config.lidGap === 'number') lidGapInput.value = config.lidGap;
                
                // Update box dimensions first
                if (activeSimulator && typeof activeSimulator.updateBoxDimensions === 'function') {
                    const dimensions = {
                        width: config.boxWidth,
                        lidHeight: config.lidHeight,
                        baseHeight: config.baseHeight,
                        lidGap: config.lidGap
                    };
                    activeSimulator.updateBoxDimensions(dimensions);
                }
                
                // Apply pivot positions if available
                if (config.pivots && activeSimulator && typeof activeSimulator.setConfiguration === 'function') {
                    activeSimulator.setConfiguration({
                        boxDimensions: {
                            width: config.boxWidth,
                            baseHeight: config.baseHeight,
                            lidHeight: config.lidHeight,
                            lidGap: config.lidGap
                        },
                        pivots: config.pivots
                    });
                }
                
                // Reset animation state
                lastValidPct = 0;
                lidAngleSliderRef.value = '0';
                
                // Trigger slider update to recalculate limits
                const event = new Event('input');
                lidAngleSliderRef.dispatchEvent(event);
                
                console.log('Configuration imported successfully');
            } catch (error) {
                console.error('Error importing configuration:', error);
                alert('Error importing configuration file. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }

    // Event listeners for export/import
    if (exportButton) {
        exportButton.addEventListener('click', exportConfiguration);
    }

    if (importButton && importFile) {
        importButton.addEventListener('click', () => {
            importFile.click();
        });
        
        importFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importConfiguration(e.target.files[0]);
                // Reset the file input value after processing to allow reimporting the same file
                e.target.value = '';
            }
        });
    }

    // Units toggle functionality
    function setupUnitsToggle() {
        // Set initial state
        mmRadio.checked = currentUnit === 'mm';
        inchesRadio.checked = currentUnit === 'inches';
        
        // Helper function to convert a value between units
        function convertValue(value, fromUnit, toUnit) {
            if (fromUnit === toUnit) return value;
            
            if (fromUnit === 'mm' && toUnit === 'inches') {
                return value / MM_PER_INCH;
            } else if (fromUnit === 'inches' && toUnit === 'mm') {
                return value * MM_PER_INCH;
            }
            return value;
        }
        
        // Function to update all dimension inputs based on current unit
        function updateInputsForUnit(newUnit) {
            if (newUnit === currentUnit) return;
            
            isUpdatingUnits = true;
            
            // Get current values in pixels (internally stored as mm)
            const boxWidth = parseFloat(boxWidthInput.value) || 0;
            const lidHeight = parseFloat(lidHeightInput.value) || 0;
            const baseHeight = parseFloat(baseHeightInput.value) || 0;
            const lidGap = parseFloat(lidGapInput.value) || 0;
            
            // Convert to new unit
            boxWidthInput.value = convertValue(boxWidth, currentUnit, newUnit).toFixed(newUnit === 'inches' ? 2 : 0);
            lidHeightInput.value = convertValue(lidHeight, currentUnit, newUnit).toFixed(newUnit === 'inches' ? 2 : 0);
            baseHeightInput.value = convertValue(baseHeight, currentUnit, newUnit).toFixed(newUnit === 'inches' ? 2 : 0);
            lidGapInput.value = convertValue(lidGap, currentUnit, newUnit).toFixed(newUnit === 'inches' ? 2 : 0);
            
            // Update labels and input properties
            const unitSuffix = newUnit === 'mm' ? 'mm' : 'in';
            document.querySelectorAll('.slider-group label').forEach(label => {
                const text = label.textContent;
                if (text.includes('(mm):') || text.includes('(in):')) {
                    label.textContent = text.replace(/\((mm|in)\):/, `(${unitSuffix}):`);
                }
            });
            
            // Update step and precision for each input based on unit
            [boxWidthInput, lidHeightInput, baseHeightInput, lidGapInput].forEach(input => {
                if (newUnit === 'inches') {
                    input.step = '0.1';
                    input.min = '0.1';
                } else {
                    input.step = '1';
                    input.min = '1';
                }
            });
            
            currentUnit = newUnit;
            isUpdatingUnits = false;
        }
        
        // Add event listeners to radio buttons
        mmRadio.addEventListener('change', () => {
            if (mmRadio.checked) updateInputsForUnit('mm');
        });
        
        inchesRadio.addEventListener('change', () => {
            if (inchesRadio.checked) updateInputsForUnit('inches');
        });
        
        // Initialize labels
        updateInputsForUnit('mm');
    }
    
    // Add event listeners for dimension inputs to handle updates correctly
    function setupDimensionInputs() {
        const dimensionInputs = [boxWidthInput, lidHeightInput, baseHeightInput, lidGapInput];
        
        dimensionInputs.forEach(input => {
            input.addEventListener('change', () => {
                if (isUpdatingUnits) return;
                
                // Convert back to mm for internal use
                let value = parseFloat(input.value) || 0;
                if (currentUnit === 'inches') {
                    value = value * MM_PER_INCH;
                }
                
                // Only update dimensions when actively changed by user (not during unit conversion)
                if (activeSimulator && typeof activeSimulator.updateBoxDimensions === 'function') {
                    const dimensions = {};
                    if (input === boxWidthInput) dimensions.width = value;
                    if (input === lidHeightInput) dimensions.lidHeight = value;
                    if (input === baseHeightInput) dimensions.baseHeight = value;
                    if (input === lidGapInput) dimensions.lidGap = value;
                    
                    activeSimulator.updateBoxDimensions(dimensions);
                }
            });
        });
    }
    
    console.log('Initializing application with DesignerUI');
    // Initialize with design mode
    switchMode();
    
    // Setup units toggle and dimension inputs after simulator is initialized
    setupUnitsToggle();
    setupDimensionInputs();
    
    // Double-check if slider is properly initialized
    setTimeout(() => {
        console.log('Active simulator:', activeSimulator);
        console.log('Lid angle slider:', lidAngleSlider);
        console.log('Slider listener reference:', lidAngleSliderRef);
        console.log('Unlock hinge checkbox:', unlockHingeCheckbox);
    }, 500);

});
