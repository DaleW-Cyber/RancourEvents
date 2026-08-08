(()=>{
  const mount=()=>{
    const path=location.pathname;
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));

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

      const style=document.createElement('style');
      style.textContent=`
        #recentDrops .recent-drop{display:grid;grid-template-columns:50px minmax(0,1fr);gap:9px;align-items:center;min-height:62px;padding:7px 9px}
        #recentDrops .recent-drop.no-image{grid-template-columns:1fr}
        .recent-drop-image-wrap{width:48px;height:48px;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle,#2b251d,#15120e 72%);border:2px ridge #665538;box-shadow:inset 0 0 0 1px #17130f}
        .recent-drop-image{display:block;max-width:44px;max-height:44px;width:auto;height:auto;object-fit:contain;filter:drop-shadow(1px 2px 1px rgba(0,0,0,.65))}
        .recent-drop-copy{min-width:0}
        .roster-head button{appearance:none;border:0;padding:0;margin:0;background:none;color:inherit;font:inherit;text-transform:inherit;letter-spacing:inherit;cursor:pointer;text-align:left}
        .roster-head button:nth-child(n+2){text-align:right}.roster-head button:hover{color:#d5b86e}.roster-sort-icon{display:inline-block;min-width:9px;margin-left:2px;color:#d5b86e}
        .roster-player-link{appearance:none;border:0;padding:0;background:none;color:#e3d1aa;font:inherit;font-weight:bold;cursor:pointer;text-align:left;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.roster-player-link:hover{text-decoration:underline;color:#f0d28f}
        .player-drawer{position:fixed;inset:0;z-index:30;display:none;place-items:center;padding:12px;background:rgba(0,0,0,.78)}.player-drawer.open{display:grid}
        .player-scroll{position:relative;width:min(900px,calc(100vw - 24px));height:min(800px,calc(100vh - 24px));overflow:auto;background:linear-gradient(rgba(255,255,255,.05),rgba(0,0,0,.05)),#d7c59e;color:#2b2015;border:5px ridge #846438;box-shadow:0 18px 70px #000;padding:18px;scrollbar-width:thin;scrollbar-color:#80663d #b29b70}
        .player-close{position:sticky;top:0;z-index:3;float:right;border:3px outset #8c6d40;background:#5d181b;color:#efd9aa;padding:5px 9px;cursor:pointer}.player-kicker{font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:#765729;font-weight:bold}.player-title{margin:4px 0 2px;font-size:34px;color:#591d1a}.player-sub{margin:0 0 14px;color:#654d31;font-size:11px}
        .player-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0 16px}.player-stat{border:2px inset #957a4c;background:#c3ad80;padding:9px}.player-stat b{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#6b4f2c}.player-stat strong{display:block;margin-top:4px;font-size:20px;color:#5c201c}
        .player-section{margin-top:14px;border:2px inset #957a4c;background:#c5b07f}.player-section-title{padding:8px 10px;background:#493a28;color:#ead4a2;font-size:11px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase}.player-contrib-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:8px 10px;border-bottom:1px dotted rgba(82,58,30,.45);font-size:10px}.player-contrib-row:last-child{border-bottom:0}.player-contrib-row strong{color:#4f281d}.player-contrib-progress,.player-contrib-count{white-space:nowrap;color:#674d2f;font-weight:bold}
        .player-drop-row{display:grid;grid-template-columns:54px minmax(0,1fr) auto;gap:9px;align-items:center;padding:8px 10px;border-bottom:1px dotted rgba(82,58,30,.45)}.player-drop-row:last-child{border-bottom:0}.player-drop-image-wrap{width:48px;height:48px;display:grid;place-items:center;background:radial-gradient(circle,#b9a476,#8e774f 75%);border:2px inset #8d754e}.player-drop-image{display:block;max-width:44px;max-height:44px;width:auto;height:auto;object-fit:contain;filter:drop-shadow(1px 2px 1px rgba(0,0,0,.55))}.player-drop-copy{min-width:0}.player-drop-name{font-size:11px;font-weight:bold;color:#4f281d}.player-drop-tile{margin-top:2px;font-size:9px;color:#674d2f;white-space:normal}.player-drop-no{font-size:9px;color:#806441;white-space:nowrap}.player-empty{padding:12px;color:#654d31;font-size:10px}
        @media(max-width:650px){.player-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.player-contrib-row{grid-template-columns:1fr auto}.player-contrib-progress{grid-column:1/-1}.player-drop-row{grid-template-columns:48px minmax(0,1fr)}.player-drop-no{grid-column:2}}
      `;
      document.head.appendChild(style);

      const wikiDetailedImageUrl=itemName=>{
        const filename=`${String(itemName||'').trim().replace(/\s+/g,'_')}_detail.png`;
        return `https://oldschool.runescape.wiki/w/Special:Redirect/file/${encodeURIComponent(filename)}?width=64`;
      };
      const decorateImages=(scope,selector,nameSelector)=>{
        scope.querySelectorAll(selector).forEach(row=>{
          const nameNode=row.querySelector(nameSelector),image=row.querySelector('img[data-wiki-item]');
          if(!nameNode||!image||image.dataset.loaded==='1')return;
          image.dataset.loaded='1';
          image.addEventListener('error',()=>image.closest('.recent-drop-image-wrap,.player-drop-image-wrap')?.remove(),{once:true});
          image.src=wikiDetailedImageUrl(nameNode.textContent.trim());
        });
      };
      const decorateRecentDrops=()=>{
        document.querySelectorAll('#recentDrops .recent-drop').forEach(row=>{
          if(row.querySelector('.recent-drop-image-wrap'))return;
          const nameNode=row.querySelector('.recent-drop-name');
          if(!nameNode?.textContent?.trim())return;
          const copy=document.createElement('div');copy.className='recent-drop-copy';while(row.firstChild)copy.appendChild(row.firstChild);
          const wrap=document.createElement('div');wrap.className='recent-drop-image-wrap';
          const image=document.createElement('img');image.className='recent-drop-image';image.alt=`${nameNode.textContent.trim()} detailed item`;image.loading='lazy';image.decoding='async';image.dataset.wikiItem=nameNode.textContent.trim();wrap.appendChild(image);row.append(wrap,copy);
        });
        decorateImages(document,'#recentDrops .recent-drop','.recent-drop-name');
      };

      const reorderRight=()=>{
        const right=document.querySelector('.rightcol'),standings=document.getElementById('leaderboard')?.closest('.frame'),bounties=document.getElementById('bounties')?.closest('.frame'),recent=document.getElementById('recentDrops')?.closest('.frame');
        if(right&&standings&&bounties){right.insertBefore(standings,right.firstChild);standings.after(bounties);if(recent)bounties.after(recent)}
      };
      reorderRight();

      const drawer=document.createElement('div');drawer.className='player-drawer';drawer.id='playerDrawer';drawer.innerHTML='<div class="player-scroll"><button class="player-close" type="button">Close</button><div id="playerDetail"></div></div>';document.body.appendChild(drawer);
      const closePlayer=()=>{drawer.classList.remove('open');if(!document.getElementById('drawer')?.classList.contains('open'))document.body.style.overflow=''};
      drawer.querySelector('.player-close').onclick=closePlayer;drawer.onclick=e=>{if(e.target===drawer)closePlayer()};

      const metricValue=value=>{const text=String(value??'').trim();if(!text||/^ERROR$/i.test(text)||text.startsWith('#')||/^[-–—]+$/.test(text))return null;const n=Number(text.replace(/,/g,'').replace(/[^\d.+-]/g,''));return Number.isFinite(n)?n:null};
      const metricDisplay=value=>{const n=metricValue(value);return n===null?'—':Number.isInteger(n)?n.toLocaleString('en-GB'):n.toLocaleString('en-GB',{maximumFractionDigits:2})};
      const isBingoDrop=entry=>{const tile=String(entry?.tile||'').trim();return !!tile&&!/^not a bingo item$/i.test(tile)};
      const playerRank=(team,key,player)=>{const ranked=(team?.roster||[]).map(p=>({p,value:metricValue(p[key])})).filter(x=>x.value!==null).sort((a,b)=>b.value-a.value||String(a.p.name).localeCompare(String(b.p.name),undefined,{sensitivity:'base'}));const i=ranked.findIndex(x=>Number(x.p.number)===Number(player.number));return i<0?'—':`#${i+1} of ${ranked.length}`};
      const tileForDrop=(team,entry)=>{if(Number(entry?.tileId)>0)return team.tiles?.find(t=>Number(t.id)===Number(entry.tileId))||null;const ref=String(entry?.tile||'').trim().toLowerCase();return team.tiles?.find(t=>String(t.title||'').trim().toLowerCase()===ref)||null};

      const openPlayerDetail=number=>{
        if(typeof data==='undefined'||typeof state==='undefined'||!data?.teams?.length)return;
        const team=data.teams[state.team]||data.teams[0],player=team?.roster?.find(p=>Number(p.number)===Number(number));if(!player)return;
        const normal=String(player.name||'').trim().toLowerCase(),drops=(team.drops||[]).filter(d=>String(d.member||'').trim().toLowerCase()===normal),bingo=drops.filter(isBingoDrop),grouped=new Map();
        bingo.forEach(entry=>{const key=String(entry.tile||'Unknown tile').trim()||'Unknown tile';if(!grouped.has(key))grouped.set(key,{name:key,count:0,tile:tileForDrop(team,entry)});grouped.get(key).count++});
        const contributions=[...grouped.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)),detail=document.getElementById('playerDetail');
        detail.innerHTML=`<div class="player-kicker">${esc(team.number)} • ${esc(team.name)}</div><h2 class="player-title">${esc(player.name)}</h2><p class="player-sub">Live event record from the current team workbook.</p><div class="player-stats"><div class="player-stat"><b>Drop Points</b><strong>${esc(metricDisplay(player.dropPoints))}</strong></div><div class="player-stat"><b>EHB Gained</b><strong>${esc(metricDisplay(player.ehbGained))}</strong></div><div class="player-stat"><b>Drop Pts Team Rank</b><strong>${esc(playerRank(team,'dropPoints',player))}</strong></div><div class="player-stat"><b>EHB Team Rank</b><strong>${esc(playerRank(team,'ehbGained',player))}</strong></div><div class="player-stat"><b>Recorded Drops</b><strong>${drops.length}</strong></div><div class="player-stat"><b>Bingo Drops</b><strong>${bingo.length}</strong></div><div class="player-stat"><b>Tiles Contributed</b><strong>${contributions.length}</strong></div><div class="player-stat"><b>Non-Bingo Drops</b><strong>${drops.length-bingo.length}</strong></div><div class="player-stat"><b>Share of Team Drops</b><strong>${team.drops?.length?((drops.length/team.drops.length)*100).toFixed(1):'0.0'}%</strong></div></div><section class="player-section"><div class="player-section-title">Bingo contributions</div>${contributions.length?contributions.map(c=>`<div class="player-contrib-row"><strong>${esc(c.name)}</strong><span class="player-contrib-count">${c.count} drop${c.count===1?'':'s'}</span><span class="player-contrib-progress">${c.tile?tileProgress(c.tile).toFixed(1)+'% tile progress':'Linked contribution'}</span></div>`).join(''):'<div class="player-empty">No bingo-linked drops are currently recorded for this player.</div>'}</section><section class="player-section"><div class="player-section-title">All recorded drops — ${drops.length}</div>${drops.length?drops.map(entry=>`<div class="player-drop-row"><span class="player-drop-image-wrap"><img class="player-drop-image" data-wiki-item="${esc(entry.drop)}" loading="lazy" decoding="async" alt="${esc(entry.drop)} detailed item"></span><div class="player-drop-copy"><div class="player-drop-name">${esc(entry.drop)}</div><div class="player-drop-tile">${esc(entry.tile||'Not assigned')}</div></div><div class="player-drop-no">${entry.dropNumber!==null&&entry.dropNumber!==undefined?'Drop #'+esc(entry.dropNumber):''}</div></div>`).join(''):'<div class="player-empty">No recorded drops for this player yet.</div>'}</section>`;
        decorateImages(detail,'.player-drop-row','.player-drop-name');drawer.querySelector('.player-scroll').scrollTop=0;drawer.classList.add('open');document.body.style.overflow='hidden';
      };

      let rosterSort={key:'number',dir:'asc'};
      const sortedRoster=roster=>[...(roster||[])].sort((a,b)=>{const dir=rosterSort.dir==='asc'?1:-1;if(rosterSort.key==='name')return String(a.name||'').localeCompare(String(b.name||''),undefined,{numeric:true,sensitivity:'base'})*dir;if(rosterSort.key==='number')return(Number(a.number||0)-Number(b.number||0))*dir;const av=metricValue(a[rosterSort.key]),bv=metricValue(b[rosterSort.key]);if(av===null&&bv===null)return String(a.name||'').localeCompare(String(b.name||''));if(av===null)return 1;if(bv===null)return-1;return(av-bv)*dir||String(a.name||'').localeCompare(String(b.name||''))});
      const sortIcon=key=>rosterSort.key!==key?'↕':rosterSort.dir==='asc'?'↑':'↓';
      const setRosterSort=key=>{if(rosterSort.key===key)rosterSort.dir=rosterSort.dir==='asc'?'desc':'asc';else{rosterSort.key=key;rosterSort.dir=(key==='dropPoints'||key==='ehbGained')?'desc':'asc'}renderRoster()};
      if(typeof renderRoster==='function'){
        renderRoster=function(){if(typeof data==='undefined'||!data)return;const team=data.teams[state.team]||data.teams[0],box=document.getElementById('roster');if(!box)return;if(!team?.roster?.length){box.innerHTML='<div class="empty">No roster data</div>';return}const players=sortedRoster(team.roster);box.innerHTML=`<div class="roster-head"><button type="button" data-roster-sort="name">RSN <span class="roster-sort-icon">${sortIcon('name')}</span></button><button type="button" data-roster-sort="dropPoints">Drop Pts <span class="roster-sort-icon">${sortIcon('dropPoints')}</span></button><button type="button" data-roster-sort="ehbGained">EHB Gained <span class="roster-sort-icon">${sortIcon('ehbGained')}</span></button></div>`+players.map(player=>`<div class="person roster-row"><button type="button" class="roster-player-link" data-roster-player="${Number(player.number)}">${esc(player.name)}</button><span class="roster-metric">${esc(metricDisplay(player.dropPoints))}</span><span class="roster-metric">${esc(metricDisplay(player.ehbGained))}</span></div>`).join('');box.querySelectorAll('[data-roster-sort]').forEach(button=>button.onclick=()=>setRosterSort(button.dataset.rosterSort));box.querySelectorAll('[data-roster-player]').forEach(button=>button.onclick=()=>openPlayerDetail(button.dataset.rosterPlayer))};
        if(typeof data!=='undefined'&&data)renderRoster();
      }
      decorateRecentDrops();const recent=document.getElementById('recentDrops');if(recent)new MutationObserver(()=>{decorateRecentDrops();reorderRight()}).observe(recent,{childList:true});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drawer.classList.contains('open'))closePlayer()});
    }

    const root=document.getElementById('siteNav');if(!root)return;
    root.innerHTML='<div class="site-nav-wrap"><section class="site-nav-frame"><div class="site-nav-title">Navigation</div><div class="site-nav-list" id="siteNavList"><div class="site-nav-loading">Loading event navigation…</div></div></section></div>';
    const list=document.getElementById('siteNavList'),teamParam=Math.max(1,Math.min(99,Number(new URLSearchParams(location.search).get('team'))||1));
    const teamStat=t=>{const values=(t?.tiles||[]).map(x=>Number(x?.progress||0)).filter(Number.isFinite);return values.length?values.reduce((a,b)=>a+b,0)/values.length:0};
    const activeClass=(type,team)=>{if(type==='stats'&&(path==='/'||path==='/stats'))return' active';if(type==='summary'&&(path==='/summary'||path==='/summary/'))return' active';if(type==='drops'&&(path==='/drops'||path==='/drops/'))return' active';if(type==='items'&&path==='/items')return' active';if(type==='team'&&path==='/bingo'&&Number(team)===teamParam)return' active';return''};
    const fallback=[{number:'Team 01',name:'Team Washed',roster:[],tiles:[]},{number:'Team 02',name:'2 Much COX',roster:[],tiles:[]},{number:'Team 03',name:'Booty Bandits',roster:[],tiles:[]}];
    function render(teams){
      const rows=(teams?.length?teams:fallback).slice(0,3);
      list.innerHTML=`<a class="site-nav-link${activeClass('stats')}" href="/"><span class="site-nav-sig">S</span><span class="site-nav-name"><b>Bingo Stats</b><span class="site-nav-meta">Rankings & leaderboards</span></span><span class="site-nav-value">Home</span></a><a class="site-nav-link${activeClass('summary')}" href="/summary/"><span class="site-nav-sig">B</span><span class="site-nav-name"><b>Bingo Summary</b><span class="site-nav-meta">Compare tile progress</span></span><span class="site-nav-value">Open</span></a><div class="site-nav-divider">Team Bingo Boards</div>${rows.map((t,i)=>{const n=i+1,s=teamStat(t),players=t?.roster?.length;return`<a class="site-nav-link${activeClass('team',n)}" href="/bingo?team=${n}" data-site-team="${n}"><span class="site-nav-sig">${n}</span><span class="site-nav-name"><b>${esc(t.name||`Team ${n}`)}</b><span class="site-nav-meta">${players?`${players} players`:`Team ${String(n).padStart(2,'0')}`}</span></span><span class="site-nav-value">${s.toFixed(1)}%</span></a>`}).join('')}<div class="site-nav-divider">Reference</div><a class="site-nav-link${activeClass('drops')}" href="/drops/"><span class="site-nav-sig">D</span><span class="site-nav-name"><b>Drop Log</b><span class="site-nav-meta">All team drops</span></span><span class="site-nav-value">Open</span></a><a class="site-nav-link${activeClass('items')}" href="/items"><span class="site-nav-sig">I</span><span class="site-nav-name"><b>Item List</b><span class="site-nav-meta">Loot & pet ledger</span></span><span class="site-nav-value">Open</span></a>`;
      if(path==='/bingo')list.querySelectorAll('[data-site-team]').forEach(a=>a.onclick=e=>{e.preventDefault();const n=Number(a.dataset.siteTeam),url=new URL(location.href);url.searchParams.set('team',String(n));history.replaceState(null,'',url);list.querySelectorAll('.site-nav-link').forEach(x=>x.classList.remove('active'));a.classList.add('active');window.dispatchEvent(new CustomEvent('rancour:team-select',{detail:{team:n,index:n-1}}))});
    }
    fetch(`/api/event?nav=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(d=>render(d.teams)).catch(()=>render(fallback));
    window.rancourRefreshSiteNav=()=>fetch(`/api/event?nav=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(d=>render(d.teams)).catch(()=>{});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();