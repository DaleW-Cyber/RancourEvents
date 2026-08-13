const {$,$$,requiredGroups,groupAnswered}=window.feedbackUi;
const form=$('#feedbackForm'),status=$('#status'),submitBtn=$('#submitBtn');
const value=name=>form.elements[name]?.value?.trim?.()||'';
const list=name=>$$(`[name="${name}"]:checked`).map(el=>el.value);

function reorderChoice(name,order){
  const box=document.querySelector(`[data-choice="${name}"]`);
  if(!box)return;
  order.forEach(option=>{
    const input=[...box.querySelectorAll(`input[name="${name}"]`)].find(el=>el.value===option);
    const label=input?.closest('label');
    if(label)box.appendChild(label);
  });
}
reorderChoice('contribution',['No','Not really','Yes, somewhat','Yes, a lot']);
reorderChoice('sideObjectives',['No','Maybe','Yes']);

if(!form.elements.teamSize){
  const fairness=form.querySelector('[name="teamFairness"]')?.closest('.question');
  if(fairness){
    const question=document.createElement('div');
    question.className='question';
    question.innerHTML='<label class="q"><span class="question-number">09</span><span>How did you feel about the team size? <em class="required">*</em></span><span class="hint">Was your team too large, too small, or about right?</span></label><div class="choice segmented team-size-choice"></div>';
    const box=question.querySelector('.team-size-choice');
    ['Too big','Slightly too big','About right','Slightly too small','Too small'].forEach(option=>{
      const label=document.createElement('label');
      const input=document.createElement('input');
      const span=document.createElement('span');
      input.type='radio';input.name='teamSize';input.value=option;input.required=true;
      span.textContent=option;label.append(input,span);box.appendChild(label);
    });
    fairness.after(question);
  }
}
if(!requiredGroups.includes('teamSize'))requiredGroups.splice(7,0,'teamSize');

function renumber(selector,number){
  const node=form.querySelector(selector)?.closest('.question')?.querySelector('.question-number');
  if(node)node.textContent=number;
}
renumber('[name="contribution"]','10');
renumber('[name="motivations"]','11');
renumber('[name="rulesClarity"]','12');
renumber('[name="dashboardRating"]','13');
renumber('[name="dashboardFeatures"]','14');
renumber('#missingDashboard','15');
renumber('[name="playerStatsUsefulness"]','16');
renumber('[name="bountyRating"]','17');
renumber('[name="sideObjectives"]','18');
renumber('#keep','19');
renumber('#improve','20');
renumber('#futureIdeas','21');
renumber('#other','22');
form.dispatchEvent(new Event('change',{bubbles:true}));

function payload(){
  const other=value('other');
  const teamSize=value('teamSize');
  return{identity:value('identity'),enjoyment:value('enjoyment'),futureLikelihood:value('futureLikelihood'),length:value('length'),difficulty:value('difficulty'),balance:value('balance'),enjoyedTiles:value('enjoyedTiles'),dislikedTiles:value('dislikedTiles'),teamFairness:value('teamFairness'),contribution:value('contribution'),motivations:list('motivations'),rulesClarity:value('rulesClarity'),dashboardRating:value('dashboardRating'),dashboardFeatures:list('dashboardFeatures'),missingDashboard:value('missingDashboard'),playerStatsUsefulness:value('playerStatsUsefulness'),bountyRating:value('bountyRating'),sideObjectives:value('sideObjectives'),keep:value('keep'),improve:value('improve'),futureIdeas:value('futureIdeas'),other:`[[Team size: ${teamSize}]]${other?`\n\n${other}`:''}`};
}
function showStatus(message,type=''){status.textContent=message;status.className='status show '+type;status.scrollIntoView({behavior:'smooth',block:'center'})}
form.addEventListener('submit',async e=>{e.preventDefault();const missing=requiredGroups.filter(name=>!groupAnswered(name));if(missing.length){showStatus('Please answer all required questions before submitting.','error');form.querySelector(`[name="${missing[0]}"]`)?.closest('.question')?.scrollIntoView({behavior:'smooth',block:'center'});return}submitBtn.disabled=true;submitBtn.textContent='Submitting…';status.className='status';try{const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||`Submission failed (${response.status})`);form.style.display='none';document.querySelector('.progress-wrap').style.display='none';$('#success').classList.add('show');$('#success').scrollIntoView({behavior:'smooth',block:'center'})}catch(error){showStatus(error.message||'Unable to submit feedback. Please try again.','error')}finally{submitBtn.disabled=false;submitBtn.textContent='Submit Feedback'}});
