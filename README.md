# Lighting Sandbox
*CSE 160: Introduction to Computer Graphics*

## Project Overview

This project is a interactive web application developed using WebGL to explore fundamental 3D computer graphics concepts, specifically focusing on various lighting models and rendering techniques. Users can manipulate light sources, adjust lighting properties, control camera perspective, and visualize surface normals within a simple 3D scene.

Developed as part of a university-level Computer Graphics course, this project demonstrates practical application of shader programming, matrix transformations, and interactive graphics programming using plain JavaScript and WebGL helper libraries.

## Features and Functionality

*   **3D Scene:** Renders a basic environment including a floor (textured), a sky (colored), a cube (textured), and a sphere.
*   **Interactive Camera:** Navigate the 3D scene using keyboard controls (`W`, `A`, `S`, `D` for movement, `Q`, `E` for panning) and mouse click-and-drag for rotation.
*   **Comprehensive Lighting System:** Implements a dynamic light source with the following features:
    *   **Ambient, Diffuse, and Specular Lighting:** Calculates realistic lighting effects based on surface properties, light position, and camera view.
    *   **Point Light:** Supports a standard point light source.
    *   **Spotlight:** Includes a fully functional spotlight with controllable direction and cutoff angle for a soft-edged effect.
    *   **Light Toggle:** Button controls to turn the main light source on or off.
    *   **Light Position Control:** Sliders to precisely adjust the light's X, Y, and Z coordinates.
    *   **Light Color Control:** RGB sliders to change the light's color.
    *   **Visual Light Marker:** A small cube rendered at the light's current position for easy visualization.
    *   **Animated Light:** The point light automatically animates from side to side within the cube's boundaries over time.
*   **Texture Mapping:** Applies textures (Grass and Dirt) to scene objects (Floor and Cube) using texture units and samplers in the fragment shader.
*   **Normal Visualization:** A toggle button allows users to visualize the surface normals of objects using color coding.
*   **Performance Monitor:** Displays real-time performance metrics (milliseconds per frame and frames per second).

## Technologies and Tools Used

*   **WebGL:** The core rendering API for hardware-accelerated 3D graphics on the web.
*   **HTML5:** Provides the structure for the web page and the canvas element for WebGL rendering, along with UI controls.
*   **CSS3:** Styles the HTML elements and layout for the control panel and scene.
*   **JavaScript:** Implements the application logic, handles user input, manages scene state, and communicates with the GPU via WebGL.
*   **GLSL (OpenGL Shading Language):** Used for writing vertex and fragment shaders to define how 3D models are transformed, lit, and colored.
*   **`cuon-matrix.js`, `cuon-utils.js`, `webgl-debug.js`, `webgl-utils.js`:** Helper libraries commonly used in WebGL tutorials and projects for matrix operations, utility functions, debugging, and context setup.

### Key Components:

#### `Lighting.js`

This is the core file that orchestrates the WebGL application. It contains the vertex and fragment shader source code, sets up the WebGL context, connects JavaScript variables to GLSL uniforms and attributes, handles user input events (keyboard and mouse), initializes textures, manages the main render loop (`tick` function), updates animations, and renders all the objects in the scene.

**Shader Source (GLSL):**
Defines how vertices are transformed and how pixels are colored, including lighting calculations and texture mapping.

```glsl
// Snippet from Fragment Shader (FSHADER_SOURCE)
void main() {
    // ... texture handling ...

    vec3 lightVector = u_lightPos - vec3(v_VertPos);
    vec3 L = normalize(lightVector);
    vec3 N = normalize(v_Normal);
    float nDotL = max(dot(L, N), 0.0);

    vec3 R = reflect(-L, N);
    vec3 E = normalize(u_cameraPos - vec3(v_VertPos));
    float specular = pow(max(dot(E, R), 0.0), 64.0) * 0.8;

    vec3 diffuse = u_lightColor * vec3(gl_FragColor) * nDotL * 0.7;
    vec3 ambient = vec3(gl_FragColor) * 0.2;

    if (u_lightOn) {
      // Spotlight calculation
      vec3 spotlightDir = normalize(u_spotlightDir);
      float cosAngle = dot(-L, spotlightDir);
      float cutoff = cos(radians(u_spotlightCutoff));
      float spotlightEffect = 0.0;

      if (cosAngle > cutoff) {
        spotlightEffect = pow(cosAngle, 32.0); // Soft edge
      }

      // Apply lighting and spotlight effect
      if (u_whichTexture == 0) {
        gl_FragColor = vec4((specular + diffuse + ambient) * spotlightEffect, 1.0);
      }
      else {
        gl_FragColor = vec4((diffuse + ambient) * spotlightEffect, 1.0); // Note: Diffuse+Ambient also affected by spotlight
      }
    }
    // ... else (light off) ...
}
```

**Main Loop and Rendering:**
The `tick()` function is called repeatedly to update animations and redraw the scene using `renderAllShapes()`.

