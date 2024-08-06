import { z } from "zod";

export const GuestTranscodeJobSchema = z.object({
  sourceUrl: z.string(),
  destinationUrl: z.string(),
  format: z.string(),
  quality: z.enum(["low", "medium", "high"]),
});

export type GuestTranscodeJob = z.TypeOf<typeof GuestTranscodeJobSchema>;
