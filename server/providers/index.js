import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { runFfmpeg } from "../ffmpeg.js";

const jobs=new Map();

function clipJob(input={}){
 const id=randomUUID();
 const job={id,status:"queued",provider:process.env.VIDEO_PROVIDER||"local",created_at:new Date().toISOString(),input};
 jobs.set(id,job);
 return job;
}

export function getVideoProvider(){
 const name=(process.env.VIDEO_PROVIDER||"local").toLowerCase();
 if(name==="local"||name==="stub") return {
  async generateClip(input={}){ return clipJob(input); },
  async getJob(id){ return jobs.get(id)||null; }
 };
 throw new Error(`Unknown VIDEO_PROVIDER: ${name}`);
}

export async function renderThumbnail({input,output,width,height}){
 if(!input) throw new Error("input image is required");
 await fs.mkdir(path.dirname(output),{recursive:true});
 await runFfmpeg(["-y","-i",input,"-vf",`scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,"-frames:v","1",output]);
 return {ok:true,output,width,height};
}

export async function assembleVideo({clips=[],voiceover,audio,output,width,height,fps=30}){
 if(!clips.length) throw new Error("at least one video clip is required");
 await fs.mkdir(path.dirname(output),{recursive:true});
 const listFile=path.join(path.dirname(output),`.concat-${randomUUID()}.txt`);
 await fs.writeFile(listFile,clips.map(x=>`file '${path.resolve(x)}'`).join("\n"));
 const args=["-y","-f","concat","-safe","0","-i",listFile];
 if(voiceover||audio) args.push("-i",voiceover||audio);
 args.push("-vf",`scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${fps}`,"-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac","-shortest",output);
 try{await runFfmpeg(args);return {ok:true,output,width,height,fps};}
 finally{await fs.rm(listFile,{force:true});}
}
