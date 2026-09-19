const VISUAL_PACKS = {
  cinematic: {
    id: "cinematic",
    label: "Cinematic",
    effects: ["slow_zoom", "parallax", "light_leaks", "film_grain"]
  },
  mystery: {
    id: "mystery",
    label: "Mystery",
    effects: ["dark_vignette", "slow_zoom", "particles", "shadow_pulse"]
  },
  tech: {
    id: "tech",
    label: "Tech",
    effects: ["grid", "scanlines", "hud", "fast_zoom"]
  },
  nature: {
    id: "nature",
    label: "Nature",
    effects: ["soft_motion", "particles", "light_rays", "slow_pan"]
  },
  documentary: {
    id: "documentary",
    label: "Documentary",
    effects: ["photo_motion", "lower_third", "map_motion", "subtle_zoom"]
  },
  comic: {
    id: "comic",
    label: "Comic",
    effects: ["panels", "impact", "speed_lines", "text_pop"]
  },
  gaming: {
    id: "gaming",
    label: "Gaming",
    effects: ["hud", "screen_shake", "speed_lines", "flash"]
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    effects: ["clean_typography", "slow_zoom", "soft_gradient"]
  }
};

export function getVisualPack(id) {
  return VISUAL_PACKS[id] || VISUAL_PACKS.cinematic;
}

export function getVisualPacks(ids = []) {
  const selected = ids.map(id => getVisualPack(id)).filter(Boolean);
  return selected.length ? selected : [VISUAL_PACKS.cinematic];
}

export { VISUAL_PACKS };
