require('dotenv').config();
const email = process.argv[2] && process.argv[2].trim();
if (!email) {
  console.error('Usage: node set-user-admin.js <user-email>');
  process.exit(2);
}

const pool = require('./src/config/database');

async function setUserAdmin(email) {
  try {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE email = $2 RETURNING id, email, username, role',
      ['admin', email]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Utilisateur avec l'email ${email} non trouvé`);
      process.exit(1);
    }

    console.log('✅ Utilisateur mis à jour en admin:');
    console.log(result.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

console.log(`🔄 Mise à jour du rôle pour: ${email}`);
setUserAdmin(email);
