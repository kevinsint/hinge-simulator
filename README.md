# Cross Hinge Simulator

A web-based simulator for designing and testing cross (X-shaped) hinges for boxes. This tool helps you design a working hinge system that allows proper lid movement.

## Features

- Interactive hinge placement using sliders
- Real-time visualization of hinge movement
- Automatic calculation of optimal hinge parameters
- Visual indicators for optimal hinge position and bar length
- Detailed guidance and warnings about potential issues
- 2D rendering of box base and lid with hinge system

## Usage

1. Open `index.html` in a web browser
2. Use the sliders to adjust:
   - Hinge X Position: Horizontal position of the hinge on the box
   - Hinge Y Position: Vertical position of the hinge on the box
   - Bar Length: Length of the hinge bars
   - Lid Angle: Angle of the lid (0° = closed, 180° = fully open)

3. The simulator will:
   - Show the hinge system in real-time
   - Display optimal hinge position (green dot)
   - Show optimal bar length indicators (green lines)
   - Provide detailed guidance about the current configuration
   - Highlight potential issues in red
   - Show when the configuration is optimal in green

## Technical Details

- Built with vanilla JavaScript and HTML5 Canvas
- Uses trigonometry for accurate hinge calculations
- Real-time rendering using requestAnimationFrame
- Responsive design that works on desktop and mobile

## Design Considerations

The simulator helps you design a hinge system that:
- Allows smooth lid movement between open and closed positions
- Maintains proper clearance between the lid and box
- Is properly balanced and centered
- Uses optimal bar lengths for the given box dimensions

## Development

The code is organized into two main files:
- `index.html`: Contains the HTML structure and controls
- `hingeSimulator.js`: Contains all the hinge simulation logic

The simulator uses a simple object-oriented approach with the `CrossHingeSimulator` class handling all the calculations and rendering.

## License

This project is open source and available for use in your projects. Feel free to modify and adapt it as needed.
