import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const dir=path.resolve(process.env.JOBS_DIR||"jobs");
const jobs=new Map();

async function persist(job){
  await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(path.join(dir,job.id+".json"),JSON.stringify(job,null,2));
  return job;
}

export async function createJob(input={}){
  const job={id:randomUUID(),status:"queued",created_at:new Date().toISOString(),input};
  jobs.set(job.id,job);
  await persist(job);
  return job;
}

export async function updateJob(id,patch={}){
  const current=jobs.get(id)||await loadJob(id);
  if(!current) return null;
  const job={...current,...patch,updated_at:new Date().toISOString()};
  jobs.set(id,job);
  await persist(job);
  return job;
}

export async function loadJob(id){
  if(jobs.has(id)) return jobs.get(id);
  try{
    const job=JSON.parse(await fs.readFile(path.join(dir,id+".json"),"utf8"));
    jobs.set(id,job);
    return job;
  }catch{return null;}
}

export async function listJobs(){
  await fs.mkdir(dir,{recursive:true});
  const names=await fs.readdir(dir);
  const persisted=await Promise.all(names.filter(n=>n.endsWith(".json")).map(async n=>{
    try{return JSON.parse(await fs.readFile(path.join(dir,n),"utf8"));}catch{return null;}
  }));
  return persisted.filter(Boolean).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
}

export function runJob(id,worker){
  Promise.resolve().then(async()=>{
    await updateJob(id,{status:"running",started_at:new Date().toISOString()});
    try{
      const result=await worker();
      await updateJob(id,{status:"completed",completed_at:new Date().toISOString(),result});
    }catch(error){
      await updateJob(id,{status:"failed",completed_at:new Date().toISOString(),error:error?.message||String(error)});
    }
  });
}
