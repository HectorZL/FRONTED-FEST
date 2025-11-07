import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { RentaSalaService, RentaSalaCompleta, SalaDisponible, CrearRentaData } from '../../../services/RentaSalaService.service';
import { UsuarioCompleto } from '../../../services/usuario.service';
import { UsuarioService } from '../../../services/usuario.service';

interface FiltrosRenta {
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  sala_id: string;
  usuario_id: string;
}

interface DatosReserva {
  sala_id: number;
  usuario_id?: number;
  nombre_evento: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  precio_total: number;
  estado_renta: 'Pendiente' | 'Confirmada';
}

@Component({
  selector: 'app-renta-salas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './renta.html'
})
export class RentaSalasComponent implements OnInit, OnDestroy {
  rentas: RentaSalaCompleta[] = [];
  rentasFiltradas: RentaSalaCompleta[] = [];
  salasDisponibles: SalaDisponible[] = [];
  usuarios: UsuarioCompleto[] = [];
  rentaSeleccionada: RentaSalaCompleta | null = null;
  isModalOpen = false;
  isCreandoRenta = false;
  isLoading = true;
  private subscriptions: Subscription = new Subscription();

  // Propiedades computadas para las estadísticas
  get totalRentas(): number {
    return this.rentas.length;
  }

  get rentasConfirmadas(): number {
    return this.rentas.filter(r => r.estado_renta === 'Confirmada').length;
  }

  get rentasPendientes(): number {
    return this.rentas.filter(r => r.estado_renta === 'Pendiente').length;
  }

  get ingresosTotales(): number {
    return this.rentas.reduce((total, r) => total + r.precio_total, 0);
  }

  filtros: FiltrosRenta = {
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'todos',
    sala_id: 'todas',
    usuario_id: 'todos'
  };

  datosReserva: DatosReserva = {
    sala_id: 0,
    usuario_id: undefined,
    nombre_evento: '',
    fecha_hora_inicio: '',
    fecha_hora_fin: '',
    precio_total: 0,
    estado_renta: 'Pendiente'
  };

  estadosRenta = [
    { value: 'todos', label: 'Todos los estados', color: 'gray' },
    { value: 'Pendiente', label: 'Pendiente', color: 'yellow' },
    { value: 'Confirmada', label: 'Confirmada', color: 'green' },
    { value: 'Cancelada', label: 'Cancelada', color: 'red' },
    { value: 'Completada', label: 'Completada', color: 'blue' }
  ];

  tiposEvento = [
    { value: 'conferencia', label: 'Conferencia' },
    { value: 'fiesta', label: 'Fiesta' },
    { value: 'reunión', label: 'Reunión' },
    { value: 'evento_especial', label: 'Evento Especial' },
    { value: 'proyección', label: 'Proyección' },
    { value: 'otros', label: 'Otros' }
  ];

