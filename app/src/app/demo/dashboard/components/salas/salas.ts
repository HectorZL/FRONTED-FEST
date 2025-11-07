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
  x: number;
  y: number;
}

interface Sala {
  id: number;
  nombre: string;
  capacidadTotal: number;
  tipo: '2D' | '3D' | 'IMAX' | '4DX';
  asientos: Asiento[];
  estado: boolean;
}

@Component({
  selector: 'app-salas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './salas.html'
})
export class Salas {
  mostrarModal = false;
  salaEditando: Sala | null = null;

  salas: Sala[] = [
    {
      id: 1,
      nombre: 'Sala Premier 1',
      capacidadTotal: 120,
      tipo: '3D',
      estado: true,
      asientos: this.generarAsientos(1, 10, 12)
    },
    {
      id: 2,
      nombre: 'Sala IMAX',
      capacidadTotal: 200,
      tipo: 'IMAX',
      estado: true,
      asientos: this.generarAsientos(2, 12, 18)
    },
    {
      id: 3,
      nombre: 'Sala 4DX',
      capacidadTotal: 80,
      tipo: '4DX',
      estado: false,
      asientos: this.generarAsientos(3, 8, 10)
    }
  ];

  tiposSala = ['2D', '3D', 'IMAX', '4DX'];
  tiposAsiento = ['normal', 'premium', 'vip', 'discapacitado'];

  nuevaSala: Omit<Sala, 'id' | 'asientos'> = {
    nombre: '',
    capacidadTotal: 0,
    tipo: '2D',
    estado: true
  };

  generarAsientos(salaId: number, filas: number, asientosPorFila: number): Asiento[] {
    const asientos: Asiento[] = [];
    const filasLetras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let idCounter = 1;

    for (let i = 0; i < filas; i++) {
      for (let j = 1; j <= asientosPorFila; j++) {
        let tipo: Asiento['tipo'] = 'normal';
        if (i === 0) tipo = 'vip';
        else if (i === 1) tipo = 'premium';
        else if (j === 1 || j === asientosPorFila) tipo = 'discapacitado';

        asientos.push({
          id: idCounter++,
          salaId: salaId,
          fila: filasLetras[i],
          numero: j,
          tipo: tipo,
          estado: 'disponible',
          x: j * 40,
          y: i * 50 + 50
        });
      }
    }
    return asientos;
  }

  // Métodos auxiliares para la template
  getAsientosMantenimiento(sala: Sala): number {
    return sala.asientos.filter(a => a.estado === 'mantenimiento').length;
  }

  getMaxAsientosPorFila(sala: Sala): number {
    return Math.max(...sala.asientos.map(a => a.numero));
  }

  getAsientosDisponibles(sala: Sala): number {
    return sala.capacidadTotal - this.getAsientosOcupados(sala);
  }

  abrirModal(sala?: Sala) {
    if (sala) {
      this.salaEditando = { ...sala };
      this.nuevaSala = {
        nombre: sala.nombre,
        capacidadTotal: sala.capacidadTotal,
        tipo: sala.tipo,
        estado: sala.estado
      };
    } else {
      this.salaEditando = null;
      this.nuevaSala = {
        nombre: '',
        capacidadTotal: 0,
        tipo: '2D',
        estado: true
      };
    }
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.salaEditando = null;
  }

  guardarSala() {
    if (this.salaEditando) {
      const index = this.salas.findIndex(s => s.id === this.salaEditando!.id);
      if (index !== -1) {
        this.salas[index] = {
          ...this.salas[index],
          ...this.nuevaSala
        };
      }
    } else {
      const nuevaSalaCompleta: Sala = {
        id: Math.max(...this.salas.map(s => s.id)) + 1,
        ...this.nuevaSala,
        asientos: this.generarAsientos(0, 8, 10)
      };
      this.salas.push(nuevaSalaCompleta);
    }
    this.cerrarModal();
  }

  toggleEstadoSala(sala: Sala) {
    sala.estado = !sala.estado;
  }

  eliminarSala(id: number) {
    this.salas = this.salas.filter(s => s.id !== id);
  }

  getColorTipo(tipo: string): string {
    const colores: { [key: string]: string } = {
      '2D': 'bg-blue-100 text-blue-800',
      '3D': 'bg-purple-100 text-purple-800',
      'IMAX': 'bg-orange-100 text-orange-800',
      '4DX': 'bg-red-100 text-red-800'
    };
    return colores[tipo] || 'bg-gray-100 text-gray-800';
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

  getAsientosOcupados(sala: Sala): number {
    return sala.asientos.filter(a => a.estado === 'ocupado').length;
  }

  // Agrega estos métodos a la clase SalasComponent:

getFilasUnicas(sala: Sala): string[] {
  const filas = [...new Set(sala.asientos.map(asiento => asiento.fila))];
  return filas.sort();
}

getAsientosPorFila(sala: Sala, fila: string): Asiento[] {
  return sala.asientos
    .filter(asiento => asiento.fila === fila)
    .sort((a, b) => a.numero - b.numero);
}
}