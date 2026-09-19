export function paidModeEnabled(){return String(process.env.AI_VIDEO_PAID_MODE||"false").toLowerCase()==="true";}
export function requirePaidGeneration(feature="AI generation"){if(!paidModeEnabled())throw new Error(feature+" is disabled in Safe Free Mode. No paid API call was made. Enable AI_VIDEO_PAID_MODE=true only when you intentionally want paid generation.");}
export function billingStatus(){return {mode:paidModeEnabled()?"paid":"free",safe_free_mode:!paidModeEnabled()};}
