# 🚀 ZandeBooks Deployment Guide
## Deploy to zandebooks.co.za

---

## ✅ **Step 1: Prepare Your Code**

### 1.1 Initialize Git (if not already done)
```powershell
# Navigate to your project
cd "c:\Users\Zwonaka Mabege\OneDrive\Desktop\Zande Technologies\Zandebooks\Zandebooks"

# Initialize git
git init

# Create .gitignore
echo "node_modules/" > .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".DS_Store" >> .gitignore
echo "*.log" >> .gitignore

# Add all files
git add .

# First commit
git commit -m "Initial commit - ZandeBooks production ready"
```

### 1.2 Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `zandebooks`
3. Description: "Multi-industry accounting platform for South Africa"
4. **Private** (keep it private for now)
5. Click **Create repository**

### 1.3 Push to GitHub
```powershell
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/zandebooks.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## ✅ **Step 2: Deploy Frontend to Vercel**

### 2.1 Sign Up for Vercel
1. Go to https://vercel.com/signup
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your repositories

### 2.2 Import Project
1. Click **"Add New Project"**
2. Select **"Import Git Repository"**
3. Find and select `zandebooks`
4. Click **"Import"**

### 2.3 Configure Project Settings
**Framework Preset:** Other (or Vanilla)
**Root Directory:** `./` (leave as is)
**Build Command:** Leave empty or use `echo "Static site"`
**Output Directory:** `./` (since you have static HTML)

### 2.4 Add Environment Variables
Click **"Environment Variables"** and add:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these:**
- Go to Supabase Dashboard → Settings → API
- Copy **Project URL** → `SUPABASE_URL`
- Copy **anon public** key → `SUPABASE_ANON_KEY`

### 2.5 Deploy
1. Click **"Deploy"**
2. Wait 1-2 minutes
3. You'll get a URL like: `zandebooks.vercel.app`

---

## ✅ **Step 3: Connect Custom Domain**

### 3.1 In Vercel Dashboard
1. Go to your project → **Settings** → **Domains**
2. Add domain: `zandebooks.co.za`
3. Add domain: `www.zandebooks.co.za`
4. Vercel will show DNS records you need to add

### 3.2 Configure DNS (Your Domain Registrar)

Go to where you bought `zandebooks.co.za` (e.g., Afrihost, Domains.co.za, etc.)

**Add these DNS records:**

#### For Root Domain (`zandebooks.co.za`):
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

#### For WWW (`www.zandebooks.co.za`):
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

### 3.3 Wait for DNS Propagation
- Usually takes 5-30 minutes
- Check status: https://dnschecker.org
- Once propagated, Vercel auto-generates SSL certificate (HTTPS)

---

## ✅ **Step 4: Configure Supabase for Production**

### 4.1 Update Allowed Redirect URLs
1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add to **Site URL**: `https://zandebooks.co.za`
3. Add to **Redirect URLs**:
   - `https://zandebooks.co.za/*`
   - `https://www.zandebooks.co.za/*`
   - `https://zandebooks.vercel.app/*` (for testing)

### 4.2 Enable Row Level Security (Already Done ✅)
All your tables have RLS enabled - you're good!

### 4.3 Set Up Backups
1. Supabase Dashboard → **Database** → **Backups**
2. Enable **Daily Backups** (available on Pro plan - $25/month)

---

## ✅ **Step 5: Update Your Code**

### 5.1 Create `vercel.json` (for routing)
Create this file in your project root:

```json
{
  "routes": [
    {
      "src": "/app.html",
      "dest": "/app/app.html"
    },
    {
      "src": "/",
      "dest": "/Index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### 5.2 Push Changes
```powershell
git add .
git commit -m "Add Vercel configuration"
git push
```

Vercel will auto-deploy the update!

---

## ✅ **Step 6: Test Production Site**

### 6.1 Test These Features:
1. ✅ Visit https://zandebooks.co.za
2. ✅ Sign up / Login
3. ✅ Navigate to Chart of Accounts
4. ✅ Check if template loads automatically
5. ✅ Test industry-adaptive sidebar

### 6.2 Check Browser Console
- No errors should appear
- Supabase connection should work

---

## ✅ **Step 7: Set Up Monitoring (Optional but Recommended)**

### 7.1 Vercel Analytics
1. Project → **Analytics** tab
2. Enable **Web Analytics** (free)
3. Track page views, performance

### 7.2 Supabase Monitoring
1. Dashboard → **Reports**
2. Monitor database queries
3. Check API usage

---

## 🎉 **You're Live!**

Your accounting platform is now running at:
- **Primary**: https://zandebooks.co.za
- **WWW**: https://www.zandebooks.co.za
- **Staging**: https://zandebooks.vercel.app

---

## 📊 **Cost Breakdown**

### Current (Free Tier):
- Vercel: **Free** (100GB bandwidth/month)
- Supabase: **Free** (500MB database, 2GB bandwidth)
- **Total: R0/month** 🎉

### When You Grow:
- Vercel Pro: $20/month (~R380)
- Supabase Pro: $25/month (~R475)
- **Total: ~R855/month**

---

## 🔄 **Future Deployments**

Every time you push to GitHub:
```powershell
git add .
git commit -m "Your change description"
git push
```

Vercel automatically deploys the new version in ~2 minutes!

---

## 🆘 **Need Help?**

**Vercel Issues:**
- https://vercel.com/docs
- https://vercel.com/support

**Supabase Issues:**
- https://supabase.com/docs
- https://supabase.com/dashboard

**DNS Propagation Check:**
- https://dnschecker.org

---

## ✅ **Next Steps After Deployment**

1. ✅ Run remaining database scripts (Customers, Suppliers, etc.)
2. ✅ Build Customers UI
3. ✅ Build Invoicing UI
4. ✅ Add more industry templates
5. ✅ Set up email notifications (Resend.com - free tier)
6. ✅ Add PDF generation for invoices
7. ✅ Marketing & customer acquisition!

---

**Deployed by**: Zande Technologies  
**Domain**: zandebooks.co.za  
**Status**: 🟢 LIVE IN PRODUCTION
