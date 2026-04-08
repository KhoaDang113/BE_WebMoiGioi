import { PropertyTypeRepository } from "../repositories/property-type.repository.js";
import { AppError } from "../utils/customErrors.js";

export class PropertyTypeController {
  private readonly propertyTypeRepo: PropertyTypeRepository;

  constructor() {
    this.propertyTypeRepo = new PropertyTypeRepository();
  }

  async getAll() {
    return this.propertyTypeRepo.findAll();
  }

  async create(name: string) {
    if (!name || name.trim() === "") {
      throw new AppError("Tên danh mục không được để trống", 400);
    }

    const existingType = await this.propertyTypeRepo.findByName(name.trim());
    if (existingType) {
      throw new AppError("Tên danh mục đã tồn tại", 400);
    }

    return this.propertyTypeRepo.create({ name: name.trim() });
  }

  async update(id: number, name: string) {
    if (isNaN(id)) {
      throw new AppError("ID không hợp lệ", 400);
    }

    if (!name || name.trim() === "") {
      throw new AppError("Tên danh mục không được để trống", 400);
    }

    const existingType = await this.propertyTypeRepo.findById(id);
    if (!existingType) {
      throw new AppError("Không tìm thấy danh mục", 404);
    }

    const duplicateType = await this.propertyTypeRepo.findByName(name.trim());
    if (duplicateType && duplicateType.id !== id) {
      throw new AppError("Tên danh mục đã tồn tại", 400);
    }

    return this.propertyTypeRepo.update(id, { name: name.trim() });
  }

  async delete(id: number) {
    if (isNaN(id)) {
      throw new AppError("ID không hợp lệ", 400);
    }

    const existingType = await this.propertyTypeRepo.findById(id);
    if (!existingType) {
      throw new AppError("Không tìm thấy danh mục", 404);
    }

    const linkedListingsCount =
      await this.propertyTypeRepo.getCountListingsAssigned(id);
    if (linkedListingsCount > 0) {
      throw new AppError(
        `Không thể xóa vì danh mục đang được sử dụng bởi ${linkedListingsCount} bài đăng.`,
        400,
      );
    }

    await this.propertyTypeRepo.delete(id);
    return true;
  }
}
