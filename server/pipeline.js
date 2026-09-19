import { createPlan } from "./openai.js";
import { buildStoryboard } from "./storyboard.js";
import { buildRenderPlan } from "./render.js";
import { generateVoiceover } from "./audio.js";
import { generateThumbnail } from "./media.js";
import { getVideoProvider, assembleVideo, renderThumbnail } from "./providers/index.js";
import { getOutputFormat } from "./formats.js";

export async function runProductionPipeline(input={}){
 const brief=String(input.brief||"").trim();
 const format_id=input.format_id||"youtube_landscape";
 if(!brief&&!input.plan)throw new Error("brief or plan is required");
 const plan=input.plan||await createPlan(brief,format_id);
 const format=getOutputFormat(plan.format?.id||format_id);
 const storyboard=buildStoryboard(plan);
 const render=buildRenderPlan({plan,format_id:format.id});
 const output=input.output||render.output;

 if(format.id.includes("thumbnail")){
  if(input.image_file){
   const rendered=await renderThumbnail({input:input.image_file,output,width:format.width,height:format.height});
   return {status:"rendered",format,plan,storyboard,render,rendered,next_stage:"complete"};
  }
  const rendered=await generateThumbnail({prompt:plan.thumbnail_prompt||brief,output,width:format.width,height:format.height});
  return {status:"rendered",format,plan,storyboard,render,rendered,next_stage:"complete"};
 }

 let voiceover=null;
 const voiceText=input.voiceover_text||storyboard.map(s=>s.dialogue).filter(Boolean).join(" ");
 const shouldGenerateVoiceover=input.generate_voiceover!==false;
 if(shouldGenerateVoiceover&&voiceText.trim()){
  voiceover=await generateVoiceover({text:voiceText,voice:input.voice||"nova",output:input.voiceover_output||"renders/voiceover.mp3"});
 }

 const provider=getVideoProvider();
 const clipFiles=[];
 const clipJobs=[];
 for(let i=0;i<storyboard.length;i++){
  const scene=storyboard[i];
  const job=await provider.generateClip({scene,format,output:"renders/clip-"+String(i+1).padStart(2,"0")+".mp4"});
  clipJobs.push(job);
  if(job.output)clipFiles.push(job.output);
 }

 let rendered=null;
 if(input.clip_files?.length)clipFiles.splice(0,clipFiles.length,...input.clip_files);
 if(clipFiles.length)rendered=await assembleVideo({clips:clipFiles,voiceover:voiceover?.output,output,width:format.width,height:format.height,fps:30});

 return {
  status:rendered?"rendered":"planned",
  format,plan,storyboard,voiceover,clip_jobs:clipJobs,render,rendered,
  next_stage:rendered?"complete":"clip_generation"
 };
}
