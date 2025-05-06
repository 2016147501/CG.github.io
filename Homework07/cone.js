export class Cone {
    /**
     * @param {WebGL2RenderingContext} gl
     * @param {number} seg  –  side subdivisions (≥3)
     * @param {{color?: number[]}} opt – RGBA array 0‑1 (default grey)
     */
    constructor(gl, seg = 32, opt = {}) {
      /* =========  파라미터 & CPU 버퍼  ========= */
      this.gl   = gl;
      this.seg  = Math.max(3, seg | 0);
      this.col  = (opt.color || [0.8, 0.8, 0.8, 1]).slice(0, 4);
  
      const R = 0.5, yTip =  0.5, yBase = -0.5;
      const vert  = [], nor  = [], idx = [];
  
      /* 정점  : 세그먼트마다 정점 3개( tip + 두 바닥점 ) 중복
         → flat  노멀 교체가 쉬움 (Homework07 요구)            */
      const dθ = 2 * Math.PI / this.seg;
      for (let i = 0; i < this.seg; ++i) {
        const θ0 = i * dθ, θ1 = (i + 1) * dθ;
        const x0 = R * Math.cos(θ0), z0 = R * Math.sin(θ0);
        const x1 = R * Math.cos(θ1), z1 = R * Math.sin(θ1);
  
        // 3개 정점 위치 push
        vert.push(
          0,  yTip, 0,   // tip
          x0, yBase, z0, // base0
          x1, yBase, z1  // base1
        );
  
        // face normal (flat 용)
        const midθ = θ0 + dθ * 0.5;
        const slope = R / 1.0;              // r/h = 0.5/1
        const fnx = Math.cos(midθ), fnz = Math.sin(midθ);
        const fny = slope / Math.hypot(1, slope);   // 정규화
        for (let k = 0; k < 3; ++k) nor.push(fnx, fny, fnz);
  
        // 인덱스
        const base = i * 3;
        idx.push(base, base + 1, base + 2);
      }
  
      /* Float32 → GPU */
      this._vertArr = new Float32Array(vert);
      this._norArr  = new Float32Array(nor);     // 현재 노멀 캐시
      this._faceNor = new Float32Array(nor);     // flat 백업
      this._vertNor = this._makeSmoothNormals(); // smooth 백업
      this._idxArr  = new Uint16Array(idx);
  
      this.#buildVao();
    }
  
    /* ------------------------------------------------------------
     *  public API  (Homework07.js 와 호환)
     * ---------------------------------------------------------- */
    copyFaceNormalsToNormals()   { this._norArr.set(this._faceNor); }
    copyVertexNormalsToNormals() { this._norArr.set(this._vertNor); }
    updateNormals()              { this.#pushNormals(); }
  
    /** @param {Shader} sh */
    draw(sh) {
      const { gl } = this;
      sh.use();
      gl.bindVertexArray(this._vao);
      gl.drawElements(gl.TRIANGLES, this._idxArr.length, gl.UNSIGNED_SHORT, 0);
      gl.bindVertexArray(null);
    }
    delete() {
      const { gl } = this;
      gl.deleteBuffer(this._vbo);
      gl.deleteBuffer(this._ebo);
      gl.deleteVertexArray(this._vao);
    }
  
    /* ------------------------------------------------------------
     *  내부 로직
     * ---------------------------------------------------------- */
    _makeSmoothNormals() {
      const out = new Float32Array(this._norArr.length);
      const slopeY = 0.5;                       // r/h
      for (let i = 0; i < this._vertArr.length / 3; ++i) {
        const x = this._vertArr[i * 3], z = this._vertArr[i * 3 + 2];
        const len = Math.hypot(x, slopeY, z);
        out.set([x / len, slopeY / len, z / len], i * 3);
      }
      /* tip 방향 보정 (보다 뾰족한 느낌) */
      out.set([0, 1, 0], 0);
      return out;
    }
  
    #buildVao() {
      const gl = this.gl;
      this._vao = gl.createVertexArray();
      this._vbo = gl.createBuffer();
      this._ebo = gl.createBuffer();
      gl.bindVertexArray(this._vao);
  
      /* interleaved: pos(3) + nor(3) */
      const stride = 6 * 4;
      const inter  = new Float32Array(this._vertArr.length + this._norArr.length);
      for (let i = 0; i < this._vertArr.length / 3; ++i) {
        inter.set(this._vertArr.subarray(i * 3, i * 3 + 3), i * 6);
        inter.set(this._norArr .subarray(i * 3, i * 3 + 3), i * 6 + 3);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);
      gl.bufferData(gl.ARRAY_BUFFER, inter, gl.STATIC_DRAW);
  
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
      gl.enableVertexAttribArray(0);
      gl.enableVertexAttribArray(1);
  
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._ebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this._idxArr, gl.STATIC_DRAW);
  
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
  
    #pushNormals() {
      /* 노멀만 GPU 버퍼의 두 번째 float3 슬롯에 덮어씀 */
      const gl = this.gl;
      const vCount = this._vertArr.length / 3;
      const stride = 6 * 4;
      gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);
      for (let i = 0; i < vCount; ++i) {
        gl.bufferSubData(gl.ARRAY_BUFFER, i * stride + 12,
                         this._norArr.subarray(i * 3, i * 3 + 3));
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
  }
  