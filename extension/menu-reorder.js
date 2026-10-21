/* Reorder siblings only. Moving a menu branch never changes its destination path. */
(() => {
  const entries=new WeakMap();
  let busy=false;
  function attach(element,{items,item,save,label='destination',changed=()=>{}}){
    const handle=document.createElement('button');
    handle.type='button';handle.className='reorder-handle';handle.textContent='⠿';
    handle.title='Drag to reorder · Arrow keys to move';
    handle.setAttribute('aria-label',`Reorder ${label}. Drag or use Up and Down arrow keys.`);
    entries.set(element,{item});element.classList.add("reorder-item");
    const siblings=()=>Array.from(element.parentElement?.children||[]).filter(el=>entries.has(el));
    const move=async(target,after)=>{
      if(busy||!target||target===element||target.parentElement!==element.parentElement)return;
      const list=items(),from=list.indexOf(item),to=list.indexOf(entries.get(target)?.item);
      if(from<0||to<0)return;
      const snapshot=list.slice(),parent=element.parentElement,next=element.nextSibling;
      list.splice(from,1);const index=list.indexOf(entries.get(target).item)+(after?1:0);list.splice(index,0,item);
      parent.insertBefore(element,after?target.nextSibling:target);
      busy=true;handle.setAttribute("aria-busy","true");
      try{await save();changed();handle.focus({preventScroll:true});handle.scrollIntoView?.({block:"nearest"});}
      catch(error){list.splice(0,list.length,...snapshot);parent.insertBefore(element,next?.parentElement===parent?next:null);changed(error);}
      finally{busy=false;handle.removeAttribute("aria-busy");}
    };
    handle.addEventListener('keydown',event=>{
      if(!['ArrowUp','ArrowDown'].includes(event.key))return;
      event.preventDefault();const rows=siblings(),index=rows.indexOf(element),down=event.key==='ArrowDown';
      move(rows[index+(down?1:-1)],down);
    });
    handle.addEventListener('pointerdown',event=>{
      if(busy||event.button!==0||handle.disabled)return;
      event.preventDefault();handle.focus({preventScroll:true});
      const parent=element.parentElement,startY=event.clientY,startX=event.clientX;
      let target=null,after=false,dragging=false,ghost=null,frame=null,lastY=startY,ended=false;
      try{handle.setPointerCapture?.(event.pointerId);}catch{}
      const markTarget=()=>{
        const rows=siblings().filter(el=>el!==element&&el.getBoundingClientRect().height);
        for(const el of siblings())el.classList.remove('reorder-before','reorder-after');
        target=rows.find(el=>{const r=el.getBoundingClientRect();return lastY<r.top+r.height/2;})||rows.at(-1)||null;
        after=Boolean(target&&lastY>=target.getBoundingClientRect().top+target.getBoundingClientRect().height/2);
        target?.classList.add(after?'reorder-after':'reorder-before');
      };
      const scroll=()=>{
        if(ended)return;
        if(lastY<64)window.scrollBy(0,-12);
        else if(lastY>window.innerHeight-64)window.scrollBy(0,12);
        markTarget();frame=window.requestAnimationFrame?.(scroll)??null;
      };
      const cleanup=()=>{
        ended=true;if(frame!==null)window.cancelAnimationFrame(frame);
        ghost?.remove();parent?.classList.remove('reorder-list-dragging');element.classList.remove('reordering');
        for(const el of siblings())el.classList.remove('reorder-before','reorder-after');
        document.removeEventListener('pointermove',preview,true);document.removeEventListener('pointerup',finish,true);document.removeEventListener('pointercancel',cancel,true);document.removeEventListener('keydown',escape,true);
        handle.removeEventListener('lostpointercapture',cancel);
      };
      const preview=e=>{
        if(event.pointerId!==undefined&&e.pointerId!==event.pointerId)return;
        lastY=e.clientY;
        if(!dragging&&Math.hypot(e.clientY-startY,e.clientX-startX)<5)return;
        e.preventDefault();
        if(!dragging){
          dragging=true;
          const previousTop=handle.getBoundingClientRect().top;
          parent?.classList.add('reorder-list-dragging');element.classList.add('reordering');
          const correction=handle.getBoundingClientRect().top-previousTop;
          if(correction)window.scrollBy(0,correction);
          ghost=document.createElement('div');ghost.className='reorder-ghost';ghost.textContent='⠿  '+label;ghost.setAttribute('aria-hidden','true');document.body.append(ghost);
          frame=window.requestAnimationFrame?.(scroll)??null;
        }
        ghost.style.left=Math.min(e.clientX+14,Math.max(8,window.innerWidth-260))+'px';ghost.style.top=Math.min(e.clientY+14,window.innerHeight-50)+'px';
        markTarget();
      };
      const finish=e=>{
        if(event.pointerId!==undefined&&e.pointerId!==event.pointerId)return;
        if(dragging)markTarget();const destination=target,placeAfter=after;
        cleanup();if(dragging&&destination)move(destination,placeAfter);
      };
      const cancel=()=>cleanup();
      const escape=e=>{if(e.key==='Escape'){e.preventDefault();cancel();}};
      // Document listeners survive pointer capture loss and leaving the tiny grip.
      document.addEventListener('pointermove',preview,{capture:true,passive:false});document.addEventListener('pointerup',finish,true);document.addEventListener('pointercancel',cancel,true);document.addEventListener('keydown',escape,true);
      handle.addEventListener('lostpointercapture',cancel);
    });
    return handle;
  }
  globalThis.RedownReorder={attach};
})();
