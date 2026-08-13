const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];

if(!document.querySelector('link[href="/feedback-modern.css"]')){
  const theme=document.createElement('link');theme.rel='stylesheet';theme.href='/feedback-modern.css';document.head.appendChild(theme);
}

const sliderLabels={enjoyment:['Not enjoyable','Loved it'],futureLikelihood:['Very unlikely','Definitely'],balance:['Poorly balanced','Very balanced'],teamFairness:['Very unfair','Very fair'],rulesClarity:['Very unclear','Very clear'],dashboardRating:['Poor','Excellent']};
const sliderWords={1:'Very poor',2:'Poor',3:'Below average',4:'Mixed',5:'Okay',6:'Good',7:'Very good',8:'Great',9:'Excellent',10:'Outstanding'};

$$('[data-scale]').forEach(box=>{
  const name=box.dataset.scale,max=Number(box.dataset.max||10),labels=sliderLabels[name]||['Low','High'],start=Math.ceil(max/2);
  box.classList.add('slider-control');
  box.innerHTML=`<div class="slider-topline"><span class="slider-answer" data-slider-answer>Move the slider to answer</span><output class="slider-value" for="slider-${name}" data-slider-value>—</output></div><input id="slider-${name}" class="rating-slider" type="range" name="${name}" min="1" max="${max}" step="1" value="${start}" data-answered="false" aria-label="Rating from 1 to ${max}"><div class="slider-labels"><span>${labels[0]}</span><span>${labels[1]}</span></div>`;
  const input=box.querySelector('input'),output=box.querySelector('[data-slider-value]'),answer=box.querySelector('[data-slider-answer]');
  const update=()=>{input.dataset.answered='true';const value=Number(input.value);output.textContent=`${value}/${max}`;const normalised=max===5?Math.round(((value-1)/4)*9)+1:value;answer.textContent=sliderWords[normalised]||'Selected rating';input.style.setProperty('--slider-fill',`${((value-1)/(max-1))*100}%`);updateProgress()};
  input.style.setProperty('--slider-fill','50%');input.addEventListener('input',update);input.addEventListener('change',update);
});

$$('[data-choice]').forEach(box=>{const name=box.dataset.choice;box.innerHTML=box.dataset.options.split('|').map(value=>`<label><input type="radio" name="${name}" value="${value}"><span>${value}</span></label>`).join('')});
$$('[data-multi]').forEach(box=>{const name=box.dataset.multi;box.innerHTML=box.dataset.options.split('|').map(value=>`<label><input type="checkbox" name="${name}" value="${value}"><span>${value}</span></label>`).join('')});

const baseRequired=['enjoyment','futureLikelihood','length','difficulty','balance','favouriteTile','favouriteTileWhy','leastFavouriteTile','leastFavouriteTileWhy','teamFairness','teamSize','contribution','motivations','rulesClarity','dashboardRating','playerStatsUsefulness','sideObjectives','dropSubmissionMethod'];
const sectionRequirements={overall:['enjoyment','futureLikelihood','length'],board:['difficulty','balance','favouriteTile','favouriteTileWhy','leastFavouriteTile','leastFavouriteTileWhy'],team:['teamFairness','teamSize','contribution','motivations','rulesClarity'],tools:['dashboardRating','playerStatsUsefulness','sideObjectives','dropSubmissionMethod'],future:[]};
const selectedValue=name=>{const nodes=$$(`[name="${name}"]`);if(!nodes.length)return '';if(nodes[0].type==='radio')return nodes.find(n=>n.checked)?.value||'';if(nodes[0].type==='checkbox')return nodes.filter(n=>n.checked).map(n=>n.value);return nodes[0].value||''};
function conditionalRequired(){const out=[];if(selectedValue('sideObjectives')==='Yes')out.push('sideObjectivesRecommendations');const method=selectedValue('dropSubmissionMethod');if(method==='Discord')out.push('discordNoPluginReason');if(method==='RuneLite Plugin')out.push('runelitePluginFeedback');return out}
function requiredNow(){return [...baseRequired,...conditionalRequired()]}
function groupAnswered(name){const nodes=$$(`[name="${name}"]`);if(!nodes.length)return false;const first=nodes[0];if(first.type==='range')return first.dataset.answered==='true';if(first.type==='radio'||first.type==='checkbox')return nodes.some(n=>n.checked);return String(first.value||'').trim().length>0}

function syncConditionalFields(){
  $$('[data-condition-name]').forEach(block=>{const show=selectedValue(block.dataset.conditionName)===block.dataset.conditionValue;block.classList.toggle('show',show);block.querySelectorAll('textarea,input').forEach(el=>el.required=show)});
}
function updateProgress(){
  syncConditionalFields();
  const required=requiredNow(),answered=required.filter(groupAnswered).length,pct=Math.round(answered/required.length*100);
  $('#progressFill').style.width=pct+'%';$('#progressText').textContent=pct+'% complete';
  $$('[data-step]').forEach(step=>{const reqs=[...(sectionRequirements[step.dataset.step]||[])];if(step.dataset.step==='tools')reqs.push(...conditionalRequired());step.classList.toggle('done',reqs.length>0&&reqs.every(groupAnswered))});
}

$$('textarea[data-autogrow]').forEach(area=>{const counter=document.querySelector(`[data-count-for="${area.id}"]`);const resize=()=>{area.style.height='auto';area.style.height=Math.min(360,Math.max(88,area.scrollHeight))+'px';if(counter)counter.textContent=area.value.length?`${area.value.length.toLocaleString('en-GB')} / ${Number(area.maxLength).toLocaleString('en-GB')}`:''};area.addEventListener('input',resize);resize()});

