import OpenAI from "openai";
import fs from "node:fs/promises";
import path from "node:path";
let client=null;
function getClient(){if(!client)client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});return client;}
export async function generateVoiceover({text,voice="nova",output="renders/voiceover.mp3"}){
 if(!text?.trim()) throw new Error("text is required");
 if(!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
 const response=await getClient().audio.speech.create({model:process.env.TTS_MODEL||"gpt-4o-mini-tts",voice,input:text,instructions:"Natural, warm Dutch narration for a professional YouTube video.",response_format:"mp3"});
 await fs.mkdir(path.dirname(output),{recursive:true});
 await fs.writeFile(output,Buffer.from(await response.arrayBuffer()));
 return {ok:true,output,voice,model:process.env.TTS_MODEL||"gpt-4o-mini-tts"};
}
