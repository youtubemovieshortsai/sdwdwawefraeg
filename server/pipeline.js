import { createPlan } from "./openai.js";
import { buildStoryboard } from "./storyboard.js";
import { buildRenderPlan } from "./render.js";
import { generateVoiceover } from "./audio.js";

export async function runProductionPipeline(input={}){
 const brief=String(input.brief||"").trim();
 const format_id=input.format_id||"youtube_landscape";
 if(!brief && !input.plan) throw new Error("brief or plan is required");

 const plan=input.plan||await createPlan(brief,format_id);
 const storyboard=buildStoryboard(plan);
 const render=buildRenderPlan({plan,format_id:plan.format?.id||format_id});

 let voiceover=null;
 const voiceText=input.voiceover_text||storyboard.map(s=>s.dialogue).filter(Boolean).join(" ");
 if(input.generate_voiceover && voiceText.trim()){
  voiceover=await generateVoiceover({
   text:voiceText,
   voice:input.voice||"nova",
   output:input.voiceover_output||"renders/voiceover.mp3"
  });
 }

 return {
  status:"planned",
  format:plan.format,
  plan,
  storyboard,
  voiceover,
  render,
  next_stage:plan.format.id.includes("thumbnail")?"thumbnail_render":"clip_generation"
 };
}
