

## Problem Analysis

The product detail page (`ListingDetail.tsx`) already exists with a full media gallery, account inventory, seller info, and a "Chat with Seller" button. However, two issues are preventing it from working:

1. **RLS policies are still RESTRICTIVE** — all table policies show `Permissive: No`, meaning they block access instead of granting it. The previous migration likely failed or didn't apply correctly.

2. **Chat button is buyer-only** — the "Chat Now" button only shows for users with role `buyer`. The user wants sellers to also be able to chat with buyers (bidirectional).

## Plan

### 1. Fix RLS policies (database migration)
Drop all existing RESTRICTIVE policies on `listings`, `conversations`, `messages`, `profiles`, and `user_roles` tables, then recreate them as PERMISSIVE so authenticated users can actually read data.

### 2. Update ListingDetail.tsx — make "Chat Now" available for all users
- Remove the `role === "buyer"` restriction on the Chat button
- Show "Chat with Seller" for non-sellers, "Chat with Buyer" is not needed since buyers initiate — but allow any authenticated non-owner to start a chat
- Update the conversation creation to work regardless of role (swap buyer_id/seller_id based on who initiates)

### 3. Update BrowseListings navigation
- Ensure clicking any card navigates to the detail page (already works, just confirming after RLS fix)

No new pages needed — the existing `ListingDetail` page already has the Flipkart-style layout with gallery + details + chat CTA. The fix is making data accessible and chat universal.

