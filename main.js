'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let lightPositionEl;
let stereoCamera;
let accelerometerView;

let sphereVertices, sphereUvs;
let vertices, uvs;

let audio = {};

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model() {

  
    this.BufferData = function () {
        const allVertices = vertices.concat(sphereVertices);
        const allUvs = uvs.concat(sphereUvs);
        const allBuffer = allVertices.concat(allUvs);

        // vertices
        const vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allBuffer), gl.STREAM_DRAW);

        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(shProgram.iTexCoord);
        gl.vertexAttribPointer(shProgram.iTexCoord, 2, gl.FLOAT, false, 0, allVertices * 4);
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

    // Normals
    this.iNormal = -1;
    this.iNormalMatrix = -1;

    this.iLightColor = -1;

    // Shininess
    this.iShininess = -1;

    // Light position
    this.iLightPos = -1;
    this.iLightVec = -1;

    this.Use = function () {
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

function drawLeft() {
    /* Set the values of the projection transformation */
    let projection = leftFrustum(stereoCamera);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );

    let modelViewInv = m4.inverse(matAccum1, new Float32Array(16));
    let normalMatrix = m4.transpose(modelViewInv, new Float32Array(16));

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    // const lightPos = Array.from(lightPositionEl.getElementsByTagName('input')).map(el => +el.value);
    // gl.uniform3fv(shProgram.iLightPos, lightPos);
    gl.uniform3fv(shProgram.iLightVec, new Float32Array(3));

    gl.uniform1f(shProgram.iShininess, 1.0);

    gl.uniform3fv(shProgram.iLightColor, [0, 1, 1]);

    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [0,1,1,1] );

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertices.length / 3);

    if (accelerometerView) {
      matAccum1 = m4.multiply(matAccum1, accelerometerView);
    }

    modelViewInv = m4.inverse(matAccum1, new Float32Array(16));
    normalMatrix = m4.transpose(modelViewInv, new Float32Array(16));
    modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    gl.drawArrays(gl.TRIANGLE_STRIP, vertices.length / 3, sphereVertices.length / 3);
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

    let modelViewInv = m4.inverse(matAccum1, new Float32Array(16));
    let normalMatrix = m4.transpose(modelViewInv, new Float32Array(16));

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    // const lightPos = Array.from(lightPositionEl.getElementsByTagName('input')).map(el => +el.value);
    // gl.uniform3fv(shProgram.iLightPos, lightPos);
    gl.uniform3fv(shProgram.iLightVec, new Float32Array(3));

    gl.uniform1f(shProgram.iShininess, 1.0);

    gl.uniform3fv(shProgram.iLightColor, [0, 1, 1]);

    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [0,1,1,1] );

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertices.length / 3);

    if (accelerometerView) {
      matAccum1 = m4.multiply(matAccum1, accelerometerView);
    }

    modelViewInv = m4.inverse(matAccum1, new Float32Array(16));
    normalMatrix = m4.transpose(modelViewInv, new Float32Array(16));
    modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    gl.drawArrays(gl.TRIANGLE_STRIP, vertices.length / 3, sphereVertices.length / 3);
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0,0,0,1);
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.colorMask(false, true, true, true);
    drawRight();
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.colorMask(true, false, false, true);
    drawLeft();
}

