import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PeliculasService,Pelicula } from '../services/peliculas.service';
import { Subscription } from 'rxjs'; // Necesario para gestionar la desuscripción

@Component({
  selector: 'app-dashboard',
  standalone: true, // Asumimos que es un Standalone Component
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  // Inyección de dependencias usando la función inject (Angular 14+)
  private peliculasService = inject(PeliculasService);
  private peliculasSubscription!: Subscription;

  isCollapsed = false;

  menuItems = [
    {
      path: '/dashboard/usuarios',
      icon: '👥',
      label: 'Usuarios',
      description: 'Gestionar usuarios del sistema',
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
    {
    },
    {
      path: '/dashboard/roles',
      icon: '🔐',
      label: 'Roles',
      description: 'Gestionar permisos y roles',
    },
  ];

  // ===================================
  // LÓGICA DE SERVICIO
  // ===================================

  ngOnInit() {
    console.log('--- Iniciando la carga de datos de películas ---');
    
    // 1. Suscribirse a la lista de películas
    this.peliculasSubscription = this.peliculasService.getListaPeliculas().subscribe(
      (peliculas: Pelicula[]) => {
        // 2. Muestra la lista por consola. 
        // ¡Esta línea se ejecutará cada vez que haya un cambio en Supabase!
        console.log('✅ Lista de Películas (Tiempo Real) recibida:', peliculas);
      },
      (error) => {
        console.error('❌ Error al obtener películas en el Dashboard:', error);
      }
    );
  }

  ngOnDestroy() {
    // Desuscribe para evitar fugas de memoria (memory leaks)
    if (this.peliculasSubscription) {
      this.peliculasSubscription.unsubscribe();
    }
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }
}