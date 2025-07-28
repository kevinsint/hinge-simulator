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

## Development

The code is organized into the following files:
- `index.html`: The main HTML file containing the page structure and UI controls.
- `throttled-simulator.js`: The core JavaScript file with the `CrossHingeSimulator` class that handles all simulation logic, calculations, and rendering.

The simulator uses a simple object-oriented approach with the `CrossHingeSimulator` class handling all the calculations and rendering.

## Mechanism

### Four-Bar Linkages
https://dynref.engr.illinois.edu/aml.html

Antiparallelogram (crossing) four-bar mechanism:

- Four rigid links: one of these is fixed (ground), the other three move.
- Four pin joints connecting the links.
- It has a single degree of freedom, which means the motion of the input link determines the rest.
- Links cross; input and output move in opposing senses, producing an X configuration.
- Links BC (coupler) and AD (ground) never cross each other.
- No links need to be of equal length.

### Links (Rigid Bodies)

1. **Ground Link (L₄)**: The fixed link connecting pivots A and D, connected to the base of the box.
2. **Input Link (L₁)**: The first crossing bar connecting pivots A and B.
3. **Output Link (L₂)**: The second crossing bar connecting pivots D and C.
4. **Floating Link (L₃)**: The link connecting pivots B and C, connected to the lid of the box.

### Pivots (Pin Joints)

- **Pivot A**: The fixed base left pivot point (ground-input joint).
- **Pivot B**: The mobile lid left pivot point (input-coupler joint).
- **Pivot C**: The mobile lid right pivot point (coupler-output joint).
- **Pivot D**: The fixed base right pivot point (ground-output joint).

### Crossing Point

- **Intersection Point (X)**: The point where the input link (AB) and output link (DC) cross each other. This point moves during operation but is not a physical pivot.

## Mechanism design

- The user define the box width, the base height and the lid height.
- Once defined, the length of the links cannot be changed.
- The lid is attached to the coupler link.
- The base is attached to the ground link.
- Link A-B must not cross over pivot D.
- Link C-D must not cross over pivot A.

### Lid design

- The lid must not cross over the base.
- The lid width is the same as the base width, the global box width.
- The lid height can be set by the user.
- The user can reposition the floating pivot B and C points inside the lid.
- The coupler pivot B and C must not cross over the base.
- The coupler pivot B and C cannot be placed outside the lid.

### Base design

- The base position is always fixed.
- The user can reposition the ground pivot A and D points inside the box base.
- The user can adjust the box bas height.
- The base width is the same as the lid width: the global box width.

