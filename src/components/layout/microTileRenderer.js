/**
 * WebGL2 instanced mosaic tile renderer.
 *
 * One canvas and one instanced quad draw a field of medium-sized
 * rectangular panels. Each panel has its own position, size,
 * rotation axis, direction, cover timing, reveal timing, and depth
 * variation. The vertex shader uses a real perspective projection:
 * tiles rotate in view space, move in depth, and are culled once
 * they pass the edge-on position.
 *
 * Returns null when WebGL2 is unavailable so navigation can fall
 * back to an instant page change instead of a substitute effect.
 */

const CAMERA_DISTANCE = 900;
const NEAR_PLANE = 1;
const FAR_PLANE = 2600;

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
in vec2 aPos;
in vec2 aSize;
in vec2 aCover;
in vec2 aReveal;
in vec4 aMotion;

uniform float uTime;
uniform float uMode;
uniform float uPhaseStart;
uniform vec2 uViewport;
uniform float uCameraDistance;
uniform vec2 uPlanes;

out vec2 vLocal;
out float vFace;
out float vSeed;
out float vShade;

float easeOutCubic(float t) { return 1.0 - pow(1.0 - t, 3.0); }
float easeInOut(float t) { return t * t * (3.0 - 2.0 * t); }

vec3 rotateTile(vec3 point, float axis, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  if (axis < 0.5) {
    return vec3(point.x, point.y * c - point.z * s, point.y * s + point.z * c);
  }
  return vec3(point.x * c + point.z * s, point.y, -point.x * s + point.z * c);
}

void main() {
  vLocal = aPosition;
  vSeed = aMotion.y;

  float angle;
  float depth;
  if (uMode < 0.5) {
    float progress = clamp((uTime - uPhaseStart - aCover.x) / aCover.y, 0.0, 1.0);
    float eased = easeOutCubic(progress);
    angle = mix(1.78, 0.0, eased) * aMotion.w;
    depth = mix(48.0 + aMotion.z * 30.0, aMotion.z * 2.0, eased);
  } else {
    float progress = clamp((uTime - uPhaseStart - aReveal.x) / aReveal.y, 0.0, 1.0);
    float eased = easeInOut(progress);
    angle = mix(0.0, 1.73, eased) * aMotion.w;
    depth = mix(aMotion.z * 2.0, 58.0 + aMotion.z * 44.0, progress);
  }

  vec3 local = vec3(aPosition * aSize, 0.0);
  vec3 rotated = rotateTile(local, aMotion.x, angle);
  vec3 normal = rotateTile(vec3(0.0, 0.0, 1.0), aMotion.x, angle);
  vFace = cos(angle);
  vec3 lightDirection = normalize(vec3(-0.35, 0.55, 0.76));
  vShade = 0.58 + 0.42 * max(dot(normal, lightDirection), 0.0);

  vec3 centerView = vec3(
    aPos.x - uViewport.x * 0.5,
    uViewport.y * 0.5 - aPos.y,
    -(uCameraDistance + depth + aMotion.y * 1.5)
  );
  vec3 viewPosition = centerView + rotated;

  float focalX = 2.0 * uCameraDistance / uViewport.x;
  float focalY = 2.0 * uCameraDistance / uViewport.y;
  float zFactor = (uPlanes.y + uPlanes.x) / (uPlanes.x - uPlanes.y);
  float zOffset = (2.0 * uPlanes.y * uPlanes.x) / (uPlanes.x - uPlanes.y);
  gl_Position = vec4(
    viewPosition.x * focalX,
    viewPosition.y * focalY,
    viewPosition.z * zFactor + zOffset,
    -viewPosition.z
  );
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec2 vLocal;
in float vFace;
in float vSeed;
in float vShade;
out vec4 outColor;

void main() {
  // Equivalent backface handling in addition to hardware culling:
  // nothing is drawn once a tile has passed edge-on.
  if (vFace <= 0.02) discard;

  vec3 darkest = vec3(0.006, 0.010, 0.018);
  vec3 metallic = vec3(0.020, 0.032, 0.048);
  vec3 base = mix(darkest, metallic, vSeed) * vShade;

  vec2 edgeDistance = abs(vLocal);
  float edge = smoothstep(0.455, 0.5, max(edgeDistance.x, edgeDistance.y));
  vec3 edgeLight = vec3(0.08, 0.24, 0.32) * edge * (0.08 + vSeed * 0.10);

  outColor = vec4(base + edgeLight, 1.0);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Deterministic pseudo-random from an index. The same viewport gets the same mosaic. */
function seeded(index, salt) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/** Base rectangular cell size for the available content width. */
export function getMosaicTilePitch(width) {
  if (width <= 640) return { width: 31, height: 23 };
  if (width <= 1024) return { width: 35, height: 26 };
  return { width: 39, height: 29 };
}

/**
 * Build a stable rectangular mosaic over a width by height region.
 * Most tiles occupy one cell. A small deterministic minority merge
 * two cells horizontally or vertically, matching the irregular
 * block sizes in the reference frames without creating large panels.
 */
export function buildMosaicLayout(width, height) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const pitch = getMosaicTilePitch(safeWidth);
  const columns = Math.max(1, Math.ceil(safeWidth / pitch.width));
  const rows = Math.max(1, Math.ceil(safeHeight / pitch.height));
  const cellWidth = safeWidth / columns;
  const cellHeight = safeHeight / rows;
  const occupied = new Uint8Array(columns * rows);
  const tiles = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const cellIndex = row * columns + col;
      if (occupied[cellIndex]) continue;

      let spanColumns = 1;
      let spanRows = 1;
      const mergeRoll = seeded(cellIndex, 5);
      if (
        mergeRoll < 0.09 &&
        col + 1 < columns &&
        !occupied[cellIndex + 1]
      ) {
        spanColumns = 2;
      } else if (
        mergeRoll > 0.94 &&
        row + 1 < rows &&
        !occupied[cellIndex + columns]
      ) {
        spanRows = 2;
      }

      for (let r = row; r < row + spanRows; r += 1) {
        for (let c = col; c < col + spanColumns; c += 1) {
          occupied[r * columns + c] = 1;
        }
      }

      const seed = seeded(cellIndex, 17);
      tiles.push({
        x: (col + spanColumns / 2) * cellWidth,
        y: (row + spanRows / 2) * cellHeight,
        // Slight overlap prevents antialiased transparent seams
        // between stationary tiles.
        width: spanColumns * cellWidth + 1.5 + seed * 0.7,
        height: spanRows * cellHeight + 1.5 + seeded(cellIndex, 23) * 0.7,
        col,
        row,
        spanColumns,
        spanRows,
      });
    }
  }

  return { tiles, columns, rows, pitch, tileCount: tiles.length };
}

