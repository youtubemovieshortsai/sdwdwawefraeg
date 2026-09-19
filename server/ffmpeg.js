import {spawn} from "node:child_process";
export function runFfmpeg(args){
 return new Promise((resolve,reject)=>{
  const p=spawn(process.env.FFMPEG_PATH||"ffmpeg",args,{stdio:["ignore","pipe","pipe"]});
  let stderr="";p.stderr.on("data",d=>stderr+=d);
  p.on("error",reject);p.on("close",code=>code===0?resolve({ok:true}):reject(new Error("FFmpeg failed: "+stderr.slice(-2000))));
 });
}