  constructor(
    private rentaSalaService: RentaSalaService,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
    this.configurarFechasPorDefecto();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private configurarFechasPorDefecto(): void {
    const hoy = new Date();
    const mañana = new Date(hoy);
    mañana.setDate(hoy.getDate() + 1);
    
    this.filtros.fecha_inicio = hoy.toISOString().split('T')[0];
    this.filtros.fecha_fin = mañana.toISOString().split('T')[0];
    
    // Configurar fechas por defecto para nueva reserva
    const inicioDefault = new Date();
    inicioDefault.setHours(18, 0, 0, 0);
    const finDefault = new Date(inicioDefault);
    finDefault.setHours(20, 0, 0, 0);
    
    this.datosReserva.fecha_hora_inicio = inicioDefault.toISOString().slice(0, 16);
    this.datosReserva.fecha_hora_fin = finDefault.toISOString().slice(0, 16);
  }

  private cargarDatos(): void {
    // Cargar rentas
    this.subscriptions.add(
      this.rentaSalaService.rentas$.subscribe({
        next: (rentas) => {
          this.rentas = rentas;
          this.aplicarFiltros();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar rentas:', error);
          this.isLoading = false;
        }
      })
    );

    // Cargar usuarios
    this.subscriptions.add(
      this.usuarioService.usuarios$.subscribe({
        next: (usuarios) => {
          this.usuarios = usuarios;
        },
        error: (error) => {
          console.error('Error al cargar usuarios:', error);
        }
      })
    );
  }

  aplicarFiltros(): void {
    this.rentasFiltradas = this.rentas.filter(renta => {
      const coincideEstado = this.filtros.estado === 'todos' || renta.estado_renta === this.filtros.estado;
      const coincideSala = this.filtros.sala_id === 'todas' || renta.sala_id.toString() === this.filtros.sala_id;
      const coincideUsuario = this.filtros.usuario_id === 'todos' || renta.usuario_id?.toString() === this.filtros.usuario_id;
      
      let coincideFecha = true;
      if (this.filtros.fecha_inicio) {
        coincideFecha = renta.fecha_hora_inicio >= this.filtros.fecha_inicio + 'T00:00:00';
      }
      if (this.filtros.fecha_fin) {
        coincideFecha = coincideFecha && renta.fecha_hora_fin <= this.filtros.fecha_fin + 'T23:59:59';
      }

      return coincideEstado && coincideSala && coincideUsuario && coincideFecha;
    });
  }

  buscarSalasDisponibles(): void {
    if (this.filtros.fecha_inicio && this.filtros.fecha_fin) {
      this.subscriptions.add(
        this.rentaSalaService.getSalasDisponibles(
          this.filtros.fecha_inicio + 'T00:00:00',
          this.filtros.fecha_fin + 'T23:59:59'
        ).subscribe({
          next: (salas) => {
            this.salasDisponibles = salas;
          },
          error: (error) => {
            console.error('Error al cargar salas disponibles:', error);
          }
        })
      );
    }
  }

  limpiarFiltros(): void {
    this.filtros = {
      fecha_inicio: this.filtros.fecha_inicio,
      fecha_fin: this.filtros.fecha_fin,
      estado: 'todos',
      sala_id: 'todas',
      usuario_id: 'todos'
    };
    this.aplicarFiltros();
  }

  abrirModalCrear(): void {
    this.isCreandoRenta = true;
    this.isModalOpen = true;
    this.buscarSalasDisponibles();
    this.calcularPrecio();
  }

  abrirModalEditar(renta: RentaSalaCompleta): void {
    this.rentaSeleccionada = renta;
    this.datosReserva = {
      sala_id: renta.sala_id,
      usuario_id: renta.usuario_id,
      nombre_evento: renta.nombre_evento,
      fecha_hora_inicio: renta.fecha_hora_inicio.slice(0, 16),
      fecha_hora_fin: renta.fecha_hora_fin.slice(0, 16),
      precio_total: renta.precio_total,
      estado_renta: renta.estado_renta as 'Pendiente' | 'Confirmada'
    };
    this.isCreandoRenta = false;
    this.isModalOpen = true;
  }

  crearRenta(): void {
    const rentaData: CrearRentaData = {
      ...this.datosReserva,
      precio_total: this.datosReserva.precio_total || this.calcularPrecio()
    };

    this.subscriptions.add(
      this.rentaSalaService.crearRenta(rentaData).subscribe({
        next: (rentaCreada) => {
          console.log('Renta creada:', rentaCreada);
          this.cerrarModal();
          alert('Renta creada exitosamente');
        },
        error: (error) => {
          console.error('Error al crear renta:', error);
          alert('Error al crear renta: ' + error.message);
        }
      })
    );
  }

  actualizarRenta(): void {
    if (this.rentaSeleccionada) {
      this.subscriptions.add(
        this.rentaSalaService.actualizarRenta(this.rentaSeleccionada.renta_id, this.datosReserva).subscribe({
          next: (rentaActualizada) => {
            console.log('Renta actualizada:', rentaActualizada);
            this.cerrarModal();
            alert('Renta actualizada exitosamente');
          },
          error: (error) => {
            console.error('Error al actualizar renta:', error);
            alert('Error al actualizar renta: ' + error.message);
          }
        })
      );
    }
  }

  eliminarRenta(renta: RentaSalaCompleta): void {
    if (confirm(`¿Estás seguro de que quieres eliminar la renta "${renta.nombre_evento}"?`)) {
      this.subscriptions.add(
        this.rentaSalaService.eliminarRenta(renta.renta_id).subscribe({
          next: () => {
            console.log('Renta eliminada exitosamente');
          },
          error: (error) => {
            console.error('Error al eliminar renta:', error);
            alert('Error al eliminar renta: ' + error.message);
          }
        })
      );
    }
  }

  cambiarEstadoRenta(renta: RentaSalaCompleta, nuevoEstado: 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada'): void {
    this.subscriptions.add(
      this.rentaSalaService.cambiarEstadoRenta(renta.renta_id, nuevoEstado).subscribe({
        next: (rentaActualizada) => {
          console.log('Estado de renta actualizado:', rentaActualizada);
        },
        error: (error) => {
          console.error('Error al cambiar estado:', error);
          alert('Error al cambiar estado: ' + error.message);
        }
      })
    );
  }

  calcularPrecio(): number {
    if (!this.datosReserva.fecha_hora_inicio || !this.datosReserva.fecha_hora_fin) {
      return 0;
    }

    const inicio = new Date(this.datosReserva.fecha_hora_inicio);
    const fin = new Date(this.datosReserva.fecha_hora_fin);
    const horas = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60);
    
    // Usar el método del servicio para calcular precio
    const tipoEvento = 'otros'; // Podrías agregar un campo para tipo de evento
    return this.rentaSalaService.calcularPrecio(this.datosReserva.sala_id, horas, tipoEvento);
  }

