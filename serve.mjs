import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'dist');
const assets=new Map([
  ['index.html','text/html; charset=utf-8'],['styles.css','text/css; charset=utf-8'],
  ['app.mjs','text/javascript; charset=utf-8'],['engine.mjs','text/javascript; charset=utf-8'],
  ['life.mjs','text/javascript; charset=utf-8'],['life-ui.mjs','text/javascript; charset=utf-8'],
  ['visuals.mjs','text/javascript; charset=utf-8'],['sw.js','text/javascript; charset=utf-8'],
  ['mark.svg','image/svg+xml'],['icon-192.png','image/png'],['icon-512.png','image/png'],
  ['manifest.webmanifest','application/manifest+json']
]);
const port=Number(process.env.REPQUEST_PORT||4173);
const apiKey=process.env.OPENAI_API_KEY?.trim();
const model=process.env.REPQUEST_OPENAI_MODEL||'gpt-4.1-mini';
const localOrigins=new Set(['http://127.0.0.1:'+port,'http://localhost:'+port]);
const instructions='You are RepQuest, a fitness education coach for students and beginners. Give brief, practical, low-risk home workout advice. Stay within the topic of general fitness. Include rest, comfortable effort, and seated or equipment-free options where relevant. Never diagnose conditions, recommend weight-loss diets, push through pain, or suggest extreme challenges. For pain or dizziness, recommend stopping and seeking qualified guidance. If symptoms seem severe, suggest urgent help. Avoid asking for personal or health identifiers.';
let busy=false, nextRequest=0;
function json(res,status,value){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(value));
}
async function askCoach(req,res){
  if(req.method!=='POST'||!localOrigins.has(req.headers.origin)||req.headers['content-type']!=='application/json'){
    json(res,403,{error:'Online coaching requires a local app request.'});return;
  }
  if(!apiKey){json(res,503,{error:'Online coaching is unavailable.'});return;}
  let question;
  try{
    const data=[];let size=0;
    for await(const chunk of req){
      size+=chunk.length;
      if(size>4096){json(res,413,{error:'The question is too long.'});return;}
      data.push(chunk);
    }
    question=JSON.parse(Buffer.concat(data)).question;
    if(typeof question!=='string'||!question.trim()||question.length>400)throw Error();
  }catch{json(res,400,{error:'Enter a question of up to 400 characters.'});return;}
  if(busy||Date.now()<nextRequest){json(res,429,{error:'Wait a moment before asking the online coach again.'});return;}
  busy=true;nextRequest=Date.now()+2000;
  try{
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
      headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
      body:JSON.stringify({model,instructions,input:question.trim(),max_output_tokens:320,store:false})
    });
    if(!response.ok)throw Error();
    const payload=await response.json();
    const answer=payload.output?.filter(item=>item.type==='message').flatMap(item=>item.content||[]).filter(item=>item.type==='output_text').map(item=>item.text).join('\n').trim();
    if(!answer)throw Error();
    json(res,200,{answer:answer.slice(0,3000)});
  }catch{json(res,502,{error:'Online coaching is temporarily unavailable.'});}
  finally{busy=false;}
}
createServer(async(req,res)=>{
  const path=new URL(req.url,'http://127.0.0.1').pathname;
  if(path==='/api/coach/status'&&req.method==='GET'){json(res,200,{available:!!apiKey});return;}
  if(path==='/api/coach'){await askCoach(req,res);return;}
  const file=path==='/'?'index.html':path.slice(1);
  if(!assets.has(file)){res.writeHead(404).end('Not found');return;}
  try{
    const bytes=await readFile(join(root,file));
    res.writeHead(200,{'Content-Type':assets.get(file),'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}).end(bytes);
  }catch{res.writeHead(404).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log('RepQuest is running at http://127.0.0.1:'+port+'/'));
