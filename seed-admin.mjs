import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

import fs from "fs";
import path from "path";

// Cargar .env manualmente para Node.js si no lo provee el runtime
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      envContent.split("\n").forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || "";
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          process.env[key] = value.trim();
        }
      });
    }
  } catch (err) {
    console.warn("No se pudo cargar el archivo .env:", err.message);
  }
}

// Configuración de Firebase obtenida de sdk-firebase.js
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD3HjosAZg5bc1H6RGB_Tw2uPwOSJzlUt4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "z-suite-academic-agile.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "z-suite-academic-agile",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "z-suite-academic-agile.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "524259557449",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:524259557449:web:85eb2acc9ef9b12a48ff98"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const adminEmail = "zapataval2304@gmail.com";
  const adminDocRef = doc(db, "users", adminEmail);
  
  const adminData = {
    id: adminEmail,
    email: adminEmail,
    name: "Jaime Zapata",
    code: "admin123", // Contraseña/código de acceso por defecto para el administrador principal
    role: "admin"
  };

  console.log("Intentando almacenar el usuario administrador en Firestore...");
  try {
    await setDoc(adminDocRef, adminData);
    console.log("----------------------------------------------------------------");
    console.log("¡ÉXITO!");
    console.log(`Usuario principal (admin) almacenado correctamente en Firestore.`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Nombre: Jaime Zapata`);
    console.log(`Código de Acceso: admin123`);
    console.log("----------------------------------------------------------------");
    process.exit(0);
  } catch (error) {
    console.error("Error al almacenar el administrador principal en Firestore:", error);
    process.exit(1);
  }
}

main();
