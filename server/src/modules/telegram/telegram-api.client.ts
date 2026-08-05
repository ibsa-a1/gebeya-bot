import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class TelegramApiClient {
  private readonly logger = new Logger(TelegramApiClient.name);

  private baseUrl(botToken: string) {
    return `https://api.telegram.org/bot${botToken}`;
  }

  async sendMessage(
    botToken: string,
    chatId: number | string,
    text: string,
    replyMarkup?: unknown,
  ) {
    const res = await fetch(`${this.baseUrl(botToken)}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
    });
    if (!res.ok) {
      this.logger.error(`sendMessage failed: ${await res.text()}`);
    }
    return res.json();
  }

  async sendPhoto(botToken: string, chatId: number | string, photo: Buffer, caption?: string) {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    if (caption) form.append("caption", caption);
    form.append("photo", new Blob([photo]), "receipt.png");

    const res = await fetch(`${this.baseUrl(botToken)}/sendPhoto`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      this.logger.error(`sendPhoto failed: ${await res.text()}`);
    }
    return res.json();
  }

  async getFile(botToken: string, fileId: string): Promise<string> {
    const res = await fetch(`${this.baseUrl(botToken)}/getFile?file_id=${fileId}`);
    const data = await res.json();
    if (!data.ok) {
      throw new Error(`getFile failed: ${JSON.stringify(data)}`);
    }
    return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
  }
}
