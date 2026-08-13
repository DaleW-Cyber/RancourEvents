const {$,$$,requiredNow,groupAnswered}=window.feedbackUi;
const form=$('#feedbackForm'),status=$('#status'),submitBtn=$('#submitBtn');
const value=name=>form.elements[name]?.value?.trim?.()||'';
const list=name=>$$(`[name="${name}"]:checked`).map(el=>el.value);
function payload(){return{
  identity:value('identity'),
  enjoyment:value('enjoyment'),
  futureLikelihood:value('futureLikelihood'),
  length:value('length'),
  difficulty:value('difficulty'),
  balance:value('balance'),
  favouriteTile:value('favouriteTile'),
  favouriteTileWhy:value('favouriteTileWhy'),
  leastFavouriteTile:value('leastFavouriteTile'),
  leastFavouriteTileWhy:value('leastFavouriteTileWhy'),
  teamFairness:value('teamFairness'),
  teamSize:value('teamSize'),
  contribution:value('contribution'),
  motivations:list('motivations'),
  rulesClarity:value('rulesClarity'),
  dashboardRating:value('dashboardRating'),
  dashboardFeatures:list('dashboardFeatures'),
  missingDashboard:value('missingDashboard'),
  playerStatsUsefulness:value('playerStatsUsefulness'),
  sideObjectives:value('sideObjectives'),
  sideObjectivesRecommendations:value('sideObjectivesRecommendations'),
  dropSubmissionMethod:value('dropSubmissionMethod'),
  discordNoPluginReason:value('discordNoPluginReason'),
  runelitePluginFeedback:value('runelitePluginFeedback'),
  keep:value('keep'),
  improve:value('improve'),
  futureIdeas:value('futureIdeas'),
  other:value('other')
}}
function showStatus(message,type=''){status.textContent=message;status.className='status show '+type;status.scrollIntoView({behavior:'smooth',block:'center'})}
function markMissing(missing){$$('.question.invalid').forEach(q=>q.classList.remove('invalid'));missing.forEach(name=>form.querySelector(`[name="${name}"]`)?.closest('.question')?.classList.add('invalid'))}
form.addEventListener('submit',async e=>{
  e.preventDefault();
  const missing=requiredNow().filter(name=>!groupAnswered(name));
  markMissing(missing);
  if(missing.length){showStatus('Please answer all required questions before submitting.','error');form.querySelector(`[name="${missing[0]}"]`)?.closest('.question')?.scrollIntoView({behavior:'smooth',block:'center'});return}
  submitBtn.disabled=true;submitBtn.textContent='Submitting…';status.className='status';
  try{
    const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body.error||`Submission failed (${response.status})`);
    form.style.display='none';document.querySelector('.progress-wrap').style.display='none';$('#success').classList.add('show');$('#success').scrollIntoView({behavior:'smooth',block:'center'});
  }catch(error){showStatus(error.message||'Unable to submit feedback. Please try again.','error')}
  finally{submitBtn.disabled=false;submitBtn.textContent='Submit Feedback'}
});
