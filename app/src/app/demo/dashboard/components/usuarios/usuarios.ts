import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UsuarioService, UsuarioCompleto, Rol, CrearUsuarioData, ActualizarUsuarioData } from '../../../services/usuario.service';

interface UserFilters {
  search: string;
  role: string;
  tipo_usuario: string;
  status: string;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html'
})
export class UserManagementComponent implements OnInit, OnDestroy {
  usuarios: UsuarioCompleto[] = [];
  filteredUsers: UsuarioCompleto[] = [];
  selectedUser: UsuarioCompleto | null = null;
  roles: Rol[] = [];
  isEditModalOpen = false;
  isLoading = true;
  private subscriptions: Subscription = new Subscription();

  filters: UserFilters = {
    search: '',
    role: 'all',
    tipo_usuario: 'all',
    status: 'all'
  };

  // Opciones para filtros
  roleOptions = [
    { value: 'all', label: 'Todos los roles' },
    { value: '1', label: 'Administrador' },
    { value: '2', label: 'Trabajador' }
  ];

  tipoUsuarioOptions = [
    { value: 'all', label: 'Todos los tipos' },
    { value: 'trabajador', label: 'Trabajador' },
    { value: 'estudiante', label: 'Estudiante' }
  ];

  statusOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' }
  ];

  constructor(private usuarioService: UsuarioService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private cargarDatos(): void {
    // Cargar usuarios
    this.subscriptions.add(
      this.usuarioService.usuarios$.subscribe({
        next: (usuarios) => {
          this.usuarios = usuarios;
          this.aplicarFiltros();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar usuarios:', error);
          this.isLoading = false;
        }
      })
    );

    // Cargar roles
    this.subscriptions.add(
      this.usuarioService.getRoles().subscribe({
        next: (roles) => {
          this.roles = roles;
          // Actualizar opciones de roles con los datos reales
          this.roleOptions = [
            { value: 'all', label: 'Todos los roles' },
            ...roles.map(rol => ({ value: rol.rol_id.toString(), label: rol.nombre }))
          ];
        },
        error: (error) => {
          console.error('Error al cargar roles:', error);
        }
      })
    );
  }

  aplicarFiltros(): void {
    this.filteredUsers = this.usuarios.filter(usuario => {
      const matchesSearch = !this.filters.search || 
        usuario.nombres.toLowerCase().includes(this.filters.search.toLowerCase()) ||
        usuario.apellidos.toLowerCase().includes(this.filters.search.toLowerCase()) ||
        usuario.email.toLowerCase().includes(this.filters.search.toLowerCase()) ||
        usuario.cedula.toLowerCase().includes(this.filters.search.toLowerCase());
      
      const matchesRole = this.filters.role === 'all' || usuario.rol_id.toString() === this.filters.role;
      const matchesTipoUsuario = this.filters.tipo_usuario === 'all' || usuario.tipo_usuario === this.filters.tipo_usuario;
      
      // Para estado, podemos usar métricas o fecha de creación
      const matchesStatus = this.filters.status === 'all' || 
        (this.filters.status === 'active' && this.esUsuarioActivo(usuario)) ||
        (this.filters.status === 'inactive' && !this.esUsuarioActivo(usuario));

      return matchesSearch && matchesRole && matchesTipoUsuario && matchesStatus;
    });
  }

  private esUsuarioActivo(usuario: UsuarioCompleto): boolean {
    // Considerar activo si ha comprado boletos
    return (usuario.metricas?.total_boletos_comprados || 0) > 0;
  }

  onFiltersChange(): void {
    this.aplicarFiltros();
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      role: 'all',
      tipo_usuario: 'all',
      status: 'all'
    };
    this.aplicarFiltros();
  }

  onEditUser(usuario: UsuarioCompleto): void {
    this.selectedUser = { ...usuario };
    this.isEditModalOpen = true;
  }

  onDeleteUser(usuario: UsuarioCompleto): void {
    if (confirm(`¿Estás seguro de que quieres eliminar a ${usuario.nombres} ${usuario.apellidos}?`)) {
      this.subscriptions.add(
        this.usuarioService.eliminarUsuario(usuario.usuario_id).subscribe({
          next: () => {
            console.log('Usuario eliminado exitosamente');
          },
          error: (error) => {
            console.error('Error al eliminar usuario:', error);
            alert('Error al eliminar usuario: ' + error.message);
          }
        })
      );
    }
  }

  onSaveUser(usuarioData: Partial<UsuarioCompleto>): void {
    if (this.selectedUser) {
      const updateData: ActualizarUsuarioData = {
        nombres: usuarioData.nombres,
        apellidos: usuarioData.apellidos,
        email: usuarioData.email,
        tipo_usuario: usuarioData.tipo_usuario as 'trabajador' | 'estudiante',
        rol_id: usuarioData.rol_id
      };

      this.subscriptions.add(
        this.usuarioService.actualizarUsuario(this.selectedUser.usuario_id, updateData).subscribe({
          next: (usuarioActualizado) => {
            console.log('Usuario actualizado:', usuarioActualizado);
            this.isEditModalOpen = false;
            this.selectedUser = null;
          },
          error: (error) => {
            console.error('Error al actualizar usuario:', error);
            alert('Error al actualizar usuario: ' + error.message);
          }
        })
      );
    }
  }

  onCloseModal(): void {
    this.isEditModalOpen = false;
    this.selectedUser = null;
  }

  // Métodos auxiliares para la UI
  getRoleBadgeClass(rolId: number): string {
    const classes: { [key: number]: string } = {
      1: 'bg-purple-100 text-purple-800', // Admin
      2: 'bg-blue-100 text-blue-800',     // Trabajador
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${classes[rolId] || 'bg-gray-100 text-gray-800'}`;
  }

  getTipoUsuarioBadgeClass(tipo: string): string {
    const classes: { [key: string]: string } = {
      'trabajador': 'bg-green-100 text-green-800',
      'estudiante': 'bg-yellow-100 text-yellow-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${classes[tipo] || 'bg-gray-100 text-gray-800'}`;
  }

  getStatusBadgeClass(usuario: UsuarioCompleto): string {
    const isActive = this.esUsuarioActivo(usuario);
    return `px-2 py-1 rounded-full text-xs font-medium ${
      isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
    }`;
  }

  getRoleLabel(rolId: number): string {
    const rol = this.roles.find(r => r.rol_id === rolId);
    return rol?.nombre || 'Sin rol';
  }

  getStatusLabel(usuario: UsuarioCompleto): string {
    return this.esUsuarioActivo(usuario) ? 'Activo' : 'Inactivo';
  }

  getInitials(nombres: string, apellidos: string): string {
    return `${nombres.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return 'Nunca';
    return new Date(fecha).toLocaleDateString('es-ES');
  }

  getMetricasTexto(usuario: UsuarioCompleto): string {
    const metricas = usuario.metricas;
    if (!metricas) return 'Sin actividad';
    
    return `${metricas.total_boletos_comprados} compras • $${metricas.total_gastado}`;
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}