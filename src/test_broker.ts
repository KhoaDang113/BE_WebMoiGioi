import "dotenv/config";
import { UserService } from "./services/user.service.js";
import { UploadService } from "./services/upload.service.js";
import prisma from "./config/database.js";

async function run() {
  const service = new UserService();
  const upload = new UploadService();
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log("No users found");
        return;
    }
    console.log("Testing with User ID:", user.id);
    const buffer = Buffer.from("fake_image_binary_data");
    const res = await service.registerBroker(user.id.toString(), { fullName: "Test", phoneNumber: "123456" }, {
      idFront: [{ buffer }] as any
    }, upload);
    console.log("Success", res);
  } catch (err) {
    console.error("Crash Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
