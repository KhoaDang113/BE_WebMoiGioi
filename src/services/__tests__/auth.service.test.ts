import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { RegisterRequestDTO } from "../../dtos/auth/register.dto.js";

// Mock the generated client and database config to prevent loading them
jest.mock("../../generated/client/client.js", () => ({
  PrismaClient: jest.fn(),
  AccountType: { MEMBER: "MEMBER" },
  OTPType: { REGISTER: "REGISTER" },
  UserStatus: {
    PENDING_VERIFICATION: "PENDING_VERIFICATION",
    ACTIVE: "ACTIVE",
  },
}));

jest.mock("../../config/database.js", () => ({
  __esModule: true,
  default: {},
}));

jest.mock("../../repositories/user.repository.js");
jest.mock("../../repositories/otp.repository.js");
jest.mock("../email.service.js");

import { AuthService } from "../auth.service.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { OTPRepository } from "../../repositories/otp.repository.js";
import { EmailService } from "../email.service.js";

describe("AuthService", () => {
  let authService: any;
  let mockUserRepo: any;
  let mockOTPRepo: any;
  let mockEmailService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepo = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    };
    mockOTPRepo = {
      createOTP: jest.fn(),
      findValidOTP: jest.fn(),
      findLatestOTP: jest.fn(),
      markAsUsed: jest.fn(),
      deleteOTP: jest.fn(),
    };

    mockEmailService = {
      sendOTP: jest.fn(),
    };

    // Mock the constructors
    (UserRepository as jest.Mock).mockImplementation(() => mockUserRepo);
    (OTPRepository as jest.Mock).mockImplementation(() => mockOTPRepo);
    (EmailService as jest.Mock).mockImplementation(() => mockEmailService);

    // Instantiate AuthService which will use the mocked classes
    authService = new AuthService();
  });

  const validData: RegisterRequestDTO = {
    fullName: "Test User",
    email: "test@example.com",
    phone: "0912345678",
    password: "Password123!",
    confirmPassword: "Password123!",
  };

  describe("register", () => {
    it("should register a new user successfully", async () => {
      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(null as never);
      (mockUserRepo.findByPhone as jest.Mock).mockResolvedValue(null as never);
      (mockUserRepo.create as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        status: "PENDING_VERIFICATION",
      } as never);
      (mockOTPRepo.createOTP as jest.Mock).mockResolvedValue({} as never);
      (mockEmailService.sendOTP as jest.Mock).mockResolvedValue(
        undefined as never,
      );

      await authService.register(validData);

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(validData.email);
      expect(mockUserRepo.findByPhone).toHaveBeenCalledWith(validData.phone);
      expect(mockUserRepo.create).toHaveBeenCalled();
      expect(mockOTPRepo.createOTP).toHaveBeenCalled();
      expect(mockEmailService.sendOTP).toHaveBeenCalledWith(
        validData.email,
        expect.any(String),
      );
    });

    it("should throw error if email already exists", async () => {
      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue({
        id: BigInt(1),
      } as never);

      await expect(authService.register(validData)).rejects.toThrow(
        "Email already in use",
      );
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    it("should throw error if phone already exists", async () => {
      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(null as never);
      (mockUserRepo.findByPhone as jest.Mock).mockResolvedValue({
        id: BigInt(1),
      } as never);

      await expect(authService.register(validData)).rejects.toThrow(
        "Phone number already in use",
      );
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("verifyOTP", () => {
    it("should verify OTP successfully", async () => {
      const email = "test@example.com";
      const code = "123456";
      const user = {
        id: BigInt(1),
        phoneNumber: "0912345678",
        status: "PENDING_VERIFICATION",
      };
      const otp = { id: 1, code: "123456" };

      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(user as never);
      (mockOTPRepo.findValidOTP as jest.Mock).mockResolvedValue(otp as never);
      (mockOTPRepo.deleteOTP as jest.Mock).mockResolvedValue(
        undefined as never,
      );
      (mockUserRepo.updateStatus as jest.Mock).mockResolvedValue(
        undefined as never,
      );

      await authService.verifyOTP(email, code);

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(email);
      expect(mockOTPRepo.findValidOTP).toHaveBeenCalledWith(
        user.phoneNumber,
        "REGISTER",
      );
      expect(mockOTPRepo.deleteOTP).toHaveBeenCalledWith(otp.id);
      expect(mockUserRepo.updateStatus).toHaveBeenCalledWith(user.id, "ACTIVE");
    });

    it("should throw error if OTP is invalid", async () => {
      const email = "test@example.com";
      const code = "123456";
      const user = {
        id: BigInt(1),
        phoneNumber: "0912345678",
        status: "PENDING_VERIFICATION",
      };

      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(user as never);
      (mockOTPRepo.findValidOTP as jest.Mock).mockResolvedValue(null as never);
      
      await expect(authService.verifyOTP(email, code)).rejects.toThrow(
        "OTP has expired", 
      );
    });

     it("should throw error if OTP code does not match", async () => {
      const email = "test@example.com";
      const code = "123456";
      const user = {
        id: BigInt(1),
        phoneNumber: "0912345678",
        status: "PENDING_VERIFICATION",
      };
      const otp = { id: 1, code: "654321" }; // Different code

      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(user as never);
      (mockOTPRepo.findValidOTP as jest.Mock).mockResolvedValue(otp as never);

      await expect(authService.verifyOTP(email, code)).rejects.toThrow(
        "Invalid OTP",
      );
    });
  });

  describe("resendOTP", () => {
    it("should resend OTP successfully if no cooldown", async () => {
      const email = "test@example.com";
      const user = {
        id: BigInt(1),
        email: "test@example.com",
        phoneNumber: "0912345678",
        status: "PENDING_VERIFICATION",
      };

      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(user as never);
      (mockOTPRepo.findLatestOTP as jest.Mock).mockResolvedValue(null as never);
      (mockOTPRepo.createOTP as jest.Mock).mockResolvedValue({} as never);
      (mockEmailService.sendOTP as jest.Mock).mockResolvedValue(
        undefined as never,
      );

      await authService.resendOTP(email);

      expect(mockOTPRepo.createOTP).toHaveBeenCalled();
      expect(mockEmailService.sendOTP).toHaveBeenCalledWith(
        email,
        expect.any(String),
      );
    });

    it("should throw error if cooldown is active", async () => {
      const email = "test@example.com";
      const user = {
        id: BigInt(1),
        phoneNumber: "0912345678",
        status: "PENDING_VERIFICATION",
      };
      const latestOTP = { createdAt: new Date() }; // Created just now

      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(user as never);
      (mockOTPRepo.findLatestOTP as jest.Mock).mockResolvedValue(latestOTP as never);

      await expect(authService.resendOTP(email)).rejects.toThrow(
        "Please wait 60 seconds before requesting a new OTP",
      );
      // Should NOT delete if cooldown failed
      expect(mockOTPRepo.deleteOTP).not.toHaveBeenCalled();
    });

    it("should resend OTP successfully if cooldown expired and delete old OTP", async () => {
      const email = "test@example.com";
      const user = {
        id: BigInt(1),
        email: "test@example.com",
        phoneNumber: "0912345678",
        status: "PENDING_VERIFICATION",
      };
      const latestOTP = { id: 123, createdAt: new Date(Date.now() - 61 * 1000) }; // Created 61s ago

      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(user as never);
      (mockOTPRepo.findLatestOTP as jest.Mock).mockResolvedValue(latestOTP as never);
      (mockOTPRepo.createOTP as jest.Mock).mockResolvedValue({} as never);
      (mockEmailService.sendOTP as jest.Mock).mockResolvedValue(
        undefined as never,
      );
      (mockOTPRepo.deleteOTP as jest.Mock).mockResolvedValue(undefined as never);

      await authService.resendOTP(email);

      expect(mockOTPRepo.deleteOTP).toHaveBeenCalledWith(latestOTP.id);
      expect(mockOTPRepo.createOTP).toHaveBeenCalled();
    });
  });
});
