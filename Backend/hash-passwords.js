const bcrypt = require('bcrypt');

async function hashPasswords() {
  const passwords = {
    admin: 'admin123',
    user1: 'user123'
  };

  for (const [user, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`${user}: ${hash}`);
  }
}

hashPasswords();
