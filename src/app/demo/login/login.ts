import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UsuarioService } from '../services/usuario.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = signal(false);
  showPassword = signal(false);
  errorMessage = signal('');

  private usuarioService = inject(UsuarioService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const { email, password } = this.loginForm.value;

      // Usar el método existente getUsuariosCompletos()
      this.usuarioService.getUsuariosCompletos().subscribe({
        next: (usuarios) => {
          this.isLoading.set(false);
          
          // Buscar usuario por email y contraseña
          const usuarioEncontrado = usuarios.find(usuario => 
            usuario.email === email && usuario.password_hash === password
          );

          if (usuarioEncontrado) {
            // Verificar si es administrador
            if (usuarioEncontrado.rol?.nombre?.toLowerCase() === 'administrador') {
              // Guardar sesión
              localStorage.setItem('currentUser', JSON.stringify(usuarioEncontrado));
              localStorage.setItem('isAuthenticated', 'true');
              
              // Redirigir al dashboard
              this.router.navigate(['/dashboard']);
            } else {
              this.errorMessage.set('Solo los administradores pueden acceder al sistema');
            }
          } else {
            this.errorMessage.set('Credenciales incorrectas. Intente nuevamente.');
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set('Error de conexión. Intente nuevamente.');
          console.error('Error en login:', error);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(value => !value);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}