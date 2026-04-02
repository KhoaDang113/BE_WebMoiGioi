import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/customErrors.js';
import { ListingService } from '../services/listing.service.js';
import { ListingStatus } from '../generated/client/client.js';

export class ListingController {
  private listingService: ListingService;

  constructor() {
    this.listingService = new ListingService();
  }

  createListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, price, addressDisplay, description, areaGross, propertyTypeId, provinceCode, provinceName, districtCode, districtName, wardCode, wardName, beds, rooms } = req.body;
      const files = req.files as Express.Multer.File[];

      const newListing = await this.listingService.createListing(
        req.user!.userId,
        { title, price, addressDisplay, description, areaGross, propertyTypeId, provinceCode, provinceName, districtCode, districtName, wardCode, wardName, beds, rooms },
        files
      );

      res.status(201).json({
        success: true,
        message: 'Property created successfully',
        data: newListing,
      });
    } catch (error) {
      next(error);
    }
  };

  getPropertyTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const types = await this.listingService.getPropertyTypes();
      res.status(200).json({ success: true, data: types });
    } catch (error) {
      next(error);
    }
  };

  getMyListings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const listings = await this.listingService.getMyListings(req.user!.userId);
      res.status(200).json({
        success: true,
        data: listings,
      });
    } catch (error) {
      next(error);
    }
  };

  getListingById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) throw new AppError("Listing ID is required", 400);
      const listing = await this.listingService.getListingById(req.user!.userId, id as string);
      res.status(200).json({
        success: true,
        data: listing,
      });
    } catch (error) {
      next(error);
    }
  };

  updateListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) throw new AppError("Listing ID is required", 400);
      
      const { title, price, addressDisplay, description, areaGross, propertyTypeId, provinceCode, provinceName, districtCode, districtName, wardCode, wardName, beds, rooms } = req.body;
      const files = req.files as Express.Multer.File[];

      const updatedListing = await this.listingService.updateListing(
        req.user!.userId,
        id as string,
        { title, price, addressDisplay, description, areaGross, propertyTypeId, provinceCode, provinceName, districtCode, districtName, wardCode, wardName, beds, rooms },
        files
      );

      res.status(200).json({
        success: true,
        message: 'Property updated successfully',
        data: updatedListing,
      });
    } catch (error) {
      next(error);
    }
  };

  updateListingStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) throw new AppError("Listing ID is required", 400);
      const { status } = req.body;
      
      const updated = await this.listingService.updateListingStatus(req.user!.userId, id as string, status as ListingStatus);
      res.status(200).json({
        success: true,
        message: 'Status updated',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  getAdminPendingListings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const listings = await this.listingService.getAdminPendingListings();
      res.status(200).json({ success: true, data: listings });
    } catch (error) {
      next(error);
    }
  };

  updateListingStatusByAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!id) throw new AppError("Listing ID is required", 400);

      const updated = await this.listingService.updateListingStatusByAdmin(id as string, status as ListingStatus);
      res.status(200).json({ success: true, message: 'Status updated by admin', data: updated });
    } catch (error) {
      next(error);
    }
  };

  getPublicListings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const listings = await this.listingService.getPublicListings();
      res.status(200).json({ success: true, data: listings });
    } catch (error) {
      next(error);
    }
  };

  deleteListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) throw new AppError("Listing ID is required", 400);
      await this.listingService.deleteListing(req.user!.userId, id as string);
      res.status(200).json({
        success: true,
        message: 'Listing deleted',
      });
    } catch (error) {
      next(error);
    }
  };
}
