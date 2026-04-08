import prisma from '../config/database.js';
import { AppError } from '../utils/customErrors.js';


export class FavoriteController {
  /**
   * Toggle favorite status for a listing
   */
  async toggleFavorite(userId: string | bigint, id: string) {
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
      return {
        action: 'removed',
        message: 'Đã bỏ lưu bất động sản'
      };
    } else {
      // Add favorite
      await prisma.favoriteListing.create({
        data: {
          userId: BigInt(userId),
          listingId: listingIdInt
        }
      });
      return {
        action: 'added',
        message: 'Đã lưu bất động sản'
      };
    }
  }


  /**
   * Get my favorite listings
   */
  async getMyFavorites(userId: string | bigint) {
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
    return favorites.map(f => ({
      ...f.listing,
      isFavorite: true // By definition they are favorites
    }));
  }

}
