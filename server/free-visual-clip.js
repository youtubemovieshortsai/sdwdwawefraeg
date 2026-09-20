import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { runFfmpeg } from "./ffmpeg.js";
import { getVisualPacks } from "./visual-packs/index.js";

const FONT_FILE="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONT_BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

const clampDuration=value=>Math.max(1,Math.min(30,Number(value)||5));
const escFile=value=>String(value||"").replace(/\\/g,"\\\\").replace(/:/g,"\\:").replace(/'/g,"\\'");

function effectFilters(ids,width,height){
  const filters=[];

  if(ids.includes("cinematic")){
    filters.push(
      "noise=alls=8:allf=t+u",
      "vignette=PI/5",
      "eq=contrast=1.08:saturation=1.05"
    );
  }

  if(ids.includes("mystery")){
    filters.push(
      "eq=brightness=-0.04:contrast=1.12:saturation=0.88",
      "vignette=PI/3"
    );
  }

  if(ids.includes("tech")){
    filters.push(
      "eq=contrast=1.12:saturation=1.15"
    );
  }

  return filters;
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

 const palette=["0x101827","0x172033","0x0b1320","0x1a1424","0x101c19"];
 const base=palette[Math.abs(String(scene.id||"1").split("").reduce((a,c)=>a+c.charCodeAt(0),0))%palette.length];
 const filters=[
  "format=yuv420p",
  ...effectFilters(ids,width,height),
  "eq=contrast=1.04:brightness=-0.015:saturation=1.08",
  "fade=t=in:st=0:d=0.35",
  "fade=t=out:st="+Math.max(0,seconds-0.45)+":d=0.45",
  "drawtext=fontfile="+FONT_BOLD+":textfile="+escFile(captionFile)+":fontsize='min(w,h)*0.052':fontcolor='white@0.96':shadowcolor='black@0.8':shadowx=3:shadowy=3:x='(w-text_w)/2':y='h*0.78':enable='gt(t,0.18)'",
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
 return {ok:true,provider:"local_free",output:finalOutput,width,height,fps,duration:seconds,visual_packs:ids};
}
