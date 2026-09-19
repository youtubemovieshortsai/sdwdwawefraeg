import OpenAI from "openai";
import { getOutputFormat } from "./formats.js";
import { paidModeEnabled, requirePaidGeneration } from "./billing.js";

let client=null;
function getClient(){if(!client)client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});return client;}

const baseSystem=`You are the Creative Director for a professional AI video studio.
Turn a user's idea into a production-ready plan for the exact requested output format.
Prefer original characters and worlds. Build a coherent hook, story beats, visuals, dialogue/voiceover,
captions, SFX/music, continuity and QC notes. Never claim media was generated when only a plan exists.
For video outputs, target 45-60 seconds unless the brief requests another duration.
For thumbnail outputs, create a single strong composition rather than a timeline.`;

const sceneSchema={
 type:"object",additionalProperties:false,
 properties:{
  id:{type:"string"},start:{type:"number"},end:{type:"number"},
  visual_prompt:{type:"string"},action:{type:"string"},dialogue:{type:"string"},
  caption:{type:"string"},sfx:{type:"array",items:{type:"string"}},
  music:{type:"string"},continuity:{type:"string"}
 },
 required:["id","start","end","visual_prompt","action","dialogue","caption","sfx","music","continuity"]
};

export async function chat(messages){
 if(!paidModeEnabled()) return {text:"Safe Free Mode is active. No paid OpenAI call was made. Use Plan only to prepare the production plan without spending money."};
 requirePaidGeneration("OpenAI chat");
 if(!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
 const response=await getClient().responses.create({
  model:process.env.OPENAI_MODEL||"gpt-5.6",
  instructions:baseSystem,
  input:messages.map(m=>({role:m.role||"user",content:String(m.content||"")}))
 });
 return {text:response.output_text||""};
}

function createSafePlan(brief,format){
 const isThumbnail=format.id.includes("thumbnail"),duration=isThumbnail?0:54,parts=isThumbnail?[]:["Hook","Set-up","Reveal","Escalation","Payoff","CTA"],step=parts.length?duration/parts.length:0;
 const scenes=parts.map((label,i)=>({id:"scene-"+String(i+1).padStart(2,"0"),start:Number((i*step).toFixed(1)),end:Number(((i+1)*step).toFixed(1)),visual_prompt:"Cinematic "+label.toLowerCase()+" scene based on: "+brief+". Strong composition, natural lighting, detailed environment, consistent characters, professional YouTube look.",action:label+": advance the story clearly and visually.",dialogue:i===0?brief:"Continue the story with concise Dutch narration.",caption:i===0?brief.slice(0,120):label,sfx:["subtle cinematic transition"],music:"modern cinematic underscore, energetic but clean",continuity:"Maintain character identity, wardrobe, environment and visual language from previous scene."}));
 return {title:brief.split(/[.!?]/)[0].trim().slice(0,90)||"AI Video",duration_seconds:duration,format,hook:brief,characters:["Original characters defined by the brief"],scenes,thumbnail_prompt:"High-impact YouTube thumbnail for: "+brief+". Cinematic subject, clear focal point, strong depth, professional composition, no clutter.",thumbnail_text:brief.split(/[.!?]/)[0].trim().slice(0,42),composition:"One dominant subject, readable hierarchy, strong contrast, safe margins and exact output dimensions.",qc:["Exact requested dimensions","Strong first-frame hook","Readable captions","Consistent characters and environment"]};
}

export async function createPlan(brief,formatId="youtube_landscape"){
 if(!brief.trim()) throw new Error("brief is required");
 const format=getOutputFormat(formatId);
 if(!paidModeEnabled()) return createSafePlan(brief,format);
 requirePaidGeneration("OpenAI production planning");
 if(!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
 const isThumbnail=format.id.includes("thumbnail");
 const schema={
  type:"object",additionalProperties:false,
  properties:{
   title:{type:"string"},
   duration_seconds:{type:"number"},
   format:{type:"object",additionalProperties:false,properties:{
    id:{type:"string"},width:{type:"integer"},height:{type:"integer"},aspect_ratio:{type:"string"},purpose:{type:"string"}
   },required:["id","width","height","aspect_ratio","purpose"]},
   hook:{type:"string"},
   characters:{type:"array",items:{type:"string"}},
   scenes:{type:"array",items:sceneSchema},
   thumbnail_prompt:{type:"string"},
   thumbnail_text:{type:"string"},
   composition:{type:"string"},
   qc:{type:"array",items:{type:"string"}}
  },
  required:["title","duration_seconds","format","hook","characters","scenes","thumbnail_prompt","thumbnail_text","composition","qc"]
 };
 const instructions=baseSystem+`
Requested format: ${format.label} — ${format.width}x${format.height} — ${format.aspect_ratio}.
Purpose: ${format.purpose}.
This is ${isThumbnail?"a thumbnail: duration_seconds must be 0, scenes must be an empty array, and thumbnail_prompt/thumbnail_text/composition are the main deliverables.":"a video: duration_seconds should normally be 45-60, scenes must cover the timeline, and thumbnail fields may be empty strings."}
Return data matching the supplied JSON schema exactly. Keep all dimensions equal to the requested format.`;
 const response=await getClient().responses.create({
  model:process.env.OPENAI_MODEL||"gpt-5.6",
  instructions,
  input:brief,
  text:{format:{type:"json_schema",name:"production_plan",strict:true,schema}}
 });
 if(response.status==="incomplete") throw new Error("Production plan generation was incomplete.");
 const parsed=JSON.parse(response.output_text||"{}");
 parsed.format=format;
 if(isThumbnail){parsed.duration_seconds=0;parsed.scenes=[];}
 return parsed;
}
