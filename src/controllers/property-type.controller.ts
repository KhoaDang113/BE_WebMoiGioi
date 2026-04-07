import type { Request, Response, NextFunction } from "express";
import { PropertyTypeRepository } from "../repositories/property-type.repository.js";

const propertyTypeRepo = new PropertyTypeRepository();

export const getAllPropertyTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await propertyTypeRepo.findAll();
    res.status(200).json({
      success: true,
      data: types,
    });
  } catch (error) {
    next(error);
  }
};

export const createPropertyType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      res.status(400).json({
        success: false,
        message: "Tên danh mục không được để trống",
      });
      return;
    }

    const existingType = await propertyTypeRepo.findByName(name.trim());
    if (existingType) {
      res.status(400).json({
        success: false,
        message: "Tên danh mục đã tồn tại",
      });
      return;
    }

    const newType = await propertyTypeRepo.create({ name: name.trim() });
    
    res.status(201).json({
      success: true,
      message: "Tạo danh mục thành công",
      data: newType,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePropertyType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name } = req.body;

    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "ID không hợp lệ" });
      return;
    }

    if (!name || name.trim() === '') {
      res.status(400).json({ success: false, message: "Tên danh mục không được để trống" });
      return;
    }

    const existingType = await propertyTypeRepo.findById(id);
    if (!existingType) {
      res.status(404).json({ success: false, message: "Không tìm thấy danh mục" });
      return;
    }

    const duplicateType = await propertyTypeRepo.findByName(name.trim());
    if (duplicateType && duplicateType.id !== id) {
      res.status(400).json({ success: false, message: "Tên danh mục đã tồn tại" });
      return;
    }

    const updatedType = await propertyTypeRepo.update(id, { name: name.trim() });

    res.status(200).json({
      success: true,
      message: "Cập nhật danh mục thành công",
      data: updatedType,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePropertyType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(id)) {
       res.status(400).json({ success: false, message: "ID không hợp lệ" });
       return;
    }

    const existingType = await propertyTypeRepo.findById(id);
    if (!existingType) {
       res.status(404).json({ success: false, message: "Không tìm thấy danh mục" });
       return;
    }

    const linkedListingsCount = await propertyTypeRepo.getCountListingsAssigned(id);
    if (linkedListingsCount > 0) {
      res.status(400).json({ 
        success: false, 
        message: `Không thể xóa vì danh mục đang được sử dụng bởi ${linkedListingsCount} bài đăng.` 
      });
      return;
    }

    await propertyTypeRepo.delete(id);

    res.status(200).json({
      success: true,
      message: "Xóa danh mục thành công",
    });
  } catch (error) {
    next(error);
  }
};