const sections=$$('[data-feedback-section]'),stepLinks=$$('[data-step]');
if(sections.length&&stepLinks.length&&'IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(!visible)return;const id=visible.target.dataset.feedbackSection;stepLinks.forEach(link=>link.classList.toggle('active',link.dataset.step===id))},{rootMargin:'-22% 0px -58% 0px',threshold:[0,.1,.25,.5]});sections.forEach(section=>observer.observe(section))}else if(stepLinks[0])stepLinks[0].classList.add('active');

const fallbackTiles=[
[1,'Raids SPOOONNNN!!!','Raids'],[2,'Raids Shady Heist','Raids'],[3,'TOB Bat Dick','TOB'],[4,'TOB Built Like a Brick Wall','TOB'],[5,'TOA Fang Me Harder','TOA'],[6,'TOA I am in Masoriiiii','TOA'],[7,'COX Thoughts and Prayers','COX'],[8,"COX You're a Wizard Harry!",'COX'],[9,'Various Bonk Collection','Various'],[10,'CG Stockholm Syndrome','Gauntlet'],[11,'Musp be Jo Momma','Muspah'],[12,'The Glory Hole','Colosseum'],[13,'Sit Rat','Wilderness'],[14,'The Chicken Lady','Nex'],[15,'Insomnia Pays','Nightmare'],[16,'Sigil Season','Corp'],[17,'Doomed From the Start','Doom'],[18,'The Tooth Fairy','Maggot King'],[19,'Yama Mama','Yama'],[20,'Just a Sneaky Snakeee','Zulrah'],[21,'Spider Dentist','Araxxor'],[22,'Stone Mommy','Mad Angel'],[23,'Some Assembly Required','DT2'],[24,'Monkey Business','Various'],[25,'Wizard Lizard Exterminator','Huey'],[26,'Emotional Support Pixels','Pets'],[27,'Tool Time','Zalcano'],[28,'2005 Called','Barrows'],[29,'Moonlight Grind','Moons'],[30,'Claw Enforcement','Hydra'],[31,'Lord of all the rings','DKs'],[32,'Just a Crystal Girl','Cerberus'],[33,"I've got a jar of dirt!",'Slayer'],[34,'Peace Treaty','GWD'],[35,"Pest Control Isn't Enough",'KC'],[36,'Off to the Todt with you!','Skilling']
].map(([id,title,content])=>({id,title,content,difficulty:''}));
let tiles=fallbackTiles,activeTileTarget='';
const tileModal=$('#tileModal'),tileGrid=$('#tileGrid'),tileSearch=$('#tileSearch'),tileTitle=$('#tileModalTitle');
function tileValue(tile){return `#${tile.id} ${tile.title}`}
function renderTiles(){const q=tileSearch.value.trim().toLowerCase(),selected=activeTileTarget?selectedValue(activeTileTarget):'';const shown=tiles.filter(t=>!q||`${t.id} ${t.title} ${t.content||''} ${t.difficulty||''}`.toLowerCase().includes(q));tileGrid.innerHTML=shown.length?shown.map(t=>`<button type="button" class="tile-option${tileValue(t)===selected?' selected':''}" data-tile-id="${t.id}"><span class="tile-option-no">${t.id}</span><span><strong>${t.title}</strong><small>${[t.content,t.difficulty].filter(Boolean).join(' • ')}</small></span></button>`).join(''):'<div class="tile-loading">No matching tiles.</div>';tileGrid.querySelectorAll('[data-tile-id]').forEach(btn=>btn.addEventListener('click',()=>chooseTile(Number(btn.dataset.tileId))))}
function openTilePicker(target){activeTileTarget=target;tileTitle.textContent=target==='favouriteTile'?'Choose your favourite tile':'Choose your least favourite tile';tileSearch.value='';renderTiles();tileModal.classList.add('open');tileModal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';setTimeout(()=>tileSearch.focus(),30)}
function closeTilePicker(){tileModal.classList.remove('open');tileModal.setAttribute('aria-hidden','true');document.body.style.overflow='';activeTileTarget=''}
function chooseTile(id){const tile=tiles.find(t=>Number(t.id)===Number(id));if(!tile||!activeTileTarget)return;const input=document.getElementById(activeTileTarget),display=document.querySelector(`[data-tile-selection="${activeTileTarget}"]`),button=document.querySelector(`[data-tile-target="${activeTileTarget}"]`);input.value=tileValue(tile);if(display)display.textContent=tileValue(tile);button?.classList.add('selected');closeTilePicker();input.dispatchEvent(new Event('change',{bubbles:true}));updateProgress()}
$$('[data-tile-target]').forEach(button=>button.addEventListener('click',()=>openTilePicker(button.dataset.tileTarget)));$('#tileModalClose').addEventListener('click',closeTilePicker);tileModal.addEventListener('click',e=>{if(e.target===tileModal)closeTilePicker()});tileSearch.addEventListener('input',renderTiles);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&tileModal.classList.contains('open'))closeTilePicker()});
fetch(`/api/event?feedbackTiles=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{const map=new Map();(data.teams||[]).flatMap(t=>t.tiles||[]).forEach(t=>{if(t?.id&&!map.has(Number(t.id)))map.set(Number(t.id),{id:Number(t.id),title:String(t.title||`Tile ${t.id}`),content:String(t.content||''),difficulty:String(t.difficulty||'')})});if(map.size)tiles=[...map.values()].sort((a,b)=>a.id-b.id);renderTiles()}).catch(()=>renderTiles());

const feedbackForm=$('#feedbackForm');feedbackForm.addEventListener('change',updateProgress);feedbackForm.addEventListener('input',updateProgress);syncConditionalFields();updateProgress();
window.feedbackUi={$, $$, requiredNow, groupAnswered, updateProgress, selectedValue};
