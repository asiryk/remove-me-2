'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let N = 20;                     // splines count
let lightPositionEl;
let stereoCamera;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.count = 0;

    this.BufferData = function(vertices, texcoords) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        // vertices
        const vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);

        this.count = vertices.length/3;
        // texcoords
        const tBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STREAM_DRAW);
        gl.enableVertexAttribArray(shProgram.iAttribTexcoord);
        gl.vertexAttribPointer(shProgram.iAttribTexcoord, 2, gl.FLOAT, false, 0, 0);

        this.count = vertices.length / 3;
        this.vertices = vertices;
    }

    this.Draw = function() {
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.iTextureAxis = -1;
    this.ITextureRotAngleDeg = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}

function leftFrustum(stereoCamera) {
    const { eyeSeparation, convergence, aspectRatio, fov, near, far } = stereoCamera;
    const top = near * Math.tan(fov / 2);
    const bottom = -top;

    const a = aspectRatio * Math.tan(fov / 2) * convergence;
    const b = a - eyeSeparation / 2;
    const c = a + eyeSeparation / 2;

    const left = -b * near / convergence;
    const right = c * near / convergence;

    return m4.frustum(left, right, bottom, top, near, far);
}

function rightFrustum(stereoCamera) {
    const { eyeSeparation, convergence, aspectRatio, fov, near, far } = stereoCamera;
    const top = near * Math.tan(fov / 2);
    const bottom = -top;

    const a = aspectRatio * Math.tan(fov / 2) * convergence;
    const b = a - eyeSeparation / 2;
    const c = a + eyeSeparation / 2;

    const left = -c * near / convergence;
    const right = b * near / convergence;
    return m4.frustum(left, right, bottom, top, near, far);
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */

function drawLeft() {
    /* Set the values of the projection transformation */
    let projection = leftFrustum(stereoCamera);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );

    const modelviewInv = m4.inverse(matAccum1, new Float32Array(16));
    const normalMatrix = m4.transpose(modelviewInv, new Float32Array(16));
        
    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1 );

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );

    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    surface.Draw();

}

function drawRight() {
    /* Set the values of the projection transformation */
    let projection = rightFrustum(stereoCamera);
    
    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );

    const modelviewInv = m4.inverse(matAccum1, new Float32Array(16));
    const normalMatrix = m4.transpose(modelviewInv, new Float32Array(16));
        
    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1 );

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );

    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    surface.Draw();
}

function draw() { 
    gl.clearColor(0,0,0,1);
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.colorMask(true, false, false, true);
    drawLeft();
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.colorMask(false, true, true, true);
    drawRight();
}

