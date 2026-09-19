export function buildStoryboard(plan={}){
 const scenes=plan.scenes||[];
 return scenes.map((scene,index)=>({id:scene.id||String(index+1),start:scene.start??0,end:scene.end??0,duration:Math.max(0,(scene.end??0)-(scene.start??0)),visual_prompt:scene.visual_prompt||"",visual_packs:Array.isArray(scene.visual_packs)?scene.visual_packs:[],action:scene.action||"",dialogue:scene.dialogue||"",caption:scene.caption||"",sfx:scene.sfx||[],music:scene.music||"",continuity:scene.continuity||""}));
}
