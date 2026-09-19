const TEXT_MODEL="gemini-3.1-flash-lite";
const TTS_MODEL="gemini-3.1-flash-tts-preview";
const API_URL="https://generativelanguage.googleapis.com/v1beta/interactions";

function apiKey(){
  if(!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
  return process.env.GEMINI_API_KEY;
}

async function callGemini(body){
  const response=await fetch(API_URL,{
    method:"POST",
    headers:{"x-goog-api-key":apiKey(),"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data?.error?.message||"Gemini API request failed.");
  return data;
}

function outputText(data){
  if(typeof data?.output_text==="string") return data.output_text;
  const steps=Array.isArray(data?.steps)?data.steps:[];
  return steps
    .filter(step=>step?.type==="model_output")
    .flatMap(step=>Array.isArray(step?.content)?step.content:[])
    .filter(item=>item?.type==="text" && typeof item?.text==="string")
    .map(item=>item.text)
    .join("");
}

function configuredFreeTextModel(){
  const model=process.env.GEMINI_FREE_MODEL||TEXT_MODEL;
  if(model!==TEXT_MODEL) throw new Error("Safe Free Mode only permits Gemini 3.1 Flash-Lite. No paid Gemini model was called.");
  return model;
}

function configuredFreeTtsModel(){
  const model=process.env.GEMINI_TTS_MODEL||TTS_MODEL;
  if(model!==TTS_MODEL) throw new Error("Safe Free Mode only permits Gemini 3.1 Flash TTS Preview. No paid Gemini TTS model was called.");
  return model;
}

export async function generateFreePlan({brief,instructions,schema}){
  const data=await callGemini({
    model:configuredFreeTextModel(),
    input:instructions+"\n\nUSER BRIEF:\n"+brief,
    response_format:{type:"text",mime_type:"application/json",schema},
    generation_config:{thinking_level:"minimal"}
  });
  const text=outputText(data);
  if(!text) throw new Error("Gemini returned no structured plan.");
  return JSON.parse(text);
}

export async function generateFreeChat({messages,instructions}){
  const input=instructions+"\n\n"+messages.map(m=>(m.role||"user").toUpperCase()+": "+String(m.content||"")).join("\n");
  const data=await callGemini({
    model:configuredFreeTextModel(),
    input,
    response_format:{type:"text",mime_type:"text/plain"},
    generation_config:{thinking_level:"minimal"}
  });
  return {text:outputText(data)||""};
}

function pcmToWav(pcm,sampleRate=24000,channels=1,bits=16){
  const header=Buffer.alloc(44);
  const byteRate=sampleRate*channels*bits/8;
  const blockAlign=channels*bits/8;
  header.write("RIFF",0);
  header.writeUInt32LE(36+pcm.length,4);
  header.write("WAVE",8);
  header.write("fmt ",12);
  header.writeUInt32LE(16,16);
  header.writeUInt16LE(1,20);
  header.writeUInt16LE(channels,22);
  header.writeUInt32LE(sampleRate,24);
  header.writeUInt32LE(byteRate,28);
  header.writeUInt16LE(blockAlign,32);
  header.writeUInt16LE(bits,34);
  header.write("data",36);
  header.writeUInt32LE(pcm.length,40);
  return Buffer.concat([header,pcm]);
}

export async function generateFreeVoiceover({text,voice="Kore",output}){
  const data=await callGemini({
    model:configuredFreeTtsModel(),
    input:"Speak in natural, warm Dutch for a professional YouTube video. Clear diction, confident pacing, expressive but not exaggerated. Read the following text exactly:\n\n"+text,
    response_format:{type:"audio"},
    generation_config:{speech_config:[{voice}]}
  });
  const encoded=data?.output_audio?.data||data?.steps?.flatMap(step=>Array.isArray(step?.content)?step.content:[]).find(item=>item?.type==="audio" && typeof item?.data==="string")?.data;
  if(!encoded) throw new Error("Gemini TTS returned no audio.");
  const audio=Buffer.from(encoded,"base64");
  return audio.subarray(0,4).toString("ascii")==="RIFF"?audio:pcmToWav(audio);
}

export const FREE_GEMINI_TEXT_MODEL=TEXT_MODEL;
export const FREE_GEMINI_TTS_MODEL=TTS_MODEL;
