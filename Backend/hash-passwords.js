/**
 * PASSWORT-HASHING UTILITY
 * 
 * Dieses Skript generiert gehashte Passwörter für Test-Benutzer
 * Die Hashes können dann direkt in die Datenbank eingefügt werden
 * 
 * Verwendung:
 * - node hash-passwords.js
 * - Die Ausgabe zeigt Benutzernamen und deren gehashte Passwörter
 * 
 * Wichtig: Passwörter sollten NIEMALS im Klartext gespeichert werden!
 * Verwende immer bcrypt zum Hashen
 */

const bcrypt = require('bcrypt');

/**
 * Generiert gehashte Passwörter für Standard-Testbenutzer
 * Mit 10 Salt-Runden für gute Sicherheit
 */
async function hashPasswords() {
  // Definition der Test-Benutzer und deren Passwörter
  const passwords = {
    admin: 'admin123',
    user1: 'user123'
  };

  // Iteriere über jeden Benutzer und hashe das Passwort
  for (const [user, password] of Object.entries(passwords)) {
    // bcrypt.hash(klartext, saltRounds)
    // 10 Salt-Runden ist der Standard für gute Sicherheit vs. Performance
    const hash = await bcrypt.hash(password, 10);
    console.log(`${user}: ${hash}`);
  }
}

// Führe die Funktion aus
hashPasswords();