function CreateSurfaceData() {
    let vertices = [];
    let uvs = [];

    const l = 1;
    const r1 = 0.5;
    const r2 = 4;

    function normUv(b, z) {
        return [b / 360, z / (2 * l)];
    }

    function r(a) {
        a = deg2rad(a);
        return (r2 - r1) * Math.pow(Math.sin((Math.PI * a) / (4 * l)), 2) * 100 + r1;
    }

    for (let b = 0; b <= 360; b += 1) {
        for (let a = 0; a <= 2 * l; a += 0.1) {
            const x = r(a) * Math.cos(deg2rad(b));
            const y = r(a) * Math.sin(deg2rad(b));
            const z = a;
            vertices.push(x, y, z);
            uvs.push(...normUv(b, a));

            const a1 = a + 0.2;
            const b1 = b + 5;
            const x1 = r(a1) * Math.cos(deg2rad(b1));
            const y1 = r(a1) * Math.sin(deg2rad(b1));
            const z1 = a1;
            vertices.push(x1, y1, z1);
            uvs.push(...normUv(b1, a1));
        }

        for (let a = 2*l; a > 0; a -= 0.1) {
            const x = r(a) * Math.cos(deg2rad(b));
            const y = r(a) * Math.sin(deg2rad(b));
            const z = a;
            vertices.push(x, y, z);
            uvs.push(...normUv(b, a));

            const a1 = a + 0.2;
            const b1 = b + 5;
            const x1 = r(a1) * Math.cos(deg2rad(b1));
            const y1 = r(a1) * Math.sin(deg2rad(b1));
            const z1 = a1;
            vertices.push(x1, y1, z1);
            uvs.push(...normUv(b1, a1));
        }
    }

    return {vertices, uvs};
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iTexCoord                  = gl.getAttribLocation(prog, "texcoord");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iNormal = gl.getAttribLocation(prog, 'normal');
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, 'normalMat');
    shProgram.iLightColor = gl.getUniformLocation(prog, 'lightColor');
    shProgram.iShininess = gl.getUniformLocation(prog, 'shininess');
    shProgram.iLightPos = gl.getUniformLocation(prog, 'lightPosition');
    shProgram.iLightVec = gl.getUniformLocation(prog, 'lightVec');
    shProgram.iTexScale = gl.getUniformLocation(prog, 'texScale');
    shProgram.iTexCenter = gl.getUniformLocation(prog, 'texCenter');

    surface = new Model('Surface');
    const data =  CreateSurfaceData();
    const sData = createSphereData();
    vertices = data.vertices;
    uvs = data.uvs;
    sphereVertices = sData.sphereVertices;
    sphereUvs = sData.sphereUvs;

    surface.BufferData();

    const ap = gl.canvas.width / gl.canvas.height;

    stereoCamera = {
        eyeSeparation: 0.004,
        convergence: 1,
        aspectRatio: ap,
        fov: deg2rad(25),
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
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    lightPositionEl = document.getElementById('lightSettings');

    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    // const videoElement = document.querySelector('video');
    //
    // navigator.mediaDevices.getUserMedia({ video: true })
    //     .then(stream => {
    //         videoElement.srcObject = stream;
    //         videoElement.play();
    //     })
    //     .catch(error => {
    //         console.error('Error accessing user media', error);
    //     });

    spaceball = new TrackballRotator(canvas, draw, 0);

    gl.uniform2fv(shProgram.iTexScale, [1, 1]);
    gl.uniform2fv(shProgram.iTexCenter, [0, 0]);
    const scaleUInput = document.getElementById("scaleU");
    const scaleVInput = document.getElementById("scaleV");
    const centerUInput = document.getElementById("centerU");
    const centerVInput = document.getElementById("centerV");
    const eyeSeparationInput = document.getElementById("eyeSeparation");
    const convergenceInput = document.getElementById("convergence");
    const fovIntput = document.getElementById("fov");
    const nearInput = document.getElementById("near");

    function setSpanValue (id, value) {
        document.getElementById('scale_value_'+id).innerHTML = value;
    }
    const scale = () => {
        const scaleU = parseFloat(scaleUInput.value);
        const scaleV = parseFloat(scaleVInput.value);

        setSpanValue("V", scaleV)
        setSpanValue("U", scaleU)
        gl.uniform2fv(shProgram.iTexScale, [scaleU, scaleV]);
        draw();
    };
    const center = () => {
        const centerU = parseFloat(centerUInput.value);
        const centerV = parseFloat(centerVInput.value);
        gl.uniform2fv(shProgram.iTexCenter, [centerU, centerV]);
        draw();
    };
    const stereoCam = () => {
        stereoCamera.eyeSeparation = parseFloat(eyeSeparationInput.value);
        stereoCamera.convergence = parseFloat(convergenceInput.value);
        stereoCamera.fov = deg2rad(parseFloat(fovIntput.value));
        stereoCamera.near = parseFloat(nearInput.value);
        draw();
    }
    scaleUInput.addEventListener("input", scale);
    scaleVInput.addEventListener("input", scale);
    centerUInput.addEventListener("input", center);
    centerVInput.addEventListener("input", center);
    eyeSeparationInput.addEventListener("input", stereoCam);
    convergenceInput.addEventListener("input", stereoCam);
    fovIntput.addEventListener("input", stereoCam);
    nearInput.addEventListener("input", stereoCam);

  
    const teximage = new Image();
    teximage.crossOrigin = "anonymous";
    teximage.src = "https://www.the3rdsequence.com/texturedb/download/236/texture/jpg/1024/rough+stone+rock-1024x1024.jpg";
    teximage.onload = () => {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, teximage);

        draw();
    }

    draw();

    if ("Accelerometer" in window) {
      const accelerometer = new Accelerometer({ frequency: 60 });
      accelerometer.addEventListener("reading", () => {
        const rotationX = Math.atan2(accelerometer.y, accelerometer.z);
        const rotationY = Math.atan2(accelerometer.x, accelerometer.z);
        const rotationZ = Math.atan2(accelerometer.y, accelerometer.x);
        const mX = m4.xRotation(rotationX);
        const mY = m4.yRotation(rotationY);
        const mZ = m4.zRotation(rotationZ);
        const acc = m4.multiply(mX, mY);
        accelerometerView = m4.multiply(acc, mZ);

        draw();
      });
      accelerometer.start();
    }

  initAudio();
  initCheckBox();

}

