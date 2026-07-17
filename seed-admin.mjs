import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Configuración de Firebase obtenida de sdk-firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyD3HjosAZg5bc1H6RGB_Tw2uPwOSJzlUt4",
  authDomain: "z-suite-academic-agile.firebaseapp.com",
  projectId: "z-suite-academic-agile",
  storageBucket: "z-suite-academic-agile.firebasestorage.app",
  messagingSenderId: "524259557449",
  appId: "1:524259557449:web:85eb2acc9ef9b12a48ff98"
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
