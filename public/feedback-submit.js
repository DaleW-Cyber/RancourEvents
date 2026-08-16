const feedbackUi=window.feedbackUi;
const q=feedbackUi.$, qa=feedbackUi.$$, requiredNow=feedbackUi.requiredNow, groupAnswered=feedbackUi.groupAnswered;
const form=q('#feedbackForm'),status=q('#status'),submitBtn=q('#submitBtn');
const value=name=>form.elements[name]?.value?.trim?.()||'';
const list=name=>qa(`[name="${name}"]:checked`).map(el=>el.value);
let storageReady=true;
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
function markMissing(missing){qa('.question.invalid').forEach(item=>item.classList.remove('invalid'));missing.forEach(name=>form.querySelector(`[name="${name}"]`)?.closest('.question')?.classList.add('invalid'))}
async function checkStorage(){
  try{
    const response=await fetch(`/api/feedback-status?ts=${Date.now()}`,{cache:'no-store'});
    if(!response.ok){storageReady=false;submitBtn.disabled=true;showStatus(`Feedback submission is temporarily unavailable (storage check failed with ${response.status}).`,'error');return}
    const body=await response.json().catch(()=>({}));
    if(body.configured===false){
      storageReady=false;
      submitBtn.disabled=true;
      showStatus('Feedback submission is temporarily unavailable because the response storage service is not ready. Please try again shortly.','error');
    }
  }catch(error){storageReady=false;submitBtn.disabled=true;showStatus('Feedback submission is temporarily unavailable because the response storage service could not be reached. Please try again shortly.','error')}
}
checkStorage();
form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!storageReady){showStatus('Feedback submission is currently unavailable because the response storage service is not ready.','error');return}
  const missing=requiredNow().filter(name=>!groupAnswered(name));
  markMissing(missing);
  if(missing.length){showStatus('Please answer all required questions before submitting.','error');form.querySelector(`[name="${missing[0]}"]`)?.closest('.question')?.scrollIntoView({behavior:'smooth',block:'center'});return}
  submitBtn.disabled=true;submitBtn.textContent='Submitting…';status.className='status';
  try{
    const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body.error||`Submission failed (${response.status})`);
    if(!body.ok||!body.updatedRange)throw new Error('The server did not confirm that your feedback was saved. Please try again.');
    form.style.display='none';document.querySelector('.progress-wrap').style.display='none';q('#success').classList.add('show');q('#success').scrollIntoView({behavior:'smooth',block:'center'});
  }catch(error){showStatus(error.message||'Unable to submit feedback. Please try again.','error')}
  finally{submitBtn.disabled=!storageReady;submitBtn.textContent='Submit Feedback'}
});
