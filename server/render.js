export function buildRenderPlan(project){
 const scenes=project?.scenes||project?.plan?.scenes||[];
 return {output:"renders/final.mp4",canvas:{width:1080,height:1920,fps:30},
 codec:{video:"libx264",audio:"aac",pix_fmt:"yuv420p"},
 scenes:scenes.map((s,i)=>({index:i,id:s.id||String(i+1),start:s.start,end:s.end,source:s.video_path||null}))};
}
