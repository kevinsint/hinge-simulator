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

The user will place three virtual lids in the simulator representing the following positions:

- Closed lid (fully closed)
- Intermediate lid (mid between first part of the movement and second part of the movement)
- Open lid (fully open)

### Overall mechanism design

- Once defined, the length of the links cannot be changed.
- The lid is attached to the coupler link.
- The base is attached to the ground link.
- The lid can rotate between 0 and 180 degrees.
- The lid can be placed to a distance of 0 to 150% of the box width in every direction.
- Link A-B must not cross over pivot D
- Link C-D must not cross over pivot A

### Lid design

- Each lid is drag and dropable and have an anchor point to rotate it. 
- Each lid is named accordingly: closed, intermediate and open.
- The user can reposition the floating pivot B and C points inside the closed lid.
- Lid can rotate between 0 and 180 degrees.
- Lid can be placed to a distance of 0 to 150% of the box width in every direction.


### Base design

- The base position is always fixed.
- The user can reposition the ground pivot A and D points inside the box base.

### How to calculate the mechanism

- Recalculate the mechanism every time the user moves a point or change a slider value or move the lids.


Not sure it works this way for crossed mechanisms, but work for four-bar mechanisms.
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