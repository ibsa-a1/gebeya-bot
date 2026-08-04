import { IsString, IsNotEmpty } from "class-validator";

// Chapa's webhook payload has more fields than this in practice, but these
// are the only ones our logic actually depends on — everything else gets
// stored raw in webhookPayload (Json) for audit purposes without being
// individually validated.
export class ChapaWebhookDto {
  @IsString()
  @IsNotEmpty()
  tx_ref: string;

  @IsString()
  @IsNotEmpty()
  status: string;
}
