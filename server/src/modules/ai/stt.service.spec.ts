import { Test, TestingModule } from "@nestjs/testing";
import { BadGatewayException } from "@nestjs/common";
import { SttService } from "./stt.service";

jest.mock("groq-sdk", () => {
  const mockCreate = jest.fn();
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      audio: { transcriptions: { create: mockCreate } },
    })),
    toFile: jest.fn((buffer) => Promise.resolve(buffer)),
    __mockCreate: mockCreate,
  };
});

describe("SttService", () => {
  let service: SttService;
  let mockCreate: jest.Mock;

  beforeEach(async () => {
    process.env.GROQ_API_KEY = "test-key";
    const groqSdk = require("groq-sdk");
    mockCreate = groqSdk.__mockCreate;
    mockCreate.mockReset();

    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SttService],
    }).compile();

    service = module.get(SttService);
  });

  afterEach(() => jest.clearAllMocks());

  it("throws BadGatewayException if the audio file can't be fetched", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

    await expect(service.transcribe("https://bad-url/file.oga")).rejects.toThrow(
      BadGatewayException,
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("calls Groq with the Amharic language hint and returns the transcript text", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    });
    mockCreate.mockResolvedValue({ text: "some transcribed text" });

    const result = await service.transcribe("https://good-url/file.oga");

    expect(result).toBe("some transcribed text");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ language: "am", temperature: 0 }),
    );
  });
});
