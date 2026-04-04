import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { AppError } from '../utils/customErrors.js';
import { ListingStatus } from '@prisma/client';

export class FavoriteController {
  /**
   * Toggle favorite status for a listing
   */
  async toggleFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.userId;

      if (!id) throw new AppError('Listing ID is required', 400);

      const listingIdInt = BigInt(id);

      // Check if listing exists
      const listingExist = await prisma.listing.findUnique({
        where: { id: listingIdInt }
      });

      if (!listingExist) throw new AppError('Listing not found', 404);

      // Check if already favorited
      const existingFavorite = await prisma.favoriteListing.findFirst({
        where: {
          userId: BigInt(userId),
          listingId: listingIdInt
        }
      });

      if (existingFavorite) {
        // Remove favorite
        await prisma.favoriteListing.delete({
          where: { id: existingFavorite.id }
        });
        return res.status(200).json({
          success: true,
          message: 'Đã bỏ lưu bất động sản',
          data: { action: 'removed' }
        });
      } else {
        // Add favorite
        await prisma.favoriteListing.create({
          data: {
            userId: BigInt(userId),
            listingId: listingIdInt
          }
        });
        return res.status(201).json({
          success: true,
          message: 'Đã lưu bất động sản',
          data: { action: 'added' }
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my favorite listings
   */
  async getMyFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const favorites = await prisma.favoriteListing.findMany({
        where: { userId: BigInt(userId) },
        include: {
          listing: {
            include: {
              media: true,
              propertyType: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  profile: { select: { displayName: true, avatarUrl: true } }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Map to return just the listings
      const listings = favorites.map(f => ({
        ...f.listing,
        isFavorite: true // By definition they are favorites
      }));

      res.status(200).json({ success: true, data: listings });
    } catch (error) {
      next(error);
    }
  }
}
