import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { ListingController } from "../controllers/listing.controller.js";
import { FavoriteController } from "../controllers/favorite.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { AccountType, ListingStatus } from "@prisma/client";
import { AppError } from "../utils/customErrors.js";

const router = Router();
const listingController = new ListingController();
const favoriteController = new FavoriteController();

// ─── Public ───────────────────────────────────────────────────────────────────

router.get(
  "/public",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await listingController.getPublicListings();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/public/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError("Listing ID is required", 400);
      const data = await listingController.getPublicListingById(id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

// ─── Authenticated ────────────────────────────────────────────────────────────

router.use(authMiddleware);

router.get(
  "/property-types",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await listingController.getPropertyTypes();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/my-listings",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await listingController.getMyListings(req.user!.userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/favorites",
  favoriteController.getMyFavorites.bind(favoriteController),
);

router.post(
  "/favorites/toggle/:id",
  favoriteController.toggleFavorite.bind(favoriteController),
);

router.get(
  "/admin/pending",
  authorize(AccountType.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await listingController.getAdminPendingListings();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/admin/all",
  authorize(AccountType.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await listingController.getAdminAllListings();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/admin/dashboard-stats",
  authorize(AccountType.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await listingController.getDashboardStats();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/",
  upload.array("images", 10),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        title,
        price,
        addressDisplay,
        description,
        areaGross,
        propertyTypeId,
        provinceCode,
        provinceName,
        districtCode,
        districtName,
        wardCode,
        wardName,
        beds,
        rooms,
        projectId,
      } = req.body;
      const files = req.files as Express.Multer.File[];
      const newListing = await listingController.createListing(
        req.user!.userId,
        {
          title,
          price,
          addressDisplay,
          description,
          areaGross,
          propertyTypeId,
          provinceCode,
          provinceName,
          districtCode,
          districtName,
          wardCode,
          wardName,
          beds,
          rooms,
          projectId,
        },
        files,
      );
      res
        .status(201)
        .json({
          success: true,
          message: "Property created successfully",
          data: newListing,
        });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!id) throw new AppError("Listing ID is required", 400);
    const data = await listingController.getListingById(req.user!.userId, id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put(
  "/:id",
  upload.array("images", 10),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError("Listing ID is required", 400);
      const {
        title,
        price,
        addressDisplay,
        description,
        areaGross,
        propertyTypeId,
        provinceCode,
        provinceName,
        districtCode,
        districtName,
        wardCode,
        wardName,
        beds,
        rooms,
        projectId,
      } = req.body;
      const files = req.files as Express.Multer.File[];
      const updated = await listingController.updateListing(
        req.user!.userId,
        id,
        {
          title,
          price,
          addressDisplay,
          description,
          areaGross,
          propertyTypeId,
          provinceCode,
          provinceName,
          districtCode,
          districtName,
          wardCode,
          wardName,
          beds,
          rooms,
          projectId,
        },
        files,
      );
      res
        .status(200)
        .json({
          success: true,
          message: "Property updated successfully",
          data: updated,
        });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:id/status",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError("Listing ID is required", 400);
      const { status } = req.body;
      const updated = await listingController.updateListingStatus(
        req.user!.userId,
        id,
        status as ListingStatus,
      );
      res
        .status(200)
        .json({ success: true, message: "Status updated", data: updated });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:id/admin-status",
  authorize(AccountType.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      if (!id) throw new AppError("Listing ID is required", 400);
      const updated = await listingController.updateListingStatusByAdmin(
        id,
        status as ListingStatus,
      );
      res
        .status(200)
        .json({
          success: true,
          message: "Status updated by admin",
          data: updated,
        });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError("Listing ID is required", 400);
      await listingController.deleteListing(req.user!.userId, id);
      res.status(200).json({ success: true, message: "Listing deleted" });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
