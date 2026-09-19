import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { runFfmpeg } from "./ffmpeg.js";
import { getVisualPacks } from "./visual-packs/index.js";

const FONT_FILE="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONT_BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

const clampDuration=value=>Math.max(1,Math.min(30,Number(value)||5));
const escFile=value=>String(value||"").replace(/\\/g,"\\\\").replace(/:/g,"\\:").replace(/'/g,"\\'");

function effectFilters(packIds,width,height){
 const ids=new Set(packIds);
 const f=[];
 if(ids.has("cinematic")){
  f.push("drawbox=x='-w+mod(t*0.18*(w+2*w),w+2*w)':y='0.08*h':w='0.7*w':h='0.18*h':color='white@0.045':t=fill");
  f.push("drawbox=x='mod(t*0.12*(w+2*w),w+2*w)-w':y='0.72*h':w='0.55*w':h='0.08*h':color='white@0.035':t=fill");
 }
 if(ids.has("mystery")){
  f.push("noise=alls=7:allf=t+u");
  f.push("vignette=PI/5");
  f.push("drawbox=x='0.08*w+0.04*w*sin(t*0.7)':y='0.18*h':w='0.84*w':h='0.64*h':color='black@0.08':t=fill");
 }
 if(ids.has("tech")){
  f.push("drawgrid=w='w/8':h='h/14':t=1:c='white@0.08'");
  f.push("drawbox=x='0':y='mod(t*0.32*h,h)':w='w':h='3':color='white@0.18':t=fill");
  f.push("drawbox=x='0.07*w+0.02*w*sin(t*2)':y='0.12*h':w='0.86*w':h='0.002*h':color='white@0.35':t=fill");
 }
 if(ids.has("nature")){
  f.push("drawbox=x='-0.3*w+0.55*w*sin(t*0.18)':y='-0.1*h':w='0.42*w':h='1.2*h':color='white@0.045':t=fill');
  f.push("drawbox=x='0.72*w+0.35*w*sin(t*0.13+1)':y='-0.15*h':w='0.18*w':h='1.3*h':color='white@0.035':t=fill');
 }
 if(ids.has("documentary")){
  f.push("drawbox=x='0.055*w':y='0.055*h':w='0.89*w':h='0.89*h':color='white@0.12':t=2");
  f.push("drawbox=x='0.055*w':y='0.055*h':w='0.008*w':h='0.89*h':color='white@0.65':t=fill");
 }
 if(ids.has("comic")){
  f.push("drawbox=x='0.04*w':y='0.06*h':w='0.42*w':h='0.88*h':color='white@0.08':t=2");
  f.push("drawbox=x='0.54*w':y='0.06*h':w='0.42*w':h='0.42*h':color='white@0.08':t=2");
  f.push("drawbox=x='0.54*w':y='0.52*h':w='0.42*w':h='0.42*h':color='white@0.08':t=2");
 }
 if(ids.has("gaming")){
  f.push("drawgrid=w='w/10':h='h/18':t=1:c='white@0.055'");
  f.push("drawbox=x='0':y='0.5*h+0.08*h*sin(t*8)':w='w':h='2':color='white@0.12':t=fill");
  f.push("drawbox=x='0.12*w+0.04*w*sin(t*3)':y='0.14*h':w='0.76*w':h='0.004*h':color='white@0.28':t=fill");
 }
 if(ids.has("minimal")){
  f.push("drawbox=x='0.08*w':y='0.1*h':w='0.84*w':h='0.002*h':color='white@0.2':t=fill");
 }
 return f;
}

export async function generateFreeVisualClip({scene={},format={},output,duration}={}){
 const width=Number(format.width)||1920;
 const height=Number(format.height)||1080;
 const fps=30;
 const seconds=clampDuration(duration??scene.duration??((Number(scene.end)||0)-(Number(scene.start)||0)));
 const packs=getVisualPacks(Array.isArray(scene.visual_packs)?scene.visual_packs:[]);
 const ids=packs.map(x=>x.id);
 const workDir=path.dirname(output||path.join(process.env.OUTPUT_DIR||"renders","free-clip-"+randomUUID()+".mp4"));
 await fs.mkdir(workDir,{recursive:true});
 const finalOutput=output||path.join(workDir,"clip.mp4");
 const captionFile=path.join(workDir,"caption-"+randomUUID()+".txt");
 const promptFile=path.join(workDir,"prompt-"+randomUUID()+".txt");
 const caption=String(scene.caption||scene.dialogue||"").trim().replace(/\s+/g," ").slice(0,140);
 const prompt=String(scene.visual_prompt||"").trim().replace(/\s+/g," ").slice(0,180);
 await fs.writeFile(captionFile,caption);
 await fs.writeFile(promptFile,prompt);

 const palette=["0x101827","0x172033","0x0b1320","0x1a1424","0x101c19"];
 const base=palette[Math.abs(String(scene.id||"1").split("").reduce((a,c)=>a+c.charCodeAt(0),0))%palette.length];
 const filters=[
  "format=yuv420p",
  ...effectFilters(ids,width,height),
  "eq=contrast=1.04:brightness=-0.015:saturation=1.08",
  "fade=t=in:st=0:d=0.35",
  "fade=t=out:st="+Math.max(0,seconds-0.45)+":d=0.45",
  "drawtext=fontfile="+FONT_BOLD+":textfile="+escFile(captionFile)+":fontsize='min(w,h)*0.052':fontcolor='white@0.96':shadowcolor='black@0.8':shadowx=3:shadowy=3:x='(w-text_w)/2':y='h*0.78':enable='gt(t,0.18)'",
  "drawtext=fontfile="+FONT_FILE+":textfile="+escFile(promptFile)+":fontsize='min(w,h)*0.022':fontcolor='white@0.55':x='(w-text_w)/2':y='h*0.84':enable='gt(t,0.5)'"
 ].join(",");

 await runFfmpeg([
  "-y",
  "-f","lavfi",
  "-i","color=c="+base+":s="+width+"x"+height+":r="+fps+":d="+seconds,
  "-vf",filters,
  "-t",String(seconds),
  "-r",String(fps),
  "-c:v","libx264",
  "-preset","veryfast",
  "-crf","20",
  "-pix_fmt","yuv420p",
  "-an",
  finalOutput
 ]);
 await fs.rm(captionFile,{force:true});
 await fs.rm(promptFile,{force:true});
 return {ok:true,provider:"local_free",output:finalOutput,width,height,fps,duration:seconds,visual_packs:ids};
}
