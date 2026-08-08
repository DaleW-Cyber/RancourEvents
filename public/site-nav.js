(()=>{
  const mount=()=>{
    const path=location.pathname;

    const mastKicker=document.querySelector('.masthead .kicker');
    if(mastKicker){
      mastKicker.textContent=mastKicker.textContent
        .replace(/\s*•\s*Clan War Room\b/gi,'')
        .replace(/\bWar Room\b/gi,'')
        .replace(/\s{2,}/g,' ')
        .trim();
    }

    if(/War Room/i.test(document.title)){
      document.title=document.title
        .replace(/\s*[—-]\s*War Room.*$/i,'')
        .replace(/\bWar Room\b/gi,'')
        .replace(/\s{2,}/g,' ')
        .trim();
    }

    if(path==='/'||path==='/stats'){
      const heroTitle=document.querySelector('.hero h2');
      if(heroTitle)heroTitle.textContent='Bingo Stats';
    }

    const eventStatus=document.getElementById('eventStatus');
    if(eventStatus){
      const statusFrame=eventStatus.closest('.frame');
      if(statusFrame)statusFrame.style.display='none';
    }

    if(path==='/bingo'){
      const heroDescription=document.querySelector('.hero p');
      if(heroDescription)heroDescription.remove();

      const dropImageStyle=document.createElement('style');
      dropImageStyle.textContent=`
        #recentDrops .recent-drop{
          display:grid;
          grid-template-columns:50px minmax(0,1fr);
          gap:9px;
          align-items:center;
          min-height:62px;
          padding:7px 9px;
        }
        #recentDrops .recent-drop.no-image{grid-template-columns:1fr}
        .recent-drop-image-wrap{
          width:48px;
          height:48px;
          display:grid;
          place-items:center;
          overflow:hidden;
          background:radial-gradient(circle,#2b251d,#15120e 72%);
          border:2px ridge #665538;
          box-shadow:inset 0 0 0 1px #17130f;
        }
        .recent-drop-image{
          display:block;
          max-width:44px;
          max-height:44px;
          width:auto;
          height:auto;
          object-fit:contain;
          filter:drop-shadow(1px 2px 1px rgba(0,0,0,.65));
        }
        .recent-drop-copy{min-width:0}
      `;
      document.head.appendChild(dropImageStyle);

      const wikiDetailedImageUrl=itemName=>{
        const filename=`${String(itemName||'').trim().replace(/\s+/g,'_')}_detail.png`;
        return `https://oldschool.runescape.wiki/w/Special:Redirect/file/${encodeURIComponent(filename)}?width=64`;
      };

      const decorateRecentDrops=()=>{
        document.querySelectorAll('#recentDrops .recent-drop').forEach(row=>{
          if(row.querySelector('.recent-drop-image-wrap'))return;

          const nameNode=row.querySelector('.recent-drop-name');
          const itemName=nameNode?.textContent?.trim();
          if(!itemName)return;

          const copy=document.createElement('div');
          copy.className='recent-drop-copy';
          while(row.firstChild)copy.appendChild(row.firstChild);

          const imageWrap=document.createElement('div');
          imageWrap.className='recent-drop-image-wrap';

          const image=document.createElement('img');
          image.className='recent-drop-image';
          image.alt=`${itemName} detailed item`;
          image.loading='lazy';
          image.decoding='async';
          image.src=wikiDetailedImageUrl(itemName);
          image.addEventListener('error',()=>{
            imageWrap.remove();
            row.classList.add('no-image');
          },{once:true});

          imageWrap.appendChild(image);
          row.append(imageWrap,copy);
        });
      };

      if(typeof window.renderRecentDrops==='function'){
        const originalRenderRecentDrops=window.renderRecentDrops;
        window.renderRecentDrops=function(...args){
          const result=originalRenderRecentDrops.apply(this,args);
          decorateRecentDrops();
          return result;
        };
      }

      decorateRecentDrops();
    }

    const root=document.getElementById('siteNav');
    if(!root)return;

    root.innerHTML='<div class="site-nav-wrap"><section class="site-nav-frame"><div class="site-nav-title">Navigation</div><div class="site-nav-list" id="siteNavList"><div class="site-nav-loading">Loading event navigation…</div></div></section></div>';
    const list=document.getElementById('siteNavList');
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    const teamParam=Math.max(1,Math.min(99,Number(new URLSearchParams(location.search).get('team'))||1));
    const teamStat=t=>{
      const values=(t?.tiles||[]).map(x=>Number(x?.progress||0)).filter(Number.isFinite);
      return values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
    };
    const activeClass=(type,team)=>{
      if(type==='stats'&&(path==='/'||path==='/stats'))return' active';
      if(type==='drops'&&(path==='/drops'||path==='/drops/'))return' active';
      if(type==='items'&&path==='/items')return' active';
      if(type==='team'&&path==='/bingo'&&Number(team)===teamParam)return' active';
      return'';
    };
    const fallback=[
      {number:'Team 01',name:'Team Washed',roster:[],tiles:[]},
      {number:'Team 02',name:'2 Much COX',roster:[],tiles:[]},
      {number:'Team 03',name:'Booty Bandits',roster:[],tiles:[]}
    ];

    function render(teams){
      const rows=(teams?.length?teams:fallback).slice(0,3);
      list.innerHTML=`<a class="site-nav-link${activeClass('stats')}" href="/"><span class="site-nav-sig">S</span><span class="site-nav-name"><b>Event Stats</b><span class="site-nav-meta">Rankings & leaderboards</span></span><span class="site-nav-value">Home</span></a><div class="site-nav-divider">Team Bingo Boards</div>${rows.map((t,i)=>{const n=i+1,s=teamStat(t),players=t?.roster?.length;return`<a class="site-nav-link${activeClass('team',n)}" href="/bingo?team=${n}" data-site-team="${n}"><span class="site-nav-sig">${n}</span><span class="site-nav-name"><b>${esc(t.name||`Team ${n}`)}</b><span class="site-nav-meta">${players?`${players} players`:`Team ${String(n).padStart(2,'0')}`}</span></span><span class="site-nav-value">${s.toFixed(1)}%</span></a>`}).join('')}<div class="site-nav-divider">Reference</div><a class="site-nav-link${activeClass('drops')}" href="/drops/"><span class="site-nav-sig">D</span><span class="site-nav-name"><b>Drop Log</b><span class="site-nav-meta">All team drops</span></span><span class="site-nav-value">Open</span></a><a class="site-nav-link${activeClass('items')}" href="/items"><span class="site-nav-sig">I</span><span class="site-nav-name"><b>Item List</b><span class="site-nav-meta">Loot & pet ledger</span></span><span class="site-nav-value">Open</span></a>`;

      if(path==='/bingo'){
        list.querySelectorAll('[data-site-team]').forEach(a=>a.addEventListener('click',e=>{
          e.preventDefault();
          const n=Number(a.dataset.siteTeam);
          const url=new URL(location.href);
          url.searchParams.set('team',String(n));
          history.replaceState(null,'',url);
          list.querySelectorAll('.site-nav-link').forEach(x=>x.classList.remove('active'));
          a.classList.add('active');
          window.dispatchEvent(new CustomEvent('rancour:team-select',{detail:{team:n,index:n-1}}));
        }));
      }
    }

    fetch(`/api/event?nav=${Date.now()}`,{cache:'no-store'})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(d=>render(d.teams))
      .catch(()=>render(fallback));

    window.rancourRefreshSiteNav=()=>fetch(`/api/event?nav=${Date.now()}`,{cache:'no-store'})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(d=>render(d.teams))
      .catch(()=>{});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
  else mount();
})();