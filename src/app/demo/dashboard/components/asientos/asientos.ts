import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AsientosService, Asiento, AsientoConSala } from '../../../services/asientos.service';
import { SalasService, Sala } from '../../../services/salas.service';

@Component({
  selector: 'app-asientos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asientos.html'
})
export class Asientos implements OnInit, OnDestroy {
  mostrarModal = false;
  asientoEditando: Asiento | null = null;
  cargando = false;
  guardando = false;
  private subscriptions: Subscription = new Subscription();

  asientos: AsientoConSala[] = [];
  salas: Sala[] = [];
  asientosFiltrados: AsientoConSala[] = [];

  // Filtros - IMPORTANTE: Inicializar como null para coincidir con el template
  filtroSalaId: number | null = null;
  filtroEstado: string = 'todos';
  filtroTipo: string = 'todos';
  filtroBusqueda: string = '';

  tiposAsiento = ['normal', 'premium', 'vip', 'discapacitado'];
  estadosAsiento: ('disponible' | 'ocupado' | 'mantenimiento')[] = ['disponible', 'ocupado', 'mantenimiento'];
  filasDisponibles = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Estadísticas
  totalAsientos: number = 0;
  asientosDisponibles: number = 0;
  asientosOcupados: number = 0;
  asientosMantenimiento: number = 0;

  nuevoAsiento: Omit<Asiento, 'asiento_id'> = {
    sala_id: 0,
    fila: 'A',
    numero: 1,
    tipo_asiento: 'normal',
    estado_asiento: 'disponible'
  };

