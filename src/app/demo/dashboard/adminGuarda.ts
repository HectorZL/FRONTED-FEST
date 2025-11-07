// admin.guard.ts
import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  private router = inject(Router);

  canActivate(): boolean {
    const usuarioStr = localStorage.getItem('currentUser');
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    
    if (!usuarioStr || !isAuthenticated) {
      this.router.navigate(['/login']);
      return false;
    }

    try {
      const usuario = JSON.parse(usuarioStr);
      const esAdministrador = usuario.rol?.nombre?.toLowerCase() === 'administrador';
      
      if (esAdministrador) {
        return true;
      } else {
        this.router.navigate(['/login']);
        return false;
      }
    } catch (error) {
      this.router.navigate(['/login']);
      return false;
    }
  }
}