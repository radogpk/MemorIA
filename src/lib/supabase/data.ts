import { UserProfile } from "@/types/database.types";
export const GERARDO_PROFILE_ID = "727db856-313b-4c91-91e4-7fac976dfc6d";
export const EVEBEBE_PROFILE_ID = "1e12d23b-f0b2-49d4-ae4b-b602226c7d14";

export const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: GERARDO_PROFILE_ID,
    name: "Gerardo",
    nickname: "Principito",
    avatar_color: "#3b82f6",
    role: "owner",
    created_at: "2026-09-01T00:00:00.000Z",
  },
  {
    id: EVEBEBE_PROFILE_ID,
    name: "Norely",
    nickname: "Evebebé",
    avatar_color: "#ec4899",
    role: "partner",
    created_at: "2026-09-01T00:00:00.000Z",
  },
];
