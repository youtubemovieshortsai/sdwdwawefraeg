import OpenAI from "openai";
const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
const system=`You are the Creative Director for a professional AI short-video studio.
Turn a user's idea into a production-ready plan. Default format: vertical 9:16, master 1080x1920,
45-60 seconds, default target 50-55 seconds. Prefer original characters and worlds.
Include hook, story beats, scenes, visual prompts, dialogue/voiceover, captions, SFX/music,
continuity and QC risks. Never claim a clip was generated when only a plan exists.`;

export async function chat(messages){
 if(!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
 const response=await client.responses.create({
  model:process.env.OPENAI_MODEL||"gpt-5.6",
  instructions:system,
  input:messages.map(m=>({role:m.role||"user",content:String(m.content||"")}))
 });
 return {text:response.output_text||""};
}
export async function createPlan(brief){
 if(!brief.trim()) throw new Error("brief is required");
 if(!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
 const response=await client.responses.create({
  model:process.env.OPENAI_MODEL||"gpt-5.6",
  instructions:system+`\nReturn ONLY valid JSON:
{"title":"","duration_seconds":50,"format":{"width":1080,"height":1920,"aspect_ratio":"9:16"},
"hook":"","characters":[],"scenes":[{"id":"","start":0,"end":5,"visual_prompt":"","action":"",
"dialogue":"","caption":"","sfx":[],"music":"","continuity":""}],"qc":[]}`,
  input:brief
 });
 const raw=response.output_text||"{}";
 try{return JSON.parse(raw.replace(/^\`\`\`json\s*|\s*\`\`\`$/g,""));}
 catch{throw new Error("Model returned invalid production-plan JSON.");}
}
