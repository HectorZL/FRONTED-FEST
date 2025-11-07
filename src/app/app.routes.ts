import { Routes } from '@angular/router';
import { LoginComponent } from './demo/login/login';
import { Dashboard } from './demo/dashboard/dashboard';

export const routes: Routes = [
  { 
    path: 'login', 
    component: LoginComponent 
  },
  { 
    path: '', 
    redirectTo: '/login', 
    pathMatch: 'full' 
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./demo/dashboard/dashboard').then(m => m.Dashboard),
    children: [
      {
        path: 'renta',
        loadComponent: () =>
          import('./demo/dashboard/components/renta/renta').then((m) => m.RentaSalasComponent),
      },
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
          import('./demo/dashboard/components/boletos/boletos').then((m) => m.BoletosComponent),
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
      {
        path: 'roles',
        loadComponent: () =>
          import('./demo/dashboard/components/rol/rol').then((m) => m.RoleFormComponent),
      },
      {
        path: '',
        redirectTo: 'peliculas',
        pathMatch: 'full'
      }
    ],
  },
  {
    path: "clientes",
    loadComponent: () =>
      import('./demo/client/client').then((m) => m.Client),
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
