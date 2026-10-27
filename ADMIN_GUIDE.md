# CS2 Utility Map Editing Guide

## Admin access

### Becoming an admin

1. **Create an account** in the app.
2. **Run this SQL script** against your database to grant yourself admin access:

```bash
psql -U postgres cs2_utility < set_admin.sql
```

Or run this query manually in pgAdmin:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your_email@example.com';
```

### Checking your admin status

1. Sign in.
2. Go to **Profile**.
3. You should see the `admin` role (if it is displayed in your profile).

---

## Adding utility points

### Opening the editor

1. Open a map (for example, Mirage).
2. You will see an **"✏️ Edit Map"** button (visible only to admins).
3. Click it.

### Adding a point

1. Click **"+ Add Utility Point"**.
2. Fill in the form:
   - **Name** — point name (for example, "A Site Smoke")
   - **Type** — Smoke, Molotov, Flash, Grenade, or Other
   - **X Position** — X coordinate (optional)
   - **Y Position** — Y coordinate (optional)
   - **Description** — full instructions
   - **Image/Video** — upload a demonstration image or video

3. Click **"Add Point"**.

### Editing a point

1. On the editing page, click **"Edit"** on the point.
2. Update the details.
3. Click **"Update Point"**.

### Deleting a point

1. On the editing page, click **"Delete"**.
2. Confirm the deletion.

---

## File uploads

### Supported formats

**Images:**
- JPG, JPEG, PNG, GIF

**Videos:**
- MP4, WebM

### File storage

```text
backend/
└── uploads/
    ├── utility/      (utility point images and videos)
    ├── clips/        (clips uploaded by users)
    └── maps/         (map images)
```

---

## X and Y positions

X and Y positions are optional and can be used to:
- Place points on an interactive map (if one is added later)
- Store coordinates for a future feature

For now, they are only stored as data.

---

## Possible next steps

After adding utility points to the maps, you could:

1. **Add an interactive minimap** — click the map to see the points.
2. **Add a rating system** — users can rate the tutorials.
3. **Add comments** — discussions for each point.
4. **Add advanced categories** — T vs. CT, beginning/end of round, etc.

---

## Troubleshooting

### "Admin access required"

- Make sure you ran the `set_admin.sql` script.
- Check the database: `SELECT * FROM users WHERE email = 'your_email';`
- Make sure `role = 'admin'`.

### Uploads are not working

- Check that the `backend/uploads/utility/` directory exists.
- If it does not, create it:
  ```bash
  mkdir -p backend/uploads/utility
  mkdir -p backend/uploads/maps
  mkdir -p backend/uploads/clips
  ```

### File is too large

- Current limit: approximately 50 MB.
- To increase it, edit `backend/src/server.js`:
  ```javascript
  app.use(express.json({ limit: '100mb' }));
  ```
