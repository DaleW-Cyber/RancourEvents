const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];

const sliderLabels={
  enjoyment:['Not enjoyable','Loved it'],
  futureLikelihood:['Very unlikely','Definitely'],
  balance:['Poorly balanced','Very balanced'],
  teamFairness:['Very unfair','Very fair'],
  rulesClarity:['Very unclear','Very clear'],
  dashboardRating:['Poor','Excellent'],
};

$$('[data-scale]').forEach(box=>{
  const name=box.dataset.scale,max=Number(box.dataset.max||10),labels=sliderLabels[name]||['Low','High'];
  const start=Math.ceil(max/2);
  box.classList.add('slider-control');
  box.innerHTML=`
    <div class="slider-topline"><span class="slider-answer" data-slider-answer>Not answered</span><output class="slider-value" for="slider-${name}" data-slider-value>—</output></div>
    <input id="slider-${name}" class="rating-slider" type="range" name="${name}" min="1" max="${max}" step="1" value="${start}" data-answered="false" aria-label="Rating from 1 to ${max}">
    <div class="slider-labels"><span>${labels[0]}</span><span>${labels[1]}</span></div>`;
  const input=box.querySelector('input'),output=box.querySelector('[data-slider-value]'),answer=box.querySelector('[data-slider-answer]');
  const update=()=>{
    input.dataset.answered='true';
    output.value=input.value;
    output.textContent=`${input.value}/${max}`;
    answer.textContent='Selected rating';
    const pct=((Number(input.value)-1)/(max-1))*100;
    input.style.setProperty('--slider-fill',`${pct}%`);
    updateProgress();
  };
  input.style.setProperty('--slider-fill','50%');
  input.addEventListener('input',update);
  input.addEventListener('change',update);
});

$$('[data-choice]').forEach(box=>{const name=box.dataset.choice;box.innerHTML=box.dataset.options.split('|').map(value=>`<label><input required type="radio" name="${name}" value="${value}"><span>${value}</span></label>`).join('')});
$$('[data-multi]').forEach(box=>{const name=box.dataset.multi;box.innerHTML=box.dataset.options.split('|').map(value=>`<label><input type="checkbox" name="${name}" value="${value}"><span>${value}</span></label>`).join('')});

const requiredGroups=['enjoyment','futureLikelihood','length','difficulty','balance','teamFairness','contribution','motivations','rulesClarity','dashboardRating','playerStatsUsefulness','bountyRating','sideObjectives'];
function groupAnswered(name){
  const nodes=$$(`[name="${name}"]`);
  if(!nodes.length)return false;
  if(nodes[0].type==='range')return nodes[0].dataset.answered==='true';
  return nodes.some(n=>n.checked);
}
function updateProgress(){const answered=requiredGroups.filter(groupAnswered).length,pct=Math.round(answered/requiredGroups.length*100);$('#progressFill').style.width=pct+'%';$('#progressText').textContent=pct+'% complete'}
const feedbackForm=$('#feedbackForm');feedbackForm.addEventListener('change',updateProgress);feedbackForm.addEventListener('input',updateProgress);updateProgress();
window.feedbackUi={$, $$, requiredGroups, groupAnswered};
