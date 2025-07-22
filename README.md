# Cross Hinge Simulator

A web-based simulator for designing and testing cross (X-shaped) hinges for boxes. This tool helps you design a working hinge system that allows proper lid movement.

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

## Development

The code is organized into the following files:
- `index.html`: The main HTML file containing the page structure and UI controls.
- `throttled-simulator.js`: The core JavaScript file with the `CrossHingeSimulator` class that handles all simulation logic, calculations, and rendering.

The simulator uses a simple object-oriented approach with the `CrossHingeSimulator` class handling all the calculations and rendering.

## Mechanism

Antiparallelogram (crossing) four-bar mechanism:

- Four rigid links: one of these is fixed (ground), the other three move.
- Four pin joints connecting the links.
- It typically has a single degree of freedom, which means the motion of one link determines the rest.
- Links cross; input and output move in opposing senses, producing an “X” configuration

## Terminology

### Links (Rigid Bodies)

1. **Ground Link (L₄)**: The fixed link connecting pivots A and D, representing the base of the box.
2. **Input Link (L₁)**: The first crossing bar connecting pivots A and B.
3. **Output Link (L₂)**: The second crossing bar connecting pivots D and C.
4. **Coupler Link (L₃)**: The link connecting pivots B and C, representing the lid of the box.

### Pivots (Pin Joints)

- **Pivot A**: The fixed base left pivot point (ground-input joint).
- **Pivot B**: The mobile lid left pivot point (input-coupler joint).
- **Pivot C**: The mobile lid right pivot point (coupler-output joint).
- **Pivot D**: The fixed base right pivot point (ground-output joint).

### Crossing Point

- **Intersection Point (X)**: The point where the input link (AB) and output link (DC) cross each other. This point moves during operation but is not a physical pivot.

### Kinematics Properties

- The mechanism has a single degree of freedom.
- Links AB and DC always cross, forming the characteristic "X" configuration.
- All links maintain constant length throughout the motion.
- Input and output links rotate in opposing directions.
- Lid is fixed to output link.
- Base is fixed to ground link.
- Links BC (coupler) and AD (ground) never cross each other.


Mechanism design:
Design Process in SolidWorks:

Set up the path positions:

The user will place three virtual lid in the simulator in three different positions:

- Closed position
- Intermediate position
- Open position

Lid design:
- Each virtual lid will have a center handle to move id and an anchor point to rotate it. 
- Each will be named accordingly: closed, intermediate, and open.

Once lid placed, the user will set 2 points on the closed lid that will represent the coupler link. The user will be able to move the points to adjust the mechanism.

The simulator will calculate the mechanism automatically.
How to calculate the mechanism:

- Make all lines equal length (this represents link #3)
- Identify the sides:
  - Label one end as side A (positions A1, A2, A3)
  - Label other end as side B (positions B1, B2, B3)
- Connect the positions:
  - Draw lines connecting A1 to A2, and A2 to A3
  - Draw lines connecting B1 to B2, and B2 to B3
- Find pivot points:
  - Find midpoint of A1-A2 line, draw perpendicular line from it
  - Find midpoint of A2-A3 line, draw perpendicular line from it
  - Repeat for B side (B1-B2 and B2-B3)
  - Find convergence points of perpendicular lines - these become your base pivot points
- Create the mechanism:
  - Connect convergence points to form the base (link #1)
  - Create links #2 and #4 from pivot points to the moving part
- The mechanism will now follow the desired path through all three positions
- All other parameters are calculated automatically.

## License

This project is open source and available for use in your projects. Feel free to modify and adapt it as needed.
Use MIT license.

Reference: https://mm-nitk.vlabs.ac.in/exp/position-analysis-grashof/simulation.html