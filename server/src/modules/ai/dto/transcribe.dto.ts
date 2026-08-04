import { IsString, IsUrl } from "class-validator";

export class TranscribeDto {
  @IsString()
  @IsUrl({ require_tld: false }) // allow localhost/dev URLs during testing
  fileUrl: string;
}
