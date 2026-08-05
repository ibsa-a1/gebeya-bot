import { Test, TestingModule } from "@nestjs/testing";
import { TelegramBotService } from "./telegram-bot.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SttService } from "../ai/stt.service";
import { IntentService } from "../ai/intent.service";
import { TelegramApiClient } from "./telegram-api.client";

describe("TelegramBotService", () => {
  let service: TelegramBotService;
  let prisma: { product: { findMany: jest.Mock } };
  let stt: { transcribe: jest.Mock };
  let intent: { extractIntent: jest.Mock };
  let api: { sendMessage: jest.Mock; getFile: jest.Mock };

  const tenant = { id: "tenant-1", botToken: "fake-token", currency: "ETB" };

  beforeEach(async () => {
    process.env.CLIENT_URL = "http://localhost:3000"; // deliberately non-HTTPS for most tests

    prisma = { product: { findMany: jest.fn() } };
    stt = { transcribe: jest.fn() };
    intent = { extractIntent: jest.fn() };
    api = { sendMessage: jest.fn().mockResolvedValue({}), getFile: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramBotService,
        { provide: PrismaService, useValue: prisma },
        { provide: SttService, useValue: stt },
        { provide: IntentService, useValue: intent },
        { provide: TelegramApiClient, useValue: api },
      ],
    }).compile();

    service = module.get(TelegramBotService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("handleTenantUpdate — command routing", () => {
    it("replies to /start with the welcome message", async () => {
      await service.handleTenantUpdate(tenant, {
        message: { chat: { id: 123 }, text: "/start" },
      });
      expect(api.sendMessage).toHaveBeenCalledWith(
        tenant.botToken,
        123,
        expect.stringContaining("Welcome"),
      );
    });

    it("does not attach a web_app button for /shop when CLIENT_URL is not HTTPS", async () => {
      await service.handleTenantUpdate(tenant, {
        message: { chat: { id: 123 }, text: "/shop" },
      });
      const [, , , replyMarkup] = api.sendMessage.mock.calls[0];
      expect(replyMarkup).toBeUndefined();
    });

    it("attaches a web_app button for /shop when CLIENT_URL is genuinely HTTPS", async () => {
      process.env.CLIENT_URL = "https://real-deployed-app.com";
      await service.handleTenantUpdate(tenant, {
        message: { chat: { id: 123 }, text: "/shop" },
      });
      const [, , , replyMarkup] = api.sendMessage.mock.calls[0];
      expect(replyMarkup).toEqual(
        expect.objectContaining({
          inline_keyboard: [
            [expect.objectContaining({ web_app: expect.objectContaining({ url: expect.stringContaining("https://") }) })],
          ],
        }),
      );
    });
  });

  describe("handleTenantUpdate — search honesty (the core fix from live testing)", () => {
    it("does NOT silently return the whole catalog when Gemini extracts nothing usable", async () => {
      intent.extractIntent.mockResolvedValue({
        category: null,
        color: null,
        size: null,
        maxPrice: null,
        intent: "unintelligible",
      });

      await service.handleTenantUpdate(tenant, {
        message: { chat: { id: 123 }, text: "asdkfjaslkdfj" },
      });

      expect(prisma.product.findMany).not.toHaveBeenCalled();
      expect(api.sendMessage).toHaveBeenCalledWith(
        tenant.botToken,
        123,
        expect.stringContaining("didn't quite catch"),
      );
    });

    it("searches using category, color, AND size as real filter terms, not just category", async () => {
      intent.extractIntent.mockResolvedValue({
        category: "shoes",
        color: "blue",
        size: "39",
        maxPrice: null,
        intent: "looking for blue size 39 shoes",
      });
      prisma.product.findMany.mockResolvedValue([]);

      await service.handleTenantUpdate(tenant, {
        message: { chat: { id: 123 }, text: "blue shoes size 39" },
      });

      const callArg = prisma.product.findMany.mock.calls[0][0];
      const orTerms = callArg.where.OR.map((clause: any) =>
        (clause.category ?? clause.name).contains,
      );
      expect(orTerms).toEqual(
        expect.arrayContaining(["shoes", "blue", "39"]),
      );
    });

    it("honestly flags a partial match instead of implying an exact one", async () => {
      intent.extractIntent.mockResolvedValue({
        category: "shoes",
        color: "blue",
        size: "39",
        maxPrice: null,
        intent: "looking for blue size 39 shoes",
      });
      // Only a black, size-42 product exists — matches on category alone.
      prisma.product.findMany.mockResolvedValue([
        { name: "Black Running Shoes - Size 42", price: 2400, stock: 10 },
      ]);

      await service.handleTenantUpdate(tenant, {
        message: { chat: { id: 123 }, text: "blue shoes size 39" },
      });

      expect(api.sendMessage).toHaveBeenCalledWith(
        tenant.botToken,
        123,
        expect.stringContaining("couldn't find an exact match"),
        undefined,
      );
    });

    it("confirms an exact match honestly when color and size genuinely match", async () => {
      intent.extractIntent.mockResolvedValue({
        category: "shoes",
        color: "black",
        size: "42",
        maxPrice: null,
        intent: "looking for black size 42 shoes",
      });
      prisma.product.findMany.mockResolvedValue([
        { name: "Black Running Shoes - Size 42", price: 2400, stock: 10 },
      ]);

      await service.handleTenantUpdate(tenant, {
        message: { chat: { id: 123 }, text: "black shoes size 42" },
      });

      expect(api.sendMessage).toHaveBeenCalledWith(
        tenant.botToken,
        123,
        expect.stringContaining("Here's what I found"),
        undefined,
      );
    });
  });

  describe("handleTenantUpdate — voice notes", () => {
    it("gives a graceful fallback message when transcription throws", async () => {
      api.getFile.mockResolvedValue("https://telegram.org/fake-file-url");
      stt.transcribe.mockRejectedValue(new Error("network blip"));

      await service.handleTenantUpdate(tenant, {
        message: { chat: { id: 123 }, voice: { file_id: "abc123" } },
      });

      expect(api.sendMessage).toHaveBeenCalledWith(
        tenant.botToken,
        123,
        expect.stringContaining("couldn't understand that voice note"),
      );
    });
  });
});
