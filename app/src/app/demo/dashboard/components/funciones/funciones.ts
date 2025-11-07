import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FuncionesService, Funcion, FuncionCompleta } from '../../../services/funcion.service'
import { PeliculasService, Pelicula } from '../../../services/peliculas.service';
import { SalasService, Sala } from '../../../services/salas.service';

@Component({
  selector: 'app-funciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './funciones.html'
})
export class Funciones implements OnInit, OnDestroy {
  mostrarModal = false;
  funcionEditando: FuncionCompleta | null = null;
  cargando = false;
  guardando = false;
  private subscriptions: Subscription = new Subscription();

  funciones: FuncionCompleta[] = [];
  funcionesFiltradas: FuncionCompleta[] = [];
  peliculas: Pelicula[] = [];
  salas: Sala[] = [];

  // Filtros
  filtroFecha: string = '';
  filtroSalaId: number | null = null;
  filtroEstado: string = 'todos';
  filtroPeliculaId: number | null = null;

  estadosFuncion: ('programada' | 'en_curso' | 'cancelada' | 'finalizada')[] = ['programada', 'en_curso', 'cancelada', 'finalizada'];

  nuevaFuncion: Omit<Funcion, 'funcion_id'> = {
    pelicula_id: 0,
    sala_id: 0,
    fecha_hora_inicio: '',
    fecha_hora_fin: '',
    precio_base: 8.00,
    estado: 'programada'
  };

  // Para el formulario
  fechaSeleccionada: string = this.getFechaHoy();
  horaInicioSeleccionada: string = '14:00';

  constructor(
    private funcionesService: FuncionesService,
    private peliculasService: PeliculasService,
    private salasService: SalasService
  ) { }