function CreateSurfaceData()
{
    let vertices = [];
    let texcoords = [];
    let a = 0.5;
    let b = 1;

    let vStep = 360/(N-1);
    let uStep = 180/(N-1);

    const calculateUv = (u, v) => {
        return [u / 180, v/360];
    }

    for (let u=0; u<=180; u+=uStep) {
        for (let v=0; v<=360; v+=vStep) {
            vertices.push(
                a*(b - Math.cos(deg2rad(u)))*Math.sin(deg2rad(u))*Math.cos(deg2rad(v)),
                a*(b - Math.cos(deg2rad(u)))*Math.sin(deg2rad(u))*Math.sin(deg2rad(v)),
                Math.cos(deg2rad(u))
            );
            
            texcoords.push(...calculateUv(u,v));

            vertices.push(
                a*(b - Math.cos(deg2rad(u+uStep)))*Math.sin(deg2rad(u+uStep))*Math.cos(deg2rad(v+vStep)),
                a*(b - Math.cos(deg2rad(u+uStep)))*Math.sin(deg2rad(u+uStep))*Math.sin(deg2rad(v+vStep)),
                Math.cos(deg2rad(u+uStep))
            );

            texcoords.push(...calculateUv(u,v));
        }
    }

    return {vertices, texcoords};
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex            = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribTexcoord          = gl.getAttribLocation(prog, "texcoord");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iLightPosition           = gl.getUniformLocation(prog, "lightPosition");
    shProgram.iNormalMatrix            = gl.getUniformLocation(prog, "normalMatrix");
    shProgram.iTexScale                = gl.getUniformLocation(prog, "texScale");
    shProgram.iTexCenter               = gl.getUniformLocation(prog, 'texCenter');
    shProgram.iTextureAxis             = gl.getUniformLocation(prog, 'textureAxis');
    shProgram.ITextureRotAngleDeg      = gl.getUniformLocation(prog, 'textureRotAngleDeg');



    surface = new Model('Surface');
    const {vertices, texcoords} = CreateSurfaceData();
    surface.BufferData(vertices, texcoords);

    const ap = gl.canvas.width / gl.canvas.height;

    stereoCamera = {
        eyeSeparation: 0.01,
        convergence: 1,
        aspectRatio: ap,
        fov: deg2rad(15),
        near: 0.0001,
        far: 20,
    };

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    lightPositionEl = document.getElementById('lightPostion');

    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        console.error(e);
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        console.error(e);
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    const videoElement = document.querySelector('video');

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            videoElement.srcObject = stream;
            videoElement.play();
        })
        .catch(error => {
            console.error('Error accessing user media', error);
        });

    spaceball = new TrackballRotator(canvas, draw, 0);

    const xInput = document.getElementById("x");
    const yInput = document.getElementById("y");
    const zInput = document.getElementById("z");

    const scaleUInput = document.getElementById("scaleU");
    const scaleVInput = document.getElementById("scaleV");

    const centerUInput = document.getElementById("centerU");
    const centerVInput = document.getElementById("centerV");

    const axisUInput = document.getElementById("axisU");
    const axisVInput = document.getElementById("axisV");

    const angleInput = document.getElementById("angle");

    const eyeSeparationInput = document.getElementById("eyeSeparation");
    const convergenceInput = document.getElementById("convergence");
    const fovIntput = document.getElementById("fov");

    const updateLight = () => {
        const x = parseFloat(xInput.value);
        const y = parseFloat(yInput.value);
        const z = parseFloat(zInput.value);

        gl.uniform3fv(shProgram.iLightPosition, [x, y, z]);
        draw();
    };

    gl.uniform2fv(shProgram.iTexScale, [1, 1]);
    gl.uniform2fv(shProgram.iTexCenter, [0, 0]);
    
    gl.uniform2fv(shProgram.iTexScale, [1, 1]);
    gl.uniform2fv(shProgram.iTexCenter, [0, 0]);

    gl.uniform2fv(shProgram.iTextureAxis, [0, 0]);
    gl.uniform1f(shProgram.ITextureRotAngleDeg, 0);

    const reScale = () => {
        const scaleU = parseFloat(scaleUInput.value);
        const scaleV = parseFloat(scaleVInput.value);
        gl.uniform2fv(shProgram.iTexScale, [scaleU, scaleV]);
        draw();
    };
    const center = () => {
        const centerU = parseFloat(centerUInput.value);
        const centerV = parseFloat(centerVInput.value);
        gl.uniform2fv(shProgram.iTexCenter, [centerU, centerV]);
        draw();
    };
    const axis = () => {
        const axisU = parseFloat(axisUInput.value);
        const axisV = parseFloat(axisVInput.value);
        gl.uniform2fv(shProgram.iTextureAxis, [axisU, axisV]);
        draw();
    };
    const angle = () => {
        const angle = parseFloat(angleInput.value);
        gl.uniform1f(shProgram.ITextureRotAngleDeg, angle);
        draw();
    };
    const stereoCam = () => {
        stereoCamera.eyeSeparation = parseFloat(eyeSeparationInput.value);
        stereoCamera.convergence = parseFloat(convergenceInput.value);
        stereoCamera.fov = deg2rad(parseFloat(fovIntput.value));
        draw();
    } 


    xInput.addEventListener("input", updateLight);
    yInput.addEventListener("input", updateLight);
    zInput.addEventListener("input", updateLight);
    
    scaleUInput.addEventListener("input", reScale);
    scaleVInput.addEventListener("input", reScale);

    centerUInput.addEventListener("input", center);
    centerVInput.addEventListener("input", center);

    axisUInput.addEventListener("input", axis);
    axisVInput.addEventListener("input", axis);

    angleInput.addEventListener("input", angle);

    eyeSeparationInput.addEventListener("input", stereoCam);
    convergenceInput.addEventListener("input", stereoCam);
    fovIntput.addEventListener("input", stereoCam);
    
    const image = new Image();
    image.src = "https://www.the3rdsequence.com/texturedb/download/23/texture/jpg/1024/sea+water-1024x1024.jpg";
    image.crossOrigin = "anonymous";
    image.onload = () => {
        setTexture(gl, image);
        draw();
    }

    draw();
}

function setTexture(gl, image) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
}
