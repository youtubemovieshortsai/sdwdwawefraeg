const base="https://generativelanguage.googleapis.com/v1beta";
const models=["veo-3.1-generate-preview","veo-3.1-fast-generate-preview","veo-3.1-lite-generate-preview"];
const key=process.env.GEMINI_API_KEY;
if(!key) throw new Error("GEMINI_API_KEY is not configured.");

for(const model of models){
  const response=await fetch(base+"/models/"+model,{headers:{"x-goog-api-key":key}});
  const text=await response.text();
  if(!response.ok) throw new Error(model+" availability check failed with HTTP "+response.status+": "+text.slice(0,500));
  const data=JSON.parse(text);
  console.log("Veo model available:",data.name||model);
}
console.log("Veo endpoint availability checks passed. No video was generated.");
