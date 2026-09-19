import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { runFfmpeg } from "../ffmpeg.js";
import { requirePaidGeneration } from "../billing.js";
import { getVisualPacks } from "../visual-packs/index.js";
import { generateFreeVisualClip } from "../free-visual-clip.js";

const jobs=new Map();

export const VEO_GEMINI_PREVIEW_MODELS=new Set(["veo-3.1-generate-preview","veo-3.1-fast-generate-preview","veo-3.1-lite-generate-preview"]);
export const VEO_GEMINI_API_BASE_URL="https://generativelanguage.googleapis.com/v1beta";
export function getVeoModel(){return process.env.VEO_MODEL||"veo-3.1-generate-preview";}
export function getVeoGenerateUrl(model=getVeoModel()){
 if(!VEO_GEMINI_PREVIEW_MODELS.has(model))throw new Error("Unsupported Gemini API Veo model: "+model+". Use veo-3.1-generate-preview, veo-3.1-fast-generate-preview, or veo-3.1-lite-generate-preview.");
 return VEO_GEMINI_API_BASE_URL+"/models/"+model+":predictLongRunning";
}
const clipJob=(input={},extra={})=>{const id=randomUUID();const job={id,status:"queued",provider:process.env.VIDEO_PROVIDER||"local",created_at:new Date().toISOString(),input,...extra};jobs.set(id,job);return job;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const concatPath=file=>path.resolve(file).replace(/\\/g,"/").replace(/'/g,"'\\''");

async function googleRequest(url,options={}){
 requirePaidGeneration("Gemini Veo generation");
 const key=process.env.GEMINI_API_KEY;if(!key)throw new Error("GEMINI_API_KEY is not configured.");
 const response=await fetch(url,{...options,headers:{"x-goog-api-key":key,"content-type":"application/json",...(options.headers||{})}});
 const text=await response.text();let data={};try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
 if(!response.ok)throw new Error("Veo API "+response.status+": "+(data?.error?.message||text.slice(0,500)));return data;
}

async function generateVeoClip(input={}){
 requirePaidGeneration("Veo cinematic video generation");
 const format=input.format||{},aspectRatio=format.aspect_ratio||"16:9",model=getVeoModel();
 const visualPackIds=Array.isArray(input.scene?.visual_packs)?input.scene.visual_packs:[];
  const visualPacks=getVisualPacks(visualPackIds);
  const visualPackText=visualPacks.map(pack=>pack.label+" visual style; effects: "+pack.effects.join(", ")).join("\n");
  const prompt=["Professional cinematic YouTube footage.","Aspect ratio "+aspectRatio+".",visualPackText,"Keep characters, wardrobe, environment and visual style consistent.",input.scene?.visual_prompt||"",input.scene?.action||"",input.scene?.continuity?"Continuity: "+input.scene.continuity:"",input.scene?.dialogue?"Dialogue/audio cue: "+input.scene.dialogue:"",input.scene?.sfx?.length?"Sound effects: "+input.scene.sfx.join(", "):"",input.scene?.music?"Music: "+input.scene.music:""].filter(Boolean).join("\n");
  const data=await googleRequest(getVeoGenerateUrl(model),{method:"POST",body:JSON.stringify({instances:[{prompt}],parameters:{aspectRatio,resolution:process.env.VEO_RESOLUTION||"720p",numberOfVideos:1}})});
 if(!data.name)throw new Error("Veo did not return an operation name.");
 const job=clipJob(input,{status:"running",operation:data.name,provider:"google_veo"}),started=Date.now();
 while(Date.now()-started<Number(process.env.VEO_TIMEOUT_MS||600000)){
  await sleep(Number(process.env.VEO_POLL_MS||10000));
  const status=await googleRequest("https://generativelanguage.googleapis.com/v1beta/"+data.name,{method:"GET"});
  if(status.error)throw new Error(status.error.message||"Veo generation failed.");
  if(status.done){
   const sample=status.response?.generateVideoResponse?.generatedSamples?.[0]||status.response?.generatedVideos?.[0],uri=sample?.video?.uri||sample?.video?.downloadUri;
   if(!uri)throw new Error("Veo completed without a downloadable video.");
   const response=await fetch(uri,{headers:{"x-goog-api-key":process.env.GEMINI_API_KEY}});
   if(!response.ok)throw new Error("Veo download failed: "+response.status);
   const output=input.output||path.join(process.env.OUTPUT_DIR||"renders","clip-"+job.id+".mp4");
   await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,Buffer.from(await response.arrayBuffer()));
   job.status="completed";job.output=output;job.completed_at=new Date().toISOString();return {...job};
  }
 }
 job.status="failed";job.error="Veo generation timed out.";throw new Error(job.error);
}

export function getVideoProvider(){
 const name=(process.env.VIDEO_PROVIDER||"local").toLowerCase();
 if(name==="google_veo"||name==="veo")return{async generateClip(input={}){return generateVeoClip(input);},async getJob(id){return jobs.get(id)||null;}};
 if(name==="local"||name==="stub")return{async generateClip(input={}){\n  const job=clipJob(input,{status:"running",provider:"local_free"});\n  try{const generated=await generateFreeVisualClip(input);Object.assign(job,generated,{status:"completed",completed_at:new Date().toISOString()});return {...job};}\n  catch(error){job.status="failed";job.error=error.message;throw error;}\n },async getJob(id){return jobs.get(id)||null;}};
 throw new Error("Unknown VIDEO_PROVIDER: "+name);
}

export async function renderThumbnail({input,output,width,height}){
 if(!input)throw new Error("input image is required");await fs.mkdir(path.dirname(output),{recursive:true});
 await runFfmpeg(["-y","-i",input,"-vf","scale="+width+":"+height+":force_original_aspect_ratio=increase,crop="+width+":"+height,"-frames:v","1",output]);return{ok:true,output,width,height};
}

export async function assembleVideo({clips=[],voiceover,audio,output,width,height,fps=24}){
 if(!clips.length)throw new Error("at least one video clip is required");await fs.mkdir(path.dirname(output),{recursive:true});
 const listFile=path.join(path.dirname(output),".concat-"+randomUUID()+".txt");
 await fs.writeFile(listFile,clips.map(x=>"file '"+concatPath(x)+"'").join("\n"));
 const args=["-y","-f","concat","-safe","0","-i",listFile];if(voiceover||audio)args.push("-i",voiceover||audio);
 args.push("-vf","scale="+width+":"+height+":force_original_aspect_ratio=increase,crop="+width+":"+height+",fps="+fps,"-c:v","libx264","-pix_fmt","yuv420p");
 if(voiceover||audio)args.push("-c:a","aac","-b:a","192k","-shortest");else args.push("-an");args.push(output);
 try{await runFfmpeg(args);return{ok:true,output,width,height,fps};}finally{await fs.rm(listFile,{force:true});}
}
export async function renderVideo({clips,voiceover,output,width,height,fps=24}){return assembleVideo({clips,voiceover,output,width,height,fps});}