  ngOnInit() {
    this.cargarDatos();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  cargarDatos() {
    this.cargando = true;

    // Cargar datos en paralelo
    this.subscriptions.add(
      this.peliculasService.getListaPeliculas().subscribe({
        next: (peliculas) => {
          this.peliculas = peliculas;
        },
        error: (error) => {
          console.error('Error al cargar películas:', error);
        }
      })
    );

    this.subscriptions.add(
      this.salasService.getListaSalas().subscribe({
        next: (salas) => {
          this.salas = salas;
        },
        error: (error) => {
          console.error('Error al cargar salas:', error);
        }
      })
    );

    // Suscribirse a funciones
    this.suscribirAFunciones();
  }

  suscribirAFunciones() {
    this.subscriptions.add(
      this.funcionesService.funciones$.subscribe({
        next: (funciones) => {
          this.cargarFuncionesCompletas();
        },
        error: (error) => {
          console.error('Error en suscripción a funciones:', error);
        }
      })
    );
  }

  cargarFuncionesCompletas() {
    this.subscriptions.add(
      this.funcionesService.getFuncionesCompletas().subscribe({
        next: (funciones) => {
          this.funciones = funciones;
          this.aplicarFiltros();
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al cargar funciones completas:', error);
          this.cargando = false;
          alert('Error al cargar las funciones: ' + error.message);
        }
      })
    );
  }

  aplicarFiltros() {
    this.funcionesFiltradas = this.funciones.filter(funcion => {
      const coincideFecha = this.filtroFecha ?
        funcion.fecha_hora_inicio.startsWith(this.filtroFecha) : true;

      const coincideSala = this.filtroSalaId !== null ?
        funcion.sala_id === this.filtroSalaId : true;

      const coincideEstado = this.filtroEstado !== 'todos' ?
        funcion.estado === this.filtroEstado : true;

      const coincidePelicula = this.filtroPeliculaId !== null ?
        funcion.pelicula_id === this.filtroPeliculaId : true;

      return coincideFecha && coincideSala && coincideEstado && coincidePelicula;
    });
  }

  onFiltroChange() {
    this.aplicarFiltros();
  }

  // Métodos auxiliares
  getColorEstado(estado: string): string {
    const colores: { [key: string]: string } = {
      'programada': 'bg-blue-100 text-blue-800',
      'en_curso': 'bg-green-100 text-green-800',
      'cancelada': 'bg-red-100 text-red-800',
      'finalizada': 'bg-gray-100 text-gray-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  }

  getFechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  formatearFecha(fechaISO: string): string {
    return new Date(fechaISO).toLocaleDateString('es-ES');
  }

  formatearHora(fechaISO: string): string {
    return new Date(fechaISO).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  calcularHoraFin(): void {
    if (this.nuevaFuncion.pelicula_id && this.fechaSeleccionada && this.horaInicioSeleccionada) {
      const pelicula = this.peliculas.find(p => p.id === this.nuevaFuncion.pelicula_id);
      if (pelicula) {
        const inicio = new Date(`${this.fechaSeleccionada}T${this.horaInicioSeleccionada}`);
        const fin = new Date(inicio.getTime() + pelicula.duracion * 60000);
  
        this.nuevaFuncion.fecha_hora_inicio = inicio.toISOString();
        this.nuevaFuncion.fecha_hora_fin = fin.toISOString();
      }
    }
  }

  // Método para obtener cantidad de funciones por estado
  getCantidadFuncionesPorEstado(estado: string): number {
    return this.funciones.filter(f => f.estado === estado).length;
  }

  // CRUD Operations
  abrirModal(funcion?: FuncionCompleta) {
    if (funcion) {
      this.funcionEditando = { ...funcion };
      this.nuevaFuncion = {
        pelicula_id: funcion.pelicula_id,
        sala_id: funcion.sala_id,
        fecha_hora_inicio: funcion.fecha_hora_inicio,
        fecha_hora_fin: funcion.fecha_hora_fin,
        precio_base: funcion.precio_base,
        estado: funcion.estado
      };

      // Establecer valores para el formulario
      const inicio = new Date(funcion.fecha_hora_inicio);
      this.fechaSeleccionada = inicio.toISOString().split('T')[0];
      this.horaInicioSeleccionada = inicio.toTimeString().slice(0, 5);
    } else {
      this.funcionEditando = null;
      this.nuevaFuncion = {
        pelicula_id: 0,
        sala_id: 0,
        fecha_hora_inicio: '',
        fecha_hora_fin: '',
        precio_base: 8.00,
        estado: 'programada'
      };
      this.fechaSeleccionada = this.getFechaHoy();
      this.horaInicioSeleccionada = '14:00';
    }
    this.mostrarModal = true;
    this.guardando = false;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.funcionEditando = null;
    this.guardando = false;
  }

  guardarFuncion() {
    if (!this.validarFuncion()) {
      alert('Por favor, completa todos los campos requeridos');
      return;
    }

    // Calcular fechas antes de guardar
    this.calcularHoraFin();

    this.guardando = true;

    if (this.funcionEditando) {
      // Actualizar función existente
      this.subscriptions.add(
        this.funcionesService.updateFuncion(this.funcionEditando.funcion_id, this.nuevaFuncion).subscribe({
          next: (funcionActualizada) => {
            console.log('Función actualizada:', funcionActualizada);
            this.cerrarModal();
          },
          error: (error) => {
            console.error('Error al actualizar función:', error);
            alert('Error al actualizar la función: ' + error.message);
            this.guardando = false;
          }
        })
      );
    } else {
      // Crear nueva función
      this.subscriptions.add(
        this.funcionesService.createFuncion(this.nuevaFuncion).subscribe({
          next: (nuevaFuncion) => {
            console.log('Función creada:', nuevaFuncion);
            this.cerrarModal();
          },
          error: (error) => {
            console.error('Error al crear función:', error);
            alert('Error al crear la función: ' + error.message);
            this.guardando = false;
          }
        })
      );
    }
  }

  validarFuncion(): boolean {
    return !!(this.nuevaFuncion.pelicula_id &&
      this.nuevaFuncion.sala_id &&
      this.fechaSeleccionada &&
      this.horaInicioSeleccionada &&
      this.nuevaFuncion.precio_base > 0);
  }

  eliminarFuncion(id: number) {
    if (confirm('¿Estás seguro de que quieres eliminar esta función? Esta acción no se puede deshacer.')) {
      this.subscriptions.add(
        this.funcionesService.deleteFuncion(id).subscribe({
          next: () => {
            console.log('Función eliminada correctamente');
          },
          error: (error) => {
            console.error('Error al eliminar función:', error);
            alert('Error al eliminar la función: ' + error.message);
          }
        })
      );
    }
  }

  cambiarEstadoFuncion(funcion: FuncionCompleta, nuevoEstado: 'programada' | 'en_curso' | 'cancelada' | 'finalizada') {
    const estadoOriginal = funcion.estado;

    // Optimistic update
    funcion.estado = nuevoEstado;

    this.subscriptions.add(
      this.funcionesService.cambiarEstadoFuncion(funcion.funcion_id, nuevoEstado).subscribe({
        next: (funcionActualizada) => {
          console.log('Estado de función actualizado:', funcionActualizada);
        },
        error: (error) => {
          console.error('Error al cambiar estado de la función:', error);
          // Revertir el cambio si hay error
          funcion.estado = estadoOriginal;
          alert('Error al cambiar el estado de la función: ' + error.message);
        }
      })
    );
  }

  getHorasDisponibles(): string[] {
    const horas = [];
    for (let i = 8; i <= 23; i++) {
      for (let j = 0; j < 60; j += 30) {
        horas.push(`${i.toString().padStart(2, '0')}:${j.toString().padStart(2, '0')}`);
      }
    }
    return horas;
  }

  tieneConflictosHorarios(): boolean {
    if (!this.nuevaFuncion.sala_id || !this.fechaSeleccionada || !this.horaInicioSeleccionada) {
      return false;
    }
  
    const inicio = new Date(`${this.fechaSeleccionada}T${this.horaInicioSeleccionada}`);
    const fin = new Date(inicio.getTime() + (this.peliculas.find(p => p.id === this.nuevaFuncion.pelicula_id)?.duracion || 120) * 60000);
  
    const funcionIdExcluir = this.funcionEditando?.funcion_id;
  
    // Por ahora retornamos false, pero puedes implementar la verificación real
    return false;
  }

  // Limpiar filtros
  limpiarFiltros() {
    this.filtroFecha = '';
    this.filtroSalaId = null;
    this.filtroEstado = 'todos';
    this.filtroPeliculaId = null;
    this.aplicarFiltros();
  }

  // Obtener películas activas
  getPeliculasActivas(): Pelicula[] {
    return this.peliculas.filter(p => p.estado === true);
  }

  // Obtener salas activas
  getSalasActivas(): Sala[] {
    return this.salas.filter(s => s.estado);
  }

  // Método para obtener nombre de sala
  getNombreSala(salaId: number): string {
    const sala = this.salas.find(s => s.sala_id === salaId);
    return sala?.nombre || 'Sala no encontrada';
  }

  // Método para obtener título de película
  getTituloPelicula(peliculaId: number): string {
    const pelicula = this.peliculas.find(p => p.id === peliculaId);
    return pelicula?.titulo || 'Película no encontrada';
  }
}