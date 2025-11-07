import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Asiento {
  id: number;
  salaId: number;
  fila: string;
  numero: number;
  tipo: 'normal' | 'premium' | 'vip' | 'discapacitado';
  estado: 'disponible' | 'ocupado' | 'mantenimiento';
}

interface Sala {
  id: number;
  nombre: string;
  capacidadTotal: number;
  tipo: string;
  estado: boolean;
}

@Component({
  selector: 'app-asientos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asientos.html'
})
export class Asientos {
  mostrarModal = false;
  asientoEditando: Asiento | null = null;

  // Datos de ejemplo
  salas: Sala[] = [
    { id: 1, nombre: 'Sala Premier 1', capacidadTotal: 120, tipo: '3D', estado: true },
    { id: 2, nombre: 'Sala IMAX', capacidadTotal: 200, tipo: 'IMAX', estado: true },
    { id: 3, nombre: 'Sala 4DX', capacidadTotal: 80, tipo: '4DX', estado: false }
  ];

  asientos: Asiento[] = [
    { id: 1, salaId: 1, fila: 'A', numero: 1, tipo: 'vip', estado: 'disponible' },
    { id: 2, salaId: 1, fila: 'A', numero: 2, tipo: 'vip', estado: 'disponible' },
    { id: 3, salaId: 1, fila: 'B', numero: 1, tipo: 'premium', estado: 'ocupado' },
    { id: 4, salaId: 1, fila: 'B', numero: 2, tipo: 'premium', estado: 'mantenimiento' },
    { id: 5, salaId: 2, fila: 'A', numero: 1, tipo: 'normal', estado: 'disponible' },
    { id: 6, salaId: 2, fila: 'A', numero: 2, tipo: 'discapacitado', estado: 'disponible' },
    { id: 7, salaId: 3, fila: 'A', numero: 1, tipo: 'vip', estado: 'ocupado' }
  ];

  tiposAsiento = ['normal', 'premium', 'vip', 'discapacitado'];
  estadosAsiento: ('disponible' | 'ocupado' | 'mantenimiento')[] = ['disponible', 'ocupado', 'mantenimiento'];
  filasDisponibles = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  nuevoAsiento: Omit<Asiento, 'id'> = {
    salaId: 0,
    fila: 'A',
    numero: 1,
    tipo: 'normal',
    estado: 'disponible'
  };

  salaSeleccionada: number = 0;
  filtroBusqueda: string = '';

  // Métodos auxiliares
  getAsientosFiltrados() {
    let asientosFiltrados = this.asientos;

    if (this.salaSeleccionada) {
      asientosFiltrados = asientosFiltrados.filter(a => a.salaId === this.salaSeleccionada);
    }

    if (this.filtroBusqueda) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      asientosFiltrados = asientosFiltrados.filter(a =>
        a.fila.toLowerCase().includes(busqueda) ||
        a.tipo.toLowerCase().includes(busqueda) ||
        a.estado.toLowerCase().includes(busqueda) ||
        a.numero.toString().includes(busqueda)
      );
    }

    return asientosFiltrados;
  }

  getNombreSala(salaId: number): string {
    const sala = this.salas.find(s => s.id === salaId);
    return sala ? sala.nombre : 'Sala no encontrada';
  }

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
        salaId: asiento.salaId,
        fila: asiento.fila,
        numero: asiento.numero,
        tipo: asiento.tipo,
        estado: asiento.estado
      };
    } else {
      this.asientoEditando = null;
      this.nuevoAsiento = {
        salaId: this.salaSeleccionada || this.salas[0]?.id || 0,
        fila: 'A',
        numero: 1,
        tipo: 'normal',
        estado: 'disponible'
      };
    }
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.asientoEditando = null;
  }

  guardarAsiento() {
    if (this.validarAsiento()) {
      if (this.asientoEditando) {
        // Editar asiento existente
        const index = this.asientos.findIndex(a => a.id === this.asientoEditando!.id);
        if (index !== -1) {
          this.asientos[index] = {
            ...this.asientoEditando,
            ...this.nuevoAsiento
          };
        }
      } else {
        // Crear nuevo asiento
        const nuevoAsientoCompleto: Asiento = {
          id: Math.max(...this.asientos.map(a => a.id), 0) + 1,
          ...this.nuevoAsiento
        };
        this.asientos.push(nuevoAsientoCompleto);
      }
      this.cerrarModal();
    }
  }

  validarAsiento(): boolean {
    return !!(this.nuevoAsiento.salaId && 
              this.nuevoAsiento.fila && 
              this.nuevoAsiento.numero > 0);
  }

  eliminarAsiento(id: number) {
    this.asientos = this.asientos.filter(a => a.id !== id);
  }

  cambiarEstadoAsiento(asiento: Asiento, nuevoEstado: 'disponible' | 'ocupado' | 'mantenimiento') {
    asiento.estado = nuevoEstado;
  }

  // Generar números para el select de número de asiento
  getNumerosAsiento(): number[] {
    return Array.from({ length: 30 }, (_, i) => i + 1);
  }
}