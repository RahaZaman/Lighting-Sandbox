// Vertex shader program
var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_VertPos;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;

  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    // v_Normal = a_Normal;
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 1.0)));
    v_VertPos = u_ModelMatrix * a_Position;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform int u_whichTexture;
  uniform vec3 u_lightPos;
  uniform vec3 u_cameraPos;
  uniform vec3 u_lightColor;
  uniform vec3 u_spotlightDir;
  uniform float u_spotlightCutoff;
  varying vec4 v_VertPos;
  uniform bool u_lightOn;

  void main() {
    if (u_whichTexture == -3) { 
      gl_FragColor = vec4((v_Normal + 1.0) / 2.0, 1.0);           // Use normal debug color
    } 
    else if (u_whichTexture == -2) {
      gl_FragColor = u_FragColor;                    // Use color
    } 
    else if (u_whichTexture == -1) {
      gl_FragColor = vec4(v_UV, 1.0, 1.0);           // Use UV debug color
    }
    else if (u_whichTexture == 0) {
      gl_FragColor = texture2D(u_Sampler0, v_UV);   // Use texture0
    }
    else if (u_whichTexture == 1) {
      gl_FragColor = texture2D(u_Sampler1, v_UV);   // Use texture1
    }
    else {
      gl_FragColor = vec4(1,.2,.2,1);               // Error, use Redish
    }

    vec3 lightVector = u_lightPos - vec3(v_VertPos);
    float r = length(lightVector);

    // N dot L
    vec3 L = normalize(lightVector);
    vec3 N = normalize(v_Normal);
    float nDotL = max(dot(L, N), 0.0);

    // Reflection vector
    vec3 R = reflect(-L, N);

    // eye 
    vec3 E = normalize(u_cameraPos - vec3(v_VertPos));

    // Specular
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
      
      if (u_whichTexture == 0) {
        gl_FragColor = vec4((specular + diffuse + ambient) * spotlightEffect, 1.0);
      }
      else {
        gl_FragColor = vec4(diffuse + ambient, 1.0);
      }
    }
  }`

// Global variables
let canvas;
let gl; 
let a_Position;
let a_UV;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_NormalMatrix;
let u_ProjectionMatrix;
let u_ViewMatrix;
let u_GlobalRotateMatrix;
let u_lightPos;
let u_cameraPos;
let u_lightOn;
let u_lightColor;
let u_spotlightDir;
let u_spotlightCutoff;

// Mouse and camera
var g_lastMouseX = -1;
var g_isMouseDown = false;

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of a_UV
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
    return;
  }

  // Get the storage location of a_Normal
  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_lightPos
  u_lightPos = gl.getUniformLocation(gl.program, 'u_lightPos');
  if (!u_lightPos) {
    console.log('Failed to get the storage location of u_lightPos');
    return;
  }

  // Get the storage location of u_cameraPos
  u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
  if (!u_cameraPos) {
    console.log('Failed to get the storage location of u_cameraPos');
    return;
  }

  // Get the storage location of u_lightOn
  u_lightOn = gl.getUniformLocation(gl.program, 'u_lightOn');
  if (!u_lightOn) {
    console.log('Failed to get the storage location of u_lightOn');
    return;
  }

  // Get the storage location of u_ModelMatrix
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return; 
  }

  // Get the storage location of u_NormalMatrix
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_NormalMatrix) {
    console.log('Failed to get the storage location of u_NormalMatrix');
    return;
  }

  // Get the storage location of u_GlobalRotateMatrix
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return; 
  }

  // Get the storage location of u_ViewMatrix
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return; 
  }

  // Get the storage location of u_ProjectionMatrix
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if (!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return; 
  }

  // Get the storage location of u_Sampler0
  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler0) {
    console.log('Failed to get the storage location of u_Sampler0');
    return;
  }

  // Get the storage location of u_Sampler1
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  if (!u_Sampler1) {
    console.log('Failed to get the storage location of u_Sampler1');
    return;
  }

  // Get the storage location of u_whichTexture
  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  if (!u_whichTexture) {
    console.log('Failed to get the storage location of u_whichTexture');
    return;
  }

  // Get the storage location of u_lightColor
  u_lightColor = gl.getUniformLocation(gl.program, 'u_lightColor');
  if (!u_lightColor) {
    console.log('Failed to get the storage location of u_lightColor');
    return;
  }

  // Get the storage location of u_spotlightDir
  u_spotlightDir = gl.getUniformLocation(gl.program, 'u_spotlightDir');
  if (!u_spotlightDir) {
    console.log('Failed to get the storage location of u_spotlightDir');
    return;
  }

  // Get the storage location of u_spotlightCutoff
  u_spotlightCutoff = gl.getUniformLocation(gl.program, 'u_spotlightCutoff');
  if (!u_spotlightCutoff) {
    console.log('Failed to get the storage location of u_spotlightCutoff');
    return;
  }

  // Set an initial value for this matrix to identity 
  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

// global related UI elements
let g_selectedColor = [1.0, 1.0, 1.0, 1.0]; 
let g_selectedSize = 5;
let g_globalAngle = 0;
let g_normalOn = false;
// holds light position and color
let g_lightPos = [0, 1, -2];
let g_lightColor = [1.0, 1.0, 0.9];
let g_lightOn = false;
let g_spotlightDir = [0, -1, 0]; // spotlight direction (pointing down)
let g_spotlightCutoff = 0.0; // cutoff angle

// map or world creation
var g_map = [];

// Set up actions for HTML UI elements
function addActionsForHTMLUI() {

  // Register keyboard and mouse event handlers
  document.onkeydown = keydown;
  canvas.onmousedown = function(ev) {
    mousedown(ev);
    // Focus the canvas when clicked
    canvas.focus();
  };
  document.onmouseup = mouseup;
  document.onmousemove = mousemove;

  // Normalization on and off buttons
  document.getElementById('normalOn').onclick = function() {g_normalOn = true};
  document.getElementById('normalOff').onclick = function() {g_normalOn = false};

  // Light on and off buttons
  document.getElementById('lightOn').onclick = function() {g_lightOn = true};
  document.getElementById('lightOff').onclick = function() {g_lightOn = false};

  // Sliders for light position
  document.getElementById('lightSlideX').addEventListener('mousemove', function(ev) {if(ev.buttons === 1) {g_lightPos[0] = this.value / 100; renderAllShapes();}});
  document.getElementById('lightSlideY').addEventListener('mousemove', function(ev) {if(ev.buttons === 1) {g_lightPos[1] = this.value / 100; renderAllShapes();}});
  document.getElementById('lightSlideZ').addEventListener('mousemove', function(ev) {if(ev.buttons === 1) {g_lightPos[2] = this.value / 100; renderAllShapes();}});

  // Light color sliders
  document.getElementById('lightColorR').addEventListener('mousemove', function(ev) {if(ev.buttons === 1) {g_lightColor[0] = this.value / 100; renderAllShapes();}});
  document.getElementById('lightColorG').addEventListener('mousemove', function(ev) {if(ev.buttons === 1) {g_lightColor[1] = this.value / 100; renderAllShapes();}});
  document.getElementById('lightColorB').addEventListener('mousemove', function(ev) {if(ev.buttons === 1) {g_lightColor[2] = this.value / 100; renderAllShapes();}});

  // Spotlight direction sliders
  document.getElementById('spotlightDirX').addEventListener('mousemove', function(ev) {if(ev.buttons === 1) {g_spotlightDir[0] = this.value / 100; renderAllShapes();}});
  document.getElementById('spotlightDirY').addEventListener('mousemove', function(ev) {if(ev.buttons === 1) {g_spotlightDir[1] = this.value / 100; renderAllShapes();}});
  document.getElementById('spotlightDirZ').addEventListener('mousemove', function(ev) {if(ev.buttons === 1) {g_spotlightDir[2] = this.value / 100; renderAllShapes();}});

  // Spotlight cutoff slider
  document.getElementById('spotlightCutoff').addEventListener('mousemove', function(ev) {if(ev.buttons === 1) {g_spotlightCutoff = this.value; renderAllShapes();}});
}

function initTextures() {

  // Grass texture
  let grassImage = new Image();
  if (!grassImage) {
    console.log('Failed to create the grass image object');
    return false;
  }
  grassImage.onload = function () {
    sendTextureToTEXTURE0(grassImage);
  };
  grassImage.src = 'img/grass.jpg';

  // Dirt texture
  let dirtImage = new Image();
  if (!dirtImage) {
    console.log('Failed to create the dirt image object');
    return false;
  }
  dirtImage.onload = function () {
    sendTextureToTEXTURE1(dirtImage);
  };
  dirtImage.src = 'img/dirt.jpg';

  // Add more textures loading
  return true;
}

function sendTextureToTEXTURE0(image) {
  var texture = gl.createTexture();   // Create a texture object
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis
  // Enable texture unit0
  gl.activeTexture(gl.TEXTURE0);
  // Bind the texture object to the target
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the texture parameters for better rendering
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  
  // Set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  // Set the texture unit 0 to the sampler
  gl.uniform1i(u_Sampler0, 0);

  console.log('Grass texture loaded successfully');
}

function sendTextureToTEXTURE1(image) {
  var texture = gl.createTexture();   // Create a texture object
  if (!texture) {
    console.log('Failed to create the dirt texture object');
    return false;
  }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis
  // Enable texture unit1
  gl.activeTexture(gl.TEXTURE1);
  // Bind the texture object to the target
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the texture parameters for better rendering
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  
  // Set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  // Set the texture unit 1 to the sampler
  gl.uniform1i(u_Sampler1, 1);

  console.log('Dirt texture loaded successfully');
}

// handles mouse movement
function mousemove(ev) {
  if (g_isMouseDown) {
    // Only rotate if mouse button is pressed
    const x = ev.clientX;
    
    // calculate the movement from last mouse position
    if (g_lastMouseX !== -1) {
      const deltaX = x - g_lastMouseX;
      if (deltaX !== 0) {
        g_camera.rotateWithMouse(deltaX);
        renderAllShapes();
      }
    }
    
    // Save current position for next move event
    g_lastMouseX = x;
  }
}

// Add these functions to handle mouse press/release
function mousedown(ev) {
  g_isMouseDown = true;
  g_lastMouseX = ev.clientX;
}

function mouseup(ev) {
  g_isMouseDown = false;
  g_lastMouseX = -1;
}

// Update the main function to register these handlers
function main() {
  // Set up canvas and gl variables
  setupWebGL();

  // Set up GLSL shader programs and connect GLSL variables
  connectVariablesToGLSL();

  // Initialize camera with correct canvas dimensions
  g_camera = new Camera(canvas.width, canvas.height);
  console.log("Canvas dimensions:", canvas.width, "x", canvas.height);

  // Set up actions for HTML UI elements
  addActionsForHTMLUI();
  
  // Make canvas focusable for keyboard events
  canvas.tabIndex = 0;
  // Focus canvas by default
  canvas.focus();

  // Initialize textures
  initTextures();

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Initial render
  renderAllShapes();
  
  // Start the animation loop
  requestAnimationFrame(tick);
}

var g_startTime = performance.now() / 1000.0;
var g_seconds = performance.now() / 1000.0 + g_startTime;

// Called by browser repeatedly whenever its time
function tick() {
  // Prints some debugging information to console
  g_seconds = performance.now() / 1000.0 + g_startTime;
  // console.log(performance.now());

  // Update Animation Angles
  updateAnimationAngles();

  // Draw everything
  renderAllShapes();

  // Tell the browser to update again when it has time
  requestAnimationFrame(tick);
}

// Update the angles of everything if currently animated
function updateAnimationAngles() {

  // to make the light move in a circle or animate
  // Animate X from -2 to 5 (based on the cube position)
  const minX = -2;
  const maxX = 5;
  const t = (Math.sin(g_seconds) + 1) / 2; // t goes from 0 to 1
  g_lightPos[0] = minX + (maxX - minX) * t;
}

// performs the keyboard input
function keydown(ev) {
  console.log(`Key pressed: ${ev.key}, KeyCode: ${ev.keyCode}`);
  
  /* Camera Movement */
  if (ev.key === 'w' || ev.key === 'W' || ev.keyCode === 87) {
    console.log("Moving forward");
    g_camera.moveForward(0.5);  // Adjust speed as needed
  } 
  else if (ev.key === 's' || ev.key === 'S' || ev.keyCode === 83) {
    console.log("Moving backward");
    g_camera.moveBackward(0.5);  // Adjust speed as needed
  } 
  else if (ev.key === 'a' || ev.key === 'A' || ev.keyCode === 65) {
    console.log("Moving left");
    g_camera.moveLeft(0.5);  // Adjust speed as needed
  } 
  else if (ev.key === 'd' || ev.key === 'D' || ev.keyCode === 68) {
    console.log("Moving right");
    g_camera.moveRight(0.5);  // Adjust speed as needed
  } 
  
  /* Rotating Cameras */
  else if (ev.key === 'q' || ev.key === 'Q' || ev.keyCode === 81) {
    console.log("Panning left");
    g_camera.panLeft(5);  // Adjust angle as needed
  } 
  else if (ev.key === 'e' || ev.key === 'E' || ev.keyCode === 69) {
    console.log("Panning right");
    g_camera.panRight(5);  // Adjust angle as needed
  }
  
  // Log camera position after movement
  console.log("Camera eye:", g_camera.eye.toString());
  console.log("Camera at:", g_camera.at.toString());
  
  // Always re-render after a key press
  renderAllShapes();
  
  // Prevent default behavior for these keys (like scrolling)
  if (['w', 'W', 'a', 'A', 's', 'S', 'd', 'D', 'q', 'Q', 'e', 'E'].includes(ev.key)) {
    ev.preventDefault();
  }
}

// Draw every shape that is supposed to be in the canvas
function renderAllShapes() {
  // Check the time at the start of this function
  var startTime = performance.now();

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Update and pass camera matrices
  g_camera.updateViewMatrix();
  g_camera.updateProjectionMatrix(); // in case canvas resizes
  
  // Pass matrices to shaders
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);

  // Pass the global rotation matrix
  var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  // Pass the light position to GLSL
  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);

  // Pass the camera position to GLSL
  gl.uniform3f(u_cameraPos, g_camera.eye.x, g_camera.eye.y, g_camera.eye.z);

  // Pass the light on/off to GLSL
  gl.uniform1i(u_lightOn, g_lightOn);

  // Pass the light color to GLSL
  gl.uniform3f(u_lightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);

  // Pass the spotlight direction to GLSL
  gl.uniform3f(u_spotlightDir, g_spotlightDir[0], g_spotlightDir[1], g_spotlightDir[2]);

  // Pass the spotlight cutoff to GLSL
  gl.uniform1f(u_spotlightCutoff, g_spotlightCutoff);

  // Calculate normal matrix for proper normal transformation
  var normalMatrix = new Matrix4();
  normalMatrix.setInverseOf(globalRotMat).transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

  // Draw the light
  var light = new Cube();
  light.color = [2,2,0,1];
  light.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  light.matrix.scale(-0.2, -0.2, -0.2);
  light.matrix.translate(-.5, -.5, -.5);
  light.render();

  // Draw the floor
  var floor = new Floor();
  floor.textureNum = 0; // Use grass texture
  floor.textureRepeat = 40; 
  floor.matrix.translate(0, -0.75, 0.0);
  floor.matrix.scale(100, 0.1, 100);  
  floor.matrix.translate(-0.5, 0, -0.5);
  floor.render();

  // Draw the sky
  var sky = new Cube();
  sky.color = [0.6, 0.8, 1.0, 1.0];
  sky.matrix.scale(1000, 1000, 1000);
  sky.matrix.translate(-0.5, -0.5, -0.5);
  sky.render();

  // Draw cube
  var cube = new Cube();
  if (g_normalOn) {
    cube.textureNum = -3; // Use normal debug color
  } else {
    cube.textureNum = -2; // Use color
  }
  cube.color = [0.2, 0.8, 1.0, 1.0]; // Light blue for visibility
  cube.matrix.translate(5, 5, 5);    // Centered at origin
  cube.matrix.scale(-7, -7, -7);    
  cube.render();

  // Draw sphere
  var sphere = new Sphere();
  if (g_normalOn) {
    sphere.textureNum = -3; // Use normal debug color
  } else {
    sphere.textureNum = -2; // Use color
  }
  sphere.matrix.translate(1, 1, 1);    // Centered at origin
  sphere.matrix.scale(-1, -1, -1);        
  sphere.render();

  // Check the time at the end of the function, and show on web page
  var duration = performance.now() - startTime;
  sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(1000/duration), "numdot");
}

// Set the text of an HTML element
function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + "from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}
