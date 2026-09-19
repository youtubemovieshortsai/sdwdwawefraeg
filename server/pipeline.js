import { createPlan } from "./openai.js";
import { buildStoryboard } from "./storyboard.js";
import { buildRenderPlan } from "./render.js";
import { generateVoiceover } from "./audio.js";
import { getVideoProvider, assembleVideo, renderThumbnail } from "./providers/index.js";
import { getOutputFormat } from "./formats.js";

export async function runProductionPipeline(input={}){
 const brief=String(input.brief||"").trim();
 const format_id=input.format_id||"youtube_landscape";
 if(!brief && !input.plan) throw new Error("brief or plan is required");
 const plan=input.plan||await createPlan(brief,format_id);
 const format=getOutputFormat(plan.format?.id||format_id);
 const storyboard=buildStoryboard(plan);
 const render=buildRenderPlan({plan,format_id:format.id});

 let voiceover=null;
 const voiceText=input.voiceover_text||storyboard.map(s=>s.dialogue).filter(Boolean).join(" ");
 if(input.generate_voiceover && voiceText.trim()){
  voiceover=await generateVoiceover({text:voiceText,voice:input.voice||"nova",output:input.voiceover_output||"renders/voiceover.mp3"});
 }

 const provider=getVideoProvider();
 const clipJobs=storyboard.map(scene=>provider.generateClip({scene,format}));
 let rendered=null;
 if(input.clip_files?.length){
  if(format.id.includes("thumbnail")){
   rendered=await renderThumbnail({input:input.clip_files[0],output:render.output,width:format.width,height:format.height});
  }else{
   rendered=await assembleVideo({clips:input.clip_files,voiceover:voiceover?.output,output:render.output,width:format.width,height:format.height,fps:30});
  }
 }
 return {
  status:rendered?"rendered":"planned",
  format,plan,storyboard,voiceover,clip_jobs:clipJobs,render,
  rendered,next_stage:rendered?"complete":format.id.includes("thumbnail")?"thumbnail_render":"clip_generation"
 };
}
