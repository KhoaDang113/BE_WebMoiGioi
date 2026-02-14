
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { RegisterRequestDTO } from "../../dtos/auth/register.dto.js";

// Mock dependencies using unstable_mockModule for ESM support
// We must do this BEFORE importing the module under test
jest.unstable_mockModule("../../repositories/user.repository.js", () => ({
  UserRepository: jest.fn(),
}));

jest.unstable_mockModule("../../repositories/otp.repository.js", () => ({
  OTPRepository: jest.fn(),
}));

jest.unstable_mockModule("../email.service.js", () => ({
  EmailService: jest.fn(),
}));

// We also need to mock the database config to prevent the real Prisma client from loading
// even if UserRepository tries to import it (though our mock above should prevent it)
jest.unstable_mockModule("../../config/database.js", () => ({
  __esModule: true,
  default: {},
}));

describe("AuthService", () => {
  let AuthService: any;
  let authService: any;
  let mockUserRepo: any;
  let mockOTPRepo: any;
  let mockEmailService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Dynamically import the module under test and mocked modules
    const AuthServiceModule = await import("../auth.service.js");
    AuthService = AuthServiceModule.AuthService;
    
    // Setup mock instances
    mockUserRepo = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
    };

    mockOTPRepo = {
      createOTP: jest.fn(),
      findValidOTP: jest.fn(),
      markAsUsed: jest.fn(),
    };

    mockEmailService = {
      sendOTP: jest.fn(),
    };

    // Instantiate AuthService with mocks
    authService = new AuthService(mockUserRepo, mockOTPRepo, mockEmailService);
  });

  const validData: RegisterRequestDTO = {
    fullName: "Test User",
    email: "test@example.com",
    phone: "0912345678",
    password: "Password123!",
    confirmPassword: "Password123!",
  };

  it("should register a new user successfully", async () => {
    // Setup return values
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockUserRepo.findByPhone.mockResolvedValue(null);
    mockUserRepo.create.mockResolvedValue({ id: BigInt(1), status: "PENDING_VERIFICATION" });
    mockOTPRepo.createOTP.mockResolvedValue({});
    mockEmailService.sendOTP.mockResolvedValue();

    // Execute
    await authService.register(validData);

    // Assert
    expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(validData.email);
    expect(mockUserRepo.findByPhone).toHaveBeenCalledWith(validData.phone);
    expect(mockUserRepo.create).toHaveBeenCalled();
    expect(mockOTPRepo.createOTP).toHaveBeenCalled();
    expect(mockEmailService.sendOTP).toHaveBeenCalledWith(validData.email, expect.any(String));
  });

  it("should throw error if email already exists", async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: BigInt(1) });

    await expect(authService.register(validData)).rejects.toThrow("Email already in use");
    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });

  it("should throw error if phone already exists", async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockUserRepo.findByPhone.mockResolvedValue({ id: BigInt(1) });

    await expect(authService.register(validData)).rejects.toThrow("Phone number already in use");
    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });
});
