import express from 'express';
import crypto from 'node:crypto';
import { parse } from 'csv-parse/sync';

// Keep feedback locked to the workbook chosen for Summer Bingo feedback.
// Do not allow a stale deployment environment variable to redirect responses elsewhere.
const FEEDBACK_SHEET_ID = '1q5d4ogALQ5qrNr0qz3godAX0TYHH14E53ShJ5VvPQyE';
const FEEDBACK_SHEET_NAME = 'Responses';
const FEEDBACK_PROXY_URL = process.env.FEEDBACK_PROXY_URL || 'http://worker.railway.internal:8080/internal/rancour-events/feedback';
const FEEDBACK_PROXY_HEALTH_URL = `${FEEDBACK_PROXY_URL}/health`;
const SERVICE_ACCOUNT_JSON = process.env.FEEDBACK_GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
const SERVICE_ACCOUNT_EMAIL = process.env.FEEDBACK_GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.FEEDBACK_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

let tokenCache = { accessToken: '', expiresAt: 0 };

const fieldOrder = [
  'identity','enjoyment','futureLikelihood','length','difficulty','balance','favouriteTile','favouriteTileWhy',
  'leastFavouriteTile','leastFavouriteTileWhy','teamFairness','teamSize','contribution','motivations','rulesClarity',
  'dashboardRating','dashboardFeatures','missingDashboard','playerStatsUsefulness','sideObjectives',
  'sideObjectivesRecommendations','dropSubmissionMethod','discordNoPluginReason','runelitePluginFeedback',
  'keep','improve','futureIdeas','other',
];
const listFields = new Set(['motivations','dashboardFeatures']);
const requiredFields = [
  'enjoyment','futureLikelihood','length','difficulty','balance','favouriteTile','favouriteTileWhy','leastFavouriteTile',
  'leastFavouriteTileWhy','teamFairness','teamSize','contribution','motivations','rulesClarity','dashboardRating',
  'playerStatsUsefulness','sideObjectives','dropSubmissionMethod',
];

