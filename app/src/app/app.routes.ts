import { Routes } from '@angular/router';
import { Dashboard } from './demo/dashboard/dashboard';
import { Peliculas } from './demo/dashboard/components/peliculas/peliculas';

export const routes: Routes = [
  {
    path: 'dashboard',
    component: Dashboard,
    children: [
      {
        path: 'peliculas',
        loadComponent: () =>
          import('./demo/dashboard/components/peliculas/peliculas').then((m) => m.Peliculas),
      },
      {
        path: 'boletos',
        loadComponent: () =>
          import('./demo/dashboard/components/boletos/boletos').then((m) => m.Boletos),
      },
      {
        path: 'salas',
        loadComponent: () =>
          import('./demo/dashboard/components/salas/salas').then((m) => m.Salas),
      },
    ],
  },
];
