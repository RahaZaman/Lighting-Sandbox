class Cube {

    constructor() {
        this.type = "cube";
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.textureNum = -2; // Default to using color
    }

    render() {
        var rgba = this.color;

        // Set texture or color mode
        gl.uniform1i(u_whichTexture, this.textureNum);
        
        // Set base color
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        
        // Pass the model matrix to shader
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        // Front face (normal pointing towards +z)
        drawTriangle3DUVNormal([0,0,0, 1,1,0, 1,0,0], [0,0, 1,1, 1,0], [0,0,1, 0,0,1, 0,0,1]);
        drawTriangle3DUVNormal([0,0,0, 0,1,0, 1,1,0], [0,0, 0,1, 1,1], [0,0,1, 0,0,1, 0,0,1]);

        // Back face (normal pointing towards -z)
        drawTriangle3DUVNormal([0,0,1, 1,1,1, 1,0,1], [1,0, 0,1, 0,0], [0,0,-1, 0,0,-1, 0,0,-1]);
        drawTriangle3DUVNormal([0,0,1, 0,1,1, 1,1,1], [1,0, 1,1, 0,1], [0,0,-1, 0,0,-1, 0,0,-1]);

        // Top face (normal pointing towards +y)
        drawTriangle3DUVNormal([0,1,0, 0,1,1, 1,1,1], [0,0, 0,1, 1,1], [0,1,0, 0,1,0, 0,1,0]);
        drawTriangle3DUVNormal([0,1,0, 1,1,1, 1,1,0], [0,0, 1,1, 1,0], [0,1,0, 0,1,0, 0,1,0]);

        // Bottom face (normal pointing towards -y)
        drawTriangle3DUVNormal([0,0,0, 0,0,1, 1,0,1], [0,0, 0,1, 1,1], [0,-1,0, 0,-1,0, 0,-1,0]);
        drawTriangle3DUVNormal([0,0,0, 1,0,1, 1,0,0], [0,0, 1,1, 1,0], [0,-1,0, 0,-1,0, 0,-1,0]);

        // Right face (normal pointing towards +x)
        drawTriangle3DUVNormal([1,0,0, 1,1,0, 1,1,1], [0,0, 0,1, 1,1], [1,0,0, 1,0,0, 1,0,0]);
        drawTriangle3DUVNormal([1,0,0, 1,1,1, 1,0,1], [0,0, 1,1, 1,0], [1,0,0, 1,0,0, 1,0,0]);

        // Left face (normal pointing towards -x)
        drawTriangle3DUVNormal([0,0,0, 0,1,0, 0,1,1], [1,0, 1,1, 0,1], [-1,0,0, -1,0,0, -1,0,0]);
        drawTriangle3DUVNormal([0,0,0, 0,1,1, 0,0,1], [1,0, 0,1, 0,0], [-1,0,0, -1,0,0, -1,0,0]);
    }
}

class Floor extends Cube {
    constructor() {
        super();
        this.textureNum = 0; // Default to grass texture
        this.textureRepeat = 20; // How many times to repeat the texture
    }

    render() {
        var rgba = this.color;

        // Set texture or color mode
        gl.uniform1i(u_whichTexture, this.textureNum);
        
        // Set base color - set to white to show true texture colors
        gl.uniform4f(u_FragColor, 1.0, 1.0, 1.0, 1.0);
        
        // Pass the model matrix to shader
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        const repeat = this.textureRepeat;
        
        // Only render the top face with repeated texture
        // Top face (which will be the floor)
        
        // First triangle
        drawTriangle3DUV(
            [0,1,0, 0,1,1, 1,1,1], 
            [0,0, 0,repeat, repeat,repeat]
        );
        
        // Second triangle
        drawTriangle3DUV(
            [0,1,0, 1,1,1, 1,1,0], 
            [0,0, repeat,repeat, repeat,0]
        );
    }
}

function drawCube() {
    let vertices = new Float32Array([
      // Front face
      -0.5, -0.5,  0.5,
       0.5, -0.5,  0.5,
       0.5,  0.5,  0.5,
      -0.5,  0.5,  0.5,
      // Back face
      -0.5, -0.5, -0.5,
       0.5, -0.5, -0.5,
       0.5,  0.5, -0.5,
      -0.5,  0.5, -0.5,
    ]);
  
    let indices = new Uint8Array([
      0,1,2,   0,2,3,    // front
      1,5,6,   1,6,2,    // right
      5,4,7,   5,7,6,    // back
      4,0,3,   4,3,7,    // left
      3,2,6,   3,6,7,    // top
      4,5,1,   4,1,0     // bottom
    ]);
  
    // Create a buffer object
    var vertexBuffer = gl.createBuffer();
    var indexBuffer = gl.createBuffer();
    if (!vertexBuffer || !indexBuffer) {
      console.log('Failed to create buffers');
      return -1;
    }
  
    // Write vertex coordinates to buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  
    // Assign buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  
    // Enable assignment
    gl.enableVertexAttribArray(a_Position);
  
    // Write indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  
    // Draw cube
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
}