# 🐕 Paseos de Luna

App para gestionar turnos de paseo del perro entre hermanos.

## Features

- 📸 Captura de foto con verificación IA (detección de perro)
- 🔄 Rotación automática de turnos
- 👎 Sistema de rechazo por consenso (2 votos)
- 🪟 Diseño Liquid Glass estilo iOS 26
- 🔥 Firebase (Auth, Firestore, Storage, Hosting)

## Tech Stack

- React + TypeScript + Vite
- Firebase (Auth, Firestore, Storage)
- TensorFlow.js (COCO-SSD para detección)
- Lucide React (iconos)

## Setup

```bash
cd client
npm install
npm run dev
```

## Deploy

```bash
npm run build
npx firebase deploy --only hosting
```

## Live

https://dogwalker-b090e.web.app
