import * as THREE from 'three';
import {finishSurface,opticalMaterial} from './surface-glsl.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

// Authoring units are 65 mm. Displayed at a presentation scale by the viewer.
// Exterior proportions follow DJI specifications; small details remain illustrative.
export const AUTHOR_UNIT_METRES=.065;
export function createAir3S(rig){
 const objects=[],groups=Array.from({length:6},(_,id)=>{const g=new THREE.Group();g.userData.id=id;rig.add(g);return g;});
 const material=(color,roughness=.48,metalness=.12)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const shell=material(0x60665f,.60,.08),edge=material(0x4f5752,.54,.12),rubber=material(0x181d1e,.75,.05),black=material(0x080d11,.34,.35),metal=material(0x939b9e,.3,.7),copper=material(0xb48247,.37,.76),orange=material(0xf29234,.43,.08);
 const glass=new THREE.MeshPhysicalMaterial({color:0x153329,metalness:.58,roughness:.11,clearcoat:1,clearcoatRoughness:.05});
 const led=material(0x99e94c,.3,.05);led.emissive.setHex(0x79c82f);led.emissiveIntensity=1.1;
 function mesh(parent,geo,mat,pos=[0,0,0]){const m=new THREE.Mesh(geo,finishSurface(mat.clone()));m.position.set(...pos);m.userData.baseEmissive=mat.emissive?.getHex()||0;m.userData.partId=findId(parent);parent.add(m);objects.push(m);return m;}
 function findId(g){while(g&&g.userData.id===undefined)g=g.parent;return g?.userData.id;}
 const box=(g,w,h,d,p,mat=shell,r=.04)=>mesh(g,new RoundedBoxGeometry(w,h,d,4,Math.min(r,w*.45,h*.45,d*.45)),mat,p);
 const cyl=(g,r,h,p,mat=black,rb=r)=>mesh(g,new THREE.CylinderGeometry(r,rb,h,48),mat,p);
 const torus=(g,r,t,p,mat=metal)=>mesh(g,new THREE.TorusGeometry(r,t,12,64),mat,p);
 function line(g,points,color=0x464b49){const m=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color}));g.add(m);return m;}
 function screw(g,p,axis='y',r=.023){const a=cyl(g,r,.014,p,metal);if(axis==='x')a.rotation.z=Math.PI/2;if(axis==='z')a.rotation.x=Math.PI/2;const b=box(g,r*1.25,.003,.008,[p[0],p[1]+.009,p[2]],black,.002);if(axis!=='y'){b.visible=false;}}
 function text(g,words,w,h,p,rotation=[0,0,0],color='#d5d8d5'){
  const c=document.createElement('canvas');c.width=1024;c.height=220;const ct=c.getContext('2d');ct.font='600 170px Arial';const textWidth=ct.measureText(words).width;c.width=Math.ceil(textWidth)+28;ct.fillStyle=color;ct.font='600 170px Arial';ct.textAlign='center';ct.textBaseline='middle';ct.fillText(words,c.width/2,115);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));m.position.set(...p);m.rotation.set(...rotation);g.add(m);return m;
 }
 // Continuous shell skins. Cross sections make the shoulders broad, crown flattened,
 // belly chamfered, and tail narrower; thickness is visible in exploded mode.
 function skin(sections,start,end,thickness=.035){
  const wCurve=new THREE.CatmullRomCurve3(sections.map(a=>new THREE.Vector3(a[0],a[1],a[3])));
  const hCurve=new THREE.CatmullRomCurve3(sections.map(a=>new THREE.Vector3(a[0],a[2],a[3])));
  const smooth=[];for(let i=0;i<=(sections.length-1)*8;i++){let t=i/((sections.length-1)*8),w=wCurve.getPoint(t),h=hCurve.getPoint(t);smooth.push([w.x,w.y,h.y,w.z]);}sections=smooth;
  const vertices=[],indices=[],n=40,count=sections.length;
  for(let layer=0;layer<2;layer++)for(const [z,w,h,cy] of sections)for(let j=0;j<=n;j++){
   const t=start+(end-start)*j/n,c=Math.cos(t),s=Math.sin(t),ww=w-layer*thickness,hh=h-layer*thickness;
   vertices.push(Math.sign(c)*Math.pow(Math.abs(c),.76)*ww,cy+Math.sign(s)*Math.pow(Math.abs(s),.67)*hh,z);
  }
  const span=count*(n+1);
  for(let k=0;k<2;k++)for(let i=0;i<count-1;i++)for(let j=0;j<n;j++){const a=k*span+i*(n+1)+j,b=a+1,c=a+n+1,d=c+1;indices.push(...(k?[a,c,b,b,c,d]:[a,b,c,b,d,c]));}
  for(let i=0;i<count-1;i++)for(const j of [0,n]){const a=i*(n+1)+j,b=a+n+1,c=a+span,d=b+span;indices.push(a,c,b,b,c,d);}
  for(const row of [0,count-1])for(let j=0;j<n;j++){const a=row*(n+1)+j,b=a+1,c=a+span,d=b+span;indices.push(a,b,c,b,d,c);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
 }
 const top=new THREE.Group(),middle=new THREE.Group(),bottom=new THREE.Group();groups[0].add(top,middle,bottom);
 const topSections=[[-1.54,.43,.19,.18],[-1.42,.57,.24,.18],[-1.13,.65,.29,.15],[-.68,.655,.34,.13],[-.14,.60,.32,.11],[.12,.565,.29,.1],[.28,.546,.275,.1]];
 mesh(top,skin(topSections,0,Math.PI),shell);
 mesh(bottom,skin([[-1.39,.43,.21,-.04],[-1.12,.61,.26,-.05],[-.6,.61,.27,-.04],[.2,.55,.25,-.025],[1.16,.45,.20,0],[1.52,.38,.15,.03]],Math.PI,2*Math.PI,.03),edge);
 // Perimeter frame is a true open ring, with structural cross braces rather than invented boards.
 const outline=new THREE.Shape();outline.moveTo(-.42,-1.38);outline.quadraticCurveTo(-.67,-1.2,-.61,-.6);outline.lineTo(-.48,1.25);outline.quadraticCurveTo(0,1.6,.48,1.25);outline.lineTo(.61,-.6);outline.quadraticCurveTo(.67,-1.2,.42,-1.38);outline.closePath();const hole=new THREE.Path();hole.moveTo(-.34,-1.15);hole.lineTo(.34,-1.15);hole.lineTo(.36,1.14);hole.lineTo(-.36,1.14);hole.closePath();outline.holes.push(hole);
 const frame=mesh(middle,new THREE.ExtrudeGeometry(outline,{depth:.09,bevelEnabled:true,bevelSize:.018,bevelThickness:.015,bevelSegments:2,steps:1}),rubber);frame.rotation.x=Math.PI/2;frame.position.y=.035;
 for(const z of [-.9,-.2,.55,1.15]){box(middle,.95,.07,.09,[0,0,z],edge,.016);for(const s of [-1,1]){cyl(middle,.062,.14,[s*.41,.025,z],edge);screw(middle,[s*.41,.102,z]);}}
 // Nose-mounted front vision sensors and the wide LiDAR facade.
 
 function lens(g,x,y,z,r){
  for(const [rr,depth,zz,mat] of [[r,.055,z,black],[r*.88,.06,z-.012,rubber],[r*.78,.064,z-.02,black],[r*.69,.069,z-.025,glass]]){const m=cyl(g,rr,depth,[x,y,zz],mat);m.rotation.x=Math.PI/2;}
  torus(g,r*.46,.008,[x,y,z-.066],material(0x42625b,.21,.65));const dot=mesh(g,new THREE.CircleGeometry(r*.12,16),material(0x8ba9c0,.12,.45),[x-r*.25,y+r*.28,z-.065]);dot.rotation.y=Math.PI;
 }
 for(const s of [-1,1]){const eye=new THREE.Group();eye.position.set(s*.535,.24,-1.415);eye.rotation.y=s*-.20;top.add(eye);const shoulder=mesh(eye,new THREE.SphereGeometry(1,48,32),shell,[0,.008,.012]);shoulder.scale.set(.177,.155,.218);lens(eye,0,0,-.19,.101);
  const sideEye=new THREE.Group();sideEye.position.set(s*.43,.20,1.30);sideEye.rotation.y=Math.PI+s*.48;groups[0].add(sideEye);lens(sideEye,0,0,-.035,.082);
 }
 // Small bottom optical windows face down, not forward.
 for(const x of [-.22,.22]){const down=new THREE.Group();down.position.set(x,-.304,-.3);down.rotation.x=-Math.PI/2;bottom.add(down);lens(down,0,0,0,.075);}
 const aux=cyl(bottom,.055,.018,[0,-.3,.23],material(0xd9d9bb,.24,.1));box(bottom,.15,.018,.21,[0,-.268,.53],black,.035);
 for(let s of [-1,1]){for(let j=0;j<9;j++)box(top,.018,.10,.032,[s*(.601-j*.004),.08,-.25+j*.076],black,.004);
  line(top,[[s*.59,.15,-1.05],[s*.63,.13,-.6],[s*.56,.115,.3]],0x565c59);
  for(const z of [-.85,.08])screw(top,[s*.42,profileY(topSections,z,s*.42)+.003,z]);}
 // Battery occupies the dorsal tail; no floating slab on the crown.
 const battery=groups[2];box(battery,.84,.33,1.13,[0,.025,.91],edge,.045);for(let i=0;i<5;i++)box(battery,.065,.028,.026,[-.16+i*.08,-.12,.325],metal,.003);mesh(battery,skin([[.307,.541,.275,.10],[.75,.50,.27,.1],[1.24,.455,.23,.08],[1.53,.375,.18,.075]],0,Math.PI),shell);
 box(battery,.72,.27,.12,[0,.075,1.5],shell,.065);box(battery,.46,.17,.025,[0,.085,1.57],edge,.025);
 for(let i=0;i<4;i++)box(battery,.028,.043,.012,[-.13+i*.067,.12,1.59],led,.008);
 const power=cyl(battery,.048,.013,[.235,.12,1.587],rubber);power.rotation.x=Math.PI/2;
 for(const s of [-1,1])box(battery,.057,.13,.27,[s*.505,.12,.56],edge,.025);

 // Recessed USB-C and microSD on the back of the lower fuselage.
 box(bottom,.39,.13,.04,[0,-.11,1.52],rubber,.03);box(bottom,.15,.047,.014,[-.10,-.1,1.546],metal,.017);box(bottom,.116,.026,.016,[-.10,-.1,1.555],black,.008);box(bottom,.12,.014,.018,[.105,-.1,1.552],black,.002);
 text(bottom,'USB-C   microSD',.33,.036,[0,-.2,1.542],[0,Math.PI,0],'#c3c9c5');
 // Shaped front aperture and optical gimbal, cross-checked against DJI's close-up.
 function roundedPolygon(points,r=.04){const path=new THREE.Shape();const corners=points.map((p,i)=>{const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length],v=new THREE.Vector2(...p),a=new THREE.Vector2(...prev).sub(v),b=new THREE.Vector2(...next).sub(v);const d=Math.min(r,a.length()*.3,b.length()*.3);return{v,a:a.normalize().multiplyScalar(d).add(v),b:b.normalize().multiplyScalar(d).add(v)};});path.moveTo(corners[0].a.x,corners[0].a.y);for(const c of corners){path.lineTo(c.a.x,c.a.y);path.quadraticCurveTo(c.v.x,c.v.y,c.b.x,c.b.y);}path.closePath();return path;}
 const lidar=roundedPolygon([[-.29,.14],[.29,.14],[.245,.275],[-.245,.275]],.035);const lidarMesh=mesh(top,new THREE.ExtrudeGeometry(lidar,{depth:.025,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:3,curveSegments:8}),black,[0,.035,-1.594]);
 const lidarGlass=mesh(top,new THREE.PlaneGeometry(.43,.075),material(0x101d21,.14,.55),[0,.243,-1.607]);lidarGlass.rotation.y=Math.PI;
 // A recessed U-shaped cradle underneath the brow; the black void stays open.
 for(const side of [-1,1]){const cheek=roundedPolygon([[side*.48,.04],[side*.63,.12],[side*.57,-.23],[side*.47,-.30]],.045);mesh(bottom,new THREE.ExtrudeGeometry(cheek,{depth:.24,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:4}),edge,[0,0,-1.43]);}
 const gimbal=groups[1],centerY=-.43;
 const mountPath=new THREE.CatmullRomCurve3([new THREE.Vector3(-.43,-.41,-1.53),new THREE.Vector3(-.42,-.17,-1.35),new THREE.Vector3(0,-.10,-1.27),new THREE.Vector3(.42,-.17,-1.35),new THREE.Vector3(.43,-.41,-1.53)]);
 mesh(gimbal,new THREE.TubeGeometry(mountPath,48,.058,12,false),rubber);
 const housingPts=[[-.235,.45],[.235,.45],[.335,.29],[.37,.07],[.34,-.30],[.25,-.45],[-.25,-.45],[-.34,-.30],[-.37,.07],[-.335,.29]];
 const housing=roundedPolygon(housingPts,.075);for(const pts of [[[-.135,.345],[.195,.345],[.267,.047],[-.218,.047]],[[-.258,-.025],[.267,-.025],[.215,-.355],[-.22,-.355]]]){const cut=roundedPolygon(pts.map(([x,y])=>[-x,y]),.04);housing.holes.push(new THREE.Path(cut.getPoints(48)));}mesh(gimbal,new THREE.ExtrudeGeometry(housing,{depth:.36,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:5,curveSegments:16}),material(0x252c2c,.47,.22),[0,centerY,-1.855]);
 const upperPts=[[-.135,.345],[.195,.345],[.267,.047],[-.218,.047]],lowerPts=[[-.258,-.025],[.267,-.025],[.215,-.355],[-.22,-.355]];
 const windows=[roundedPolygon(upperPts.map(([x,y])=>[-x,y]),.046),roundedPolygon(lowerPts.map(([x,y])=>[-x,y]),.057)];
 const front=roundedPolygon(housingPts.map(([x,y])=>[x*.97,y*.97]),.065);for(const path of windows)front.holes.push(new THREE.Path(path.getPoints(48)));
 mesh(gimbal,new THREE.ExtrudeGeometry(front,{depth:.025,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:3,curveSegments:16}),material(0x4d5551,.42,.4),[0,centerY,-1.916]);
 function cavity(shape,localY,radius){
  const pts=shape.getPoints(64),vertices=[],indices=[];for(let k=0;k<2;k++)for(const p of pts){const ratio=k?.81:1;vertices.push(p.x*ratio,centerY+localY+(p.y-localY)*ratio,k?-1.824:-1.915);}
  const n=pts.length;for(let i=0;i<n-1;i++)indices.push(i,i+1,i+n,i+1,i+n+1,i+n);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const walls=mesh(gimbal,geo,rubber);walls.material.side=THREE.DoubleSide;
  const backing=mesh(gimbal,new THREE.ShapeGeometry(shape,24),black,[0,centerY,-1.823]);backing.material.side=THREE.DoubleSide;
  for(const [rr,z] of [[radius*1.18,-1.838],[radius*1.08,-1.858],[radius*.94,-1.87]])torus(gimbal,rr,.009,[0,centerY+localY,z],black);
  const optic=mesh(gimbal,new THREE.SphereGeometry(radius,64,40),opticalMaterial(radius),[0,centerY+localY,-1.867]);optic.scale.z=.16;
 }
 cavity(windows[0],.185,.119);cavity(windows[1],-.18,.143);
 for(const side of [-1,1]){const joint=cyl(gimbal,.158,.135,[side*.392,centerY,-1.58],rubber);joint.rotation.z=Math.PI/2;const cap=cyl(gimbal,.131,.143,[side*.401,centerY,-1.58],black);cap.rotation.z=Math.PI/2;for(let k=0;k<2;k++){const groove=torus(gimbal,.142-k*.01,.004,[side*(.46+k*.006),centerY,-1.58],edge);groove.rotation.y=Math.PI/2;}}
 text(gimbal,'dji',.074,.031,[.244,centerY+.29,-1.948],[0,Math.PI,0],'#e6e8df');text(gimbal,'E70',.063,.023,[.272,centerY+.14,-1.949],[0,Math.PI,0],'#ced1cb');text(gimbal,'E24',.063,.023,[.272,centerY+.104,-1.949],[0,Math.PI,0],'#ced1cb');
 for(let i=0;i<8;i++)box(gimbal,.018,.028,.11,[-.105+i*.03,centerY-.466,-1.63],black,.004);
 // Four articulated arm assemblies; each motor follows its hinge even though
 // it remains independently selectable and explodable.
 const armRoots=[],motorRoots=[],propRoots=[],arms=[];
 function beam(g,a,b,width,height,mat=shell){
  const v=new THREE.Vector3().subVectors(b,a),length=v.length(),vertices=[],indices=[],cross=[[-.4,-.5],[.4,-.5],[.5,-.3],[.5,.28],[.34,.5],[-.34,.5],[-.5,.28],[-.5,-.3]],n=24;
  for(let i=0;i<=n;i++){const t=i/n;const root=1+.22*Math.exp(-t*12),tip=1+.15*Math.exp(-(1-t)*20);const w=width*root*tip,h=height*(.86+.14*Math.cos(t*Math.PI*2));for(const [x,y] of cross)vertices.push(x*w,y*h+Math.sin(t*Math.PI)*.015,t*length);}
  for(let i=0;i<n;i++)for(let j=0;j<8;j++){const a=i*8+j,b=i*8+(j+1)%8,c=a+8,d=b+8;indices.push(a,c,b,b,c,d);}for(let j=1;j<7;j++){indices.push(0,j,j+1);const base=n*8;indices.push(base,base+j+1,base+j);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const m=mesh(g,geo,mat,a.toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),v.normalize());return m;
 }
 for(const s of [-1,1])for(const front of [true,false]){
  const pivot=new THREE.Vector3(s*(front?.56:.47),front?.01:-.12,front?-.94:.96);
  const endpoint=new THREE.Vector3(s*(front?2.26:2.19),front?.035:.25,front?-1.35:1.86);
  const arm=new THREE.Group();arm.position.copy(pivot);groups[3].add(arm);const relative=endpoint.clone().sub(pivot);
  beam(arm,new THREE.Vector3(),relative,.23,.20);const hinge=cyl(arm,.145,.25,[0,0,0],edge);if(!front)hinge.rotation.z=Math.PI/2;
  const local=relative.clone();cyl(arm,.235,.17,local.toArray(),shell,.21);
  if(front){beam(arm,new THREE.Vector3(local.x,local.y-.05,local.z),new THREE.Vector3(local.x-s*.055,-.72,local.z+.13),.16,.16);box(arm,.15,.055,.24,[local.x-s*.055,-.75,local.z+.13],rubber,.02);box(arm,.05,.035,.15,[local.x+s*.12,local.y,local.z-.16],led,.01);}
  else box(arm,.18,.12,.21,[local.x,local.y-.13,local.z],edge,.035);
  screw(arm,[local.x+s*.20,local.y+.015,local.z],'x',.035);
  // Small model lettering belongs on the outside vertical face of the front arm.
  
  const motor=new THREE.Group();groups[4].add(motor);
  const profile=[[.191,.075],[.218,.085],[.226,.12],[.227,.255],[.213,.285],[.190,.297]].map(([r,y])=>new THREE.Vector2(r,y));mesh(motor,new THREE.LatheGeometry(profile,64),material(0x22282a,.42,.48));const topCover=new THREE.Shape();topCover.absarc(0,0,.195,0,Math.PI*2,false);for(let k=0;k<12;k++){const a=k*Math.PI/6,hole=new THREE.Path();hole.absellipse(Math.cos(a)*.15,Math.sin(a)*.15,.021,.042,0,Math.PI*2,true,a-Math.PI/2);topCover.holes.push(hole);}const cover=mesh(motor,new THREE.ExtrudeGeometry(topCover,{depth:.015,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:2,curveSegments:8}),black,[0,.315,0]);cover.rotation.x=Math.PI/2;cyl(motor,.049,.13,[0,.365,0],metal);
  for(let j=0;j<12;j++){const a=j*Math.PI/6;const winding=mesh(motor,new THREE.TorusGeometry(.021,.009,6,16,Math.PI*1.8),copper,[Math.cos(a)*.15,.289,Math.sin(a)*.15]);winding.rotation.x=Math.PI/2;const slot=box(motor,.025,.018,.075,[Math.cos(a)*.176,.317,Math.sin(a)*.176],black,.005);slot.rotation.y=-a;}
  for(let j=0;j<3;j++){let a=j*Math.PI*2/3;screw(motor,[Math.cos(a)*.095,.325,Math.sin(a)*.095]);}
  const prop=new THREE.Group();groups[5].add(prop);prop.rotation.y=s*(front?.32:-.5);cyl(prop,.115,.06,[0,0,0],black);cyl(prop,.045,.068,[0,.012,0],metal);
  for(const side of [-1,1]){const bladeGroup=new THREE.Group();bladeGroup.rotation.y=side<0?Math.PI:0;prop.add(bladeGroup);
   const shape=new THREE.Shape();shape.moveTo(.07,-.055);shape.bezierCurveTo(.28,-.10,.63,-.15,.94,-.12);shape.bezierCurveTo(1.13,-.10,1.28,-.045,1.36,.015);shape.quadraticCurveTo(1.4,.07,1.30,.09);shape.bezierCurveTo(.9,.16,.45,.095,.07,.055);shape.closePath();const blade=mesh(bladeGroup,new THREE.ExtrudeGeometry(shape,{depth:.013,bevelEnabled:true,bevelSize:.007,bevelThickness:.004,bevelSegments:2,steps:1,curveSegments:20}),material(0x252a2d,.53,.16));blade.rotation.x=-Math.PI/2;
   const tip=new THREE.Shape();tip.moveTo(1.28,-.035);tip.quadraticCurveTo(1.34,-.012,1.36,.015);tip.quadraticCurveTo(1.4,.07,1.30,.09);tip.lineTo(1.245,.099);tip.closePath();const cap=mesh(bladeGroup,new THREE.ExtrudeGeometry(tip,{depth:.018,bevelEnabled:false,curveSegments:12}),orange);cap.rotation.x=-Math.PI/2;cap.position.y=.003;
   bladeGroup.userData.foldSide=side;screw(bladeGroup,[.14,.026,0],'y',.019);
  }
  const entry={s,front,pivot,endpoint,arm,motor,prop,foldAngle:front?-s*1.70:s*1.94,restAngle:prop.rotation.y};arms.push(entry);armRoots.push({g:arm,dir:new THREE.Vector3(s*.9,0,front?-.3:.35)});motorRoots.push({g:motor,base:endpoint.clone(),dir:new THREE.Vector3(s*.9,1.0,front?-.3:.35)});propRoots.push({g:prop,restAngle:prop.rotation.y,base:endpoint.clone().add(new THREE.Vector3(0,.45,0)),dir:new THREE.Vector3(s*.9,1.85,front?-.3:.35)});
 }
 // Shell panel seams and service details. The seam follows the actual upper surface.
 function seam(g,points,radius=.005,mat=rubber){return mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(24,points.length*4),radius,6,false),mat);}
 function profileY(sections,z,x){const wCurve=new THREE.CatmullRomCurve3(sections.map(a=>new THREE.Vector3(a[0],a[1],a[3]))),hCurve=new THREE.CatmullRomCurve3(sections.map(a=>new THREE.Vector3(a[0],a[2],a[3])));let lo=0,hi=1;for(let i=0;i<16;i++){let t=(lo+hi)/2;if(wCurve.getPoint(t).x<z)lo=t;else hi=t;}const t=(lo+hi)/2,w=wCurve.getPoint(t),h=hCurve.getPoint(t),c=Math.pow(Math.min(.999,Math.abs(x)/w.y),1/.76);return w.z+h.y*Math.pow(Math.sqrt(1-c*c),.67);}
 function roofY(z,x){return profileY(topSections,z,x);}
 for(const side of [-1,1]){const points=[];for(let j=0;j<=16;j++){const z=-1.35+j*.095,x=side*(.42+.035*Math.sin(j/16*Math.PI));points.push([x,roofY(z,x)+.003,z]);}seam(top,points,.004,edge);}
 const batterySeam=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI;batterySeam.push([Math.cos(a)*.54,.1+Math.pow(Math.sin(a),.67)*.275,.294]);}seam(battery,batterySeam,.006,rubber);
 // A fitted dorsal panel and a larger readable mark, not a floating logo quad.
 const dorsal=[];for(const point of roundedPolygon([[-.285,.54],[.285,.54],[.285,1.29],[-.285,1.29]],.07).getPoints(60)){const x=point.x,z=point.y;dorsal.push([x,profileY([[.307,.541,.275,.10],[.75,.50,.27,.1],[1.24,.455,.23,.08],[1.53,.375,.18,.075]],z,x)+.003,z]);}seam(battery,dorsal,.004,edge);text(battery,'dji',.22,.075,[0,.372,.91],[-Math.PI/2,0,0],'#eef0e9');
 for(const a of arms){const g=a.arm;for(let j=0;j<3;j++){const ring=torus(g,.135-j*.014,.007,[0,.129,0],rubber);ring.rotation.x=Math.PI/2;}box(g,.29,.075,.32,[a.s*.075,-.06,a.front?.04:-.03],edge,.035);const shaft=cyl(g,.073,.02,[0,.142,0],black);screw(g,[0,.155,0]);
  const v=a.endpoint.clone().sub(a.pivot),dir=v.clone().normalize(),normal=new THREE.Vector3(a.s*dir.z,0,-a.s*dir.x),pos=v.clone().multiplyScalar(.54).addScaledVector(normal,.127);pos.y+=.025;const mark=text(g,'AIR 3S',.37,.075,pos.toArray(),[0,0,0],'#d9ded6');mark.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
 }
 // Belly fasteners, a recessed auxiliary light and optical/ToF windows.
 for(const side of [-1,1])for(const z of [-.93,-.55,.03,.63,1.13]){const fast=cyl(bottom,.024,.013,[side*(z<0?.47:.36),-.22,z],rubber);const inset=cyl(bottom,.010,.015,[side*(z<0?.47:.36),-.227,z],metal);}
 for(const side of [-1,1])for(let j=0;j<5;j++)box(bottom,.027,.07,.017,[side*.43,-.15,.7+j*.06],black,.004);
 // Match official unfolded, propeller-free bounding-box proportions with a
 // single fixed calibration. Individual feature positions are approximations.
 rig.updateMatrixWorld(true);
 // Motor/prop positions are set by the update function below; set them before calibration.
 function update(values,fold,flying=false){
  groups.forEach((g,i)=>g.position.set(0,i===1?-.45*values[1]:i===2?1.45*values[2]:0,i===1?-.9*values[1]:i===2?.9*values[2]:0));
  top.position.y=values[0]*1.05;middle.position.y=values[0]*.23;bottom.position.y=-values[0]*.62;
  arms.forEach((a,i)=>{
   const angle=a.foldAngle*fold,rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle),dir=armRoots[i].dir;
   a.arm.position.copy(a.pivot).addScaledVector(dir,values[3]);a.arm.rotation.y=angle;if(!flying)a.prop.rotation.y=a.restAngle+angle;for(const blade of a.prop.children.filter(c=>c.userData.foldSide)){const base=blade.userData.foldSide<0?Math.PI:0;let desired=(a.front?Math.PI/2:-Math.PI/2)-a.prop.rotation.y;desired=base+THREE.MathUtils.euclideanModulo(desired-base+Math.PI,Math.PI*2)-Math.PI;blade.rotation.y=THREE.MathUtils.lerp(base,desired,fold);blade.position.y=(blade.userData.foldSide<0?.018:0)*fold;}
   const end=a.endpoint.clone().sub(a.pivot).applyQuaternion(rotation).add(a.pivot);
   a.motor.position.copy(end).addScaledVector(motorRoots[i].dir,values[4]);a.prop.position.copy(end).add(new THREE.Vector3(0,.45,0)).addScaledVector(propRoots[i].dir,values[5]);
  });
 }
 update(Array(6).fill(0),0);
 // Calibration of full exterior geometry, excluding propeller assemblies.
 const calibrationBox=new THREE.Box3();for(let i=0;i<5;i++)calibrationBox.union(new THREE.Box3().setFromObject(groups[i]));const size=calibrationBox.getSize(new THREE.Vector3());
 const calibration=new THREE.Vector3((.32547/AUTHOR_UNIT_METRES)/size.x,(.106/AUTHOR_UNIT_METRES)/size.y,(.26611/AUTHOR_UNIT_METRES)/size.z);
 const geometryRoot=new THREE.Group();rig.add(geometryRoot);groups.forEach(g=>geometryRoot.add(g));geometryRoot.scale.copy(calibration);
 const anchorLocal=[new THREE.Vector3(.35,.45,-.6),new THREE.Vector3(.32,-.5,-1.94),new THREE.Vector3(.25,.35,1.25),new THREE.Vector3(1.1,.04,-1.1),new THREE.Vector3(0,.3,0),new THREE.Vector3(0,.06,0)];
 function anchor(id){let g=groups[id],v=anchorLocal[id].clone();if(id===0)g=top;if(id===3){g=arms[0].arm;v.set(.8,0,-.2);}if(id===4)g=arms[2].motor;if(id===5)g=arms[0].prop;return g.localToWorld(v);}
 const dimensions={unfoldedWithoutPropellersMm:[266.11,325.47,106],authorUnitMetres:AUTHOR_UNIT_METRES,calibration:calibration.toArray()};
 return {groups,objects,propRoots,update,anchor,geometryRoot,dimensions};
}
