/** Reproducible lab audit. Run against npm run preview, without concurrent browser tests. */
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const label=process.argv[2]||'current';
if(!/^[a-z0-9-]+$/.test(label))throw new Error('Use a simple audit label');
const base=process.env.ROMA_PERF_URL||'http://localhost:4321';
const output=new URL(`../research/performance/${label}/`,import.meta.url);
await mkdir(output,{recursive:true});
const results=[];
for(const [page,path] of [['home','/'],['article','/articles/augustan-settlement/'],['atlas','/atlas/']]){
  for(let run=1;run<=3;run++){
    const file=new URL(`${page}-${run}.json`,output);
    const args=['--yes','lighthouse@13.5.0',new URL(path,base).href,'--quiet','--only-categories=performance,accessibility','--chrome-flags=--headless --no-sandbox --enable-unsafe-swiftshader --disable-dev-shm-usage','--output=json',`--output-path=${file.pathname}`];
    await new Promise((resolve,reject)=>{
      const child=spawn('npx',args,{env:{...process.env,CHROME_PATH:process.env.CHROME_PATH||chromium.executablePath()},stdio:'inherit'});
      child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(`Lighthouse exited ${code}`)));
    });
    const report=JSON.parse(await readFile(file,'utf8'));
    const result={page,run,lighthouse:report.lighthouseVersion,settings:report.configSettings,performance:report.categories.performance.score*100,accessibility:report.categories.accessibility.score*100,lcpMs:report.audits['largest-contentful-paint'].numericValue,cls:report.audits['cumulative-layout-shift'].numericValue,tbtMs:report.audits['total-blocking-time'].numericValue};
    results.push(result);console.log(JSON.stringify({page,run,performance:result.performance,lcpMs:result.lcpMs,cls:result.cls,tbtMs:result.tbtMs}));
  }
}
await writeFile(new URL('summary.json',output),JSON.stringify({base,label,date:new Date().toISOString(),note:'Laboratory measurements; TBT is not field INP.',results},null,2)+'\n');