  constructor(
    private asientosService: AsientosService,
    private salasService: SalasService
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  cargarDatos() {
    this.cargando = true;
    
    // Cargar salas para el select
    this.subscriptions.add(
      this.salasService.getListaSalas().subscribe({
        next: (salas) => {
          this.salas = salas;
          this.suscribirAAsientos();
        },
        error: (error) => {
          console.error('Error al cargar salas:', error);
          this.cargando = false;
          alert('Error al cargar las salas: ' + error.message);
        }
      })
    );
  }

  suscribirAAsientos() {
    // Suscribirse al BehaviorSubject del servicio para updates en tiempo real
    this.subscriptions.add(
      this.asientosService.asientos$.subscribe({
        next: (asientos) => {
          // Cuando recibimos asientos básicos, cargamos la info completa con sala
          this.cargarAsientosCompletos();
        },
        error: (error) => {
          console.error('Error en suscripción a asientos:', error);
        }
      })
    );
  }

  cargarAsientosCompletos() {
    this.subscriptions.add(
      this.asientosService.getAsientosConSala().subscribe({
        next: (asientos) => {
          this.asientos = asientos;
          this.calcularEstadisticas();
          this.aplicarFiltros();
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al cargar asientos completos:', error);
          this.cargando = false;
          // Si falla, intentamos cargar solo los asientos básicos
          this.cargarAsientosBasicos();
        }
      })
    );
  }

  cargarAsientosBasicos() {
    this.subscriptions.add(
      this.asientosService.getListaAsientos().subscribe({
        next: (asientos) => {
          // Convertir Asiento[] a AsientoConSala[] básico
          this.asientos = asientos.map(asiento => ({
            ...asiento,
            sala_nombre: 'Cargando...',
            sala_tipo: ''
          }));
          this.calcularEstadisticas();
          this.aplicarFiltros();
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al cargar asientos básicos:', error);
          this.cargando = false;
          alert('Error al cargar los asientos: ' + error.message);
        }
      })
    );
  }

  calcularEstadisticas() {
    this.totalAsientos = this.asientos.length;
    this.asientosDisponibles = this.asientos.filter(a => a.estado_asiento === 'disponible').length;
    this.asientosOcupados = this.asientos.filter(a => a.estado_asiento === 'ocupado').length;
    this.asientosMantenimiento = this.asientos.filter(a => a.estado_asiento === 'mantenimiento').length;
  }

  aplicarFiltros() {
    console.log('Aplicando filtros:', {
      filtroSalaId: this.filtroSalaId,
      filtroEstado: this.filtroEstado,
      filtroTipo: this.filtroTipo,
      filtroBusqueda: this.filtroBusqueda
    });

    this.asientosFiltrados = this.asientos.filter(asiento => {
      // Filtro por sala - IMPORTANTE: comparar correctamente
      const coincideSala = this.filtroSalaId !== null ? asiento.sala_id === this.filtroSalaId : true;
      
      // Filtro por estado
      const coincideEstado = this.filtroEstado !== 'todos' ? asiento.estado_asiento === this.filtroEstado : true;
      
      // Filtro por tipo
      const coincideTipo = this.filtroTipo !== 'todos' ? asiento.tipo_asiento === this.filtroTipo : true;
      
      // Filtro por búsqueda
      const coincideBusqueda = this.filtroBusqueda ? 
        asiento.fila.toLowerCase().includes(this.filtroBusqueda.toLowerCase()) ||
        asiento.tipo_asiento.toLowerCase().includes(this.filtroBusqueda.toLowerCase()) ||
        asiento.estado_asiento.toLowerCase().includes(this.filtroBusqueda.toLowerCase()) ||
        asiento.numero.toString().includes(this.filtroBusqueda) ||
        (asiento.sala_nombre && asiento.sala_nombre.toLowerCase().includes(this.filtroBusqueda.toLowerCase()))
        : true;
      
      const resultado = coincideSala && coincideEstado && coincideTipo && coincideBusqueda;
      
      if (resultado && this.filtroSalaId !== null) {
        console.log('Asiento coincide con filtro de sala:', asiento);
      }
      
      return resultado;
    });

    console.log('Asientos filtrados:', this.asientosFiltrados.length);
  }

  onFiltroChange() {
    console.log('Filtro cambiado - Sala ID:', this.filtroSalaId);
    this.aplicarFiltros();
  }

  // Métodos auxiliares
  getColorTipo(tipo: string): string {
    const colores: { [key: string]: string } = {
      'normal': 'bg-gray-100 text-gray-800',
      'premium': 'bg-green-100 text-green-800',
      'vip': 'bg-yellow-100 text-yellow-800',
      'discapacitado': 'bg-blue-100 text-blue-800'
    };
    return colores[tipo] || 'bg-gray-100 text-gray-800';
  }

  getColorEstado(estado: string): string {
    const colores: { [key: string]: string } = {
      'disponible': 'bg-green-100 text-green-800',
      'ocupado': 'bg-red-100 text-red-800',
      'mantenimiento': 'bg-orange-100 text-orange-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  }

  // CRUD Operations
  abrirModal(asiento?: Asiento) {
    if (asiento) {
      this.asientoEditando = { ...asiento };
      this.nuevoAsiento = {
        sala_id: asiento.sala_id,
        fila: asiento.fila,
        numero: asiento.numero,
        tipo_asiento: asiento.tipo_asiento,
        estado_asiento: asiento.estado_asiento
      };
    } else {
      this.asientoEditando = null;
      this.nuevoAsiento = {
        sala_id: this.salas[0]?.sala_id || 0,
        fila: 'A',
        numero: 1,
        tipo_asiento: 'normal',
        estado_asiento: 'disponible'
      };
    }
    this.mostrarModal = true;
    this.guardando = false;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.asientoEditando = null;
    this.guardando = false;
    this.nuevoAsiento = {
      sala_id: 0,
      fila: 'A',
      numero: 1,
      tipo_asiento: 'normal',
      estado_asiento: 'disponible'
    };
  }

  guardarAsiento() {
    if (!this.validarAsiento()) {
      alert('Por favor, completa todos los campos requeridos');
      return;
    }

    this.guardando = true;

    if (this.asientoEditando) {
      // Actualizar asiento existente
      this.subscriptions.add(
        this.asientosService.updateAsiento(this.asientoEditando.asiento_id, this.nuevoAsiento).subscribe({
          next: (asientoActualizado) => {
            console.log('Asiento actualizado:', asientoActualizado);
            this.cerrarModal();
          },
          error: (error) => {
            console.error('Error al actualizar asiento:', error);
            alert('Error al actualizar el asiento: ' + error.message);
            this.guardando = false;
          }
        })
      );
    } else {
      // Crear nuevo asiento
      this.subscriptions.add(
        this.asientosService.createAsiento(this.nuevoAsiento).subscribe({
          next: (nuevoAsiento) => {
            console.log('Asiento creado:', nuevoAsiento);
            this.cerrarModal();
          },
          error: (error) => {
            console.error('Error al crear asiento:', error);
            alert('Error al crear el asiento: ' + error.message);
            this.guardando = false;
          }
        })
      );
    }
  }

  validarAsiento(): boolean {
    return !!(this.nuevoAsiento.sala_id && 
              this.nuevoAsiento.fila && 
              this.nuevoAsiento.numero > 0);
  }

  eliminarAsiento(id: number) {
    if (confirm('¿Estás seguro de que quieres eliminar este asiento? Esta acción no se puede deshacer.')) {
      this.subscriptions.add(
        this.asientosService.deleteAsiento(id).subscribe({
          next: () => {
            console.log('Asiento eliminado correctamente');
          },
          error: (error) => {
            console.error('Error al eliminar asiento:', error);
            alert('Error al eliminar el asiento: ' + error.message);
          }
        })
      );
    }
  }

  cambiarEstadoAsiento(asiento: Asiento, nuevoEstado: 'disponible' | 'ocupado' | 'mantenimiento') {
    const estadoOriginal = asiento.estado_asiento;
    
    // Optimistic update
    asiento.estado_asiento = nuevoEstado;
    this.calcularEstadisticas(); // Actualizar estadísticas inmediatamente
    
    this.subscriptions.add(
      this.asientosService.cambiarEstadoAsiento(asiento.asiento_id, nuevoEstado).subscribe({
        next: (asientoActualizado) => {
          console.log('Estado de asiento actualizado:', asientoActualizado);
        },
        error: (error) => {
          console.error('Error al cambiar estado del asiento:', error);
          // Revertir el cambio si hay error
          asiento.estado_asiento = estadoOriginal;
          this.calcularEstadisticas(); // Revertir estadísticas
          alert('Error al cambiar el estado del asiento: ' + error.message);
        }
      })
    );
  }

  // Generar números para el select de número de asiento
  getNumerosAsiento(): number[] {
    return Array.from({ length: 30 }, (_, i) => i + 1);
  }

  // Limpiar filtros
  limpiarFiltros() {
    this.filtroSalaId = null;
    this.filtroEstado = 'todos';
    this.filtroTipo = 'todos';
    this.filtroBusqueda = '';
    this.aplicarFiltros();
  }

  // Método para debug
  debugFiltroSala() {
    console.log('Debug filtro sala:');
    console.log('filtroSalaId:', this.filtroSalaId, 'tipo:', typeof this.filtroSalaId);
    console.log('Salas disponibles:', this.salas.map(s => ({ id: s.sala_id, nombre: s.nombre })));
    console.log('Asientos:', this.asientos.map(a => ({ id: a.asiento_id, sala_id: a.sala_id })));
  }
}