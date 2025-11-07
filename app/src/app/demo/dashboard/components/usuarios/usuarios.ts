import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  lastLogin?: Date;
  createdAt: Date;
  department?: string;
}

enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended'
}

interface UserFilters {
  search: string;
  role: UserRole | 'all';
  status: UserStatus | 'all';
  department: string;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html'
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  selectedUser: User | null = null;
  isEditModalOpen = false;
  isLoading = true;

  filters: UserFilters = {
    search: '',
    role: 'all',
    status: 'all',
    department: ''
  };

  roles = [
    { value: 'all', label: 'Todos los roles' },
    { value: UserRole.ADMIN, label: 'Administrador' },
    { value: UserRole.MANAGER, label: 'Gerente' },
    { value: UserRole.EDITOR, label: 'Editor' },
    { value: UserRole.VIEWER, label: 'Solo lectura' }
  ];

  statuses = [
    { value: 'all', label: 'Todos los estados' },
    { value: UserStatus.ACTIVE, label: 'Activo' },
    { value: UserStatus.INACTIVE, label: 'Inactivo' },
    { value: UserStatus.PENDING, label: 'Pendiente' },
    { value: UserStatus.SUSPENDED, label: 'Suspendido' }
  ];

  departments = ['TI', 'Ventas', 'Marketing', 'Recursos Humanos', 'Finanzas'];

  ngOnInit(): void {
    this.loadMockUsers();
  }

  private loadMockUsers(): void {
    // Simular carga de datos
    setTimeout(() => {
      this.users = [
        {
          id: '1',
          firstName: 'María',
          lastName: 'García',
          email: 'maria.garcia@empresa.com',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          avatar: 'MG',
          lastLogin: new Date('2024-01-15'),
          createdAt: new Date('2023-01-10'),
          department: 'TI'
        },
        {
          id: '2',
          firstName: 'Carlos',
          lastName: 'Rodríguez',
          email: 'carlos.rodriguez@empresa.com',
          role: UserRole.MANAGER,
          status: UserStatus.ACTIVE,
          avatar: 'CR',
          lastLogin: new Date('2024-01-14'),
          createdAt: new Date('2023-03-15'),
          department: 'Ventas'
        },
        {
          id: '3',
          firstName: 'Ana',
          lastName: 'López',
          email: 'ana.lopez@empresa.com',
          role: UserRole.EDITOR,
          status: UserStatus.PENDING,
          avatar: 'AL',
          lastLogin: new Date('2024-01-10'),
          createdAt: new Date('2023-06-20'),
          department: 'Marketing'
        },
        {
          id: '4',
          firstName: 'Pedro',
          lastName: 'Martínez',
          email: 'pedro.martinez@empresa.com',
          role: UserRole.VIEWER,
          status: UserStatus.INACTIVE,
          avatar: 'PM',
          lastLogin: new Date('2023-12-01'),
          createdAt: new Date('2023-08-05'),
          department: 'Finanzas'
        }
      ];
      this.filteredUsers = [...this.users];
      this.isLoading = false;
    }, 1000);
  }

  onFiltersChange(): void {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = !this.filters.search || 
        user.firstName.toLowerCase().includes(this.filters.search.toLowerCase()) ||
        user.lastName.toLowerCase().includes(this.filters.search.toLowerCase()) ||
        user.email.toLowerCase().includes(this.filters.search.toLowerCase());
      
      const matchesRole = this.filters.role === 'all' || user.role === this.filters.role;
      const matchesStatus = this.filters.status === 'all' || user.status === this.filters.status;
      const matchesDepartment = !this.filters.department || user.department === this.filters.department;

      return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
    });
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      role: 'all',
      status: 'all',
      department: ''
    };
    this.onFiltersChange();
  }

  onEditUser(user: User): void {
    this.selectedUser = { ...user };
    this.isEditModalOpen = true;
  }

  onDeleteUser(user: User): void {
    if (confirm(`¿Estás seguro de que quieres eliminar a ${user.firstName} ${user.lastName}?`)) {
      this.users = this.users.filter(u => u.id !== user.id);
      this.onFiltersChange();
    }
  }

  onSaveUser(userData: Partial<User>): void {
    if (this.selectedUser) {
      const index = this.users.findIndex(u => u.id === this.selectedUser!.id);
      if (index !== -1) {
        this.users[index] = { ...this.users[index], ...userData };
        this.onFiltersChange();
      }
      this.isEditModalOpen = false;
      this.selectedUser = null;
    }
  }

  onCloseModal(): void {
    this.isEditModalOpen = false;
    this.selectedUser = null;
  }

  getRoleBadgeClass(role: UserRole): string {
    const classes = {
      [UserRole.ADMIN]: 'bg-purple-100 text-purple-800',
      [UserRole.MANAGER]: 'bg-blue-100 text-blue-800',
      [UserRole.EDITOR]: 'bg-green-100 text-green-800',
      [UserRole.VIEWER]: 'bg-gray-100 text-gray-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${classes[role]}`;
  }

  getStatusBadgeClass(status: UserStatus): string {
    const classes = {
      [UserStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [UserStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
      [UserStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [UserStatus.SUSPENDED]: 'bg-red-100 text-red-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${classes[status]}`;
  }

  getStatusLabel(status: UserStatus): string {
    const labels = {
      [UserStatus.ACTIVE]: 'Activo',
      [UserStatus.INACTIVE]: 'Inactivo',
      [UserStatus.PENDING]: 'Pendiente',
      [UserStatus.SUSPENDED]: 'Suspendido'
    };
    return labels[status];
  }

  getRoleLabel(role: UserRole): string {
    const labels = {
      [UserRole.ADMIN]: 'Administrador',
      [UserRole.MANAGER]: 'Gerente',
      [UserRole.EDITOR]: 'Editor',
      [UserRole.VIEWER]: 'Solo lectura'
    };
    return labels[role];
  }

  getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}