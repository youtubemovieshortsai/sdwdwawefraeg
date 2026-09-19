import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPlan, chat } from "./openai.js";
import { saveProject, loadProject, listProjects } from "./projects.js";
import { getVideoProvider } from "./providers/index.js";
import { buildRenderPlan } from "./render.js";
import { listOutputFormats, getOutputFormat } from "./formats.js";
import { generateVoiceover } from "./audio.js";
import { buildStoryboard } from "./storyboard.js";
import { runProductionPipeline } from "./pipeline.js";
import { createJob, loadJob, listJobs, runJob } from "./jobs.js";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express();
const outputDir=path.resolve(process.env.OUTPUT_DIR||"renders");
app.use(express.json({limit:"10mb"}));
app.use(express.static(path.join(__dirname,"..","public")));
app.use("/renders",express.static(outputDir));

app.get("/api/health",(_req,res)=>res.json({
 ok:true,
 provider:process.env.VIDEO_PROVIDER||"local",
 video_model:process.env.VEO_MODEL||null,
 openai_configured:Boolean(process.env.OPENAI_API_KEY),
 gemini_configured:Boolean(process.env.GEMINI_API_KEY)
}));
app.get("/api/formats",(_req,res)=>res.json({formats:listOutputFormats()}));
app.get("/api/formats/:id",(req,res)=>{try{res.json(getOutputFormat(req.params.id));}catch(e){res.status(400).json({error:e.message});}});
app.post("/api/chat",async(req,res)=>{try{res.json(await chat(req.body?.messages||[]));}catch(e){res.status(500).json({error:e.message});}});
app.post("/api/plan",async(req,res)=>{try{res.json(await createPlan(req.body?.brief||"",req.body?.format_id||"youtube_landscape"));}catch(e){res.status(500).json({error:e.message});}});
app.post("/api/projects",async(req,res)=>{try{res.json(await saveProject(req.body));}catch(e){res.status(500).json({error:e.message});}});
app.get("/api/projects",async(_req,res)=>{try{res.json(await listProjects());}catch(e){res.status(500).json({error:e.message});}});
app.get("/api/projects/:id",async(req,res)=>{try{res.json(await loadProject(req.params.id));}catch(e){res.status(404).json({error:e.message});}});
app.post("/api/render-plan",async(req,res)=>{try{res.json(buildRenderPlan(req.body));}catch(e){res.status(400).json({error:e.message});}});
app.post("/api/storyboard",(req,res)=>{try{res.json({storyboard:buildStoryboard(req.body?.plan||req.body||{})});}catch(e){res.status(400).json({error:e.message});}});
app.post("/api/audio/voiceover",async(req,res)=>{try{res.json(await generateVoiceover(req.body||{}));}catch(e){res.status(500).json({error:e.message});}});
app.post("/api/video/generate",async(req,res)=>{try{res.status(202).json(await getVideoProvider().generateClip(req.body));}catch(e){res.status(500).json({error:e.message});}});

app.post("/api/production-jobs",async(req,res)=>{
 try{
  const input=req.body||{};
  if(!String(input.brief||"").trim()&&!input.plan)return res.status(400).json({error:"brief or plan is required"});
  const job=await createJob(input);
  runJob(job.id,()=>runProductionPipeline({...input,job_id:job.id}));
  res.status(202).json(job);
 }catch(e){res.status(500).json({error:e.message});}
});
app.get("/api/production-jobs",async(_req,res)=>{try{res.json(await listJobs());}catch(e){res.status(500).json({error:e.message});}});
app.get("/api/production-jobs/:id",async(req,res)=>{const job=await loadJob(req.params.id);if(!job)return res.status(404).json({error:"production job not found"});res.json(job);});

app.post("/api/production-pipeline",async(req,res)=>{try{res.json(await runProductionPipeline(req.body||{}));}catch(e){res.status(500).json({error:e.message});}});

const port=Number(process.env.PORT||3000);
app.listen(port,"0.0.0.0",()=>console.log("AI Video Studio running on port "+port));
