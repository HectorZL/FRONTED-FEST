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
        path: 'usuarios',
        loadComponent: () =>
          import('./demo/dashboard/components/usuarios/usuarios').then((m) => m.UserManagementComponent),
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
      {
        path: 'asientos',
        loadComponent: () =>
          import('./demo/dashboard/components/asientos/asientos').then((m) => m.Asientos),
      },
      {
        path: 'funciones',
        loadComponent: () =>
          import('./demo/dashboard/components/funciones/funciones').then((m) => m.Funciones),
      },
    ],
  },
];
