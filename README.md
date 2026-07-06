# Yen Sim Trading — Order Management System

Mobile-first sales order tracking for Yen Sim Trading Sdn Bhd.

## Stack
- React 18 + Vite
- Claude API (claude-sonnet-4-6) for AI order parsing
- Web Speech API for voice transcription
- No database — state in memory (add Supabase/Firebase for persistence)

---

## Deploy to Vercel (15 minutes, free)

### Step 1 — GitHub
1. Go to github.com → New repository → name it `yen-sim-trading`
2. Upload all these files (drag & drop into the repo)
3. Commit

### Step 2 — Vercel
1. Go to vercel.com → Sign up with GitHub (free)
2. Click "Add New Project"
3. Import your `yen-sim-trading` repo
4. Framework: **Vite** (auto-detected)
5. Click **Deploy**

Vercel gives you a URL like:
`https://yen-sim-trading.vercel.app`

Share this link in WhatsApp. It opens directly on mobile browser.

### Step 3 — Custom domain (optional)
In Vercel → Settings → Domains → add `orders.yensim.com.my`
Point your DNS CNAME to `cname.vercel-dns.com`

---

## Run locally (development)

```bash
npm install
npm run dev
# Opens at http://localhost:5173
```

## Build for production

```bash
npm run build
# Output in /dist folder
```

---

## Folder structure

```
yen-sim/
├── index.html          ← Entry point + PWA meta tags
├── package.json
├── vite.config.js
├── vercel.json         ← Routing config for Vercel
└── src/
    ├── main.jsx        ← React root mount
    └── App.jsx         ← Entire application
```

---

## Adding a real database (next step)

Replace the in-memory `useState(seed)` with Supabase:

```bash
npm install @supabase/supabase-js
```

```js
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  'https://YOUR_PROJECT.supabase.co',
  'YOUR_ANON_KEY'
)

// Then in App.jsx replace:
// const [orders, setOrders] = useState(seed)
// with:
// const [orders, setOrders] = useState([])
// useEffect(() => { supabase.from('orders').select('*').then(({data}) => setOrders(data)) }, [])
```

---

## WhatsApp Business API (real integration)

When ready to receive real WhatsApp orders automatically:

1. Apply at developers.facebook.com → WhatsApp Business API
2. Set webhook URL to: `https://orders.yensim.com.my/api/webhook`
3. Create a server endpoint (Node.js/Python) that:
   - Receives POST from Meta
   - Calls Claude API to parse
   - Saves to Supabase
   - Sends confirmation reply

See the code snippet in the app (New Order → WhatsApp API Setup).
