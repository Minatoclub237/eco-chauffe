// Caméra thermique : un front de chaleur balaie la photo, en fausses couleurs, avec une brume de chaud sur sa lisière.
// Le canvas se pose au-dessus de l'<img> ; il reste transparent là où la photo vraie doit se voir.
// Sans WebGL, le canvas reste vide et la photo s'affiche normalement.

const VERT = `attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}`

const FRAG = `precision mediump float;
uniform sampler2D tex;
uniform vec2 scale,offset;
uniform float front,time,invert,gamma;
varying vec2 v;
float h(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
vec3 iron(float t){
  t=clamp(t,0.,1.);
  vec3 a=vec3(.02,.0,.27),b=vec3(.30,.05,.60),c=vec3(.86,.16,.42),d=vec3(.98,.46,.12),e=vec3(1.,.86,.35),f=vec3(1.,.99,.92);
  if(t<.18)return mix(a,b,t/.18);
  if(t<.42)return mix(b,c,(t-.18)/.24);
  if(t<.66)return mix(c,d,(t-.42)/.24);
  if(t<.86)return mix(d,e,(t-.66)/.2);
  return mix(e,f,(t-.86)/.14);
}
void main(){
  float w=n(vec2(v.y*5.,time*.25))-.5;
  float x=v.x-(front+w*.09);
  float behind=1.-smoothstep(-.01,.05,x);
  float m=mix(behind,1.-behind,invert);
  float edge=1.-smoothstep(0.,.1,abs(x));
  float a=max(m,edge);
  if(a<.004){gl_FragColor=vec4(0.);return;}
  float t=time;
  vec2 d=vec2(n(vec2(v.x*9.,v.y*6.-t*.9))-.5,n(vec2(v.x*7.+3.,v.y*8.-t*1.1))-.5)*(.016*edge+.004*m);
  vec3 c=texture2D(tex,offset+(v+d)*scale).rgb;
  float l=dot(c,vec3(.3,.59,.11));
  vec3 col=mix(c,iron(pow(l,gamma)+(n(v*14.+t*.15)-.5)*.05),m);
  col+=edge*vec3(1.,.5,.18)*.4;
  gl_FragColor=vec4(col*a,a);
}`

export function thermal(canvas, img, { focus = [0.5, 0.5], invert = false, gamma = 1.1 } = {}) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' })
  if (!gl) return null
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s }
  const pr = gl.createProgram()
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT))
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(pr)
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null
  gl.useProgram(pr)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(pr, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const u =Object.fromEntries(['tex', 'scale', 'offset', 'front', 'time', 'invert', 'gamma'].map((k) => [k, gl.getUniformLocation(pr, k)]))
  gl.uniform1f(u.invert, invert ? 1 : 0)
  gl.uniform1f(u.gamma, gamma)

  let ready = false, iw = 1, ih = 1, front = -0.2, dirty = true

  const fit = () => {
    const w = Math.round(canvas.clientWidth * 0.55), h = Math.round(canvas.clientHeight * 0.55)
    if (!w || !h) return
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
    gl.viewport(0, 0, w, h)
    const ca = w / h, ia = iw / ih
    const sx = ca > ia ? 1 : ca / ia, sy = ca > ia ? ia / ca : 1
    gl.uniform2f(u.scale, sx, sy)
    // Même cadrage que object-position sur l'<img> ; v=0 est en bas de l'image retournée
    gl.uniform2f(u.offset, (1 - sx) * focus[0], (1 - sy) * (1 - focus[1]))
    dirty = true
  }

  const load = () => {
    const tex = new Image()
    tex.onload = () => {
      iw = tex.naturalWidth; ih = tex.naturalHeight
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, tex)
      for (const [k, val] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, val)
      ready = true
      fit()
      // Le pilote compile le shader au premier dessin : on le fait au chargement, pas au premier geste
      gl.uniform1f(u.front, 0.5)
      gl.uniform1f(u.time, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.finish()
    }
    tex.src = img.currentSrc || img.src
  }

  return {
    load,
    fit,
    // p de 0 à 1 : le front traverse l'image de gauche à droite
    set(p) { const f = p * 1.4 - 0.2; if (f !== front) { front = f; dirty = true } },
    draw(time) {
      if (!ready) return
      const idle = !invert && front <= -0.2
      if (idle && !dirty) return
      gl.uniform1f(u.front, front)
      gl.uniform1f(u.time, time)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      if (!idle) gl.drawArrays(gl.TRIANGLES, 0, 3)
      dirty = false
    },
  }
}
