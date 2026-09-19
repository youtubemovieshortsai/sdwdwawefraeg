import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
const dir=path.resolve("projects");
async function ensure(){await fs.mkdir(dir,{recursive:true});}
export async function saveProject(project){
 await ensure(); const id=project.id||crypto.randomUUID();
 const value={...project,id,updated_at:new Date().toISOString()};
 await fs.writeFile(path.join(dir,id+".json"),JSON.stringify(value,null,2)); return value;
}
export async function loadProject(id){await ensure();return JSON.parse(await fs.readFile(path.join(dir,id+".json"),"utf8"));}
export async function listProjects(){
 await ensure(); const names=await fs.readdir(dir);
 return Promise.all(names.filter(n=>n.endsWith(".json")).map(async n=>JSON.parse(await fs.readFile(path.join(dir,n),"utf8"))));
}
