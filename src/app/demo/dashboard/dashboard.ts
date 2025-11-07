import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PeliculasService, Pelicula } from '../services/peliculas.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  private peliculasService = inject(PeliculasService);
  private router = inject(Router);
  private peliculasSubscription!: Subscription;

  isCollapsed = false;
  currentUser: any = null; // ✅ AGREGAR ESTA PROPIEDAD

  menuItems = [
    {
      path: '/dashboard/usuarios',
      icon: '👥',
      label: 'Usuarios',
      description: 'Gestionar usuarios del sistema',
    },
    {
      path: '/dashboard/renta',
      icon: '🏢',
      label: 'Renta de Salas',
      description: 'Gestionar renta de salas de cine',
    },
    {
      path: '/dashboard/peliculas',
      icon: '🎬',
      label: 'Películas',
      description: 'Gestionar catálogo de películas',
    },
    {
      path: '/dashboard/salas',
      icon: '🏢',
      label: 'Salas',
      description: 'Administrar salas de cine',
    },
    {
      path: '/dashboard/roles',
      icon: '🔒',
      label: 'Roles y Permisos',
      description: 'Gestionar roles y permisos del sistema',
    },
    {
      path: '/dashboard/asientos',
      icon: '💺',
      label: 'Asientos',
      description: 'Configurar distribución de asientos',
    },
    {
      path: '/dashboard/funciones',
      icon: '⏰',
      label: 'Funciones',
      description: 'Programar horarios de funciones',
    },
    {
      path: '/dashboard/boletos',
      icon: '🎫',
      label: 'Boletos',
      description: 'Gestionar venta de boletos',
    },
  ];

  ngOnInit() {
    // ✅ AGREGAR: Cargar usuario del localStorage
    this.loadCurrentUser();
    
    console.log('--- Iniciando la carga de datos de películas ---');
    
    this.peliculasSubscription = this.peliculasService.getListaPeliculas().subscribe(
      (peliculas: Pelicula[]) => {
        console.log('✅ Lista de Películas (Tiempo Real) recibida:', peliculas);
      },
      (error) => {
        console.error('❌ Error al obtener películas en el Dashboard:', error);
      }
    );
  }

  // ✅ AGREGAR ESTE MÉTODO
  private loadCurrentUser(): void {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      this.currentUser = JSON.parse(userStr);
      console.log('Usuario cargado del localStorage:', this.currentUser);
    } else {
      console.error('No se encontró usuario en localStorage');
      // Si no hay usuario, redirigir al login
      this.router.navigate(['/login']);
    }
  }

  // ✅ AGREGAR ESTE MÉTODO
  logout(): void {
    // Limpiar localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('rememberMe');
    
    // Redirigir al login
    this.router.navigate(['/login']);
  }

  // ✅ AGREGAR ESTE MÉTODO
  getUserInitials(): string {
    if (!this.currentUser) return 'A';
    const nombres = this.currentUser.nombres || '';
    const apellidos = this.currentUser.apellidos || '';
    
    if (nombres && apellidos) {
      return (nombres.charAt(0) + apellidos.charAt(0)).toUpperCase();
    } else if (nombres) {
      return nombres.charAt(0).toUpperCase();
    } else if (this.currentUser.email) {
      return this.currentUser.email.charAt(0).toUpperCase();
    }
    
    return 'A';
  }

  ngOnDestroy() {
    if (this.peliculasSubscription) {
      this.peliculasSubscription.unsubscribe();
    }
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }
}