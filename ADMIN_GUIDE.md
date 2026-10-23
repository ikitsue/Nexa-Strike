# Guide d'Édition des Maps - CS2 Utility App

## 🔐 Accès Admin

### Devenir Admin

1. **Crée ton compte** sur l'app
2. **Lance ce script SQL** sur ta base de données pour te rendre admin:

```bash
psql -U postgres cs2_utility < set_admin.sql
```

Ou manuellement dans pgAdmin:
```sql
UPDATE users SET role = 'admin' WHERE email = 'ton_email@example.com';
```

### Vérifier que tu es admin

1. Connecte-toi
2. Va dans **Profile**
3. Tu devrais voir un rôle 'admin' (si tu l'ajoutes au profil)

---

## 📍 Ajouter des Utility Points

### Accès à l'éditeur

1. Va sur une map (ex: Mirage)
2. Tu verras un bouton **"✏️ Edit Map"** (visible seulement si tu es admin)
3. Clique dessus

### Ajouter un point

1. Clique sur **"+ Add Utility Point"**
2. Remplis le formulaire:
   - **Name** - Nom du point (ex: "A Site Smoke")
   - **Type** - Smoke, Molotov, Flash, Grenade, Other
   - **X Position** - Coordonnée X (optionnel)
   - **Y Position** - Coordonnée Y (optionnel)
   - **Description** - Instructions complètes
   - **Image/Video** - Upload une image ou vidéo de démonstration

3. Clique **"Add Point"**

### Modifier un point

1. Sur la page d'édition, clique sur **"Edit"** sur le point
2. Modifie les infos
3. Clique **"Update Point"**

### Supprimer un point

1. Sur la page d'édition, clique sur **"Delete"**
2. Confirme la suppression

---

## 🎥 Upload de Fichiers

### Format acceptés:

**Images:**
- JPG, JPEG, PNG, GIF

**Vidéos:**
- MP4, WebM

### Où sont stockés les fichiers?

```
backend/
└── uploads/
    ├── utility/      (images et vidéos des points)
    ├── clips/        (clips uploadés par les users)
    └── maps/         (images des maps)
```

---

## 📊 Positions X, Y

Les positions X et Y sont optionnelles et peuvent servir à:
- Placer les points sur une carte interactive (si tu ajoutes une carte plus tard)
- Stocker les coordinates pour une fonctionnalité future

Pour le moment, c'est juste du stockage de données.

---

## 🚀 Prochaines Étapes

Après avoir rempli les maps avec des points, tu peux:

1. **Ajouter une minimap interactive** - Cliquer sur la carte pour voir les points
2. **Ajouter un système de notation** - Les users notent les tutoriels
3. **Ajouter des commentaires** - Discussion sur chaque point
4. **Catégories avancées** - T vs CT, début/fin de round, etc.

---

## ❓ Dépannage

### "Admin access required"

- Vérifier que tu as lancé le script `set_admin.sql`
- Vérifie dans la base de données: `SELECT * FROM users WHERE email = 'ton_email';`
- Assure-toi que `role = 'admin'`

### Les uploads ne fonctionnent pas

- Vérifie que le dossier `backend/uploads/utility/` existe
- Sinon crée-le:
  ```bash
  mkdir -p backend/uploads/utility
  mkdir -p backend/uploads/maps
  mkdir -p backend/uploads/clips
  ```

### Fichier trop volumineux

- Limite actuelle: ~50MB
- Pour augmenter, modifie `backend/src/server.js`:
  ```javascript
  app.use(express.json({ limit: '100mb' }));
  ```

---

Besoin d'aide? Dis-moi! 🎮
