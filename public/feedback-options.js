const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
$$('[data-scale]').forEach(box=>{const name=box.dataset.scale,max=Number(box.dataset.max||10);box.innerHTML=Array.from({length:max},(_,i)=>`<label><input required type="radio" name="${name}" value="${i+1}"><span>${i+1}</span></label>`).join('')});
$$('[data-choice]').forEach(box=>{const name=box.dataset.choice;box.innerHTML=box.dataset.options.split('|').map(value=>`<label><input required type="radio" name="${name}" value="${value}"><span>${value}</span></label>`).join('')});
$$('[data-multi]').forEach(box=>{const name=box.dataset.multi;box.innerHTML=box.dataset.options.split('|').map(value=>`<label><input type="checkbox" name="${name}" value="${value}"><span>${value}</span></label>`).join('')});
const requiredGroups=['enjoyment','futureLikelihood','length','difficulty','balance','teamFairness','contribution','motivations','rulesClarity','dashboardRating','playerStatsUsefulness','bountyRating','sideObjectives'];
function groupAnswered(name){return $$(`[name="${name}"]`).some(n=>n.checked)}
function updateProgress(){const answered=requiredGroups.filter(groupAnswered).length,pct=Math.round(answered/requiredGroups.length*100);$('#progressFill').style.width=pct+'%';$('#progressText').textContent=pct+'% complete'}
const feedbackForm=$('#feedbackForm');feedbackForm.addEventListener('change',updateProgress);feedbackForm.addEventListener('input',updateProgress);updateProgress();
window.feedbackUi={$, $$, requiredGroups, groupAnswered};