async function initAudio() {
  await new Promise(resolve => setTimeout(resolve, 3000));
  const audioContext = new AudioContext();
  const decodedAudioData = await fetch("/VR_KPI/music.mp3")
    .then(response => response.arrayBuffer())
    .then(audioData => audioContext.decodeAudioData(audioData));

  const source = audioContext.createBufferSource();
  source.buffer = decodedAudioData;
  source.connect(audioContext.destination);
  source.start();
  const panner = audioContext.createPanner();
  const volume = audioContext.createGain();
  volume.connect(panner);
  const highpass = audioContext.createBiquadFilter();
  highpass.type = "lowshelf";
  highpass.frequency.value = 500;

  audio.panner = panner;
  audio.context = audioContext;
  audio.filter = highpass;
  audio.source = source;
  source.connect(highpass);

  window.setAudioPosition = (x, y, z) => {
    panner.positionX.value = x;
    panner.positionY.value = y;
    panner.positionZ.value = z;
  }
}

function createSphereData() {
  const radius = 0.2;
  const horizontalPieces = 16;
  const verticalPieces = 16;
  const sphereVertices = [];
  const sphereUvs = [];

  for(let stackNumber = 0; stackNumber <= verticalPieces; stackNumber++) {
    const theta = stackNumber * Math.PI / verticalPieces;
    const nextTheta = (stackNumber + 1) * Math.PI / verticalPieces;

    for(let sliceNumber = 0; sliceNumber <= horizontalPieces; sliceNumber++) {
      const phi = sliceNumber * 2 * Math.PI / horizontalPieces;
      const nextPhi = (sliceNumber + 1) * 2 * Math.PI / horizontalPieces;
      const x1 = radius * Math.sin(theta) * Math.cos(phi);
      const y1 = radius * Math.cos(theta);
      const z1 = radius * Math.sin(theta) * Math.sin(phi);
      const u1 = sliceNumber / horizontalPieces;
      const v1 = stackNumber / verticalPieces;
      const x2 = radius * Math.sin(nextTheta) * Math.cos(nextPhi);
      const y2 = radius * Math.cos(nextTheta);
      const z2 = radius * Math.sin(nextTheta) * Math.sin(nextPhi);
      const u2 = (sliceNumber + 1) / horizontalPieces;
      const v2 = (stackNumber + 1) / verticalPieces;

      const offset = 1.4;
      sphereVertices.push(x1 + offset, y1, z1 + offset);
      sphereVertices.push(x2 + offset, y2, z2 + offset);
      sphereUvs.push(u1, v1);
      sphereUvs.push(u2, v2);
    }
  }

  return { sphereVertices, sphereUvs };
}

function initCheckBox() {
  const toggle = document.querySelector("#toggleFilter");

  toggle.onchange = e => {
    if (e.target.checked) {
      audio.filter.connect(audio.context.destination);
    } else {
      audio.filter.disconnect();
    }
  }
}
function validateMin(value, minValue = 0)
{
    return value < minValue ? minValue : value;
}

function getCurrentValue(id)
{
    return document.getElementById(id).value
}

function setCurrentValue(id, value)
{
    value = validateMin(value);

    document.getElementById(id).value = value;
    document.getElementById(id+'_span').innerHTML = value;
}

const setCenter = (centerU = false, centerV = false) => {
    console.log(centerU, centerV)
    gl.uniform2fv(shProgram.iTexCenter, [centerU, centerV]);
    draw();
};


const Vpoint = 'centerV'
const Upoint = 'centerU'

document.onkeydown = (e) => {
    if (e.key === "ArrowUp" || e.key === "w") {
        setCurrentValue(
            Vpoint,
            parseFloat(getCurrentValue(Vpoint)) + 0.5
        )
    } else if (e.key === "ArrowDown" || e.key === "s") {
        setCurrentValue(
            Vpoint,
            parseFloat(getCurrentValue(Vpoint)) - 0.5
        )
    } else if (e.key === "ArrowLeft" || e.key === "a") {
        setCurrentValue(
            Upoint,
            parseFloat(getCurrentValue(Upoint)) - 0.5
        )
    } else if (e.key === "ArrowRight" || e.key === "d") {
        setCurrentValue(
            Upoint,
            parseFloat(getCurrentValue(Upoint)) + 0.5
        )
    }


    setCenter(getCurrentValue(Upoint), getCurrentValue(Vpoint))
    console.log(getCurrentValue(Vpoint), getCurrentValue(Upoint))
};
