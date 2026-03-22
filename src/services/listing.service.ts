import { ListingStatus, ListingType, PriceUnit } from '../generated/client/client.js';
import { AppError } from '../utils/customErrors.js';
import { UploadService } from './upload.service.js';
import prisma from '../config/database.js';

export class ListingService {
  private uploadService: UploadService;

  constructor() {
    this.uploadService = new UploadService();
  }

  // Basic slugifier avoiding external slugify library if not installed
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[^a-z0-9]+/g, '-')     // replace non-alphanumeric with dash
      .replace(/^-+|-+$/g, '')         // trim dashes
      + '-' + Date.now();
  }

  async getPropertyTypes() {
      return prisma.propertyType.findMany({ orderBy: { id: 'asc' } });
  }

  async getListingById(userId: string | bigint, listingId: string | bigint) {
      const listing = await prisma.listing.findUnique({
          where: { id: BigInt(listingId) },
          include: { media: true }
      });
      if (!listing) throw new AppError("Listing not found", 404);
      if (listing.userId !== BigInt(userId)) throw new AppError("Permission denied", 403);
      
      return listing;
  }

  async createListing(userId: string | bigint, data: any, files?: Express.Multer.File[]) {
    if (!data.title || !data.price || !data.addressDisplay || !data.propertyTypeId) {
        throw new AppError("Missing essential listing information", 400);
    }

    const priceNum = parseFloat(data.price);
    
    return prisma.$transaction(async (tx) => {
        // Creating the DB entry
        const newListing = await tx.listing.create({
            data: {
                userId: BigInt(userId),
                title: data.title,
                slug: this.generateSlug(data.title),
                listingType: ListingType.SALE, // default
                propertyTypeId: parseInt(data.propertyTypeId),
                provinceCode: '01', provinceName: 'Hồ Chí Minh', // Mocked geographic
                districtCode: '001', districtName: 'Quận 1',
                wardCode: '00001', wardName: 'Phường Bến Nghé',
                addressDisplay: data.addressDisplay,
                price: priceNum,
                priceUnit: PriceUnit.VND,
                areaGross: data.areaGross ? parseFloat(data.areaGross) : 50,
                attributes: data.description ? { description: data.description } : {},
                status: ListingStatus.PENDING_REVIEW,
            }
        });

        // Upload Images to Cloudinary if they exist
        if (files && files.length > 0) {
            // Upload in parallel
            const uploadPromises = files.map((file, i) => {
                return this.uploadService.uploadImage(file.buffer, { folder: "property_listings" })
                    .then(url => {
                        return tx.listingMedia.create({
                            data: {
                                listingId: newListing.id,
                                mediaType: "IMAGE",
                                originalUrl: url,
                                isPrimary: i === 0, // First image is cover photo
                                sortOrder: i
                            }
                        });
                    });
            });
            await Promise.all(uploadPromises);
        }

        return newListing;
    });
  }

  async getMyListings(userId: string | bigint) {
      return prisma.listing.findMany({
          where: { userId: BigInt(userId) },
          include: { 
             media: {
                 where: { isPrimary: true },
                 take: 1
             }
          },
          orderBy: { id: 'desc' },
          take: 50
      });
  }

  async updateListing(userId: string | bigint, listingId: string | bigint, data: any, files?: Express.Multer.File[]) {
      const existing = await this.getListingById(userId, listingId);
      
      const priceNum = data.price ? parseFloat(data.price) : undefined;
      const attrBase = typeof existing.attributes === 'object' && existing.attributes ? existing.attributes : {};
      
      const updateData: any = {};
      if (data.title) updateData.title = data.title;
      if (data.propertyTypeId) updateData.propertyTypeId = parseInt(data.propertyTypeId);
      if (data.addressDisplay) updateData.addressDisplay = data.addressDisplay;
      if (data.price) updateData.price = parseFloat(data.price);
      if (data.areaGross) updateData.areaGross = parseFloat(data.areaGross);
      if (data.description) updateData.attributes = { ...attrBase, description: data.description };
      
      return prisma.$transaction(async (tx) => {
          const updated = await tx.listing.update({
              where: { id: BigInt(listingId) },
              data: updateData
          });

          // If new files are provided, we blindly replace all images for simplicity in this demo.
          if (files && files.length > 0) {
              await tx.listingMedia.deleteMany({ where: { listingId: BigInt(listingId) } });
              
              const uploadPromises = files.map((file, i) => {
                  return this.uploadService.uploadImage(file.buffer, { folder: "property_listings" })
                      .then(url => {
                          return tx.listingMedia.create({
                              data: {
                                  listingId: updated.id,
                                  mediaType: "IMAGE",
                                  originalUrl: url,
                                  isPrimary: i === 0,
                                  sortOrder: i
                              }
                          });
                      });
              });
              await Promise.all(uploadPromises);
          }
          
          return updated;
      });
  }

  async deleteListing(userId: string | bigint, listingId: string | bigint) {
      const listing = await prisma.listing.findUnique({ where: { id: BigInt(listingId) }});
      if (!listing) throw new AppError("Listing not found", 404);
      if (listing.userId !== BigInt(userId)) throw new AppError("Permission denied", 403);

      await prisma.listing.delete({ where: { id: BigInt(listingId) }});
      return true;
  }

  async updateListingStatus(userId: string | bigint, listingId: string | bigint, status: ListingStatus) {
      const listing = await prisma.listing.findUnique({ where: { id: BigInt(listingId) }});
      if (!listing) throw new AppError("Listing not found", 404);
      if (listing.userId !== BigInt(userId)) throw new AppError("Permission denied", 403);

      return prisma.listing.update({
          where: { id: BigInt(listingId) },
          data: { status }
      });
  }

  async getAdminPendingListings() {
      return prisma.listing.findMany({
          where: { status: ListingStatus.PENDING_REVIEW },
          include: { 
              user: { select: { email: true } },
              media: { take: 1 } 
          },
          orderBy: { id: 'desc' }
      });
  }

  async updateListingStatusByAdmin(listingId: string | bigint, status: ListingStatus) {
      const listing = await prisma.listing.findUnique({ where: { id: BigInt(listingId) }});
      if (!listing) throw new AppError("Listing not found", 404);

      return prisma.listing.update({
          where: { id: BigInt(listingId) },
          data: { status }
      });
  }
}
