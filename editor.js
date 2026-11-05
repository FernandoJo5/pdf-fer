/* PDF Fer Visual Editor — PDF.js + pdf-lib. Todos los cambios se exportan a un nuevo PDF. */
(() => {
 'use strict';
 const PDF_CDN='https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
 const READER_CDN='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
 const WORKER_CDN='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 const ids=(id)=>document.getElementById(id);
 const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icon=(name)=>`<i data-lucide="${name}"></i>`;
 const refresh=()=>window.lucide?.createIcons();
 const load=(url,global)=>new Promise((res,rej)=>{
   if(window[global])return res(window[global]);
   const s=document.createElement('script');s.src=url;s.onload=()=>window[global]?res(window[global]):rej(new Error('Falta la biblioteca '+global));s.onerror=()=>rej(new Error('No se descargó '+global+'. Revisa la conexión.'));document.head.appendChild(s);
 });
 const makeId=()=>Math.random().toString(36).slice(2,11);
 const rgb=(hex)=>{const a=hex.replace('#','');const s=a.length===3?a.split('').map(x=>x+x).join(''):a;return window.PDFLib.rgb(parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255);};
 const tools=[['select','mouse-pointer-2','Seleccionar'],['text','type','Texto'],['pen','pen-tool','Dibujar'],['rect','square','Rectángulo'],['highlight','highlighter','Resaltar'],['whiteout','eraser','Cubrir'],['image','image-plus','Imagen']];
 const engine={file:null,reader:null,doc:null,page:1,tool:'select',scale:1,viewport:null,annotations:[],history:[],historyIndex:-1,selected:null,gesture:null,renderCount:0,readOnly:false,pendingImage:null,url:null,installed:false};
 function shell(){
   if(ids('fer-editor'))return;
   const dialog=document.createElement('dialog');dialog.id='fer-editor';dialog.setAttribute('aria-label','Editor visual de PDF Fer');
   dialog.innerHTML=`<div class="ed-layout">
    <header class="ed-top"><div class="ed-logo"><span class="fer-brandmark">FJ</span><div><strong>PDF Fer <span style="font-weight:400;color:#76829b">/ Editor</span></strong><small id="ed-filename">Cargando documento…</small></div></div>
      <div class="ed-actions"><button type="button" class="ed-button" id="ed-undo" title="Deshacer (Ctrl+Z)">${icon('undo-2')}<span class="ed-label-hide">Deshacer</span></button><button type="button" class="ed-button" id="ed-redo" title="Rehacer (Ctrl+Y)">${icon('redo-2')}<span class="ed-label-hide">Rehacer</span></button><button type="button" class="ed-button ed-button-primary" id="ed-save">${icon('download')} Guardar PDF</button><button type="button" class="ed-button" id="ed-close" title="Cerrar editor">${icon('x')}</button></div>
    </header>
    <div class="ed-body">
      <aside class="ed-sidebar"><p class="ed-side-title">Herramientas</p>${tools.map(([id,i,label])=>`<button type="button" class="ed-tool ${id==='select'?'active':''}" data-ed-tool="${id}">${icon(i)}<span>${label}</span></button>`).join('')}<hr/><div class="ed-note">Arrastra para crear rectángulos o dibujar. Haz clic en una anotación para moverla. Los cambios no sobrescriben tu PDF original.</div></aside>
      <div class="ed-main"><div class="ed-canvasbar"><div class="ed-page-nav"><button class="ed-button" id="ed-prev" title="Página anterior">${icon('chevron-left')}</button><input id="ed-page" type="number" min="1" value="1" aria-label="Página actual"><span id="ed-total">/ 1</span><button class="ed-button" id="ed-next" title="Página siguiente">${icon('chevron-right')}</button></div>
      <div class="ed-page-nav"><button class="ed-button" id="ed-zoomout">${icon('minus')}</button><span id="ed-zoomvalue">100 %</span><button class="ed-button" id="ed-zoomin">${icon('plus')}</button></div></div>
      <div class="ed-scroll" id="ed-scroll"><div class="ed-paper" id="ed-paper"><canvas id="ed-canvas" aria-label="Vista previa de la página PDF"></canvas><div class="ed-overlay" id="ed-overlay" data-tool="select"><div class="ed-preview" id="ed-preview"></div></div></div></div>
      <div class="ed-status" id="ed-status" aria-live="polite">Selecciona una herramienta y haz clic sobre la página.</div></div>
      <aside class="ed-inspector"><p class="ed-side-title">Propiedades</p><label class="ed-formlabel" for="ed-text">Texto</label><textarea id="ed-text" class="ed-input" rows="3" placeholder="Escribe aquí para colocar texto">Texto nuevo</textarea>
      <label class="ed-formlabel" for="ed-size">Tamaño / grosor</label><input id="ed-size" class="ed-input" type="number" min="1" max="96" value="18">
      <label class="ed-formlabel" for="ed-color">Color</label><input id="ed-color" type="color" value="#263b80">
      <button type="button" class="ed-button ed-button-danger" id="ed-delete">${icon('trash-2')} Eliminar selección</button>
      <hr><p class="ed-side-title">Anotaciones de esta página</p><div id="ed-items" class="ed-list"></div>
      <div class="ed-note"><b>¿Editar texto existente?</b> Este editor permite agregar anotaciones, imágenes y formas encima del documento. No reemplaza los objetos de texto originales. “Cubrir” solo los oculta visualmente, no es una censura segura.</div>
      <input type="file" id="ed-file-image" accept="image/png,image/jpeg,image/webp" hidden>
      </aside>
    </div></div>`;
   document.body.appendChild(dialog);
   dialog.addEventListener('close',cleanup);
   ids('ed-close').addEventListener('click',()=>dialog.close());
   ids('ed-save').addEventListener('click',save);
   ids('ed-undo').addEventListener('click',undo);
   ids('ed-redo').addEventListener('click',redo);
   ids('ed-prev').addEventListener('click',()=>goto(engine.page-1));
   ids('ed-next').addEventListener('click',()=>goto(engine.page+1));
   ids('ed-page').addEventListener('change',e=>goto(Number(e.target.value)||1));
   ids('ed-zoomout').addEventListener('click',()=>zoom(-.15));
   ids('ed-zoomin').addEventListener('click',()=>zoom(.15));
   ids('ed-delete').addEventListener('click',deleteSelected);
   dialog.querySelectorAll('[data-ed-tool]').forEach(btn=>btn.addEventListener('click',()=>setTool(btn.dataset.edTool)));
   ids('ed-color').addEventListener('change',updateSelected);
   ids('ed-size').addEventListener('change',updateSelected);
   ids('ed-text').addEventListener('change',updateSelected);
   ids('ed-file-image').addEventListener('change',onImage);
   const over=ids('ed-overlay');
   over.addEventListener('pointerdown',pointerDown);
   over.addEventListener('pointermove',pointerMove);
   over.addEventListener('pointerup',pointerUp);
   over.addEventListener('pointercancel',pointerCancel);
   document.addEventListener('keydown',keyHandler);
   refresh();
 }
 const setStatus=(msg)=>{if(ids('ed-status'))ids('ed-status').textContent=msg;};
 function setTool(tool){
   if(tool==='image'&&!engine.pendingImage){ids('ed-file-image').click();return;}
   engine.tool=tool;
   ids('ed-overlay').dataset.tool=tool;
   document.querySelectorAll('[data-ed-tool]').forEach(b=>b.classList.toggle('active',b.dataset.edTool===tool));
   const hints={select:'Selecciona una anotación para moverla o editarla en el panel.',text:'Escribe el texto en Propiedades y haz clic en la página.',pen:'Arrastra el cursor para dibujar sobre la página.',rect:'Arrastra para dibujar un rectángulo sin relleno.',highlight:'Arrastra para resaltar contenido con transparencia.',whiteout:'Arrastra para cubrir visualmente. NO equivale a censurar.',image:'Haz clic en la página para colocar la imagen.'};
   setStatus(hints[tool]);
 }
 function commit(){
   engine.history=engine.history.slice(0,engine.historyIndex+1);
   engine.history.push(JSON.stringify(engine.annotations));
   if(engine.history.length>40)engine.history.shift();
   engine.historyIndex=engine.history.length-1;
   updateUndo();
 }
 function updateUndo(){ids('ed-undo').disabled=engine.historyIndex<=0;ids('ed-redo').disabled=engine.historyIndex>=engine.history.length-1;}
 function undo(){if(engine.historyIndex<=0)return;engine.historyIndex--;engine.annotations=JSON.parse(engine.history[engine.historyIndex]);engine.selected=null;renderAnnotations();updateUndo();}
 function redo(){if(engine.historyIndex>=engine.history.length-1)return;engine.historyIndex++;engine.annotations=JSON.parse(engine.history[engine.historyIndex]);engine.selected=null;renderAnnotations();updateUndo();}
 function deleteSelected(){if(!engine.selected)return;engine.annotations=engine.annotations.filter(a=>a.id!==engine.selected);engine.selected=null;commit();renderAnnotations();}
 function hex(){return ids('ed-color').value||'#263b80';}
 function size(){return Math.min(96,Math.max(1,Number(ids('ed-size').value)||18));}
 function imageData(){return engine.pendingImage;}
 function updateSelected(){
   const obj=engine.annotations.find(x=>x.id===engine.selected);if(!obj)return;
   if(obj.type==='text')obj.text=ids('ed-text').value;
   obj.color=hex();obj.size=size();
   commit();renderAnnotations();
 }
 function selectObject(id){
   engine.selected=id;
   const a=engine.annotations.find(x=>x.id===id);
   if(a){ids('ed-size').value=a.size||18;ids('ed-color').value=a.color||'#263b80';if(a.type==='text')ids('ed-text').value=a.text;}
   renderAnnotations();
 }
 function normalizePoint(e){
   const b=ids('ed-overlay').getBoundingClientRect();
   return {cx:Math.max(0,Math.min(b.width,e.clientX-b.left)),cy:Math.max(0,Math.min(b.height,e.clientY-b.top))};
 }
 function pdfPoint(p){return engine.viewport.convertToPdfPoint(p.cx,p.cy);}
 function previewRect(a,b){const pre=ids('ed-preview');const x=Math.min(a.cx,b.cx),y=Math.min(a.cy,b.cy);pre.style.left=x+'px';pre.style.top=y+'px';pre.style.width=Math.abs(a.cx-b.cx)+'px';pre.style.height=Math.abs(a.cy-b.cy)+'px';pre.style.display='block';}
 function clearPreview(){ids('ed-preview').style.display='none';}
 function pointerDown(e){
   if(e.button!==0||!engine.viewport)return;
   const spot=normalizePoint(e),[x,y]=pdfPoint(spot);
   const annot=e.target.closest?.('[data-ed-id]');
   if(engine.tool==='select'){
     if(annot){selectObject(annot.dataset.edId);engine.gesture={mode:'move',id:annot.dataset.edId,start:[x,y],moved:false};}
     else {engine.selected=null;renderAnnotations();}
     if(engine.gesture)ids('ed-overlay').setPointerCapture(e.pointerId);
     return;
   }
   if(engine.tool==='text'){
     const content=ids('ed-text').value.trim();if(!content){setStatus('Escribe primero un texto.');return;}
     engine.annotations.push({id:makeId(),type:'text',page:engine.page,x,y,text:content,size:size(),color:hex()});commit();renderAnnotations();return;
   }
   if(engine.tool==='image'){
     if(!imageData()){ids('ed-file-image').click();return;}
     const w=140,h=engine.pendingImageRatio?140/engine.pendingImageRatio:90;
     engine.annotations.push({id:makeId(),type:'image',page:engine.page,x,y:y-h,w,h,data:imageData(),size:12,color:hex()});commit();renderAnnotations();setTool('select');return;
   }
   engine.gesture={mode:engine.tool,start:spot,end:spot,points:[[x,y]]};
   ids('ed-overlay').setPointerCapture(e.pointerId);
   if(engine.tool==='pen')setStatus('Dibujando…');else previewRect(spot,spot);
 }
 function pointerMove(e){
   const g=engine.gesture;if(!g||!engine.viewport)return;
   const pt=normalizePoint(e),[x,y]=pdfPoint(pt);
   if(g.mode==='move'){
     const obj=engine.annotations.find(a=>a.id===g.id);if(!obj)return;
     const dx=x-g.start[0],dy=y-g.start[1];g.start=[x,y];if(Math.abs(dx)+Math.abs(dy)>0.001)g.moved=true;
     if(obj.type==='pen')obj.points=obj.points.map(p=>[p[0]+dx,p[1]+dy]);
     else{obj.x+=dx;obj.y+=dy;}
     renderAnnotations();return;
   }
   g.end=pt;
   if(g.mode==='pen'){
     g.points.push([x,y]);
     const overlay=ids('ed-overlay');const old=overlay.querySelector('.ed-templine');old?.remove();
     const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('ed-templine');svg.setAttribute('width','100%');svg.setAttribute('height','100%');svg.style.cssText='position:absolute;inset:0;pointer-events:none';
     const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',g.points.map((p,i)=>{const q=engine.viewport.convertToViewportPoint(...p);return (i?'L':'M')+q[0]+' '+q[1];}).join(' '));path.setAttribute('fill','none');path.setAttribute('stroke',hex());path.setAttribute('stroke-width',String(Math.max(1,size()/6)*engine.scale));path.setAttribute('stroke-linecap','round');svg.appendChild(path);overlay.appendChild(svg);
   } else previewRect(g.start,g.end);
 }
 function pointerUp(e){
   const g=engine.gesture;if(!g)return;
   engine.gesture=null;clearPreview();ids('ed-overlay').querySelector('.ed-templine')?.remove();
   if(g.mode==='move'){if(g.moved)commit();renderAnnotations();return;}
   if(g.mode==='pen'){
     if(g.points.length<2)return;
     engine.annotations.push({id:makeId(),type:'pen',page:engine.page,points:g.points,size:Math.max(1,size()/6),color:hex()});
     commit();renderAnnotations();return;
   }
   const [x1,y1]=pdfPoint(g.start),[x2,y2]=pdfPoint(g.end);
   if(Math.abs(x1-x2)<4||Math.abs(y1-y2)<4)return;
   engine.annotations.push({id:makeId(),type:g.mode,page:engine.page,x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.abs(x2-x1),h:Math.abs(y2-y1),size:Math.max(.75,size()/6),color:hex()});
   commit();renderAnnotations();
 }
 function pointerCancel(){engine.gesture=null;clearPreview();ids('ed-overlay')?.querySelector('.ed-templine')?.remove();}
 function bbox(a){
   const vp=engine.viewport;const p1=vp.convertToViewportPoint(a.x,a.y);const p2=vp.convertToViewportPoint(a.x+a.w,a.y+a.h);
   return {left:Math.min(p1[0],p2[0]),top:Math.min(p1[1],p2[1]),width:Math.abs(p1[0]-p2[0]),height:Math.abs(p1[1]-p2[1])};
 }
 function annotateName(a){return ({text:'Texto',pen:'Trazo',rect:'Rectángulo',highlight:'Resaltado',whiteout:'Cubierta',image:'Imagen'})[a.type]||a.type;}
 function renderAnnotations(){
   const over=ids('ed-overlay');if(!over||!engine.viewport)return;
   over.querySelectorAll('[data-ed-id]').forEach(x=>x.remove());
   const curr=engine.annotations.filter(a=>a.page===engine.page);
   for(const a of curr){
     const element=document.createElement('div');element.className='ed-object'+(engine.selected===a.id?' selected':'');element.dataset.edId=a.id;element.dataset.type=a.type;
     if(a.type==='text'){
       const pt=engine.viewport.convertToViewportPoint(a.x,a.y);
       element.style.left=pt[0]+'px';element.style.top=(pt[1]-(a.size||16)*engine.scale)+'px';
       element.style.fontSize=(a.size||16)*engine.scale+'px';element.style.color=a.color;element.textContent=a.text;
       element.style.lineHeight='1.1';
     }else if(a.type==='pen'){
       const screen=a.points.map(p=>engine.viewport.convertToViewportPoint(...p));
       const xx=screen.map(p=>p[0]),yy=screen.map(p=>p[1]);const left=Math.min(...xx)-4,top=Math.min(...yy)-4;
       const width=Math.max(...xx)-left+8,height=Math.max(...yy)-top+8;
       element.style.cssText+=`;left:${left}px;top:${top}px;width:${width}px;height:${height}px;`;
       const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
       const path=document.createElementNS(ns,'path');path.setAttribute('d',screen.map((p,i)=>(i?'L':'M')+(p[0]-left)+' '+(p[1]-top)).join(' '));path.setAttribute('fill','none');path.setAttribute('stroke',a.color);path.setAttribute('stroke-width',(a.size||2)*engine.scale);path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.appendChild(path);element.appendChild(svg);
     }else{
       const b=bbox(a);Object.assign(element.style,{left:b.left+'px',top:b.top+'px',width:b.width+'px',height:b.height+'px'});
       if(a.type==='image'){
         const im=document.createElement('img');im.src=a.data;element.appendChild(im);
       }else if(a.type==='rect')element.style.border=`${Math.max(1,(a.size||2)*engine.scale)}px solid ${a.color}`;
       else if(a.type==='whiteout')element.style.background='#ffffff';
       else if(a.type==='highlight')element.style.background='rgba(245,200,54,.38)';
     }
     over.appendChild(element);
   }
   ids('ed-items').innerHTML=curr.length?curr.map((a,i)=>`<button type="button" class="${engine.selected===a.id?'current':''}" data-ed-target="${esc(a.id)}">${i+1}. ${annotateName(a)} ${a.type==='text'?'· '+esc(a.text.slice(0,20)):''}</button>`).join(''):'<span class="ed-small">Sin anotaciones en esta página.</span>';
   ids('ed-items').querySelectorAll('[data-ed-target]').forEach(btn=>btn.addEventListener('click',()=>{setTool('select');selectObject(btn.dataset.edTarget);}));
 }
 async function renderPage(){
   if(!engine.reader)return;
   const nonce=++engine.renderCount;setStatus('Renderizando página…');
   const pg=await engine.reader.getPage(engine.page);if(nonce!==engine.renderCount)return;
   const dpr=Math.min(2,window.devicePixelRatio||1);const vp=pg.getViewport({scale:engine.scale});engine.viewport=vp;
   const canvas=ids('ed-canvas');canvas.width=Math.ceil(vp.width*dpr);canvas.height=Math.ceil(vp.height*dpr);canvas.style.width=vp.width+'px';canvas.style.height=vp.height+'px';
   const paper=ids('ed-paper');paper.style.width=vp.width+'px';paper.style.height=vp.height+'px';
   await pg.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport:pg.getViewport({scale:engine.scale*dpr}),background:'#ffffff'}).promise;
   if(nonce!==engine.renderCount)return;
   ids('ed-page').value=engine.page;ids('ed-total').textContent='/ '+engine.reader.numPages;ids('ed-zoomvalue').textContent=Math.round(engine.scale*100)+' %';
   ids('ed-prev').disabled=engine.page<=1;ids('ed-next').disabled=engine.page>=engine.reader.numPages;
   renderAnnotations();setStatus(`Página ${engine.page} de ${engine.reader.numPages} · ${engine.annotations.length} anotaciones en el documento.`);
   pg.cleanup();
 }
 async function goto(page){if(!engine.reader||page<1||page>engine.reader.numPages)return;engine.page=page;engine.selected=null;await renderPage();}
 function zoom(delta){engine.scale=Math.max(.45,Math.min(2.2,Math.round((engine.scale+delta)*100)/100));renderPage();}
 async function onImage(e){
   const file=e.target.files?.[0];if(!file)return;
   if(file.size>10*1024*1024){setStatus('Imagen demasiado grande (máximo 10 MB).');return;}
   try{
     const bitmap=await createImageBitmap(file);const scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));
     const c=document.createElement('canvas');c.width=Math.round(bitmap.width*scale);c.height=Math.round(bitmap.height*scale);
     c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);engine.pendingImage=c.toDataURL('image/png');engine.pendingImageRatio=c.width/c.height;
     bitmap.close?.();setTool('image');setStatus('Imagen preparada. Haz clic en la página para colocarla.');
   }catch(err){setStatus('No se pudo abrir la imagen: '+err.message)}
   e.target.value='';
 }
 function keyHandler(e){if(!ids('fer-editor')?.open)return;
   const active=document.activeElement;const typing=active?.matches?.('input, textarea, select, [contenteditable="true"]');
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!typing){e.preventDefault();e.shiftKey?redo():undo();}
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'&&!typing){e.preventDefault();redo();}
   if((e.key==='Delete'||e.key==='Backspace')&&!typing){e.preventDefault();deleteSelected();}
 }
 async function open(file){
   shell();if(!file)throw new Error('Selecciona un PDF válido.');
   if(ids('fer-editor').open)ids('fer-editor').close();
   await Promise.all([load(PDF_CDN,'PDFLib'),load(READER_CDN,'pdfjsLib')]);
   window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER_CDN;
   engine.file=file;engine.annotations=[];engine.page=1;engine.selected=null;engine.tool='select';engine.scale=window.innerWidth<700?.75:1.05;engine.pendingImage=null;engine.history=[];engine.historyIndex=-1;
   const bytes=new Uint8Array(await file.arrayBuffer());
   try{
     engine.reader=await window.pdfjsLib.getDocument({data:bytes.slice(),useSystemFonts:true}).promise;
     engine.doc=await window.PDFLib.PDFDocument.load(bytes);
   }catch(err){throw new Error('No se pudo abrir el PDF. Si tiene contraseña, usa primero Desbloquear PDF. '+err.message);}
   ids('ed-filename').textContent=file.name;
   ids('fer-editor').showModal();setTool('select');commit();await renderPage();
 }
 async function save(){
   if(!engine.doc)return;
   const button=ids('ed-save');button.disabled=true;setStatus('Guardando documento…');
   try{
     const pdf=await window.PDFLib.PDFDocument.load(await engine.file.arrayBuffer());
     const normal=await pdf.embedFont(window.PDFLib.StandardFonts.Helvetica);
     for(const a of engine.annotations){
       const page=pdf.getPage(a.page-1);const color=rgb(a.color||'#263b80');
       if(a.type==='text'){
         const lines=String(a.text).split(/\n/);
         for(let i=0;i<lines.length;i++) {
           const line=lines[i];if(!line)continue;
           const y=a.y-i*a.size*1.2;
           try {
             normal.encodeText(line);
             page.drawText(line,{x:a.x,y,size:a.size,font:normal,color});
           } catch {
             // Las fuentes estándar de PDF no incluyen todos los alfabetos ni emojis.
             // En esos casos dibujamos solamente esa línea como imagen, sin alterar el original.
             const cvs=document.createElement('canvas');const ctx=cvs.getContext('2d');
             ctx.font=`${a.size*3}px sans-serif`;
             cvs.width=Math.max(4,Math.ceil(ctx.measureText(line).width+12));cvs.height=Math.ceil(a.size*4.3);
             ctx.font=`${a.size*3}px sans-serif`;ctx.textBaseline='alphabetic';ctx.fillStyle=a.color||'#263b80';
             ctx.fillText(line,3,a.size*3.15);
             const png=await pdf.embedPng(cvs.toDataURL('image/png'));
             page.drawImage(png,{x:a.x,y:y-a.size*.22,width:cvs.width/3,height:cvs.height/3});
             cvs.width=cvs.height=0;
           }
         }
       } else if(a.type==='pen'){
         for(let i=1;i<a.points.length;i++)page.drawLine({start:{x:a.points[i-1][0],y:a.points[i-1][1]},end:{x:a.points[i][0],y:a.points[i][1]},thickness:a.size,color,opacity:1});
       } else if(a.type==='rect')page.drawRectangle({x:a.x,y:a.y,width:a.w,height:a.h,borderWidth:a.size,borderColor:color});
       else if(a.type==='whiteout')page.drawRectangle({x:a.x,y:a.y,width:a.w,height:a.h,color:window.PDFLib.rgb(1,1,1)});
       else if(a.type==='highlight')page.drawRectangle({x:a.x,y:a.y,width:a.w,height:a.h,color:window.PDFLib.rgb(1,.78,.12),opacity:.35});
       else if(a.type==='image'){
         const img=await pdf.embedPng(a.data);page.drawImage(img,{x:a.x,y:a.y,width:a.w,height:a.h});
       }
     }
     const bytes=await pdf.save({useObjectStreams:true});
     if(engine.url)URL.revokeObjectURL(engine.url);
     engine.url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
     const anchor=document.createElement('a');anchor.href=engine.url;anchor.download=(engine.file.name||'documento.pdf').replace(/\.pdf$/i,'')+'-editado.pdf';document.body.appendChild(anchor);anchor.click();anchor.remove();
     setStatus(`PDF exportado: ${engine.annotations.length} anotaciones. Tu archivo original no fue modificado.`);
   }catch(err){console.error(err);setStatus('No se pudo exportar: '+err.message+' (para emojis o caracteres especiales prueba texto latino).');}
   finally{button.disabled=false;}
 }
 async function cleanup(){
   engine.renderCount++;
   try{await engine.reader?.destroy()}catch{}
   engine.reader=null;engine.doc=null;engine.file=null;engine.annotations=[];engine.pendingImage=null;
   if(engine.url){const url=engine.url;setTimeout(()=>URL.revokeObjectURL(url),30000);engine.url=null;}
 }
 window.PDFFerEditor={open};
})();
