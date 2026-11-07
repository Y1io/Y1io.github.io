import * as THREE from 'three';
import { createFlight } from './flight.js';
import { createStudioEnvironment } from './surface-glsl.js';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { createAir3S } from './air3s-model.js';

const $=s=>document.querySelector(s), host=$('#viewport');
const data=[
 {name:'分层机身',en:'AIRFRAME',desc:'按官方展开尺寸校正长宽高比例。独立的上壳、中框和下壳共同形成宽肩、收尾的机身，拆解时展示三层结构；机头配有前向激光雷达和视觉传感器。',spec:[['起飞重量','724 g'],['展开尺寸¹','266 × 325 × 106 mm']]},
 {name:'双摄云台',en:'DUAL-CAMERA GIMBAL',desc:'上下排列的双摄系统，融合广角叙事与中长焦构图。三轴机械云台为航拍提供稳定的影像平台。',spec:[['广角主摄','1 英寸 · 50 MP'],['中长焦','70 mm · 48 MP']]},
 {name:'智能飞行电池',en:'INTELLIGENT BATTERY',desc:'顺着机身轮廓收拢的后置电池，上表面与机身形成连续曲面。尾部电量灯、按键与两侧卡扣按参考图重新布置。',spec:[['最长飞行时间','45 分钟¹'],['安装方式','后部抽取']]},
 {name:'折叠机臂',en:'FOLDING ARMS',desc:'四条机臂连接中央机身与动力单元，展开形成稳定的四旋翼布局。铰接结构兼顾携带体积和展开后的刚性。',spec:[['结构','四机臂 · 可折叠'],['本页演示','折叠 / 展开 / 拆解']]},
 {name:'无刷电机',en:'BRUSHLESS MOTORS',desc:'四组直驱动力单元安装在机臂末端。模型呈现电机外壳、定子铜线与转轴层次，便于观察动力系统的组成。',spec:[['布局','四电机直驱'],['内部细节','程序化示意']]},
 {name:'低噪声螺旋桨',en:'LOW-NOISE PROPELLERS',desc:'按实物参考重绘后掠双叶桨、桨根铰接与橙色桨尖。飞行模式中四组桨叶成对反向转动，退出后恢复静止。',spec:[['配置','四组双叶桨'],['安装','快拆结构']]}
];
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch(e){$('#loading').textContent='WebGL 不可用，请在支持硬件加速的浏览器中打开。';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;host.prepend(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,100);camera.position.set(8,6,-9.5);
scene.fog=new THREE.FogExp2(0x0b0e12,.036);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(-.55,.2,0);controls.enableDamping=true;controls.minDistance=2.1;controls.maxDistance=23;controls.maxPolarAngle=Math.PI*.82;controls.autoRotateSpeed=.65;
scene.add(new THREE.HemisphereLight(0xdde6ed,0x343d39,.75));
const studioEnvironment=createStudioEnvironment(renderer);scene.environment=studioEnvironment.texture;scene.environmentIntensity=.7;
for(const [color,intensity,pos] of [[0xfff7eb,2.5,[1,7,-4]],[0xc6d9f5,1.6,[-6,3,3]],[0xe2ebd6,1.1,[5,2,5]]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(...pos);scene.add(light);}
const rig=new THREE.Group();scene.add(rig);
const model=createAir3S(rig),{groups,objects,propRoots}=model;
let foldTarget=0,foldAmount=0;
// Quiet technical stage: concentric rings, ground grid and a soft procedural contact shadow.
const grid=new THREE.GridHelper(120,120,0x2a373b,0x1a242b);grid.position.y=-1.28;grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
for(let radius of [3.9,4.05,5.5]){const pts=[];for(let i=0;i<=160;i++){let a=i/160*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*radius,-1.25,Math.sin(a)*radius));}const ring=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x53634b,transparent:true,opacity:radius===4.05?.3:.14}));scene.add(ring);}
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d'),grad=sc.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'#000b');grad.addColorStop(1,'#0000');sc.fillStyle=grad;sc.fillRect(0,0,128,128);const shadow=new THREE.Mesh(new THREE.PlaneGeometry(8,7),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-1.24;scene.add(shadow);
let flight,hovered=-1,inspectionId=-1;
let selected=0,targets=Array(6).fill(0),values=Array(6).fill(0),labelsVisible=true;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const labelElements=data.map((d,i)=>{const b=document.createElement('button');b.className='label';b.textContent=d.name;b.onclick=()=>select(i,true);$('#labels').append(b);return b;});
data.forEach((d,i)=>{const b=document.createElement('button');b.className='part';b.innerHTML=`<span class="num">0${i+1}</span><span class="name">${d.name}<small>${d.en}</small></span><span class="symbol">↗</span>`;b.onclick=()=>select(i,true);$('#parts').append(b);});
function select(i,toggle=false){if(flight?.enabled)return;const refocus=inspectionId>=0;selected=i;if(toggle){unfold();}if(toggle)targets[i]=targets[i]>.5?0:1;const d=data[i];$('#detail-tag').textContent=d.en+' / 0'+(i+1);$('#detail-title').textContent=d.name;$('#detail-text').textContent=d.desc;$('#detail-specs').innerHTML=d.spec.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');sync();if(refocus){inspectionId=i;requestAnimationFrame(()=>$('#detail-focus').click());}}
function sync(){document.querySelectorAll('.part').forEach((b,i)=>{b.classList.toggle('active',i===selected);b.classList.toggle('detached',targets[i]>.1);b.setAttribute('aria-pressed',String(i===selected));});$('#detach').textContent=targets[selected]>.1?'装回此部件 ↙':'拆解此部件 ↗';const average=targets.reduce((a,b)=>a+b,0)/6;$('#spread').value=Math.round(average*100);$('#percentage').textContent=Math.round(average*100)+'%';$('#assemble').classList.toggle('active',average===0);$('#explode').classList.toggle('active',average>0);$('#scene-state').textContent=average===0?'ASSEMBLED VIEW':'EXPLODED VIEW';}
function all(v){if(flight?.enabled&&v>0)return;if(v>0)unfold();targets.fill(v);sync();}$('#assemble').onclick=()=>{if(flight?.enabled)flight.reset();all(0);};$('#explode').onclick=()=>all(1);$('#spread').oninput=e=>all(Number(e.target.value)/100);$('#detach').onclick=()=>{unfold();targets[selected]=targets[selected]>.5?0:1;sync();};$('#rotate').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('#rotate').classList.toggle('active',controls.autoRotate);$('#rotate').setAttribute('aria-pressed',controls.autoRotate);};$('#labels-toggle').onclick=()=>{labelsVisible=!labelsVisible;$('#labels').hidden=!labelsVisible;$('#labels-toggle').classList.toggle('active',labelsVisible);$('#labels-toggle').setAttribute('aria-pressed',labelsVisible);};$('#reset').onclick=()=>{inspectionId=-1;document.body.classList.remove('inspection-mode');unfold();flight?.reset();all(0);controls.autoRotate=false;$('#rotate').classList.remove('active');$('#rotate').setAttribute('aria-pressed','false');camera.position.set(8,6,-9.5);controls.target.set(-.55,.2,0);select(0);};$('#help').onclick=()=>$('#help-dialog').showModal();$('#close-help').onclick=()=>$('#help-dialog').close();$('#help-dialog').onclick=e=>{if(e.target===$('#help-dialog'))$('#help-dialog').close();};
function visibleObjects(){return objects.filter(m=>{for(let p=m;p;p=p.parent)if(!p.visible)return false;return true;});}
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let down=null;
renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointerup',e=>{if(flight?.enabled||!down||e.button!==0||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const rect=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(visibleObjects())[0];if(hit){let g=hit.object;while(g&&g.userData.id===undefined)g=g.parent;if(g)select(g.userData.id,true);}});
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.zoom=w<600?.78:1;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);resize();select(0);$('#loading').remove();
let last=performance.now();function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;flight.update(dt);for(let i=0;i<6;i++)values[i]=reduced?targets[i]:THREE.MathUtils.damp(values[i],targets[i],6,dt);foldAmount=reduced?foldTarget:THREE.MathUtils.damp(foldAmount,foldTarget,6,dt);model.update(values,foldAmount,flight.enabled);groups.forEach((g,i)=>g.visible=inspectionId<0||inspectionId===i);
 objects.forEach(m=>{const mat=m.material;if(!mat.emissive)return;const id=m.userData.partId;const original=m.userData.baseEmissive;mat.emissive.setHex(original||0);mat.emissiveIntensity=original?1.25:0;const highlight=!flight.enabled&&id===selected?(.12+values[id]*.45):(!flight.enabled&&id===hovered?.48:0);if(mat.userData.selection)mat.userData.selection.value=highlight;});
 if(inspectionId>=0){const target=model.anchor(inspectionId),delta=target.clone().sub(controls.target);camera.position.add(delta);controls.target.copy(target);}
 controls.update();scene.updateMatrixWorld();const occupied=[];for(let i=0;i<6;i++){let point=model.anchor(i);point.project(camera);const el=labelElements[i],x=(point.x*.5+.5)*host.clientWidth,y=(-point.y*.5+.5)*host.clientHeight;const shifts=[[0,-42],[62,38],[-48,-45],[85,-10],[-55,37],[-15,-36]];const small=host.clientWidth<600;let lx=THREE.MathUtils.clamp(x+shifts[i][0]*(small?.5:1),55,host.clientWidth-55),ly=y+shifts[i][1];for(const box of occupied){if(Math.abs(lx-box.x)<110&&Math.abs(ly-box.y)<32)ly=box.y+35;}occupied.push({x:lx,y:ly});el.style.left=lx+'px';el.style.top=ly+'px';el.style.display=labelsVisible&&labelEnabled[i]&&!flight.enabled&&(inspectionId<0||inspectionId===i)&&point.z<1&&x>20&&x<host.clientWidth-20&&y>20&&y<host.clientHeight-20?'block':'none';}
 renderer.render(scene,camera);}

