import { z } from 'zod';

export const connectionRequestSchema = z.object({
  userId: z.string().min(1, 'Recipient userId is required')
});
