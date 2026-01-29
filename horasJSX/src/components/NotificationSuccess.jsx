/**
 * Componente NotificationSuccess
 * Notificación flotante de éxito
 */

import React from 'react';
import { Save } from 'lucide-react';

export function NotificationSuccess({ show, darkMode }) {
  if (!show) return null;

  return (
    <div
      className={`fixed top-8 right-8 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-slideIn ${
        darkMode
          ? 'bg-emerald-600 text-white'
          : 'bg-emerald-500 text-white'
      }`}
    >
      <Save className="w-5 h-5" />
      <span className="font-semibold">Entrada guardada</span>
    </div>
  );
}
