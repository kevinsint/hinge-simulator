# Cross Hinge Simulator

A web-based simulator for designing and testing cross (X-shaped) hinges for boxes. 

This tool helps you design a working hinge system that allows proper lid movement.

## Features

- 2D rendering of box base and lid with hinge system
- Interactive hinge placement using sliders
- Real-time visualization of hinge movement
- Automatic calculation of optimal hinge parameters (later)
- Visual indicators for optimal hinge position and bar length (later)
- Detailed guidance and warnings about potential issues

## Usage

1. Start the server by running `./start-server.sh`.

2. Open http://localhost:8000 in a web browser.

3. Use the sliders to adjust the mechanism's parameters:
   - **Box Dimensions:** Control the size of the base and lid.
   - **Hinge Configuration:** Adjust the lengths of the input/output links and the position of the fixed pivots.
   - **Animation slider:** Control the input angle (`pivotAAngle`) to animate the mechanism.

4. The simulator will:
   - Show the hinge system in real-time
   - Provide detailed guidance about the current configuration
   - Highlight potential issues in red

5. Stop the server by running `./stop-server.sh`.

## Technical Details

- Built with vanilla JavaScript and HTML5 Canvas
- Uses trigonometry for accurate hinge calculations
- Real-time rendering
- Responsive design that works on desktop and mobile

## Design Considerations

The simulator helps you design a hinge system that:
- Allows smooth lid movement between open and closed positions
- Maintains proper clearance between the lid and box
- Uses optimal bar lengths for the given box dimensions

