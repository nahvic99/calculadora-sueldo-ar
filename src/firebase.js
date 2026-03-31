import { initializeApp } from "firebase/app";
import { getRemoteConfig } from "firebase/remote-config";

const firebaseConfig = {
  apiKey: "AIzaSyB06rBKyo3bOZ6euzb2iVN7MHVDoXqrc7Q",
  authDomain: "calculadorasueldoar.firebaseapp.com",
  projectId: "calculadorasueldoar",
  storageBucket: "calculadorasueldoar.firebasestorage.app",
  messagingSenderId: "366822848892",
  appId: "1:366822848892:web:ed550efd5c3ef6c0c80cf9",
  measurementId: "G-3BVL8973XZ"
};

const app = initializeApp(firebaseConfig);
export const remoteConfig = getRemoteConfig(app);
// Configuramos para que traiga datos nuevos al instante en desarrollo (en prod poné 3600 segundos)
remoteConfig.settings.minimumFetchIntervalMillis = 0;