import OpenAI from "openai";
import { getOutputFormat } from "./formats.js";

const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});

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
 if(!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
 const response=await client.responses.create({
  model:process.env.OPENAI_MODEL||"gpt-5.6",
  instructions:baseSystem,
  input:messages.map(m=>({role:m.role||"user",content:String(m.content||"")}))
 });
 return {text:response.output_text||""};
}

export async function createPlan(brief,formatId="youtube_landscape"){
 if(!brief.trim()) throw new Error("brief is required");
 if(!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
 const format=getOutputFormat(formatId);
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
 const response=await client.responses.create({
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