function base64Url(value){const buffer=Buffer.isBuffer(value)?value:Buffer.from(value);return buffer.toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')}
function readServiceAccount(){
  if(SERVICE_ACCOUNT_JSON){
    try{
      const value=JSON.parse(SERVICE_ACCOUNT_JSON);
      if(value?.client_email&&value?.private_key)return value;
    }catch(error){console.error('Invalid feedback service-account JSON:',error.message)}
  }
  if(SERVICE_ACCOUNT_EMAIL&&SERVICE_ACCOUNT_PRIVATE_KEY){
    return {client_email:SERVICE_ACCOUNT_EMAIL,private_key:SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g,'\n')};
  }
  return null;
}
async function getGoogleAccessToken(){
  if(tokenCache.accessToken&&Date.now()<tokenCache.expiresAt-60000)return tokenCache.accessToken;
  const account=readServiceAccount();
  if(!account){const error=new Error('Feedback submission storage is not configured on the server.');error.code='FEEDBACK_NOT_CONFIGURED';throw error}
  const now=Math.floor(Date.now()/1000),header=base64Url(JSON.stringify({alg:'RS256',typ:'JWT'})),claim=base64Url(JSON.stringify({iss:account.client_email,scope:SHEETS_SCOPE,aud:GOOGLE_TOKEN_URL,iat:now,exp:now+3600})),unsigned=`${header}.${claim}`,signature=crypto.createSign('RSA-SHA256').update(unsigned).end().sign(account.private_key),assertion=`${unsigned}.${base64Url(signature)}`;
  const response=await fetch(GOOGLE_TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth-type:jwt-bearer',assertion})});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||!payload.access_token)throw new Error(payload.error_description||payload.error||`Google OAuth returned ${response.status}`);
  tokenCache={accessToken:payload.access_token,expiresAt:Date.now()+Number(payload.expires_in||3600)*1000};
  return tokenCache.accessToken;
}
function cleanText(value,max=4000){return String(value??'').replace(/\u0000/g,'').trim().slice(0,max)}
function cleanList(value){if(!Array.isArray(value))return[];return[...new Set(value.map(item=>cleanText(item,120)).filter(Boolean))].slice(0,20)}
function normaliseFeedback(body){const result={};for(const key of fieldOrder)result[key]=listFields.has(key)?cleanList(body?.[key]):cleanText(body?.[key]);return result}
function oneOf(value,options){return options.includes(value)}
function validateFeedback(feedback){
  const missing=requiredFields.filter(key=>Array.isArray(feedback[key])?feedback[key].length===0:!String(feedback[key]||'').trim());if(missing.length)return'Please answer all required questions.';
  for(const [key,min,max] of [['enjoyment',1,10],['futureLikelihood',1,10],['balance',1,5],['teamFairness',1,5],['rulesClarity',1,5],['dashboardRating',1,5]]){const value=Number(feedback[key]);if(!Number.isFinite(value)||value<min||value>max)return`Invalid value supplied for ${key}.`}
  if(!oneOf(feedback.length,['Too short','Slightly too short','About right','Slightly too long','Too long']))return'Invalid event length value.';
  if(!oneOf(feedback.difficulty,['Too easy','Slightly easy','About right','Slightly hard','Too hard']))return'Invalid board difficulty value.';
  if(!oneOf(feedback.teamSize,['Too small','Slightly too small','About right','Slightly too big','Too big']))return'Invalid team size value.';
  if(!oneOf(feedback.contribution,['No','Not really','Yes, somewhat','Yes, a lot']))return'Invalid contribution value.';
  if(!oneOf(feedback.playerStatsUsefulness,['1','2','3','4','5','Did not use it']))return'Invalid player stats usefulness value.';
  if(!oneOf(feedback.sideObjectives,['No','Maybe','Yes']))return'Invalid side objectives value.';
  if(feedback.sideObjectives==='Yes'&&!feedback.sideObjectivesRecommendations)return'Please add your recommendations for future side objectives or awards.';
  if(!oneOf(feedback.dropSubmissionMethod,['Discord','RuneLite Plugin']))return'Invalid drop submission method.';
  if(feedback.dropSubmissionMethod==='Discord'&&!feedback.discordNoPluginReason)return'Please tell us why you used Discord rather than the RuneLite Plugin.';
  if(feedback.dropSubmissionMethod==='RuneLite Plugin'&&!feedback.runelitePluginFeedback)return'Please add feedback about your RuneLite Plugin experience.';
  const tilePattern=/^#(?:[1-9]|[12]\d|3[0-6])\s+.+/;
  if(!tilePattern.test(feedback.favouriteTile)||!tilePattern.test(feedback.leastFavouriteTile))return'Please choose your favourite and least favourite tiles from the Bingo board.';
  return'';
}
function feedbackRow(feedback,responseId){return[
  new Date().toISOString(),responseId,feedback.identity,feedback.enjoyment,feedback.futureLikelihood,feedback.length,feedback.difficulty,feedback.balance,
  feedback.favouriteTile,feedback.favouriteTileWhy,feedback.leastFavouriteTile,feedback.leastFavouriteTileWhy,feedback.teamFairness,feedback.teamSize,
  feedback.contribution,feedback.motivations.join(' | '),feedback.rulesClarity,feedback.dashboardRating,feedback.dashboardFeatures.join(' | '),feedback.missingDashboard,
  feedback.playerStatsUsefulness,feedback.sideObjectives,feedback.sideObjectives==='Yes'?feedback.sideObjectivesRecommendations:'',feedback.dropSubmissionMethod,
  feedback.dropSubmissionMethod==='Discord'?feedback.discordNoPluginReason:'',feedback.dropSubmissionMethod==='RuneLite Plugin'?feedback.runelitePluginFeedback:'',
  feedback.keep,feedback.improve,feedback.futureIdeas,feedback.other,
]}
async function appendFeedbackViaProxy(row){
  const response=await fetch(FEEDBACK_PROXY_URL,{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'RancourEvents/1.0 (+Private Feedback Proxy)'},body:JSON.stringify({row})});
  const text=await response.text();
  let payload={};
  try{payload=text?JSON.parse(text):{}}catch{payload={}}
  if(!response.ok)throw new Error(payload.error||text||`Feedback proxy returned ${response.status}`);
  if(!payload.ok)throw new Error('Feedback proxy did not confirm that the response was saved.');
  return payload.updatedRange||`${FEEDBACK_SHEET_NAME}!A:AD`;
}
async function appendFeedback(row){
  if(!readServiceAccount())return appendFeedbackViaProxy(row);
  const accessToken=await getGoogleAccessToken();
  const range=encodeURIComponent(`${FEEDBACK_SHEET_NAME}!A:AD`);
  const url=`https://sheets.googleapis.com/v4/spreadsheets/${FEEDBACK_SHEET_ID}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS&includeValuesInResponse=true`;
  const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({values:[row]})});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload?.error?.message||`Google Sheets returned ${response.status}`);
  if(Number(payload?.updates?.updatedRows)!==1)throw new Error('Google Sheets did not confirm that the feedback row was saved.');
  return payload?.updates?.updatedRange||'';
}
function recordsFromValues(values){
  const rows=Array.isArray(values)?values:[];
  const headers=(rows[0]||[]).map(value=>String(value||'').trim());
  const records=rows.slice(1).filter(row=>row.some(value=>String(value||'').trim())).map(row=>Object.fromEntries(headers.map((header,index)=>[header,String(row[index]??'').trim()])));
  return {headers,records};
}
async function fetchFeedbackRowsAuthenticated(){
  const accessToken=await getGoogleAccessToken();
  const range=encodeURIComponent(`${FEEDBACK_SHEET_NAME}!A:AD`);
  const response=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${FEEDBACK_SHEET_ID}/values/${range}`,{headers:{Authorization:`Bearer ${accessToken}`}});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload?.error?.message||`Google Sheets returned ${response.status}`);
  return recordsFromValues(payload.values||[]);
}
async function fetchFeedbackRowsPublic(){
  const params=new URLSearchParams({tqx:'out:csv',sheet:FEEDBACK_SHEET_NAME,range:'A:AD'}),url=`https://docs.google.com/spreadsheets/d/${FEEDBACK_SHEET_ID}/gviz/tq?${params}`,response=await fetch(url,{redirect:'follow',headers:{'User-Agent':'RancourEvents/1.0 (+Feedback Results)'}});
  if(!response.ok)throw new Error(`Google Sheets returned ${response.status}`);
  const text=await response.text();
  if(text.trim().startsWith('<!DOCTYPE html')||text.includes('accounts.google.com'))throw new Error('Feedback Sheet is not anonymously readable.');
  const rows=parse(text,{relax_column_count:true,skip_empty_lines:true});
  return recordsFromValues(rows);
}
async function fetchFeedbackRows(){
  if(readServiceAccount()){
    try{return await fetchFeedbackRowsAuthenticated()}catch(error){console.error('Authenticated feedback results read failed, falling back to public CSV:',error.message)}
  }
  return fetchFeedbackRowsPublic();
}
async function feedbackStorageStatus(){
  if(readServiceAccount())return{configured:true,mode:'direct-google-service-account'};
  try{
    const response=await fetch(FEEDBACK_PROXY_HEALTH_URL,{headers:{'User-Agent':'RancourEvents/1.0 (+Private Feedback Proxy)'},cache:'no-store'});
    const body=await response.json().catch(()=>({}));
    return{configured:Boolean(response.ok&&body.ok),mode:'railway-private-proxy'};
  }catch(error){
    console.error('Feedback proxy health check failed:',error.message);
    return{configured:false,mode:'railway-private-proxy'};
  }
}

