import { getOutputFormat } from "./formats.js";

export function buildRenderPlan(project = {}) {
  const format = getOutputFormat(
    project.format_id || project.format || "youtube_landscape"
  );

  const scenes = project?.scenes || project?.plan?.scenes || [];

  const renderScenes = scenes.map((scene, index) => ({
    ...scene,
    id: scene.id || String(index + 1),
    visual_packs: Array.isArray(scene.visual_packs)
      ? scene.visual_packs
      : []
  }));

  const extension = format.id.includes("thumbnail") ? ".png" : ".mp4";

  return {
    output: project.output || `renders/${format.id}${extension}`,
    format: format.id.includes("thumbnail") ? "png" : "mp4",
    format,
    canvas: {
      width: format.width,
      height: format.height,
      aspect_ratio: format.aspect_ratio,
      fps: format.id.includes("thumbnail") ? null : 30
    },
    codec: format.id.includes("thumbnail")
      ? null
      : {
          video: "libx264",
          audio: "aac",
          pix_fmt: "yuv420p"
        },
    scenes: renderScenes
  };
}
