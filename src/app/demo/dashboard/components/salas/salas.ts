import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SalasService, Sala, Asiento, EstadisticasSala } from '../../../services/salas.service';

@Component({
  selector: 'app-salas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './salas.html'
})
export class Salas implements OnInit, OnDestroy {
  mostrarModal = false;
  salaEditando: Sala | null = null;
  cargando = false;
  guardando = false;
  private subscriptions: Subscription = new Subscription();

  salas: (Sala & { estadisticas?: EstadisticasSala })[] = [];
  estadisticas: EstadisticasSala[] = [];
  asientosPorSala: Map<number, Asiento[]> = new Map();

  tiposSala = ['2D', '3D', 'IMAX', '4DX'];

  nuevaSala: Omit<Sala, 'sala_id'> = {
    nombre: '',
    capacidad_total: 0,
    tipo_sala: '2D',
    estado: true
  };

  constructor(private salasService: SalasService) {}

  ngOnInit() {
    this.cargarDatos();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  cargarDatos() {
    this.cargando = true;
    // Suscribirse al BehaviorSubject del servicio
    this.subscriptions.add(
      this.salasService.salas$.subscribe({
        next: (salas) => {
          this.salas = salas;
          this.cargarEstadisticas();
          this.cargarAsientos();
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al cargar salas:', error);
          this.cargando = false;
          alert('Error al cargar las salas: ' + error.message);
        }
      })
    );
  }

  cargarEstadisticas() {
    this.subscriptions.add(
      this.salasService.getEstadisticasSalas().subscribe({
        next: (estadisticas) => {
          this.estadisticas = estadisticas;
          // Combinar estadísticas con salas
          this.salas = this.salas.map(sala => ({
            ...sala,
            estadisticas: estadisticas.find(est => est.sala_id === sala.sala_id)
          }));
        },
        error: (error) => {
          console.error('Error al cargar estadísticas:', error);
        }
      })
    );
  }

  cargarAsientos() {
    // Limpiar asientos anteriores
    this.asientosPorSala.clear();
    
    this.salas.forEach(sala => {
      this.subscriptions.add(
        this.salasService.getAsientosDisponiblesPorSala(sala.sala_id).subscribe({
          next: (asientos) => {
            this.asientosPorSala.set(sala.sala_id, asientos);
          },
          error: (error) => {
            console.error(`Error al cargar asientos para sala ${sala.sala_id}:`, error);
          }
        })
      );
    });
  }

  // Métodos auxiliares para la template
  getAsientosMantenimiento(sala: any): number {
    return sala.estadisticas?.mantenimiento || 0;
  }

  getAsientosDisponibles(sala: any): number {
    return sala.estadisticas?.disponibles || 0;
  }

  getAsientosOcupados(sala: any): number {
    return sala.estadisticas?.ocupados || 0;
  }

  getAsientosSala(salaId: number): Asiento[] {
    return this.asientosPorSala.get(salaId) || [];
  }

  abrirModal(sala?: Sala) {
    if (sala) {
      this.salaEditando = { ...sala };
      this.nuevaSala = {
        nombre: sala.nombre,
        capacidad_total: sala.capacidad_total,
        tipo_sala: sala.tipo_sala || '2D',
        estado: sala.estado
      };
    } else {
      this.salaEditando = null;
      this.nuevaSala = {
        nombre: '',
        capacidad_total: 0,
        tipo_sala: '2D',
        estado: true
      };
    }
    this.mostrarModal = true;
    this.guardando = false;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.salaEditando = null;
    this.guardando = false;
    // Resetear el formulario
    this.nuevaSala = {
      nombre: '',
      capacidad_total: 0,
      tipo_sala: '2D',
      estado: true
    };
  }

  guardarSala() {
    if (!this.nuevaSala.nombre || !this.nuevaSala.capacidad_total) {
      alert('Por favor, completa todos los campos requeridos');
      return;
    }

    this.guardando = true;

    if (this.salaEditando) {
      // Actualizar sala existente
      this.subscriptions.add(
        this.salasService.updateSala(this.salaEditando.sala_id, this.nuevaSala).subscribe({
          next: (salaActualizada) => {
            console.log('Sala actualizada:', salaActualizada);
            this.cerrarModal();
            // No necesitamos recargar porque el BehaviorSubject se actualiza automáticamente
          },
          error: (error) => {
            console.error('Error al actualizar sala:', error);
            alert('Error al actualizar la sala: ' + error.message);
            this.guardando = false;
          }
        })
      );
    } else {
      // Crear nueva sala
      this.subscriptions.add(
        this.salasService.createSala(this.nuevaSala).subscribe({
          next: (nuevaSala) => {
            console.log('Sala creada:', nuevaSala);
            this.cerrarModal();
            // No necesitamos recargar porque el BehaviorSubject se actualiza automáticamente
          },
          error: (error) => {
            console.error('Error al crear sala:', error);
            alert('Error al crear la sala: ' + error.message);
            this.guardando = false;
          }
        })
      );
    }
  }

  toggleEstadoSala(sala: Sala) {
    const nuevoEstado = !sala.estado;
    const estadoOriginal = sala.estado;
    
    // Optimistic update
    sala.estado = nuevoEstado;
    
    this.subscriptions.add(
      this.salasService.updateSala(sala.sala_id, { estado: nuevoEstado }).subscribe({
        next: (salaActualizada) => {
          console.log('Estado de sala actualizado:', salaActualizada);
        },
        error: (error) => {
          console.error('Error al cambiar estado:', error);
          // Revertir el cambio si hay error
          sala.estado = estadoOriginal;
          alert('Error al cambiar el estado de la sala: ' + error.message);
        }
      })
    );
  }

  eliminarSala(salaId: number) {
    if (confirm('¿Estás seguro de que quieres eliminar esta sala? Esta acción no se puede deshacer.')) {
      this.subscriptions.add(
        this.salasService.deleteSala(salaId).subscribe({
          next: () => {
            console.log('Sala eliminada correctamente');
            // El BehaviorSubject se actualizará automáticamente por el realtime
          },
          error: (error) => {
            console.error('Error al eliminar sala:', error);
            alert('Error al eliminar la sala: ' + error.message);
          }
        })
      );
    }
  }

  getColorTipo(tipo: string | undefined): string {
    const colores: { [key: string]: string } = {
      '2D': 'bg-blue-100 text-blue-800',
      '3D': 'bg-purple-100 text-purple-800',
      'IMAX': 'bg-orange-100 text-orange-800',
      '4DX': 'bg-red-100 text-red-800'
    };
    return colores[tipo || '2D'] || 'bg-gray-100 text-gray-800';
  }

  getColorAsiento(tipo: string): string {
    const colores: { [key: string]: string } = {
      'normal': 'bg-gray-400',
      'premium': 'bg-green-500',
      'vip': 'bg-yellow-500',
      'discapacitado': 'bg-blue-500'
    };
    return colores[tipo] || 'bg-gray-400';
  }

  getFilasUnicas(salaId: number): string[] {
    const asientos = this.getAsientosSala(salaId);
    const filas = [...new Set(asientos.map(asiento => asiento.fila))];
    return filas.sort();
  }

  getAsientosPorFila(salaId: number, fila: string): Asiento[] {
    const asientos = this.getAsientosSala(salaId);
    return asientos
      .filter(asiento => asiento.fila === fila)
      .sort((a, b) => a.numero - b.numero);
  }

  cambiarEstadoAsiento(asiento: Asiento, nuevoEstado: 'disponible' | 'ocupado' | 'mantenimiento') {
    const estadoOriginal = asiento.estado_asiento;
    
    // Optimistic update
    asiento.estado_asiento = nuevoEstado;
    
    this.subscriptions.add(
      this.salasService.cambiarEstadoAsiento(asiento.asiento_id, nuevoEstado).subscribe({
        next: (asientoActualizado) => {
          console.log('Estado de asiento actualizado:', asientoActualizado);
          // Actualizar localmente
          const asientos = this.asientosPorSala.get(asiento.sala_id) || [];
          const index = asientos.findIndex(a => a.asiento_id === asiento.asiento_id);
          if (index !== -1) {
            asientos[index] = asientoActualizado;
            this.asientosPorSala.set(asiento.sala_id, asientos);
          }
          this.cargarEstadisticas(); // Recargar estadísticas
        },
        error: (error) => {
          console.error('Error al cambiar estado del asiento:', error);
          // Revertir el cambio si hay error
          asiento.estado_asiento = estadoOriginal;
          alert('Error al cambiar el estado del asiento: ' + error.message);
        }
      })
    );
  }
}