const labelEnabled=Array(6).fill(true);
const labelSettings=document.createElement('details');labelSettings.id='label-settings';labelSettings.innerHTML='<summary>部件标签 <span>独立显示 / 隐藏</span></summary><div>'+data.map((d,i)=>`<label><input type="checkbox" data-label="${i}" checked><span>${d.name}</span></label>`).join('')+'</div>';document.querySelector('aside').append(labelSettings);
labelSettings.querySelectorAll('input').forEach(input=>input.onchange=()=>{labelEnabled[Number(input.dataset.label)]=input.checked;});
flight=createFlight({rig,propRoots,controls,camera,assemble:()=>{inspectionId=-1;document.body.classList.remove('inspection-mode');foldTarget=0;foldAmount=0;updateFoldButton();targets.fill(0);values.fill(0);sync();}});

function updateFoldButton(){const b=$('#fold');b.classList.toggle('active',foldTarget>0);b.setAttribute('aria-pressed',String(foldTarget>0));b.textContent=foldTarget>0?'↔ 展开机臂':'⇥ 折叠机臂';}
function unfold(){foldTarget=0;updateFoldButton();}
$('#fold').onclick=()=>{if(flight.enabled)return;targets.fill(0);sync();foldTarget=foldTarget?0:1;updateFoldButton();};
const viewPositions={hero:[8,6,-9.5],front:[0,1,-13],top:[0,13,.01],side:[13,2,0]};

