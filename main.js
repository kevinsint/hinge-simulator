import { DesignerUI } from './designer.js';
import { CrossHingeSimulator } from './simulation_ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('hingeCanvas');
    const designModeSelect = document.getElementById('designMode');
    const simulationControls = document.getElementById('simulationControls');
    const designControls = document.getElementById('designControls');

    let activeSimulator = null;

    function switchMode(mode) {
        if (activeSimulator && typeof activeSimulator.destroy === 'function') {
            activeSimulator.destroy();
        }

        if (mode === 'design') {
            simulationControls.style.display = 'none';
            designControls.style.display = 'block';
            activeSimulator = new DesignerUI(canvas);
        } else {
            simulationControls.style.display = 'block';
            designControls.style.display = 'none';
            activeSimulator = new CrossHingeSimulator(canvas);
        }
    }

    designModeSelect.addEventListener('change', (event) => {
        switchMode(event.target.value);
    });

    // Initialize with the default mode
    switchMode(designModeSelect.value);
});