  onCambiarFechas(): void {
    this.datosReserva.precio_total = this.calcularPrecio();
    this.buscarSalasDisponibles();
  }

  cerrarModal(): void {
    this.isModalOpen = false;
    this.isCreandoRenta = false;
    this.rentaSeleccionada = null;
    this.datosReserva = {
      sala_id: 0,
      usuario_id: undefined,
      nombre_evento: '',
      fecha_hora_inicio: '',
      fecha_hora_fin: '',
      precio_total: 0,
      estado_renta: 'Pendiente'
    };
  }

  // Métodos auxiliares para la UI
  getEstadoBadgeClass(estado: string): string {
    const clases: { [key: string]: string } = {
      'Pendiente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Confirmada': 'bg-green-100 text-green-800 border-green-200',
      'Cancelada': 'bg-red-100 text-red-800 border-red-200',
      'Completada': 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return `px-3 py-1 rounded-full text-sm font-medium border ${clases[estado] || 'bg-gray-100 text-gray-800'}`;
  }

  getSalaBadgeClass(tipoSala: string): string {
    const clases: { [key: string]: string } = {
      'Estándar': 'bg-blue-100 text-blue-800',
      'VIP': 'bg-purple-100 text-purple-800',
      '3D': 'bg-green-100 text-green-800',
      'IMAX': 'bg-red-100 text-red-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${clases[tipoSala] || 'bg-gray-100 text-gray-800'}`;
  }

  formatearFecha(fechaISO: string): string {
    return this.rentaSalaService.formatearFecha(fechaISO);
  }

  formatearPrecio(precio: number): string {
    return this.rentaSalaService.formatearPrecio(precio);
  }

  getDuracion(renta: RentaSalaCompleta): string {
    const metricas = renta.metricas;
    if (!metricas) return 'N/A';
    return `${metricas.duracion_horas}h`;
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  validarReserva(): boolean {
    return !!(
      this.datosReserva.sala_id &&
      this.datosReserva.nombre_evento &&
      this.datosReserva.fecha_hora_inicio &&
      this.datosReserva.fecha_hora_fin &&
      this.datosReserva.precio_total > 0
    );
  }
}