document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{inspectionId=-1;document.body.classList.remove('inspection-mode');document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el===b));controls.autoRotate=false;$('#rotate').classList.remove('active');$('#rotate').setAttribute('aria-pressed','false');const target=rig.position.clone();const destination=new THREE.Vector3(...viewPositions[b.dataset.view]).add(target);camera.position.copy(destination);controls.target.copy(target);controls.update();});
$('#inspection-exit').onclick=()=>{inspectionId=-1;document.body.classList.remove('inspection-mode');camera.position.set(8,6,-9.5);controls.target.set(-.55,.2,0);};
const focus=$('#detail-focus');focus.onclick=()=>{inspectionId=selected;document.body.classList.add('inspection-mode');controls.autoRotate=false;$('#rotate').classList.remove('active');$('#rotate').setAttribute('aria-pressed','false');scene.updateMatrixWorld(true);const target=model.anchor(selected);const offsets=[new THREE.Vector3(2.6,2.1,-3.7),new THREE.Vector3(1.2,.55,-2.8),new THREE.Vector3(2.0,1.6,3.2),new THREE.Vector3(1.6,1.1,-2.4),new THREE.Vector3(1.4,1.1,-2.4),new THREE.Vector3(1.0,2.7,-1.9)];controls.target.copy(target);camera.position.copy(target).add(offsets[selected]);controls.update();};
renderer.domElement.addEventListener('pointermove',e=>{if(e.buttons||flight.enabled)return;const rect=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(visibleObjects())[0];hovered=hit?.object.userData.partId??-1;renderer.domElement.style.cursor=hovered>=0?'pointer':'grab';});
renderer.domElement.addEventListener('pointerleave',()=>{hovered=-1;});
requestAnimationFrame(frame);
window.__airExplorer={getState:()=>({selected,targets:[...targets],values:[...values],meshCount:objects.length,inspectionId,fold:foldAmount,dimensions:model.dimensions,labelsVisible,labelEnabled:[...labelEnabled],flight:flight.state()}),select,all,renderer,scene,camera,rig,model,controls};

