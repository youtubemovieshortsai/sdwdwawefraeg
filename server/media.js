import OpenAI from "openai";
import fs from "node:fs/promises";
import path from "node:path";
import { renderThumbnail } from "./providers/index.js";

let client=null;
function getClient(){if(!client)client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});return client;}

export async function generateThumbnail({prompt,output,width,height}){
 if(!prompt?.trim())throw new Error("thumbnail prompt is required");
 if(!process.env.OPENAI_API_KEY)throw new Error("OPENAI_API_KEY is not configured.");
 const response=await getClient().images.generate({model:process.env.IMAGE_MODEL||"gpt-image-2",prompt,quality:"high",size:"1536x1024"});
 const item=response.data?.[0];
 if(!item?.b64_json)throw new Error("Image generation returned no image data.");
 const source=path.join(process.env.OUTPUT_DIR||"renders",".thumbnail-source-"+Date.now()+".png");
 await fs.mkdir(path.dirname(source),{recursive:true});
 await fs.writeFile(source,Buffer.from(item.b64_json,"base64"));
 try{return await renderThumbnail({input:source,output,width,height});}
 finally{await fs.rm(source,{force:true});}
}
