import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { randomSource } from './core.mjs';

const GLSL_NOISE=`
float hash2(vec2 p){ return fract(sin(dot(p,vec2(128.31,319.72)))*43758.5453); }
float softNoise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1)),f.x),f.y);
}
float layers(vec2 p){ return .58*softNoise(p)+.27*softNoise(p*2.13)+.15*softNoise(p*4.21); }
`;
export const DOCK_LIGHTS=[
  [-38.7,52],[-32.9,36],[-37.7,24],[-27.1,11],[-25.2,-1],[-14,-15],[11,-31],[25,-29],[44,-23]
];
export function skyDome(scene,index) {
  const material=new T.ShaderMaterial({
    uniforms:{uTime:{value:0},uWarm:{value:index===2?.84:index===1?.38:.63}},
    vertexShader:`varying vec3 vSky;void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1);}`,
    fragmentShader:`
      varying vec3 vSky;uniform float uTime,uWarm;
      ${GLSL_NOISE}
      void main(){
        vec3 d=normalize(vSky);vec2 p=d.xz/(.23+abs(d.y));
        float cloud=layers(p*3.4+vec2(uTime*.007,-uTime*.004));
        float high=smoothstep(-.07,.60,d.y);
        float clearing=smoothstep(.4,.99,dot(d,normalize(vec3(.47,.16,-.84))));
        vec3 fog=mix(vec3(.148,.194,.224),vec3(.51,.37,.22),clearing*uWarm);
        vec3 storm=mix(vec3(.034,.053,.076),vec3(.114,.145,.171),smoothstep(.24,.74,cloud));
        float stripe=(.3+.7*cloud)*clearing*(1.0-smoothstep(.16,.72,d.y));
        float dawn=max(0.0,dot(d,normalize(vec3(.25,.077,-1.0))));
        vec3 flare=vec3(.44,.28,.13)*pow(dawn,74.0)*uWarm+vec3(.42,.29,.17)*pow(dawn,890.0)*uWarm;
        gl_FragColor=vec4(mix(fog,storm,high)+vec3(.24,.167,.084)*stripe*uWarm+flare,1);
        #include <colorspace_fragment>
      }`,side:T.BackSide,depthWrite:false
  });
  const sky=new T.Mesh(new T.SphereGeometry(197,32,20),material);
  sky.frustumCulled=false;
  scene.add(sky);
  return sky;
}
const wetShader={
  name:'WetPort',
  uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null},uTime:{value:0},uRoughness:{value:.66},uSeed:{value:0},uDistance:{value:1}},
  vertexShader:`uniform mat4 textureMatrix;varying vec4 vMirror; varying vec3 vWorld;
    void main(){vMirror=textureMatrix*vec4(position,1);vWorld=(modelMatrix*vec4(position,1)).xyz;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1);}`,
  fragmentShader:`
    uniform vec3 color;uniform sampler2D tDiffuse;uniform float uTime,uSeed,uRoughness;
    varying vec4 vMirror;varying vec3 vWorld;
    ${GLSL_NOISE}
    void main(){
      vec2 p=vWorld.xz,st=vMirror.xy/vMirror.w;
      float fine=softNoise(p*15.0);
      float patches=layers(p*.32+uSeed);
      float mask=smoothstep(.46,.67,patches+.065*sin(p.y*.3));
      float shore=1.0-uRoughness;
      mask=max(mask,shore*shore);
      if(mask<.04)discard;
      float distanceToEye=distance(cameraPosition,vWorld);
      vec2 perturb=vec2(sin(p.y*8.2+uTime*6.0),cos(p.x*6.1+p.y*3.1-uTime*4.1));
      vec2 ripple=perturb*(.0007+shore*.0036)+vec2(fine-.5)*.0022;
      vec3 refl=texture2D(tDiffuse,st+ripple).rgb*.68+texture2D(tDiffuse,st+ripple*.5+vec2(.0017,.0003)).rgb*.32;
      float fresnel=pow(1.0-abs(normalize(cameraPosition-vWorld).y),4.0);
      float grit=.8+.28*softNoise(p*24.0);
      float sheen=pow(max(0.0,1.0-abs(perturb.x*.67+perturb.y*.33)),10.0)*.018;
      vec3 outColor=mix(color*.32,refl,.40+fresnel*.48)*grit+vec3(sheen);
      gl_FragColor=vec4(outColor,mask*(.48+fresnel*.39+shore*.19)*(1.0-smoothstep(87.0,175.0,distanceToEye)));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
};
export function wetGround(scene,map,index,smallViewport) {
  const tint=index===2?0x55464a:index===1?0x384650:0x3e4d58;
  const mirror=new Reflector(new T.PlaneGeometry(192,194),{
    color:tint,textureWidth:smallViewport?240:430,textureHeight:smallViewport?144:250,
    clipBias:.002,multisample:0,shader:wetShader
  });
  mirror.position.y=.026;
  mirror.rotation.x=-Math.PI/2;
  mirror.material.transparent=true;
  mirror.material.depthWrite=false;
  mirror.material.uniforms.uRoughness.value=index===1?.93:.78;
  mirror.material.uniforms.uSeed.value=index*12.3;
  mirror.renderOrder=1;
  let lastRender=-Infinity;
  const capture=mirror.onBeforeRender;
  mirror.onBeforeRender=function(renderer,world,camera){
    const now=performance.now();
    if(now-lastRender<(smallViewport?140:78))return;
    lastRender=now;
    const disabled=world.children.filter(node=>node.userData.omitReflection&&node.visible);
    disabled.forEach(node=>node.visible=false);
    try {capture.call(this,renderer,world,camera);}
    finally {disabled.forEach(node=>node.visible=true);}
  };
  scene.add(mirror);
  return mirror;
}
function hazyLightTexture() {
  const size=64, data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const q=(y*size+x)*4,r=Math.hypot((x+.5-size*.5)/31,(y+.5-size*.5)/31);
    data[q]=data[q+1]=data[q+2]=255;
    data[q+3]=Math.round(255*Math.exp(-r*r*4.4)*Math.max(0,1-r));
  }
  const t=new T.DataTexture(data,size,size);t.needsUpdate=true;t.magFilter=T.LinearFilter;t.minFilter=T.LinearFilter;
  return t;
}
const haloTexture=hazyLightTexture();haloTexture.userData.shared=true;
export function practicalLight(scene,x,y,z,intensity=1,color=0xffbd6d) {
  const m=new T.SpriteMaterial({map:haloTexture,color,transparent:true,opacity:.65*intensity,
    blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
  const sprite=new T.Sprite(m);
  sprite.position.set(x,y,z);sprite.scale.setScalar(3.5+intensity);scene.add(sprite);
  const pool=new T.Mesh(new T.PlaneGeometry(12,14),new T.MeshBasicMaterial({
    map:haloTexture,color,transparent:true,opacity:.43*intensity,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false
  }));
  pool.rotation.x=-Math.PI/2;pool.rotation.z=x*.14;
  pool.position.set(x,.028,z-.4);pool.renderOrder=2;pool.userData.omitReflection=true;scene.add(pool);
}
export function makeWeather(scene,index,smallViewport) {
  const rng=randomSource(3200+index),count=smallViewport?420:940;
  const lines=new Float32Array(count*6),seeds=new Float32Array(count*4);
  for(let i=0;i<count;i++) {
    seeds.set([(rng()-.5)*47,rng(),(rng()-.5)*47,.36+rng()*.64],i*4);
  }
  const geo=new T.BufferGeometry(),coords=new T.BufferAttribute(lines,3).setUsage(T.DynamicDrawUsage);
  geo.setAttribute('position',coords);
  const rain=new T.LineSegments(geo,new T.LineBasicMaterial({color:0x9dbbc9,transparent:true,opacity:index===1?.22:.26,depthWrite:false}));
  rain.frustumCulled=false;rain.renderOrder=3;rain.userData.omitReflection=true;scene.add(rain);
  const size=64, noise=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const f=(y*size+x)*4;
    const phi=Math.hypot((x-31.5)/31.5,(y-31.5)/31.5);
    noise[f]=noise[f+1]=noise[f+2]=255;
    noise[f+3]=Math.max(0,1-phi)**2*255*(.55+.45*Math.sin(x*.19+y*.25)**2);
  }
  const texture=new T.DataTexture(noise,size,size);texture.needsUpdate=true;texture.magFilter=T.LinearFilter;
  const wisps=[];
  for(let i=0;i<12;i++) {
    const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,color:index===2?0xaa9287:0x95a8b3,opacity:.086,transparent:true,depthWrite:false}));
    const x=(rng()-.5)*127,z=(rng()-.5)*138;
    sprite.position.set(x,1.1,z);sprite.scale.set(21+rng()*21,3.2+rng()*2.4,1);
    sprite.userData.omitReflection=true;
    wisps.push({sprite,x,z});
    scene.add(sprite);
  }
  return {
    update(t,camera,density=1){
      rain.position.set(Math.floor(camera.position.x/10)*10,0,Math.floor(camera.position.z/10)*10);
      rain.material.opacity=(index===1?.17:.23)*density;
      for(let i=0;i<count;i++){
        const j=i*4,k=i*6;
        const y=((seeds[j+1]*17-t*(9+seeds[j+3]*5))%17+17)%17;
        const x=seeds[j]+y*.15,z=seeds[j+2]-y*.035,len=.22+seeds[j+3]*.48;
        lines[k]=x;lines[k+1]=y;lines[k+2]=z;
        lines[k+3]=x+len*.16;lines[k+4]=y+len;lines[k+5]=z-len*.035;
      }
      coords.needsUpdate=true;
      for(const {sprite,x,z} of wisps)sprite.position.set(x+Math.sin(t*.13+z)*3.7,1.02+Math.sin(t*.21+x)*.31,z+Math.cos(t*.09+x)*2);
    },
    dispose(){texture.dispose();}
  };
}
