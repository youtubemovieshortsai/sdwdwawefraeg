import { spawn } from "node:child_process";

export function runFfmpeg(args){
 return new Promise((resolve,reject)=>{
  const p=spawn(process.env.FFMPEG_PATH||"ffmpeg",args,{stdio:["ignore","pipe","pipe"]});
  let stderr="";
  p.stderr.on("data",d=>stderr+=d);
  p.on("error",reject);
  p.on("close",code=>code===0?resolve({ok:true}):reject(new Error("FFmpeg failed: "+stderr.slice(-2000))));
 });
}

export function probeMedia(input){
 return new Promise((resolve,reject)=>{
  const p=spawn(process.env.FFPROBE_PATH||"ffprobe",["-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",input],{stdio:["ignore","pipe","pipe"]});
  let out="",err="";
  p.stdout.on("data",d=>out+=d);p.stderr.on("data",d=>err+=d);
  p.on("error",reject);p.on("close",code=>code===0?resolve({duration_seconds:Number(out.trim())||0}):reject(new Error("FFprobe failed: "+err.slice(-1000))));
 });
}
