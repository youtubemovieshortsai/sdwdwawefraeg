import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { runFfmpeg } from "./ffmpeg.js";
import { getVisualPacks } from "./visual-packs/index.js";

const FONT_BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

const clampDuration=value=>Math.max(1,Math.min(30,Number(value)||5));
const escFile=value=>String(value||"").replace(/\\/g,"\\\\").replace(/:/g,"\\:").replace(/'/g,"\\'");

function effectFilters(packIds){
 const ids=new Set(packIds);
 const f=[];
 if(ids.has("cinematic")) f.push("noise=alls=5:allf=t+u","vignette=PI/5","eq=contrast=1.08:saturation=1.05");
 if(ids.has("mystery")) f.push("eq=brightness=-0.04:contrast=1.12:saturation=0.88","vignette=PI/3");
 if(ids.has("tech")) f.push("eq=contrast=1.12:saturation=1.15","noise=alls=3:allf=t");
 if(ids.has("nature")) f.push("eq=brightness=0.02:saturation=1.12","vignette=PI/7");
 if(ids.has("documentary")) f.push("eq=contrast=1.03:saturation=0.96");
 if(ids.has("comic")) f.push("eq=contrast=1.16:saturation=1.2");
 if(ids.has("gaming")) f.push("eq=contrast=1.12:saturation=1.18","noise=alls=4:allf=t");
 if(ids.has("minimal")) f.push("eq=contrast=1.02:saturation=0.98");
 return f;
}

function imageMotionFilter(width,height,seconds){
 return [
  "scale="+width+":"+height+":force_original_aspect_ratio=increase",
  "crop="+width+":"+height,
  "zoompan=z='min(zoom+0.0007,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s="+width+"x"+height+":fps=30",
  "trim=duration="+seconds,
  "setpts=PTS-STARTPTS"
 ].join(",");
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
 const caption=String(scene.caption||scene.dialogue||"").trim().replace(/\s+/g," ").slice(0,140);
 await fs.writeFile(captionFile,caption);

 const filters=[
  imageMotionFilter(width,height,seconds),
  ...effectFilters(ids),
  "format=yuv420p",
  "fade=t=in:st=0:d=0.35",
  "fade=t=out:st="+Math.max(0,seconds-0.45)+":d=0.45",
  "drawtext=fontfile="+FONT_BOLD+":textfile="+escFile(captionFile)+":fontsize='min(w,h)*0.052':fontcolor='white@0.96':shadowcolor='black@0.8':shadowx=3:shadowy=3:x='(w-text_w)/2':y='h*0.78':enable='gt(t,0.18)'"
 ].join(",");

 const imagePath=scene.image_path;
 const args=["-y"];
 if(imagePath){
  args.push("-loop","1","-i",imagePath);
 }else{
  const palette=["0x101827","0x172033","0x0b1320","0x1a1424","0x101c19"];
  const base=palette[Math.abs(String(scene.id||"1").split("").reduce((a,c)=>a+c.charCodeAt(0),0))%palette.length];
  args.push("-f","lavfi","-i","color=c="+base+":s="+width+"x"+height+":r="+fps+":d="+seconds);
 }
 args.push("-vf",filters,"-t",String(seconds),"-r",String(fps),"-c:v","libx264","-preset","veryfast","-crf","20","-pix_fmt","yuv420p","-an",finalOutput);
 try{
  await runFfmpeg(args);
 }finally{
  await fs.rm(captionFile,{force:true});
 }
 return {ok:true,provider:imagePath?"puter_free_image+ffmpeg":"local_free_fallback",output:finalOutput,width,height,fps,duration:seconds,visual_packs:ids,image_source:Boolean(imagePath)};
}
