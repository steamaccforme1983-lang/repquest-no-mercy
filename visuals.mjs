export const glyphs={
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  sword:'<path d="m14.5 17.5 3 3m-5.5-6 8-8V3h-3.5l-8 8m-3 10 4-4m-5-2 5.5 5.5m-4.5-9 6 6"/>',
  chart:'<path d="M3 3v18h18M8 16v-3m5 3V9m5 7V5"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  trophy:'<path d="M8 21h8m-4-4v4M7 4h10v6a5 5 0 0 1-10 0V4ZM7 6H4v2a3 3 0 0 0 3 3m10-5h3v2a3 3 0 0 1-3 3"/>',
  spark:'<path d="M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2ZM20 2v4m-2-2h4"/>',
  plug:'<path d="M9 3v5m6-5v5M6 8h12v4a6 6 0 0 1-12 0V8Zm6 10v4"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="m10 3-1 3-3 1-3 3v4l3 3 3 1 1 3h4l1-3 3-1 3-3v-4l-3-3-3-1-1-3z"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>', down:'<path d="m6 9 6 6 6-6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8z"/>',
  fire:'<path d="M12 22a7 7 0 0 0 7-7c0-4-2-7-5-10 0 3-2 4-2 4C11 6 9 3 8 2c1 7-3 8-3 13a7 7 0 0 0 7 7Z"/><path d="M10 19c-1-2 1-4 2-5 1 2 3 3 2 5"/>',
  dumbbell:'<path d="M6 7v10m12-10v10M3 9v6m18-6v6m-15-3h12"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  shield:'<path d="m12 22 4-3c3-2 4-4 4-8V5l-8-3-8 3v6c0 4 1 6 4 8z"/><path d="m9 12 2 2 4-4"/>',
  flag:'<path d="M5 21V4m0 1c5-5 8 4 14 0v10c-6 4-9-5-14 0"/>',
  heart:'<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1s-2 6 0 8l8 8 8-8c2-2 3-5 0-8Z"/>',
  moon:'<path d="M20 15A8 8 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
  star:'<path d="m12 3 2.7 5.8 6.3.8-4.6 4.5 1 6.4-5.4-3-5.4 3 1-6.4L3 9.6l6.3-.8z"/>',
  check:'<path d="m5 12 5 5L20 7"/>', minus:'<path d="M6 12h12"/>', x:'<path d="m6 6 12 12M18 6 6 18"/>', plus:'<path d="M12 5v14M5 12h14"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 10h18c0-3-3-3-3-10M10 22h4"/>',
  play:'<path d="m8 5 12 7-12 7z"/>', pause:'<path d="M9 5v14m6-14v14"/>', search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h1m-1 6h1m-1 6h1"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>', 
  send:'<path d="m3 4 19 8-19 8 4-8-4-8zm4 8h15"/>',
  note:'<path d="M8 4H5v16h14V4h-3m-8-1h8v4H8zm0 8h8m-8 4h6"/>',
  repeat:'<path d="M4 10a8 8 0 1 1 2 9m-2-9V4m0 6h6"/>'
};
export const icon=(name,size=20)=>'<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(glyphs[name]||glyphs.spark)+'</svg>';
export function emblem(){
  return '<svg class="emblem" aria-hidden="true" viewBox="0 0 370 290" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="facet" x2="1" y2="1"><stop stop-color="#f0e4ff"/><stop offset=".32" stop-color="#b28dfb"/><stop offset=".7" stop-color="#7541df"/><stop offset="1" stop-color="#31156b"/></linearGradient><linearGradient id="rim" x2="0" y2="1"><stop stop-color="#dec5ff"/><stop offset="1" stop-color="#5c31ad"/></linearGradient><radialGradient id="aura"><stop stop-color="#9365fe" stop-opacity=".36"/><stop offset="1" stop-color="#9365fe" stop-opacity="0"/></radialGradient></defs><ellipse cx="195" cy="144" rx="165" ry="143" fill="url(#aura)"/><g fill="none" stroke="#9b73fd"><ellipse cx="192" cy="147" rx="155" ry="69" transform="rotate(-18 192 147)" opacity=".3"/><ellipse cx="192" cy="147" rx="143" ry="90" transform="rotate(32 192 147)" opacity=".2"/><circle cx="191" cy="142" r="108" opacity=".2" stroke-dasharray="1 5"/><circle cx="191" cy="142" r="120" opacity=".17"/><path d="M72 142h240m-121-120v240" opacity=".13"/></g><g opacity=".75" fill="#bfa5ff"><path d="m40 118 3 8 8 3-8 3-3 8-3-8-8-3 8-3zm269-58 3 9 9 3-9 3-3 9-3-9-9-3 9-3zm20 124 2 5 5 2-5 2-2 5-2-5-5-2 5-2zM79 60l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><circle cx="107" cy="207" r="3"/><circle cx="279" cy="132" r="2"/><circle cx="129" cy="39" r="2"/><circle cx="263" cy="214" r="3"/></g><path d="m191 47 75 43v90l-75 46-75-46V90z" fill="#41217d" stroke="url(#rim)" stroke-width="2"/><path d="m191 57 66 39v79l-66 40-66-40V96z" fill="url(#facet)"/><path d="m191 57 66 39-66 36-66-36zm66 118-66 40v-83z" fill="#6d43bf" opacity=".55"/><path d="m191 71 55 32v66l-55 33-55-33v-66z" fill="#251548" stroke="#d7bcff" stroke-opacity=".7"/><path d="m191 78 48 29v56l-48 29-48-29v-56z" fill="#35205b"/><path d="m191 85 11 33 33 12-33 12-11 37-11-37-33-12 33-12z" fill="url(#facet)" stroke="#e2caff" stroke-width="1.5"/><path d="m191 85 0 45-44 0 33-12zM191 130l44 0-33 12-11 37z" fill="#ecdafe" opacity=".7"/><path d="m177 141 14-11 11-12m-27 48-12 6m56-67 11-6" fill="none" stroke="#f5eaff" opacity=".6"/><path d="m191 219 7 9-7 9-7-9z" fill="#ba99ff"/></svg>';
}
const poses={
 squat:[[[100,29],[99,70],[92,100],[96,141],[99,72],[121,89],[138,90]],[[87,46],[98,88],[128,99],[102,141],[91,67],[122,69],[139,69]]],
 push:[[[92,38],[79,76],[67,107],[54,141],[88,55],[116,63],[153,61]],[[119,39],[105,75],[82,108],[54,141],[115,56],[132,77],[153,61]]],
 bridge:[[[55,124],[82,127],[113,102],[145,141],[78,129],[100,135],[121,137]],[[53,123],[84,103],[112,87],[145,141],[73,119],[98,130],[121,137]]],
 bug:[[[54,125],[91,125],[113,85],[145,84],[72,125],[75,96],[75,72]],[[54,125],[91,125],[123,104],[156,132],[72,125],[54,103],[36,92]]],
 bird:[[[125,72],[85,85],[63,116],[34,119],[109,81],[111,114],[111,140]],[[130,70],[83,83],[51,80],[18,77],[111,76],[138,72],[166,71]]],
 march:[[[99,27],[99,72],[94,106],[92,140],[99,52],[111,77],[106,96]],[[99,27],[99,72],[125,83],[120,114],[99,52],[117,66],[127,57]]],
 reach:[[[93,40],[95,90],[127,91],[129,141],[92,60],[73,82],[81,95]],[[86,40],[95,90],[127,91],[129,141],[89,58],[72,37],[53,20]]]
};
export function demo(canvas,pose){
  const ctx=canvas.getContext('2d');
  const [from,to]=poses[pose]||poses.reach;
  const draw=t=>{
    ctx.clearRect(0,0,200,158);
    ctx.strokeStyle='#62557f';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(18,143);ctx.lineTo(180,143);ctx.stroke();
    if(pose==='push'||pose==='reach'){ctx.beginPath();if(pose==='push'){ctx.moveTo(154,23);ctx.lineTo(154,143);}else{ctx.moveTo(79,143);ctx.lineTo(79,100);ctx.lineTo(135,100);ctx.lineTo(135,143);}ctx.stroke();}
    const points=from.map(([x,y],i)=>[x+(to[i][0]-x)*t,y+(to[i][1]-y)*t]);
    ctx.strokeStyle='#bf9bff';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=7;
    for(const line of [[0,1,2,3],[4,5,6]]){ctx.beginPath();line.forEach((index,i)=>{ctx[i?'lineTo':'moveTo'](...points[index]);});ctx.stroke();}
    ctx.fillStyle='#e1ccff';ctx.beginPath();ctx.arc(points[0][0],points[0][1]-9,10,0,2*Math.PI);ctx.fill();
  };
  draw(0);
  return draw;
}
