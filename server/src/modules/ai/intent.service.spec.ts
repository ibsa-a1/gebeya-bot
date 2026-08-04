import { Test, TestingModule } from "@nestjs/testing";
import { BadGatewayException } from "@nestjs/common";
import { IntentService } from "./intent.service";

jest.mock("@google/genai", () => {
  const mockGenerateContent = jest.fn();
  return {
    __esModule: true,
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: { generateContent: mockGenerateContent },
    })),
    Type: { OBJECT: "OBJECT", STRING: "STRING", NUMBER: "NUMBER" },
    __mockGenerateContent: mockGenerateContent,
  };
});

describe("IntentService", () => {
  let service: IntentService;
  let mockGenerateContent: jest.Mock;

  beforeEach(async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const genai = require("@google/genai");
    mockGenerateContent = genai.__mockGenerateContent;
    mockGenerateContent.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [IntentService],
    }).compile();

    service = module.get(IntentService);
  });

  afterEach(() => jest.clearAllMocks());

  it("throws BadGatewayException if Gemini returns an empty response", async () => {
    mockGenerateContent.mockResolvedValue({ text: "" });

    await expect(service.extractIntent("some buyer message")).rejects.toThrow(
      BadGatewayException,
    );
  });

  it("parses and returns the structured intent from Gemini's JSON response", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        category: "shoes",
        size: "42",
        color: "black",
        maxPrice: null,
        intent: "Looking for black size 42 shoes",
      }),
    });

    const result = await service.extractIntent("some buyer message");

    expect(result).toEqual({
      category: "shoes",
      size: "42",
      color: "black",
      maxPrice: null,
      intent: "Looking for black size 42 shoes",
    });
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gemini-3.6-flash" }),
    );
  });
});
