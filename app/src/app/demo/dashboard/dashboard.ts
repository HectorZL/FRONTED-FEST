import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  isCollapsed = false;
  
  menuItems = [
    { 
      path: '/dashboard/peliculas', 
      icon: '🎬', 
      label: 'Películas',
      description: 'Gestionar catálogo de películas'
    },
    { 
      path: '/dashboard/salas', 
      icon: '🏢', 
      label: 'Salas',
      description: 'Administrar salas de cine'
    },
    { 
      path: '/dashboard/asientos', 
      icon: '💺', 
      label: 'Asientos',
      description: 'Configurar distribución de asientos'
    },
    { 
      path: '/dashboard/funciones', 
      icon: '⏰', 
      label: 'Funciones',
      description: 'Programar horarios de funciones'
    },
    { 
      path: '/dashboard/boletos', 
      icon: '🎫', 
      label: 'Boletos',
      description: 'Gestionar venta de boletos'
    },
    { 
      path: '/dashboard/usuarios', 
      icon: '👥', 
      label: 'Usuarios',
      description: 'Administrar usuarios del sistema'
    },
    { 
      path: '/dashboard/roles', 
      icon: '🔐', 
      label: 'Roles',
      description: 'Gestionar permisos y roles'
    }
  ];

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }
}