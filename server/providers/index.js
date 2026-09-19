export function getVideoProvider(){
 const name=(process.env.VIDEO_PROVIDER||"stub").toLowerCase();
 if(name==="stub") return {async generateClip(input)=>({status:"queued",provider:"stub",message:"Provider adapter ready; connect a production video provider.",input})};
 throw new Error(`Unknown VIDEO_PROVIDER: ${name}`);
}
