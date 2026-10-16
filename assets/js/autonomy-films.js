'use strict';

// Recorded pixels stay in the videos; scene explanations are HTML overlays.
(() => {
  const films=[...document.querySelectorAll('[data-autonomy-film]')];
  films.forEach(film => {
    const video=film.querySelector('video');
    const stage=film.querySelector('.replay-stage');
    const caption=film.querySelector('[data-replay-caption]');
    const typing=window.KubecaReplayCaptions?.create(film);
    const start=film.querySelector('[data-film-play]');
    const fullscreen=film.querySelector('[data-film-fullscreen]');
    const progress=film.querySelector('[data-film-progress]');
    const error=film.querySelector('[data-film-error]');
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    let scenes=[];
    let active=-2;
    let frame=0;
    let request=0;
    let animation;
    const decoded=typeof video.requestVideoFrameCallback==='function';

    function sizePicture() {
      const box=stage.getBoundingClientRect();
      const aspect=video.videoWidth && video.videoHeight ? video.videoWidth/video.videoHeight : 16/9;
      const width=Math.min(box.width,box.height*aspect);
      const height=width/aspect;
      for (const [key,value] of Object.entries({width,height,left:(box.width-width)/2,top:(box.height-height)/2}))
        stage.style.setProperty(`--autonomy-picture-${key}`,`${value}px`);
    }
    function updateControls() {
      const cover=video.paused && video.currentTime<.1;
      film.classList.toggle('has-cover',cover);
      start.hidden=!cover;
      video.controls=!cover;
      fullscreen.hidden=!document.fullscreenEnabled || (cover && document.fullscreenElement!==stage);
      fullscreen.setAttribute('aria-label',document.fullscreenElement===stage ? 'Exit full screen' : 'Full screen');
    }
    function setScene(index) {
      if (index===active) return;
      active=index;
      const token=++request;
      animation?.cancel();
      const scene=scenes[index];
      if (!scene) { caption.classList.remove('is-visible'); return; }
      const show=() => {
        if (token!==request) return;
        animation?.cancel();
        caption.querySelector('[data-replay-title]').textContent=scene.title;
        caption.querySelector('[data-replay-copy]').textContent=scene.copy;
        caption.classList.add('is-visible');
        typing?.reveal(!video.paused && !video.seeking,true);
        if (!video.paused && !motion.matches)
          animation=caption.animate([{opacity:0},{opacity:1}],{duration:400,easing:'ease-out'});
      };
      if (caption.classList.contains('is-visible') && !video.paused && !motion.matches) {
        animation=caption.animate([{opacity:1},{opacity:0}],{duration:160,fill:'forwards'});
        animation.finished.then(show).catch(()=>{});
      } else show();
    }
    function render(time=video.currentTime) {
      if (scenes.length) setScene(scenes.findIndex(scene=>time>=scene.start && time<scene.end));
      progress.style.width=`${100*Math.min(1,time/(video.duration||1))}%`;
    }
    function schedule() {
      if (frame || video.paused) return;
      frame=decoded ? video.requestVideoFrameCallback((_,info)=>{
        frame=0; render(info.mediaTime); schedule();
      }) : requestAnimationFrame(()=>{frame=0; render(); schedule();});
    }
    function cancel() {
      if (frame) decoded ? video.cancelVideoFrameCallback(frame) : cancelAnimationFrame(frame);
      frame=0;
    }
    start.addEventListener('click',()=>video.play().catch(()=>{error.hidden=false;}));
    fullscreen.addEventListener('click',()=>{
      const action=document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen();
      action.catch(()=>{});
    });
    video.addEventListener('play',()=>{
      if (film.closest('.autonomy-capability')?.hidden) { video.pause(); return; }
      films.forEach(other=>{if(other!==film) other.querySelector('video').pause();});
      updateControls(); render(); schedule();
    });
    video.addEventListener('pause',()=>{updateControls(); cancel(); render();});
    video.addEventListener('ended',()=>{cancel(); video.currentTime=0; updateControls(); render(0);});
    ['loadedmetadata','loadeddata','seeked'].forEach(event=>video.addEventListener(event,()=>{
      updateControls(); sizePicture(); render();
    }));
    video.addEventListener('timeupdate',()=>{if(video.paused || !decoded) render();});
    video.addEventListener('error',()=>{start.hidden=true; error.hidden=false;});
    document.addEventListener('fullscreenchange',()=>{sizePicture(); updateControls();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden) video.pause();});
    motion.addEventListener('change',()=>{animation?.cancel(); render();});
    new ResizeObserver(sizePicture).observe(stage);
    fetch(film.dataset.scenes,{cache:'no-cache'}).then(response=>{
      if(!response.ok) throw new Error('Caption file unavailable');
      return response.json();
    }).then(data=>{scenes=data.scenes; render();}).catch(()=>{});
    if ('IntersectionObserver' in window)
      new IntersectionObserver(([entry])=>{if(!entry.isIntersecting) video.pause();},{threshold:.15}).observe(stage);
    sizePicture(); updateControls();
  });

  document.querySelectorAll('[data-autonomy-carousel]').forEach(carousel=>{
    const slides=[...carousel.querySelectorAll('.autonomy-capability')];
    const tabs=[...carousel.querySelectorAll('[data-autonomy-chapter]')];
    const previous=carousel.querySelector('[data-autonomy-previous]');
    const next=carousel.querySelector('[data-autonomy-next]');
    const count=carousel.querySelector('[data-autonomy-count]');
    const viewport=carousel.querySelector('[data-autonomy-slides]');
    const preview=carousel.querySelector('[data-autonomy-preview]');
    const description=carousel.querySelector('[data-autonomy-description]');
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    let selected=0;
    let entrance;
    let gesture=null;
    let suppressClickUntil=0;
    if(slides.length!==tabs.length || slides.length<2) return;

    function expand(value) {
      if(!value) {
        entrance?.cancel();
        carousel.classList.remove('is-promoting');
      }
      carousel.classList.toggle('is-expanded',value);
      if(!value) slides.forEach(slide=>{
        const video=slide.querySelector('video');video.pause();
        if(video.currentTime>0) video.currentTime=0;
      });
    }
    function select(index,focus=false,promote=false) {
      index=Math.max(0,Math.min(slides.length-1,index));
      const changed=index!==selected;
      const fromRear=changed && promote && !motion.matches
        ? preview.getBoundingClientRect() : null;
      selected=index;
      entrance?.cancel();
      carousel.classList.remove('is-promoting');
      slides.forEach((slide,i)=>{
        if(i!==index) slide.querySelector('video').pause();
        slide.hidden=i!==index;
        slide.setAttribute('role','tabpanel');
        slide.setAttribute('aria-labelledby',tabs[i].id);
        tabs[i].setAttribute('aria-selected',String(i===index));
        tabs[i].tabIndex=i===index ? 0 : -1;
      });
      previous.disabled=index===0;
      next.disabled=index===slides.length-1;
      count.textContent=`${String(index+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
      description.textContent=slides[index].querySelector('header p').textContent;
      const rear=(index+1)%slides.length;
      const title=slides[rear].querySelector('h3').textContent.replace(/\.$/,'');
      preview.querySelector('[data-autonomy-preview-image]').src=slides[rear].querySelector('video').poster;
      preview.querySelector('[data-autonomy-preview-number]').textContent=`0${rear+1} /`;
      preview.querySelector('[data-autonomy-preview-title]').textContent=title;
      preview.setAttribute('aria-label',`View ${title}`);
      if(fromRear) carousel.classList.add('is-promoting');
      if(promote) expand(true);
      if(fromRear) {
        const figure=slides[index].querySelector('figure');
        const destination=figure.getBoundingClientRect();
        entrance=figure.animate([
          {transformOrigin:'0 0',transform:`translate(${fromRear.left-destination.left}px,${fromRear.top-destination.top}px) scale(${fromRear.width/destination.width},${fromRear.height/destination.height})`,opacity:.65},
          {transformOrigin:'0 0',transform:'none',opacity:1}
        ],{duration:450,easing:'cubic-bezier(.22,.8,.25,1)'});
        entrance.finished.then(()=>carousel.classList.remove('is-promoting')).catch(()=>{});
      } else if(changed && !motion.matches)
        entrance=slides[index].animate([{opacity:.5},{opacity:1}],{duration:220,easing:'ease-out'});
      if(focus) tabs[index].focus();
    }
    tabs.forEach((tab,index)=>{
      tab.addEventListener('click',()=>select(index,false,true));
      tab.addEventListener('keydown',event=>{
        let destination;
        if(event.key==='ArrowRight') destination=(index+1)%slides.length;
        else if(event.key==='ArrowLeft') destination=(index-1+slides.length)%slides.length;
        else if(event.key==='Home') destination=0;
        else if(event.key==='End') destination=slides.length-1;
        else return;
        event.preventDefault(); select(destination,true,true);
      });
    });
    previous.addEventListener('click',()=>select(selected-1,false,true));
    next.addEventListener('click',()=>select(selected+1,false,true));
    preview.addEventListener('click',()=>select((selected+1)%slides.length,false,true));
    carousel.addEventListener('keydown',event=>{
      if(event.key==='Escape' && carousel.classList.contains('is-expanded') && !document.fullscreenElement) {
        event.preventDefault();expand(false);tabs[selected].focus();
      }
    });
    slides.forEach(slide=>{
      slide.querySelector('video').addEventListener('play',()=>{if(!slide.hidden) expand(true);});
      slide.querySelector('video').addEventListener('ended',()=>expand(false));
    });
    // Swipe on a poster. Playing video keeps its native touch/scrub controls.
    viewport.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='touch' || !event.isPrimary || document.fullscreenElement) return;
      if(!event.target.closest('.autonomy-film.has-cover .replay-stage')) return;
      gesture={x:event.clientX,y:event.clientY,id:event.pointerId};
    });
    viewport.addEventListener('pointerup',event=>{
      const start=gesture; gesture=null;
      if(!start || start.id!==event.pointerId) return;
      const dx=event.clientX-start.x,dy=event.clientY-start.y;
      if(Math.abs(dx)<60 || Math.abs(dx)<Math.abs(dy)*1.5) return;
      const destination=Math.max(0,Math.min(slides.length-1,selected+(dx<0 ? 1 : -1)));
      if(destination===selected) return;
      suppressClickUntil=performance.now()+500;
      select(destination);
    });
    viewport.addEventListener('pointercancel',()=>{gesture=null;});
    viewport.addEventListener('click',event=>{
      if(performance.now()<suppressClickUntil) {
        event.preventDefault();event.stopImmediatePropagation();
      }
    },true);
    carousel.classList.add('is-carousel','is-layered');
    select(0);
    preview.hidden=false;
    description.hidden=false;
    carousel.querySelector('[data-autonomy-controls]').hidden=false;
  });
})();
