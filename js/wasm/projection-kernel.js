/**
 * WebAssembly Spatial Projection & Energy Kernel
 * Compiles and instantiates a compact WASM binary matching wasm/projection.wat
 * for native-speed 3D-to-2D matrix projections and energy calculations.
 */

function uleb(v) {
  const out = [];
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v !== 0) b |= 0x80;
    out.push(b);
  } while (v !== 0);
  return out;
}

function f32Bytes(val) {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setFloat32(0, val, true);
  return [...new Uint8Array(buf)];
}

function asciiStr(str) {
  const bytes = [...str].map((ch) => ch.charCodeAt(0));
  return [...uleb(bytes.length), ...bytes];
}

function section(id, payload) {
  return [id, ...uleb(payload.length), ...payload];
}

function buildProjectionWasmBytes() {
  const F32 = 0x7d;
  const OP = {
    localGet: 0x20,
    localSet: 0x21,
    f32Load: 0x2a,
    f32Store: 0x38,
    i32Const: 0x41,
    f32Const: 0x43,
    f32Add: 0x92,
    f32Sub: 0x93,
    f32Mul: 0x94,
    f32Div: 0x95,
    end: 0x0b
  };

  const loadF32 = (offset) => [OP.i32Const, 0x00, OP.f32Load, 0x02, ...uleb(offset)];
  const storeF32 = (offset, expr) => [OP.i32Const, 0x00, ...expr, OP.f32Store, 0x02, ...uleb(offset)];
  const dotRow = (o0, o1, o2, o3) => [
    ...loadF32(o0), OP.localGet, 2, OP.f32Mul,
    ...loadF32(o1), OP.localGet, 3, OP.f32Mul,
    OP.f32Add,
    ...loadF32(o2), OP.localGet, 4, OP.f32Mul,
    ...loadF32(o3),
    OP.f32Add,
    OP.f32Add
  ];

  // Type section: (f32,f32)->f32 and (f32,f32,f32)->f32
  const typeSec = section(1, [
    0x02,
    0x60, 0x02, F32, F32, 0x01, F32,
    0x60, 0x03, F32, F32, F32, 0x01, F32
  ]);

  const funcSec = section(3, [0x02, 0x00, 0x01]);
  const memSec = section(5, [0x01, 0x00, 0x01]);
  const exportSec = section(7, [
    0x03,
    ...asciiStr('memory'), 0x02, 0x00,
    ...asciiStr('project_point'), 0x00, 0x00,
    ...asciiStr('calc_solar_yield'), 0x00, 0x01
  ]);

  // Func 0: project_point(width, height) -> ndcZ
  const func0Body = [
    0x01, 0x07, F32, // 7 f32 locals: x(2), y(3), z(4), invW(5), ndcX(6), ndcY(7), ndcZ(8)
    ...loadF32(64), OP.localSet, 2,
    ...loadF32(68), OP.localSet, 3,
    ...loadF32(72), OP.localSet, 4,

    // invW = 1.0 / cw
    OP.f32Const, ...f32Bytes(1.0),
    ...dotRow(12, 28, 44, 60),
    OP.f32Div,
    OP.localSet, 5,

    // ndcX, ndcY, ndcZ
    ...dotRow(0, 16, 32, 48), OP.localGet, 5, OP.f32Mul, OP.localSet, 6,
    ...dotRow(4, 20, 36, 52), OP.localGet, 5, OP.f32Mul, OP.localSet, 7,
    ...dotRow(8, 24, 40, 56), OP.localGet, 5, OP.f32Mul, OP.localSet, 8,

    // sx = (ndcX * 0.5 + 0.5) * width -> offset 80
    ...storeF32(80, [
      OP.localGet, 6, OP.f32Const, ...f32Bytes(0.5), OP.f32Mul,
      OP.f32Const, ...f32Bytes(0.5), OP.f32Add,
      OP.localGet, 0, OP.f32Mul
    ]),

    // sy = (0.5 - ndcY * 0.5) * height -> offset 84
    ...storeF32(84, [
      OP.f32Const, ...f32Bytes(0.5),
      OP.localGet, 7, OP.f32Const, ...f32Bytes(0.5), OP.f32Mul,
      OP.f32Sub,
      OP.localGet, 1, OP.f32Mul
    ]),

    OP.localGet, 8,
    OP.end
  ];

  // Func 1: calc_solar_yield(area, poles, sun) -> kWh
  const func1Body = [
    0x00,
    OP.localGet, 0, OP.f32Const, ...f32Bytes(0.21), OP.f32Mul,
    OP.localGet, 2, OP.f32Mul,
    OP.localGet, 1, OP.f32Const, ...f32Bytes(310.0), OP.f32Mul,
    OP.f32Add,
    OP.end
  ];

  const codeSec = section(10, [
    0x02,
    ...uleb(func0Body.length), ...func0Body,
    ...uleb(func1Body.length), ...func1Body
  ]);

  return new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    ...typeSec,
    ...funcSec,
    ...memSec,
    ...exportSec,
    ...codeSec
  ]);
}

export class WasmProjectionKernel {
  constructor() {
    this.isNativeWasm = false;
    this.exports = null;
    this.memView = null;
  }

  async init() {
    try {
      const wasmBytes = buildProjectionWasmBytes();
      const { instance } = await WebAssembly.instantiate(wasmBytes);
      this.exports = instance.exports;
      this.memView = new Float32Array(this.exports.memory.buffer);
      this.isNativeWasm = true;
    } catch (err) {
      console.warn('WASM fallback active:', err);
      this.isNativeWasm = false;
    }
    return this.isNativeWasm;
  }

  /**
   * Projects world position (x, y, z) using 4x4 ViewProjection matrix elements
   * into viewport coordinates { sx, sy, ndcZ, visible }.
   */
  projectPoint(vpElements, x, y, z, width, height) {
    if (this.isNativeWasm && this.memView) {
      this.memView.set(vpElements, 0);
      this.memView[16] = x;
      this.memView[17] = y;
      this.memView[18] = z;
      const ndcZ = this.exports.project_point(width, height);
      const sx = this.memView[20];
      const sy = this.memView[21];
      return { sx, sy, ndcZ, visible: ndcZ > -1 && ndcZ < 1 };
    }

    const m = vpElements;
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    const invW = 1 / (cw || 1);
    const ndcX = (m[0] * x + m[4] * y + m[8] * z + m[12]) * invW;
    const ndcY = (m[1] * x + m[5] * y + m[9] * z + m[13]) * invW;
    const ndcZ = (m[2] * x + m[6] * y + m[10] * z + m[14]) * invW;
    return {
      sx: (ndcX * 0.5 + 0.5) * width,
      sy: (0.5 - ndcY * 0.5) * height,
      ndcZ,
      visible: ndcZ > -1 && ndcZ < 1
    };
  }

  calcSolarYield(area, poles, sunFactor = 1320) {
    if (this.isNativeWasm && this.exports) {
      return Math.round(this.exports.calc_solar_yield(area, poles, sunFactor));
    }
    return Math.round(area * 0.21 * sunFactor + poles * 310);
  }
}
