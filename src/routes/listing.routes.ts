import { Router } from 'express';
import { ListingController } from '../controllers/listing.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/upload.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { AccountType } from '../generated/client/client.js';

const router = Router();
const listingController = new ListingController();

// Both require authentication
router.use(authMiddleware);

router.get('/property-types', listingController.getPropertyTypes.bind(listingController));
router.post('/', upload.array('images', 10), listingController.createListing.bind(listingController));
router.get('/my-listings', listingController.getMyListings.bind(listingController));
router.get('/admin/pending', authorize(AccountType.ADMIN, AccountType.MODERATOR), listingController.getAdminPendingListings.bind(listingController));
router.patch('/:id/admin-status', authorize(AccountType.ADMIN, AccountType.MODERATOR), listingController.updateListingStatusByAdmin.bind(listingController));
router.get('/:id', listingController.getListingById.bind(listingController));
router.put('/:id', upload.array('images', 10), listingController.updateListing.bind(listingController));
router.patch('/:id/status', listingController.updateListingStatus.bind(listingController));
router.delete('/:id', listingController.deleteListing.bind(listingController));

export default router;
