import * as THREE from 'three';

export function createFlight({rig,propRoots,controls,camera,assemble}){
 const $=s=>document.querySelector(s),keys=new Set(),position=new THREE.Vector3(),velocity=new THREE.Vector3();
 let enabled=false,phase='ground',altitude=0,yaw=0,rpm=0,time=0,orbit=false,elapsed=0;
 const panel=document.createElement('section');panel.id='flight-panel';panel.hidden=true;panel.innerHTML=`<div class="eyebrow">VIRTUAL FLIGHT DECK</div><h2>让探索起飞。</h2><p class="flight-note">交互飞行演示 · 非真实飞控仿真</p><div class="flight-status"><i></i><span id="flight-status">准备起飞</span><small>SIMULATION</small></div><div class="telemetry"><div><small>相对高度</small><strong id="alt">0.0 <em>m</em></strong></div><div><small>水平速度</small><strong id="speed">0.0 <em>m/s</em></strong></div><div><small>航向</small><strong id="heading">000 <em>°</em></strong></div><div><small>飞行时间</small><strong id="timer">00:00</strong></div></div><div class="flight-actions"><button id="takeoff">↑ 起飞</button><button id="land" disabled>↓ 降落</button><button id="flight-orbit" disabled>◎ 自动巡航</button><button id="home" disabled>⌂ 返回起点</button></div><div class="key-guide"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 前后左右</span><span><kbd>↑</kbd><kbd>↓</kbd> 升降</span><span><kbd>Q</kbd><kbd>E</kbd> 机头转向</span><small>失去焦点自动悬停 · 最高 12 m · 活动半径 18 m</small></div><div class="touch-controls"><div><button data-key="KeyW" aria-label="向前">▲</button><div><button data-key="KeyA" aria-label="向左">◀</button><button data-key="KeyS" aria-label="向后">▼</button><button data-key="KeyD" aria-label="向右">▶</button></div></div><div class="vertical-pad"><button data-key="ArrowUp">升高 +</button><button data-key="ArrowDown">降低 −</button><button data-key="KeyQ">左转</button><button data-key="KeyE">右转</button></div></div>`;document.querySelector('aside').append(panel);
 function clear(){keys.clear();orbit=false;$('#flight-orbit').classList.remove('active');}
 function reset(){clear();phase='ground';altitude=0;yaw=0;rpm=0;elapsed=0;position.set(0,0,0);velocity.set(0,0,0);rig.position.set(0,0,0);rig.rotation.set(0,0,0);propRoots.forEach(p=>p.g.rotation.y=p.restAngle);}
 function mode(on){reset();enabled=on;assemble();document.body.classList.toggle('flight-mode',on);panel.hidden=!on;document.querySelectorAll('#parts,#detail,.hint').forEach(e=>e.hidden=on);$('#count').textContent=on?'FLIGHT SIMULATOR':'06 COMPONENTS';document.querySelector('.panel-heading').firstChild.textContent=on?'飞行控制台 ':'部件探索 ';$('#flight-toggle').classList.toggle('active',on);$('#flight-toggle').setAttribute('aria-pressed',on);document.querySelectorAll('#explode,#spread,#detach,#fold').forEach(e=>e.disabled=on);controls.autoRotate=false;$('#rotate').classList.remove('active');$('#rotate').setAttribute('aria-pressed','false');camera.position.set(10,8,-13);controls.target.set(0,.6,0);$('#scene-state').textContent=on?'FLIGHT SIMULATION':'ASSEMBLED VIEW';update(0);}
 $('#flight-toggle').onclick=()=>mode(!enabled);
 $('#takeoff').onclick=()=>{if(phase==='ground'){phase='takeoff';clear();}};
 $('#land').onclick=()=>{if(phase!=='ground'){phase='landing';clear();}};
 $('#flight-orbit').onclick=()=>{if(phase==='flying'){orbit=!orbit;$('#flight-orbit').classList.toggle('active',orbit);}};
 $('#home').onclick=()=>{if(phase==='flying'){clear();phase='returning';}};
 function accept(e){return enabled&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)&&!document.querySelector('dialog[open]');}
 const codes=['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown'];
 window.addEventListener('keydown',e=>{if(accept(e)&&codes.includes(e.code)){e.preventDefault();keys.add(e.code);if(orbit)clearOrbit();}});
 function clearOrbit(){orbit=false;$('#flight-orbit').classList.remove('active');}
 window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 panel.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);clearOrbit();});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.key));});
 function update(dt){if(!enabled)return;time+=dt;if(phase!=='ground')elapsed+=dt;
  const active=phase!=='ground';rpm=THREE.MathUtils.damp(rpm,active?34:0,3,dt);
  if(phase==='takeoff'){altitude=THREE.MathUtils.damp(altitude,3,1.7,dt);if(altitude>2.95)phase='flying';}
  if(phase==='landing'){altitude=Math.max(0,altitude-dt*1.4);velocity.multiplyScalar(Math.exp(-dt*4));if(altitude===0){phase='ground';velocity.set(0,0,0);}}
  if(phase==='flying'){
   yaw+=((keys.has('KeyQ')?1:0)-(keys.has('KeyE')?1:0))*dt*1.15;
   const x=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),z=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0);
   const desired=new THREE.Vector3(x,0,z);if(desired.length()>1)desired.normalize();desired.multiplyScalar(3.2).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
   if(orbit){const a=time*.24;desired.set(Math.cos(a)*2.2,0,Math.sin(a)*2.2);yaw=-a-Math.PI/2;}
   velocity.lerp(desired,1-Math.exp(-dt*2.5));altitude=THREE.MathUtils.clamp(altitude+((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0))*dt*2,1,12);
  }
  if(phase==='returning'){const desired=position.clone().multiplyScalar(-1.3).clampLength(0,3.2);velocity.lerp(desired,1-Math.exp(-dt*3));if(position.length()<.08&&velocity.length()<.12){phase='flying';position.set(0,0,0);velocity.set(0,0,0);}}
  if(phase!=='takeoff')position.addScaledVector(velocity,dt);if(position.length()>18){position.clampLength(0,18);velocity.multiplyScalar(.5);}
  // One world unit maps to one displayed demonstration metre; ground clearance stays positive.
  const previous=rig.position.clone();rig.position.set(position.x,altitude+(active?Math.sin(time*2.2)*.025:0),position.z);
  rig.rotation.y=yaw;const local=velocity.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-yaw);rig.rotation.x=THREE.MathUtils.damp(rig.rotation.x,local.z*.035,4,dt);rig.rotation.z=THREE.MathUtils.damp(rig.rotation.z,-local.x*.035,4,dt);
  propRoots.forEach((p,i)=>p.g.rotation.y+=(i===0||i===3?1:-1)*rpm*dt);
  const delta=rig.position.clone().sub(previous);camera.position.add(delta);controls.target.add(delta);
  $('#alt').innerHTML=altitude.toFixed(1)+' <em>m</em>';$('#speed').innerHTML=velocity.length().toFixed(1)+' <em>m/s</em>';$('#heading').innerHTML=String(Math.round(THREE.MathUtils.euclideanModulo(-yaw*180/Math.PI,360))).padStart(3,'0')+' <em>°</em>';$('#timer').textContent=String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(Math.floor(elapsed%60)).padStart(2,'0');
  $('#flight-status').textContent=({ground:'准备起飞',takeoff:'正在起飞',flying:orbit?'自动巡航':'稳定飞行',landing:'正在降落',returning:'返回起点'})[phase];$('#takeoff').disabled=phase!=='ground';$('#land').disabled=phase==='ground'||phase==='landing';$('#flight-orbit').disabled=phase!=='flying';$('#home').disabled=phase!=='flying';
 }
 return {update,reset:()=>mode(false),get enabled(){return enabled;},state:()=>({enabled,phase,altitude,yaw,position:position.toArray(),speed:velocity.length(),rpm})};
}
