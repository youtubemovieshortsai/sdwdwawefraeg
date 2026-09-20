import test from "node:test";
import assert from "node:assert/strict";
import { listOutputFormats, getOutputFormat } from "../server/formats.js";
import { buildRenderPlan } from "../server/render.js";
import { buildStoryboard } from "../server/storyboard.js";
import { runProductionPipeline } from "../server/pipeline.js";
import { writeSrt } from "../server/subtitles.js";
import fs from "node:fs/promises";

test("all four YouTube output formats are exact",()=>{
 const formats=listOutputFormats(); assert.equal(formats.length,4);
 assert.deepEqual(getOutputFormat("youtube_landscape"),{id:"youtube_landscape",label:"YouTube video",width:1920,height:1080,aspect_ratio:"16:9",purpose:"standard YouTube landscape video"});
 assert.equal(getOutputFormat("youtube_thumbnail").width,1280);
 assert.equal(getOutputFormat("shorts").height,1920);
 assert.equal(getOutputFormat("shorts_thumbnail").aspect_ratio,"9:16");
});
test("render plan uses selected canvas",()=>{
 const p=buildRenderPlan({format_id:"shorts",scenes:[{id:"1",start:0,end:5}]});
 assert.equal(p.canvas.width,1080); assert.equal(p.canvas.height,1920); assert.equal(p.canvas.fps,30); assert.equal(p.output,"renders/shorts.mp4");
});
test("thumbnail render plan is PNG without video codec",()=>{
 const p=buildRenderPlan({format_id:"youtube_thumbnail"});
 assert.equal(p.canvas.width,1280); assert.equal(p.canvas.height,720); assert.equal(p.canvas.fps,null); assert.equal(p.codec,null); assert.equal(p.output,"renders/youtube_thumbnail.png");
});
test("storyboard normalizes scene durations",()=>{
 const s=buildStoryboard({scenes:[{id:"a",start:2,end:7,dialogue:"Hallo"}]});
 assert.equal(s[0].duration,5); assert.equal(s[0].dialogue,"Hallo");
});
test("pipeline creates clip jobs from an existing plan without an API key",async()=>{
 const plan={title:"Demo",duration_seconds:5,format:getOutputFormat("shorts"),hook:"Hook",characters:[],scenes:[{id:"1",start:0,end:5,visual_prompt:"demo",action:"",dialogue:"",caption:"",sfx:[],music:"",continuity:""}],thumbnail_prompt:"",thumbnail_text:"",composition:"",qc:[]};
 const out=await runProductionPipeline({plan,format_id:"shorts"});
 assert.equal(out.status,"rendered"); assert.equal(out.clip_jobs.length,1); assert.equal(out.next_stage,"complete"); assert.ok(out.rendered?.output);
});

test("subtitle writer creates valid SRT sidecar",async()=>{
 const file="renders/test.srt";
 const out=await writeSrt([{start:0,end:3,caption:"Hallo wereld"}],file);
 assert.equal(out.count,1);
 assert.match(await fs.readFile(file,"utf8"),/00:00:00,000 --> 00:00:03,000/);
 await fs.rm(file,{force:true});
});
