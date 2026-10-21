/* Decorative companion: show on scrolling, fade after the reader settles. */
(() => {
  const mascot=document.querySelector('.settings-mascot');
  if(!mascot)return;
  let idle;
  const hide=()=>mascot.classList.remove('is-visible');
  const show=()=>{
    clearTimeout(idle);
    if(document.hidden){hide();return;}
    mascot.classList.add('is-visible');
    idle=setTimeout(hide,1800);
  };
  // Capture also observes scrolling within Explorer and other nested panes.
  document.addEventListener('scroll',show,{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{clearTimeout(idle);if(document.hidden)hide();else show();});
  window.addEventListener('pagehide',()=>{clearTimeout(idle);hide();});
  show();
})();
