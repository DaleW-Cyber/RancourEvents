(()=>{
  const form=document.getElementById('feedbackForm');
  const status=document.getElementById('status');
  const submitBtn=document.getElementById('submitBtn');
  if(!form||!status||!submitBtn)return;

  const all=selector=>[...document.querySelectorAll(selector)];
  const value=name=>{
    const field=form.elements[name];
    if(!field)return'';
    if(typeof field.value==='string')return field.value.trim();
    return'';
  };
  const list=name=>all(`[name="${name}"]:checked`).map(el=>el.value);
  const selected=name=>{
    const nodes=all(`[name="${name}"]`);
    if(!nodes.length)return'';
    if(nodes[0].type==='radio')return nodes.find(node=>node.checked)?.value||'';
    if(nodes[0].type==='checkbox')return nodes.filter(node=>node.checked).map(node=>node.value);
    return String(nodes[0].value||'').trim();
  };
  const baseRequired=['enjoyment','futureLikelihood','length','difficulty','balance','favouriteTile','favouriteTileWhy','leastFavouriteTile','leastFavouriteTileWhy','teamFairness','teamSize','contribution','motivations','rulesClarity','dashboardRating','playerStatsUsefulness','sideObjectives','dropSubmissionMethod'];
  const fieldLabels={
    enjoyment:'Q1 — Overall enjoyment',
    futureLikelihood:'Q2 — Likelihood to join another Bingo',
    length:'Q3 — Event length',
    difficulty:'Q4 — Board difficulty',
    balance:'Q5 — Tile balance',
    favouriteTile:'Q6 — Favourite tile',
    favouriteTileWhy:'Q6 — Why it was your favourite',
    leastFavouriteTile:'Q7 — Least favourite tile',
    leastFavouriteTileWhy:'Q7 — Why it was your least favourite',
    teamFairness:'Q8 — Team fairness',
    teamSize:'Q9 — Team size',
    contribution:'Q10 — Meaningful contribution',
    motivations:'Q11 — Participation motivations',
    rulesClarity:'Q12 — Rules clarity',
    dashboardRating:'Q13 — Dashboard rating',
    playerStatsUsefulness:'Q16 — Player stats usefulness',
    sideObjectives:'Q17 — Side objectives / awards',
    sideObjectivesRecommendations:'Q17 — Side objective recommendations',
    dropSubmissionMethod:'Q18 — Drop submission method',
    discordNoPluginReason:'Q18 — Why you used Discord',
    runelitePluginFeedback:'Q18 — RuneLite Plugin feedback'
  };
  const requiredNow=()=>{
    const required=[...baseRequired];
    if(selected('sideObjectives')==='Yes')required.push('sideObjectivesRecommendations');
    if(selected('dropSubmissionMethod')==='Discord')required.push('discordNoPluginReason');
    if(selected('dropSubmissionMethod')==='RuneLite Plugin')required.push('runelitePluginFeedback');
    return required;
  };
  const answered=name=>{
    const nodes=all(`[name="${name}"]`);
    if(!nodes.length)return false;
    const first=nodes[0];
    if(first.type==='range')return String(first.value||'').trim().length>0;
    if(first.type==='radio'||first.type==='checkbox')return nodes.some(node=>node.checked);
    return String(first.value||'').trim().length>0;
  };
  const payload=()=>({
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
  });

  let storageReady=false;
  const showStatus=(message,type='')=>{
    status.textContent=message;
    status.className=`status show ${type}`.trim();
  };
  const markMissing=missing=>{
    all('.question.invalid').forEach(item=>item.classList.remove('invalid'));
    missing.forEach(name=>form.querySelector(`[name="${name}"]`)?.closest('.question')?.classList.add('invalid'));
  };

  // Range controls always have a real midpoint value. Initialise their display and
  // progress state so the visible default is treated as a valid answer even if the
  // user is happy with the midpoint and never drags the slider.
  all('input[type="range"][name]').forEach(input=>{
    if(input.dataset.answered!=='true')input.dispatchEvent(new Event('input',{bubbles:true}));
  });

  async function checkStorage(){
    submitBtn.disabled=true;
    try{
      const response=await fetch(`/api/feedback-status?ts=${Date.now()}`,{cache:'no-store'});
      const body=await response.json().catch(()=>({}));
      if(!response.ok||body.configured!==true){
        storageReady=false;
        showStatus(body.error||'Feedback submission is temporarily unavailable because response storage is not ready.','error');
        return;
      }
      storageReady=true;
      submitBtn.disabled=false;
      if(status.classList.contains('error')){status.textContent='';status.className='status';}
    }catch(error){
      storageReady=false;
      showStatus('Feedback submission is temporarily unavailable because response storage could not be reached.','error');
    }
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!storageReady){
      showStatus('Checking response storage. Please try again in a moment.','error');
      await checkStorage();
      if(!storageReady)return;
    }
    const missing=requiredNow().filter(name=>!answered(name));
    markMissing(missing);
    if(missing.length){
      const names=missing.map(name=>fieldLabels[name]||name);
      showStatus(`Please complete: ${names.join('; ')}.`,'error');
      form.querySelector(`[name="${missing[0]}"]`)?.closest('.question')?.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    submitBtn.disabled=true;
    submitBtn.textContent='Submitting…';
    status.textContent='';
    status.className='status';
    try{
      const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||`Submission failed (${response.status})`);
      if(body.ok!==true||!body.updatedRange)throw new Error('The server did not confirm that your feedback was saved.');
      form.style.display='none';
      const progress=document.querySelector('.progress-wrap');
      if(progress)progress.style.display='none';
      const success=document.getElementById('success');
      success?.classList.add('show');
      success?.scrollIntoView({behavior:'smooth',block:'center'});
    }catch(error){
      showStatus(error.message||'Unable to submit feedback. Please try again.','error');
    }finally{
      submitBtn.textContent='Submit Feedback';
      submitBtn.disabled=!storageReady;
    }
  });

  checkStorage();
})();
