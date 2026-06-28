---
layout: about
title: About
permalink: /
subtitle: 
# Currently postdoctoral researcher @<a href=https://www.lix.polytechnique.fr/vista/>VISTA</a>, LIX, Ecole Polytechnique. Palaiseau, France, previous Ph.D. at Team Mimetic <a href=https://team.inria.fr/mimetic/>Mimetic</a> of Inria Rennes, IRISA and Univ. Rennes 1.

profile:
  align: right
  image: xi_pic.jpg
  image_circular: false # crops the image to make it circular
  more_info: Pic@Barbican Centre, LDN, GB
news: true  # includes a list of news items
latest_posts: false  # includes a list of the newest posts
selected_papers: false # includes a list of papers marked as "selected={true}"
social: false  # includes social icons at the bottom of the page
---

<p>I am current a Tenure-Track Assistant Professor at Ecole Polytechnique, IP Paris. Prior to that, I was a postdoc researcher at @<a href="https://www.lix.polytechnique.fr/vista">VISTA Team</a>, LIX, Ecole Polytechnique, working with <a href="https://vicky.kalogeiton.info">Vicky Kalogeiton</a>. I finished my Ph.D. at Univ Rennes 1, Inria Rennes and IRISA advised by <a href="https://people.irisa.fr/Marc.Christie/">Marc Christie</a> and <a href="https://team.inria.fr/rainbow/fr/team/eric-marchand/">Eric Marchand</a>. My main research interests lie in <span class="gen-demo" id="genDemo"><span class="gen-demo__text" id="genText">generative models</span><span class="gen-demo__chips"><button type="button" class="gen-chip" data-m="ar" title="Autoregressive — generated token by token, left to right">AR</button><button type="button" class="gen-chip" data-m="cont" title="Continuous diffusion — denoised from Gaussian noise">cont</button><button type="button" class="gen-chip" data-m="disc" title="Discrete diffusion (e.g. MDM) — unmasked from [MASK] tokens">disc</button></span></span>, 3D vision and computational cinematography.</p>

<style>
.gen-demo{ display:inline; }
.gen-demo__text{
  display:inline-block; min-width:17ch;
  font-family:ui-monospace,"SFMono-Regular","JetBrains Mono",Menlo,Consolas,monospace;
  font-weight:600; color:var(--accent,#c75a2b); letter-spacing:-.01em; white-space:pre;
}
.gen-demo__chips{ display:inline-flex; gap:3px; margin-left:5px; vertical-align:2px; white-space:nowrap; }
.gen-chip{
  font:500 .6rem/1.5 ui-monospace,Menlo,Consolas,monospace;
  padding:0 5px; border:1px solid var(--border,#d8d8d8); border-radius:6px;
  background:transparent; color:var(--text-2,#8a8a8a); cursor:pointer;
  transition:border-color .15s,color .15s,background .15s; -webkit-user-select:none; user-select:none;
}
.gen-chip:hover{ color:var(--accent,#c75a2b); border-color:var(--accent,#c75a2b); }
.gen-chip.is-active{ color:#fff; background:var(--accent,#c75a2b); border-color:var(--accent,#c75a2b); }
@media (max-width:520px){ .gen-demo__text{ min-width:0; white-space:normal; } }
</style>

<script>
(function(){
  var el=document.getElementById('genText'); if(!el) return;
  var TXT="generative models";
  var NOISE=("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#%&*+=~/\\<>").split("");
  var token=0, buf=TXT.split("");
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rnd(){ return NOISE[(Math.random()*NOISE.length)|0]; }
  function done(){ el.textContent=TXT; el.style.filter=''; }
  function ar(){
    var my=++token,i=0,cur="▍";
    if(reduce){done();return;}
    (function step(){ if(my!==token)return;
      el.textContent=TXT.slice(0,i)+(i<TXT.length?cur:"");
      if(i<TXT.length){i++;setTimeout(step,55);} else done();
    })();
  }
  function cont(){
    var my=++token,start=performance.now(),D=1400,n=TXT.length,f=0,lock=[];
    if(reduce){done();return;}
    for(var k=0;k<n;k++) lock[k]=0.18+Math.random()*0.7;
    (function frame(now){ if(my!==token)return;
      var p=Math.min(1,(now-start)/D),o="",chg=(f++%3===0);
      for(var k=0;k<n;k++){ var c=TXT[k];
        if(c===" "){o+=" ";continue;}
        if(p>=1||p>=lock[k]) o+=c; else o+= chg? rnd() : buf[k];
      }
      buf=o.split(""); el.textContent=o;
      el.style.filter="blur("+(2.6*(1-p)).toFixed(2)+"px)";
      if(p<1) requestAnimationFrame(frame); else done();
    })(start);
  }
  function disc(){
    var my=++token,n=TXT.length,MASK="▆",idx=[];
    if(reduce){done();return;}
    for(var k=0;k<n;k++) if(TXT[k]!==" ") idx.push(k);
    for(var i=idx.length-1;i>0;i--){var j=(Math.random()*(i+1))|0,t=idx[i];idx[i]=idx[j];idx[j]=t;}
    var shown={},s=0,per=Math.max(45,(1200/idx.length)|0);
    function draw(){var o="";for(var k=0;k<n;k++){o+= TXT[k]===" "?" ":(shown[k]?TXT[k]:MASK);}el.textContent=o;}
    draw();
    (function tick(){ if(my!==token)return;
      shown[idx[s++]]=true;
      if(s<idx.length&&Math.random()<0.45) shown[idx[s++]]=true;
      draw();
      if(s<idx.length) setTimeout(tick,per); else done();
    })();
  }
  var modes={ar:ar,cont:cont,disc:disc};
  var chips=document.querySelectorAll('#genDemo .gen-chip');
  [].forEach.call(chips,function(b){
    b.addEventListener('click',function(){
      [].forEach.call(chips,function(x){x.classList.remove('is-active');});
      b.classList.add('is-active'); (modes[b.getAttribute('data-m')]||ar)();
    });
  });
  setTimeout(function(){ var a=document.querySelector('#genDemo .gen-chip[data-m=ar]'); if(a)a.classList.add('is-active'); ar(); },350);
})();
</script>
