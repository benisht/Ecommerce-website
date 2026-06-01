# LOOKWALK Production Deployment & Domain Setup Guide

This guide details the end-to-end steps to launch your **LOOKWALK** storefront live on a custom domain, using highly scalable and cost-effective hosting platforms.

---

## 1. How to Buy a Custom Domain

To make your storefront professional (e.g., `lookwalk.in` or `lookwalk.com`), you need to purchase a domain name from a ICANN-accredited registrar.

### Recommended Domain Registrars:
1. **Namecheap** (Highly Recommended: Great pricing, free lifetime privacy protection, very easy DNS interface).
2. **Cloudflare Registrar** (Sells domains at cost value with zero markups, excellent DNS speeds and top-tier security).
3. **Hostinger** (Great if you are buying in India, has regional payment methods like UPI and NetBanking).

### Step-by-Step Purchase Guide (using Namecheap as example):
1. Go to [Namecheap.com](https://www.namecheap.com).
2. Search for your brand name in the domain bar (e.g., `lookwalk.com` or `lookwalk.in` or `lookwalk.store`).
3. Select your desired extension, add to cart, and click **Checkout**.
4. Keep **WhoisGuard / Domain Privacy** enabled (this is **FREE** and prevents spammers from seeing your phone number/email).
5. Complete payment using Card, PayPal, or crypto. 
6. Keep the Namecheap dashboard open for the DNS step in Section 4!

---

## 2. Deploying the Backend API (Render or Railway)

Since your backend runs Node.js + Express with an advanced auto-switching database module, it can be hosted on **Render** (free/cheap hosting) or **Railway**.

### Option A: Hosting on Render (Recommended Free Tier)
1. Sign up/Login to [Render.com](https://render.com) using your GitHub account.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository containing the LOOKWALK code.
4. Configure your Web Service settings:
   - **Name**: `lookwalk-api`
   - **Language**: `Node`
   - **Root Directory**: `server` (Important: This isolates the backend code!)
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: Select **Free** (or Starter for no sleeping delays).
5. Click **Advanced** and add these critical **Environment Variables**:
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Add your PostgreSQL connection string here (e.g. from Supabase or Neon). *If left empty, Render will fall back to local SQLite, but note that SQLite changes are lost on server restarts due to ephemeral disk storage. We strongly recommend adding a Postgres DB!*
6. Click **Create Web Service**. Render will build and deploy your API! Note down your backend URL (e.g. `https://lookwalk-api.onrender.com`).

### Option B: Creating a Free PostgreSQL Database
You can get a free, high-performance Postgres DB in 2 minutes:
1. Go to [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
2. Create a free project.
3. Under Connection String / URI, copy the Postgres URL (starts with `postgresql://...`).
4. Paste this string as the `DATABASE_URL` in your Render Environment Variables! The server will automatically connect to it and initialize the database tables on startup.

---

## 3. Deploying the React Frontend (Vercel)

Vercel is the ultimate hosting platform for Vite/React applications. It is ultra-fast, handles high traffic, and has an outstanding CDN.

### Step-by-Step Vercel Deployment:
1. Sign up/Login to [Vercel.com](https://vercel.com) using your GitHub account.
2. Click **Add New** > **Project**.
3. Import your GitHub repository.
4. Configure the Vite build settings:
   - **Framework Preset**: `Vite` (Vercel detects this automatically).
   - **Root Directory**: `./` (Keep it as the project root).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand the **Environment Variables** section and add:
   - `VITE_API_URL`: `https://your-backend-render-url.onrender.com/api` (Replace with your actual Render API URL, making sure it ends with `/api`).
6. Click **Deploy**. Vercel will bundle your React app and launch it on a free Vercel subdomain (e.g., `https://lookwalk.vercel.app`).

---

## 4. Connecting Your Custom Domain to Vercel

Once your frontend is deployed on Vercel, you can link the custom domain you purchased in Section 1!

### 1. Add Domain in Vercel:
- In your Vercel Dashboard, go to your project > **Settings** > **Domains**.
- Type in your purchased domain (e.g., `lookwalk.com` or `www.lookwalk.com`) and click **Add**.
- Select the recommended redirect configuration (usually redirecting `lookwalk.com` to `www.lookwalk.com` or vice versa).
- Vercel will show a status of **Invalid Configuration** and provide two DNS records (e.g., an **A record** for the root domain and a **CNAME record** for `www`).

### 2. Configure DNS in Registrar (e.g., Namecheap):
- Go to your Namecheap Dashboard > **Domain List**.
- Click **Manage** next to your domain, then click the **Advanced DNS** tab.
- Click **Add New Record**:
  - **Type**: `A Record`
  - **Host**: `@`
  - **Value/IP Address**: `76.76.21.21` (Vercel's standard IP)
  - **TTL**: `Automatic` or `5 min`
- Click **Add New Record** again (for `www` subdomain):
  - **Type**: `CNAME Record`
  - **Host**: `www`
  - **Value**: `cname.vercel-dns.com`
  - **TTL**: `Automatic` or `5 min`
- Delete any conflicting default records (like default IP redirects or holding pages).
- **Save Changes**. 

*Note: DNS propagation can take anywhere from 5 minutes to 2 hours. Once propagated, Vercel will automatically generate a free SSL certificate (HTTPS secure lock), and your storefront will be live at your custom domain!*

---

## 5. Pre-Deployment Optimization & Verification Checklist

Before sharing your store with the world, double-check these settings:

### 🛡️ 1. Security Settings
- Change your administrative password in `src/pages/Admin.jsx` (currently `admin123` at line 166) to a highly secure hash or unique string.
- Make sure all payment references point to the business owner's real GPay/UPI accounts inside the admin panel.

### 📈 2. SEO & Metatags (Auto-Optimized)
- Ensure your `index.html` has a compelling title and meta description.
- Add a `robots.txt` file in your `public/` directory:
  ```txt
  User-agent: *
  Allow: /
  Disallow: /admin
  Sitemap: https://yourdomain.com/sitemap.xml
  ```
- Generate a `sitemap.xml` listing `/`, `/products`, `/about`, `/contact`, `/track-order`, and put it inside `public/`.

### ⚡ 3. Speed Check
- Compressed product photos in WebP format should be uploaded inside the admin interface.
- Database paging is fully supported; enjoy your blazing fast streetwear shop!
