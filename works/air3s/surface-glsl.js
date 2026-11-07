import * as THREE from 'three';

// Original procedural GLSL. All textures and lighting environments are generated
// locally; no photographs are projected over the product geometry.
export function finishSurface(material,kind='polymer'){
 if(!material.isMeshStandardMaterial)return material;
 const selection={value:0};material.userData.selection=selection;
 material.onBeforeCompile=shader=>{
  shader.uniforms.uDetailSelection=selection;
  shader.vertexShader='varying vec3 vSurfaceLocal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurfaceLocal = position;');
  shader.fragmentShader=`
    varying vec3 vSurfaceLocal;
    uniform float uDetailSelection;
    float surfaceHash(vec3 p){p=fract(p*vec3(443.897,441.423,437.195));p+=dot(p,p.yzx+19.19);return fract((p.x+p.y)*p.z);}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`
    #include <roughnessmap_fragment>
    float grain = surfaceHash(floor(vSurfaceLocal * 1100.0));
    float grainVisibility=1.0-smoothstep(.001,.009,length(fwidth(vSurfaceLocal)));
    roughnessFactor=clamp(roughnessFactor+(grain-.5)*.09*grainVisibility,.12,.95);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
    #include <normal_fragment_maps>
    float micro=surfaceHash(floor(vSurfaceLocal*680.0));
    vec3 dp1=dFdx(vViewPosition),dp2=dFdy(vViewPosition);
    vec3 surfR1=cross(dp2,normal),surfR2=cross(normal,dp1);
    float invDet=1.0/max(abs(dot(dp1,surfR1)),.000001);
    vec3 microGradient=(dFdx(micro)*surfR1+dFdy(micro)*surfR2)*invDet;
    normal=normalize(normal-microGradient*.000027*grainVisibility);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
    float edgeResponse=pow(1.0-abs(dot(normal,normalize(vViewPosition))),3.2);
    outgoingLight+=vec3(.52,.87,.36)*edgeResponse*uDetailSelection*.48;
    #include <opaque_fragment>
  `);
 };
 material.customProgramCacheKey=()=>`air3s-original-surface-v4-${kind}`;
 return material;
}

export function opticalMaterial(radius){
 return new THREE.ShaderMaterial({
  uniforms:{uRadius:{value:radius}},
  vertexShader:`
   varying vec2 vLens;varying vec3 vNormalEye;varying vec3 vEye;
   uniform float uRadius;
   void main(){vLens=position.xy/uRadius;vec4 p=modelViewMatrix*vec4(position,1.0);vEye=-p.xyz;vNormalEye=normalize(normalMatrix*normal);gl_Position=projectionMatrix*p;}
  `,
  fragmentShader:`
   varying vec2 vLens;varying vec3 vNormalEye;varying vec3 vEye;
   float ellipse(vec2 p,vec2 center,vec2 extent){return exp(-dot((p-center)/extent,(p-center)/extent)*2.8);}
   void main(){
    float r=length(vLens);float fresnel=pow(1.0-abs(dot(normalize(vNormalEye),normalize(vEye))),3.0);
    float pupil=1.0-smoothstep(.31,.39,r);
    vec3 coating=mix(vec3(.002,.005,.008),vec3(.008,.028,.023),smoothstep(.28,.85,r));
    vec3 col=coating*(1.0-pupil*.86);
    float rings=pow(.5+.5*cos(r*39.0),12.0)*smoothstep(.38,.48,r)*(1.0-smoothstep(.86,.95,r));
    col+=vec3(.004,.008,.007)*rings;
    col+=vec3(.07,.16,.18)*ellipse(vLens,vec2(-.28,.31),vec2(.35,.15))*.65;
    col+=vec3(.22,.32,.29)*ellipse(vLens,vec2(-.22,.35),vec2(.15,.035))*.6;
    col+=vec3(.009,.025,.04)*ellipse(vLens,vec2(.29,-.3),vec2(.12,.20));
    col+=vec3(.009,.025,.025)*fresnel;
    gl_FragColor=vec4(col,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }
  `
 });
}

export function createStudioEnvironment(renderer){
 const studio=new THREE.Scene();studio.background=new THREE.Color(0x555c61);
 const add=(w,h,p,rotation,intensity)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(intensity,intensity,intensity),side:THREE.DoubleSide}));m.position.set(...p);m.rotation.set(...rotation);studio.add(m);};
 add(14,8,[0,7,-2],[Math.PI/2,0,0],3.8);
 add(4,12,[-6,1,0],[0,Math.PI/2,0],2.5);
 add(2,12,[6,2,2],[0,Math.PI/2,0],4.5);
 add(12,9,[0,-6,0],[-Math.PI/2,0,0],.13);
 const pmrem=new THREE.PMREMGenerator(renderer);const target=pmrem.fromScene(studio,.05,.1,50);pmrem.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return target;
}
