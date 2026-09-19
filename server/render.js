import { getOutputFormat } from "./formats.js";
export function buildRenderPlan(project={}){
 const format=getOutputFormat(project.format_id||project.format||"youtube_landscape");
 const scenes=project?.scenes||project?.plan?.scenes||[];
 return {output:project.output||`renders/${format.id}.${format.id.includes("thumbnail")?"png":"mp4"}`,format:format.id,canvas:{width:format.width,height:format.height,aspect_ratio:format.aspect_ratio,fps:format.id.includes("thumbnail")?null:30},codec:format.id.includes("thumbnail")?null:{video:"libx264",audio:"aac",pix_fmt:"yuv420p"},scenes};
}