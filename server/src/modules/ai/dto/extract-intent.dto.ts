import { IsString, IsNotEmpty } from "class-validator";

export class ExtractIntentDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}
