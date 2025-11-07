import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

export interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
}

@Component({
  selector: 'app-rol',
  templateUrl: './rol.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class RoleFormComponent implements OnInit {
  @Output() roleSubmitted = new EventEmitter<RoleFormData>();
  @Output() formCancelled = new EventEmitter<void>();

  roleForm: FormGroup;
  isSubmitting = false;

  // Permisos de ejemplo organizados por categorías
  permissions: Permission[] = [
    // Administración
    { id: 'users_read', name: 'Ver usuarios', category: 'Administración', description: 'Permite ver la lista de usuarios' },
    { id: 'users_create', name: 'Crear usuarios', category: 'Administración', description: 'Permite crear nuevos usuarios' },
    { id: 'users_edit', name: 'Editar usuarios', category: 'Administración', description: 'Permite editar usuarios existentes' },
    { id: 'users_delete', name: 'Eliminar usuarios', category: 'Administración', description: 'Permite eliminar usuarios' },
    
    // Roles
    { id: 'roles_read', name: 'Ver roles', category: 'Roles', description: 'Permite ver la lista de roles' },
    { id: 'roles_create', name: 'Crear roles', category: 'Roles', description: 'Permite crear nuevos roles' },
    { id: 'roles_edit', name: 'Editar roles', category: 'Roles', description: 'Permite editar roles existentes' },
    { id: 'roles_delete', name: 'Eliminar roles', category: 'Roles', description: 'Permite eliminar roles' },
    
    // Contenido
    { id: 'content_read', name: 'Ver contenido', category: 'Contenido', description: 'Permite ver el contenido del sistema' },
    { id: 'content_create', name: 'Crear contenido', category: 'Contenido', description: 'Permite crear nuevo contenido' },
    { id: 'content_edit', name: 'Editar contenido', category: 'Contenido', description: 'Permite editar contenido existente' },
    { id: 'content_delete', name: 'Eliminar contenido', category: 'Contenido', description: 'Permite eliminar contenido' },
    
    // Reportes
    { id: 'reports_view', name: 'Ver reportes', category: 'Reportes', description: 'Permite acceder a los reportes del sistema' },
    { id: 'reports_export', name: 'Exportar reportes', category: 'Reportes', description: 'Permite exportar reportes' }
  ];

  get permissionsByCategory(): { [key: string]: Permission[] } {
    return this.permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as { [key: string]: Permission[] });
  }

  get categoryNames(): string[] {
    return Object.keys(this.permissionsByCategory);
  }

  get selectedPermissionsCount(): number {
    const selectedPermissions = this.roleForm.get('permissions') as FormArray;
    return selectedPermissions.controls.filter(control => control.value).length;
  }

  constructor(private fb: FormBuilder) {
    this.roleForm = this.createForm();
  }

  ngOnInit(): void {
    this.initializePermissions();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(200)]],
      permissions: this.fb.array([])
    });
  }

  private initializePermissions(): void {
    const permissionsArray = this.roleForm.get('permissions') as FormArray;
    this.permissions.forEach(permission => {
      permissionsArray.push(this.fb.control(false));
    });
  }

  getPermissionIndex(permissionId: string): number {
    return this.permissions.findIndex(p => p.id === permissionId);
  }

  getPermissionControl(permissionId: string) {
    const index = this.getPermissionIndex(permissionId);
    const permissionsArray = this.roleForm.get('permissions') as FormArray;
    return permissionsArray.at(index) as FormControl;
  }

  selectAllInCategory(category: string): void {
    const categoryPermissions = this.permissionsByCategory[category];
    const permissionsArray = this.roleForm.get('permissions') as FormArray;
    
    categoryPermissions.forEach(permission => {
      const index = this.permissions.findIndex(p => p.id === permission.id);
      if (index !== -1) {
        permissionsArray.at(index).setValue(true);
      }
    });
  }

  deselectAllInCategory(category: string): void {
    const categoryPermissions = this.permissionsByCategory[category];
    const permissionsArray = this.roleForm.get('permissions') as FormArray;
    
    categoryPermissions.forEach(permission => {
      const index = this.permissions.findIndex(p => p.id === permission.id);
      if (index !== -1) {
        permissionsArray.at(index).setValue(false);
      }
    });
  }

  selectAllPermissions(): void {
    const permissionsArray = this.roleForm.get('permissions') as FormArray;
    permissionsArray.controls.forEach(control => control.setValue(true));
  }

  deselectAllPermissions(): void {
    const permissionsArray = this.roleForm.get('permissions') as FormArray;
    permissionsArray.controls.forEach(control => control.setValue(false));
  }

  onSubmit(): void {
    if (this.roleForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      const formValue = this.roleForm.value;
      const selectedPermissions = this.permissions
        .filter((_, index) => formValue.permissions[index])
        .map(permission => permission.id);

      const roleData: RoleFormData = {
        name: formValue.name,
        description: formValue.description,
        permissions: selectedPermissions
      };

      // Simular una llamada a API
      setTimeout(() => {
        this.roleSubmitted.emit(roleData);
        this.isSubmitting = false;
      }, 1000);
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    if (this.roleForm.dirty) {
      if (confirm('¿Estás seguro de que deseas cancelar? Se perderán los cambios no guardados.')) {
        this.formCancelled.emit();
      }
    } else {
      this.formCancelled.emit();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.roleForm.controls).forEach(key => {
      const control = this.roleForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.roleForm.get(fieldName);
    
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return 'Este campo es requerido';
      }
      if (field.errors['minlength']) {
        return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      }
      if (field.errors['maxlength']) {
        return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
      }
    }
    
    return '';
  }
}