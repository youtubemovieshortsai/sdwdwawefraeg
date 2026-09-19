import fs from "node:fs/promises";
import path from "node:path";
function stamp(seconds){const s=Math.max(0,Number(seconds)||0),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=Math.floor(s%60),ms=Math.round((s-Math.floor(s))*1000);return [h,m,sec].map(x=>String(x).padStart(2,"0")).join(":")+","+String(ms).padStart(3,"0");}
function clean(text){return String(text||"").replace(/\r?\n/g," ").replace(/-->/g,"- >").trim();}
export async function writeSrt(scenes,output){const entries=scenes.filter(s=>clean(s.caption||s.dialogue)).map((s,i)=>(i+1)+"\n"+stamp(s.start)+" --> "+stamp(s.end)+"\n"+clean(s.caption||s.dialogue)+"\n");await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,entries.join("\n"),"utf8");return{ok:true,output,count:entries.length};}