export function registerFeedbackRoutes(app){
  app.get('/api/feedback-status',async(_req,res)=>{const status=await feedbackStorageStatus();res.set('Cache-Control','no-store');return res.json({...status,sheetId:FEEDBACK_SHEET_ID,sheetName:FEEDBACK_SHEET_NAME})});
  app.post('/api/feedback',express.json({limit:'120kb'}),async(req,res)=>{
    try{
      const feedback=normaliseFeedback(req.body||{}),validationError=validateFeedback(feedback);if(validationError)return res.status(400).json({error:validationError});
      const responseId=crypto.randomUUID();
      const updatedRange=await appendFeedback(feedbackRow(feedback,responseId));
      res.set('Cache-Control','no-store');
      return res.status(201).json({ok:true,responseId,updatedRange,sheetId:FEEDBACK_SHEET_ID});
    }catch(error){
      console.error('Feedback submission failed:',error);
      return res.status(error.code==='FEEDBACK_NOT_CONFIGURED'?503:502).json({error:error.message||'Unable to submit feedback.'});
    }
  });
  app.get('/api/feedback-results',async(_req,res)=>{
    try{const result=await fetchFeedbackRows();res.set('Cache-Control','no-store');return res.json({...result,refreshedAt:new Date().toISOString()})}
    catch(error){console.error('Feedback results refresh failed:',error);return res.status(503).json({error:error.message||'Unable to load feedback results.'})}
  });
  app.get('/feedback',(_req,res)=>res.sendFile(new URL('./public/feedback.html',import.meta.url).pathname));
  app.get('/feedback-results',(_req,res)=>res.sendFile(new URL('./public/feedback-results.html',import.meta.url).pathname));
}
