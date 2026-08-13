const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];

if(!document.querySelector('link[href="/feedback-modern.css"]')){
  const theme=document.createElement('link');
  theme.rel='stylesheet';
  theme.href='/feedback-modern.css';
  document.head.appendChild(theme);
}

const sliderLabels={
  enjoyment:['Not enjoyable','Loved it'],
  futureLikelihood:['Very unlikely','Definitely'],
  balance:['Poorly balanced','Very balanced'],
  teamFairness:['Very unfair','Very fair'],
  rulesClarity:['Very unclear','Very clear'],
  dashboardRating:['Poor','Excellent'],
};
const sliderWords={
  1:'Very poor',2:'Poor',3:'Below average',4:'Mixed',5:'Okay',6:'Good',7:'Very good',8:'Great',9:'Excellent',10:'Outstanding'
};

$$('[data-scale]').forEach(box=>{
  const name=box.dataset.scale,max=Number(box.dataset.max||10),labels=sliderLabels[name]||['Low','High'];
  const start=Math.ceil(max/2);
  box.classList.add('slider-control');
  box.innerHTML=`<div class="slider-topline"><span class="slider-answer" data-slider-answer>Move the slider to answer</span><output class="slider-value" for="slider-${name}" data-slider-value>—</output></div><input id="slider-${name}" class="rating-slider" type="range" name="${name}" min="1" max="${max}" step="1" value="${start}" data-answered="false" aria-label="Rating from 1 to ${max}"><div class="slider-labels"><span>${labels[0]}</span><span>${labels[1]}</span></div>`;
  const input=box.querySelector('input'),output=box.querySelector('[data-slider-value]'),answer=box.querySelector('[data-slider-answer]');
  const update=()=>{
    input.dataset.answered='true';
    const value=Number(input.value);
    output.value=input.value;
    output.textContent=`${value}/${max}`;
    const normalised=max===5?Math.round(((value-1)/4)*9)+1:value;
    answer.textContent=sliderWords[normalised]||'Selected rating';
    const pct=((value-1)/(max-1))*100;
    input.style.setProperty('--slider-fill',`${pct}%`);
    updateProgress();
  };
  input.style.setProperty('--slider-fill','50%');
  input.addEventListener('input',update);
  input.addEventListener('change',update);
});

$$('[data-choice]').forEach(box=>{
  const name=box.dataset.choice;
  box.innerHTML=box.dataset.options.split('|').map(value=>`<label><input required type="radio" name="${name}" value="${value}"><span>${value}</span></label>`).join('');
});
$$('[data-multi]').forEach(box=>{
  const name=box.dataset.multi;
  box.innerHTML=box.dataset.options.split('|').map(value=>`<label><input type="checkbox" name="${name}" value="${value}"><span>${value}</span></label>`).join('');
});

const requiredGroups=['enjoyment','futureLikelihood','length','difficulty','balance','teamFairness','contribution','motivations','rulesClarity','dashboardRating','playerStatsUsefulness','bountyRating','sideObjectives'];
const sectionRequirements={overall:['enjoyment','futureLikelihood','length'],board:['difficulty','balance'],team:['teamFairness','contribution','motivations','rulesClarity'],dashboard:['dashboardRating','playerStatsUsefulness','bountyRating','sideObjectives'],future:[]};
function groupAnswered(name){
  const nodes=$$(`[name="${name}"]`);
  if(!nodes.length)return false;
  if(nodes[0].type==='range')return nodes[0].dataset.answered==='true';
  return nodes.some(n=>n.checked);
}
function updateProgress(){
  const answered=requiredGroups.filter(groupAnswered).length,pct=Math.round(answered/requiredGroups.length*100);
  $('#progressFill').style.width=pct+'%';
  $('#progressText').textContent=pct+'% complete';
  $$('[data-step]').forEach(step=>{
    const reqs=sectionRequirements[step.dataset.step]||[];
    step.classList.toggle('done',reqs.length===0?false:reqs.every(groupAnswered));
  });
}

$$('textarea[data-autogrow]').forEach(area=>{
  const counter=document.querySelector(`[data-count-for="${area.id}"]`);
  const resize=()=>{
    area.style.height='auto';
    area.style.height=Math.min(360,Math.max(88,area.scrollHeight))+'px';
    if(counter)counter.textContent=area.value.length?`${area.value.length.toLocaleString('en-GB')} / ${Number(area.maxLength).toLocaleString('en-GB')}`:'';
  };
  area.addEventListener('input',resize);
  resize();
});

const sections=$$('[data-feedback-section]');
const stepLinks=$$('[data-step]');
if(sections.length&&stepLinks.length&&'IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible)return;
    const id=visible.target.dataset.feedbackSection;
    stepLinks.forEach(link=>link.classList.toggle('active',link.dataset.step===id));
  },{rootMargin:'-22% 0px -58% 0px',threshold:[0,.1,.25,.5]});
  sections.forEach(section=>observer.observe(section));
}else if(stepLinks[0])stepLinks[0].classList.add('active');

const feedbackForm=$('#feedbackForm');
feedbackForm.addEventListener('change',updateProgress);
feedbackForm.addEventListener('input',updateProgress);
updateProgress();
window.feedbackUi={$, $$, requiredGroups, groupAnswered};
