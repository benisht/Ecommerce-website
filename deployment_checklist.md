# Deployment Checklist

- [ ] Ensure `.env` contains required variables (`DATABASE_URL`, `JWT_SECRET`, `VITE_API_URL`).
- [ ] Verify `.env` is listed in `.gitignore`.
- [ ] Run `npm run build` locally and confirm it succeeds.
- [ ] On **Render**, configure environment variables:
  - `PORT=5000`
  - `NODE_ENV=production`
  - `DATABASE_URL` (PostgreSQL connection string)
  - `JWT_SECRET` (strong random string)
  - `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (if using Razorpay).
- [ ] On **Vercel**, set `VITE_API_URL` to the Render service URL (e.g., `https://<render‑url>.onrender.com/api`).
- [ ] Add custom domain DNS records (A record `@ -> 76.76.21.21`, CNAME `www -> cname.vercel-dns.com`).
- [ ] Verify SSL certificate is active on the Vercel domain.
- [ ] Test core user flows:
  - Browse products
  - Add to cart
  - Checkout (placeholder or Razorpay sandbox)
  - Order tracking
- [ ] Log in to the admin panel and test product CRUD operations.
- [ ] If Razorpay is integrated, run a sandbox payment test.
- [ ] Access the health endpoint (`/health`) on Render and confirm `OK` response.
- [ ] Review Render and Vercel logs for errors and performance warnings.
- [ ] Monitor site performance (page load times, Lighthouse scores).

*Keep this checklist updated as the project evolves.*