```javascript
// Snippet from Lighting.js
function tick() {
  g_seconds = performance.now() / 1000.0 + g_startTime;
  updateAnimationAngles(); // Animate light position
  renderAllShapes();       // Draw the scene
  requestAnimationFrame(tick);
}

function renderAllShapes() {
  // ... clear canvas, set uniforms ...
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_cameraPos, g_camera.eye.x, g_camera.eye.y, g_camera.eye.z);
  gl.uniform1i(u_lightOn, g_lightOn);
  gl.uniform3f(u_lightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  gl.uniform3f(u_spotlightDir, g_spotlightDir[0], g_spotlightDir[1], g_spotlightDir[2]);
  gl.uniform1f(u_spotlightCutoff, g_spotlightCutoff);
  // ... render objects (light, floor, sky, cube, sphere) ...
  light.render();
  floor.render();
  sky.render();
  cube.render();
  sphere.render();
  // ... update performance stats ...
}
```

**Light Animation:**
The `updateAnimationAngles()` function controls the animated movement of the light source within the cube's bounds.

```javascript
// Snippet from Lighting.js
function updateAnimationAngles() {
  // Animate X from -2 to 5 within cube bounds
  const minX = -2;
  const maxX = 5;
  const t = (Math.sin(g_seconds) + 1) / 2; // t goes from 0 to 1
  g_lightPos[0] = minX + (maxX - minX) * t;
  g_lightPos[1] = 5; // Fixed Y position
  g_lightPos[2] = 5; // Fixed Z position
}
```

#### `Camera.js`

(Assuming a standard Camera class structure based on usage in `Lighting.js`)
Handles the virtual camera's position, orientation, and the generation of view and projection matrices required for rendering the scene from the camera's perspective. Includes methods for moving forward/backward, strafing left/right, and panning/rotating.

```javascript
// Snippet (Illustrative - exact methods may vary)
class Camera {
    constructor(canvasWidth, canvasHeight) {
        this.eye = new Vector3([0, 0, 0]); // Camera position
        this.at = new Vector3([0, 0, -1]); // Look-at point
        this.up = new Vector3([0, 1, 0]);  // Up direction
        this.viewMatrix = new Matrix4();
        this.projectionMatrix = new Matrix4();
        this.fov = 60;
        this.aspect = canvasWidth / canvasHeight;
        this.near = 0.1;
        this.far = 1000;

        this.updateViewMatrix();
        this.updateProjectionMatrix();
    }

    updateViewMatrix() {
        this.viewMatrix.setLookAt(
            this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
            this.at.elements[0], this.at.elements[1], this.at.elements[2],
            this.up.elements[0], this.up.elements[1], this.up.elements[2]
        );
    }

    updateProjectionMatrix() {
         this.projectionMatrix.setPerspective(this.fov, this.aspect, this.near, this.far);
    }

    // ... movement and rotation methods ...
}
```

#### `Cube.js`, `Sphere.js`, `Floor.js`, `Triangle.js`

These files define the geometry (vertices, UVs, normals) and rendering logic for individual shapes. Each shape class likely contains a `render()` method responsible for setting up vertex buffer objects (VBOs), passing attribute data to the shaders, applying model transformations, and issuing draw calls. `Floor.js` is likely a variation of `Cube.js` with specific scaling and texturing.

```javascript
// Snippet (Illustrative - structure within each shape file)
class Cube {
    constructor() {
        this.type = 'cube';
        this.vertices = new Float32Array([...]); // Vertex positions
        this.uvs = new Float32Array([...]);      // Texture coordinates
        this.normals = new Float32Array([...]);  // Normal vectors
        this.matrix = new Matrix4();           // Model matrix for transformations
        this.textureNum = -2;                  // Texture/color mode
        this.color = [1.0, 1.0, 1.0, 1.0];       // Base color
    }

    render() {
        // ... bind buffer, set attributes ...
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        // Calculate and pass Normal Matrix for correct lighting with scaling/rotation
        var normalMatrix = new Matrix4().setInverseOf(this.matrix).transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
        gl.uniform1i(u_whichTexture, this.textureNum);
        // ... draw arrays ...
    }
}
```

## Future Improvements

Potential areas for future development include:

*   Implementing more advanced lighting models (e.g., Phong, Blinn-Phong).
*   Adding more complex geometries and models, potentially through OBJ loading (extra credit).
*   Integrating shadows and other advanced rendering techniques.
*   Creating a more complex and detailed 3D world or scene.

## 🏆 Credits & Acknowledgments

- Developed independently as part of CSE 160: Introduction to Computer Graphics
- Built on WebGL utility libraries (cuon-matrix.js, cuon-utils.js, webgl-utils.js, webgl-debug.js)
- Special thanks to the course instructors for their guidance and feedback

---

© Rahamat Zaman - UC Santa Cruz