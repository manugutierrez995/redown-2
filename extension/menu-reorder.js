/* Reorder siblings only. Moving a menu branch never changes its destination path. */
(() => {
  const entries=new WeakMap();
  let busy=false;
  function attach(element,{items,item,save,label='destination',changed=()=>{}}){
    const handle=document.createElement('button');
    handle.type='button';handle.className='reorder-handle';handle.textContent='⠿';
    handle.title='Drag to reorder · Arrow keys to move';
    handle.setAttribute('aria-label',`Reorder ${label}. Drag or use Up and Down arrow keys.`);
    entries.set(element,{item});
    const siblings=()=>Array.from(element.parentElement?.children||[]).filter(el=>entries.has(el));
    const move=async(target,after)=>{
      if(busy||!target||target===element||target.parentElement!==element.parentElement)return;
      const list=items(),from=list.indexOf(item),to=list.indexOf(entries.get(target)?.item);
      if(from<0||to<0)return;
      const snapshot=list.slice(),parent=element.parentElement,next=element.nextSibling;
      list.splice(from,1);const index=list.indexOf(entries.get(target).item)+(after?1:0);list.splice(index,0,item);
      parent.insertBefore(element,after?target.nextSibling:target);
      busy=true;handle.disabled=true;
      try{await save();changed();handle.focus({preventScroll:true});}
      catch(error){list.splice(0,list.length,...snapshot);parent.insertBefore(element,next?.parentElement===parent?next:null);changed(error);}
      finally{busy=false;handle.disabled=false;}
    };
    handle.addEventListener('keydown',event=>{
      if(!['ArrowUp','ArrowDown'].includes(event.key))return;
      event.preventDefault();const rows=siblings(),index=rows.indexOf(element),down=event.key==='ArrowDown';
      move(rows[index+(down?1:-1)],down);
    });
    handle.addEventListener('pointerdown',event=>{
      if(busy||event.button!==0||handle.disabled)return;
      event.preventDefault();handle.focus({preventScroll:true});
      const startY=event.clientY;let target=null,after=false,dragging=false;
      handle.setPointerCapture?.(event.pointerId);
      const cleanup=()=>{element.classList.remove('reordering');for(const el of siblings())el.classList.remove('reorder-before','reorder-after');handle.removeEventListener('pointermove',preview);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',cancel);handle.removeEventListener('lostpointercapture',cancel);};
      const preview=e=>{
        if(Math.abs(e.clientY-startY)<5&&!dragging)return;
        dragging=true;element.classList.add('reordering');target=null;
        for(const el of siblings()){
          el.classList.remove('reorder-before','reorder-after');
          if(el===element)continue;
          const rect=el.getBoundingClientRect();
          if(rect.height&&e.clientY>=rect.top&&e.clientY<=rect.bottom){target=el;after=e.clientY>rect.top+rect.height/2;}
        }
        target?.classList.add(after?'reorder-after':'reorder-before');
        if(e.clientY<60)window.scrollBy(0,-18);
        else if(e.clientY>window.innerHeight-60)window.scrollBy(0,18);
      };
      const finish=()=>{cleanup();if(dragging&&target)move(target,after);};
      const cancel=()=>cleanup();
      handle.addEventListener('pointermove',preview);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',cancel);handle.addEventListener('lostpointercapture',cancel);
    });
    return handle;
  }
  globalThis.RedownReorder={attach};
})();