export function createMicroTileRenderer(canvas, { onCovered, onRevealDone }) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    depth: true,
    premultipliedAlpha: false,
  });
  if (!gl) return null;

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.frontFace(gl.CCW);
  gl.disable(gl.BLEND);

  const locations = {
    position: gl.getAttribLocation(program, 'aPosition'),
    pos: gl.getAttribLocation(program, 'aPos'),
    size: gl.getAttribLocation(program, 'aSize'),
    cover: gl.getAttribLocation(program, 'aCover'),
    reveal: gl.getAttribLocation(program, 'aReveal'),
    motion: gl.getAttribLocation(program, 'aMotion'),
    time: gl.getUniformLocation(program, 'uTime'),
    mode: gl.getUniformLocation(program, 'uMode'),
    phaseStart: gl.getUniformLocation(program, 'uPhaseStart'),
    viewport: gl.getUniformLocation(program, 'uViewport'),
    cameraDistance: gl.getUniformLocation(program, 'uCameraDistance'),
    planes: gl.getUniformLocation(program, 'uPlanes'),
  };

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(locations.position);
  gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

  const instanceBuffers = {};
  function makeInstanced(name, size) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(locations[name]);
    gl.vertexAttribPointer(locations[name], size, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(locations[name], 1);
    instanceBuffers[name] = buffer;
    return buffer;
  }
  makeInstanced('pos', 2);
  makeInstanced('size', 2);
  makeInstanced('cover', 2);
  makeInstanced('reveal', 2);
  makeInstanced('motion', 4);

  let tileCount = 0;
  let coverTotal = 0;
  let revealTotal = 0;
  let viewportWidth = 1;
  let viewportHeight = 1;
  let disposed = false;
  let frame = null;
  let mode = 0;
  let phaseStartedAt = performance.now();
  let coveredSent = false;
  let revealDoneSent = false;

  function buildTiles(width, height) {
    const layout = buildMosaicLayout(width, height);
    tileCount = layout.tileCount;

    const pos = new Float32Array(tileCount * 2);
    const size = new Float32Array(tileCount * 2);
    const cover = new Float32Array(tileCount * 2);
    const reveal = new Float32Array(tileCount * 2);
    const motion = new Float32Array(tileCount * 4);
    coverTotal = 0;
    revealTotal = 0;

    layout.tiles.forEach((tile, i) => {
      const cellIndex = tile.row * layout.columns + tile.col;
      const random = seeded(i, 17);
      pos[i * 2] = tile.x;
      pos[i * 2 + 1] = tile.y;
      size[i * 2] = tile.width;
      size[i * 2 + 1] = tile.height;

      const normalizedX = (tile.col + tile.spanColumns / 2) / layout.columns;
      const normalizedY = (tile.row + tile.spanRows / 2) / layout.rows;

      // Cover moves mainly top-to-bottom with a slight diagonal.
      const coverDelay = (normalizedY * 78 + normalizedX * 32) + seeded(i, 29) * 35;
      const coverDuration = 250 + seeded(i, 37) * 35;
      cover[i * 2] = coverDelay;
      cover[i * 2 + 1] = coverDuration;
      coverTotal = Math.max(coverTotal, coverDelay + coverDuration);

      // Reveal follows the reference progression: destination
      // emerges from the top, with diagonal drift and irregular
      // deterministic delays. Lower tiles remain black longer.
      const revealDelay =
        normalizedY * 360 + normalizedX * 80 + seeded(i, 41) * 120;
      const revealDuration = 430 + seeded(i, 53) * 110;
      reveal[i * 2] = revealDelay;
      reveal[i * 2 + 1] = revealDuration;
      revealTotal = Math.max(revealTotal, revealDelay + revealDuration);

      motion[i * 4] = seeded(cellIndex, 73) < 0.52 ? 0 : 1;
      motion[i * 4 + 1] = random;
      motion[i * 4 + 2] = seeded(i, 113);
      motion[i * 4 + 3] = seeded(cellIndex, 91) > 0.5 ? 1 : -1;
    });

    const upload = (name, data) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffers[name]);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    };
    upload('pos', pos);
    upload('size', size);
    upload('cover', cover);
    upload('reveal', reveal);
    upload('motion', motion);
  }

  function resize() {
    if (disposed) return;
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 0;
    const height = canvas.clientHeight || canvas.parentElement?.clientHeight || 0;
    if (width === 0 || height === 0) return;
    viewportWidth = width;
    viewportHeight = height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    buildTiles(width, height);
  }

  function draw(now) {
    if (disposed) return;
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(locations.time, now);
    gl.uniform1f(locations.mode, mode);
    gl.uniform1f(locations.phaseStart, phaseStartedAt);
    gl.uniform2f(locations.viewport, viewportWidth, viewportHeight);
    gl.uniform1f(locations.cameraDistance, CAMERA_DISTANCE);
    gl.uniform2f(locations.planes, NEAR_PLANE, FAR_PLANE);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, tileCount);

    const elapsed = now - phaseStartedAt;
    if (mode === 0 && !coveredSent && elapsed >= coverTotal) {
      coveredSent = true;
      onCovered();
    }
    if (mode === 1 && !revealDoneSent && elapsed >= revealTotal) {
      revealDoneSent = true;
      onRevealDone();
      return;
    }
    frame = window.requestAnimationFrame(draw);
  }

  resize();
  frame = window.requestAnimationFrame(draw);

  return {
    startReveal() {
      if (disposed || mode === 1) return;
      mode = 1;
      phaseStartedAt = performance.now();
      if (frame === null) frame = window.requestAnimationFrame(draw);
    },
    resize,
    dispose() {
      disposed = true;
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      gl.bindVertexArray(null);
      gl.deleteVertexArray(vao);
      gl.deleteBuffer(quad);
      for (const buffer of Object.values(instanceBuffers)) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
