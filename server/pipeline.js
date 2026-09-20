import path from "node:path";
import { randomUUID } from "node:crypto";
import { createPlan } from "./openai.js";
import { buildStoryboard } from "./storyboard.js";
import { buildRenderPlan } from "./render.js";
import { generateVoiceover } from "./audio.js";
import { generateThumbnail } from "./media.js";
import { getVideoProvider, assembleVideo, renderThumbnail } from "./providers/index.js";
import { writeSrt } from "./subtitles.js";
import { getOutputFormat } from "./formats.js";

const publicAsset=file=>{
 if(!file)return null;
 const root=path.resolve(process.env.OUTPUT_DIR||"renders");
 const rel=path.relative(root,path.resolve(file)).split(path.sep).join("/");
 return "/renders/"+rel.replace(/^\/+/, "");
};

export async function runProductionPipeline(input={}){
 const brief=String(input.brief||"").trim();
 const format_id=input.format_id||"youtube_landscape";
 if(!brief&&!input.plan)throw new Error("brief or plan is required");

 const plan=input.plan||await createPlan(brief,format_id);
 const format=getOutputFormat(plan.format?.id||format_id);
 const storyboard=buildStoryboard(plan).map(scene=>{
  const asset=input.visual_assets?.[scene.id] || input.visual_assets?.[String(scene.id)];
  return asset ? {...scene,image_path:asset} : scene;
});
 const jobId=input.job_id||randomUUID();
 const root=path.resolve(process.env.OUTPUT_DIR||"renders");
 const workDir=input.work_dir||path.join(root,jobId);
 const render=buildRenderPlan({plan,format_id:format.id});
 const output=input.output||path.join(workDir,format.id+"."+(format.id.includes("thumbnail")?"png":"mp4"));
 const subtitleOutput=input.subtitle_output||output.replace(/.[^.]+$/,".srt");
 const subtitles=await writeSrt(storyboard,subtitleOutput);
 const publicSubtitles={...subtitles,output_url:publicAsset(subtitles.output)};

 if(format.id.includes("thumbnail")){
  const rendered=input.image_file
   ? await renderThumbnail({input:input.image_file,output,width:format.width,height:format.height})
   : await generateThumbnail({prompt:plan.thumbnail_prompt||brief,output,width:format.width,height:format.height});
  return {status:"rendered",job_id:jobId,format,plan,storyboard,render:{...render,output},rendered:{...rendered,output_url:publicAsset(rendered.output)},subtitles:publicSubtitles,next_stage:"complete"};
 }

 let voiceover=null;
 const voiceText=input.voiceover_text||storyboard.map(s=>s.dialogue).filter(Boolean).join(" ");
 if(input.generate_voiceover!==false&&voiceText.trim()){
  const generated=await generateVoiceover({text:voiceText,voice:input.voice||"nova",output:input.voiceover_output||path.join(workDir,"voiceover.mp3")});
  voiceover={...generated,output_url:publicAsset(generated.output)};
 }

 const provider=getVideoProvider();
 const clipFiles=[];
 const clipJobs=[];
 for(let i=0;i<storyboard.length;i++){
  const scene=storyboard[i];
  const job=await provider.generateClip({
   scene,
   format,
   output:path.join(workDir,"clip-"+String(i+1).padStart(2,"0")+".mp4")
  });
  clipJobs.push({...job,output_url:publicAsset(job.output)});
  if(job.output)clipFiles.push(job.output);
 }

 if(input.clip_files?.length)clipFiles.splice(0,clipFiles.length,...input.clip_files);

 let rendered=null;
 if(clipFiles.length){
  const assembled=await assembleVideo({clips:clipFiles,voiceover:voiceover?.output,output,width:format.width,height:format.height,fps:30});
  rendered={...assembled,output_url:publicAsset(assembled.output)};
 }

 return {
  status:rendered?"rendered":"planned",
  job_id:jobId,
  format,plan,storyboard,voiceover,subtitles:publicSubtitles,clip_jobs:clipJobs,
  render:{...render,output},
  rendered,
  next_stage:rendered?"complete":"clip_generation"
 };
}
