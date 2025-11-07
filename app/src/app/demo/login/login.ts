import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

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

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
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

      // Simular llamada a API
      setTimeout(() => {
        this.isLoading.set(false);
        
        // Aquí iría la lógica real de autenticación
        const { email, password } = this.loginForm.value;
        
        if (email === 'usuario@ejemplo.com' && password === '123456') {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage.set('Credenciales incorrectas. Intente nuevamente.');
        }
      }, 1500);
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