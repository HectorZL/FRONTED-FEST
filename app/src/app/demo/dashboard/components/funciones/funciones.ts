import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Funcion {
  id: number;
  peliculaId: number;
  salaId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  precioBase: number;
  estado: 'activa' | 'cancelada' | 'completa';
}

interface Pelicula {
  id: number;
  titulo: string;
  duracion: number;
  clasificacion: string;
  estado: boolean;
}

interface Sala {
  id: number;
  nombre: string;
  tipo: string;
  estado: boolean;
}

@Component({
  selector: 'app-funciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './funciones.html'
})
export class Funciones {
  mostrarModal = false;
  funcionEditando: Funcion | null = null;

  // Datos de ejemplo
  peliculas: Pelicula[] = [
    { id: 1, titulo: 'El Origen', duracion: 148, clasificacion: 'PG-13', estado: true },
    { id: 2, titulo: 'El Padrino', duracion: 175, clasificacion: 'R', estado: true },
    { id: 3, titulo: 'Interestelar', duracion: 169, clasificacion: 'PG-13', estado: true },
    { id: 4, titulo: 'El Señor de los Anillos', duracion: 178, clasificacion: 'PG-13', estado: false }
  ];

  salas: Sala[] = [
    { id: 1, nombre: 'Sala Premier 1', tipo: '3D', estado: true },
    { id: 2, nombre: 'Sala IMAX', tipo: 'IMAX', estado: true },
    { id: 3, nombre: 'Sala 4DX', tipo: '4DX', estado: false },
    { id: 4, nombre: 'Sala Standard 1', tipo: '2D', estado: true }
  ];

  funciones: Funcion[] = [
    { id: 1, peliculaId: 1, salaId: 1, fecha: '2024-01-15', horaInicio: '14:00', horaFin: '16:28', precioBase: 8.50, estado: 'activa' },
    { id: 2, peliculaId: 2, salaId: 2, fecha: '2024-01-15', horaInicio: '17:00', horaFin: '19:55', precioBase: 12.00, estado: 'activa' },
    { id: 3, peliculaId: 3, salaId: 1, fecha: '2024-01-15', horaInicio: '20:30', horaFin: '23:19', precioBase: 9.00, estado: 'completa' },
    { id: 4, peliculaId: 1, salaId: 3, fecha: '2024-01-16', horaInicio: '15:00', horaFin: '17:28', precioBase: 15.00, estado: 'cancelada' }
  ];

  estadosFuncion: ('activa' | 'cancelada' | 'completa')[] = ['activa', 'cancelada', 'completa'];
  
  nuevaFuncion: Omit<Funcion, 'id'> = {
    peliculaId: 0,
    salaId: 0,
    fecha: this.getFechaHoy(),
    horaInicio: '14:00',
    horaFin: '16:00',
    precioBase: 8.00,
    estado: 'activa'
  };

  filtroFecha: string = '';
  filtroSala: number = 0;
  filtroEstado: string = '';

  // MÉTODOS NUEVOS PARA FILTRAR
  getSalasActivas(): Sala[] {
    return this.salas.filter(sala => sala.estado);
  }

  getPeliculasActivas(): Pelicula[] {
    return this.peliculas.filter(pelicula => pelicula.estado);
  }

  // Resto de los métodos existentes...
  getFuncionesFiltradas() {
    let funcionesFiltradas = this.funciones;

    if (this.filtroFecha) {
      funcionesFiltradas = funcionesFiltradas.filter(f => f.fecha === this.filtroFecha);
    }

    if (this.filtroSala) {
      funcionesFiltradas = funcionesFiltradas.filter(f => f.salaId === this.filtroSala);
    }

    if (this.filtroEstado) {
      funcionesFiltradas = funcionesFiltradas.filter(f => f.estado === this.filtroEstado);
    }

    return funcionesFiltradas;
  }

  getNombrePelicula(peliculaId: number): string {
    const pelicula = this.peliculas.find(p => p.id === peliculaId);
    return pelicula ? pelicula.titulo : 'Película no encontrada';
  }

  getNombreSala(salaId: number): string {
    const sala = this.salas.find(s => s.id === salaId);
    return sala ? sala.nombre : 'Sala no encontrada';
  }

  getDuracionPelicula(peliculaId: number): number {
    const pelicula = this.peliculas.find(p => p.id === peliculaId);
    return pelicula ? pelicula.duracion : 0;
  }

  getColorEstado(estado: string): string {
    const colores: { [key: string]: string } = {
      'activa': 'bg-green-100 text-green-800',
      'cancelada': 'bg-red-100 text-red-800',
      'completa': 'bg-blue-100 text-blue-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  }

  getFechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  calcularHoraFin(): void {
    if (this.nuevaFuncion.peliculaId && this.nuevaFuncion.horaInicio) {
      const duracion = this.getDuracionPelicula(this.nuevaFuncion.peliculaId);
      const [horas, minutos] = this.nuevaFuncion.horaInicio.split(':').map(Number);
      
      let totalMinutos = horas * 60 + minutos + duracion;
      let nuevasHoras = Math.floor(totalMinutos / 60);
      let nuevosMinutos = totalMinutos % 60;
      
      if (nuevasHoras >= 24) {
        nuevasHoras -= 24;
      }
      
      this.nuevaFuncion.horaFin = 
        `${nuevasHoras.toString().padStart(2, '0')}:${nuevosMinutos.toString().padStart(2, '0')}`;
    }
  }

  abrirModal(funcion?: Funcion) {
    if (funcion) {
      this.funcionEditando = { ...funcion };
      this.nuevaFuncion = {
        peliculaId: funcion.peliculaId,
        salaId: funcion.salaId,
        fecha: funcion.fecha,
        horaInicio: funcion.horaInicio,
        horaFin: funcion.horaFin,
        precioBase: funcion.precioBase,
        estado: funcion.estado
      };
    } else {
      this.funcionEditando = null;
      this.nuevaFuncion = {
        peliculaId: 0,
        salaId: 0,
        fecha: this.getFechaHoy(),
        horaInicio: '14:00',
        horaFin: '16:00',
        precioBase: 8.00,
        estado: 'activa'
      };
    }
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.funcionEditando = null;
  }

  guardarFuncion() {
    if (this.validarFuncion()) {
      if (this.funcionEditando) {
        const index = this.funciones.findIndex(f => f.id === this.funcionEditando!.id);
        if (index !== -1) {
          this.funciones[index] = {
            ...this.funcionEditando,
            ...this.nuevaFuncion
          };
        }
      } else {
        const nuevaFuncionCompleta: Funcion = {
          id: Math.max(...this.funciones.map(f => f.id), 0) + 1,
          ...this.nuevaFuncion
        };
        this.funciones.push(nuevaFuncionCompleta);
      }
      this.cerrarModal();
    }
  }

  validarFuncion(): boolean {
    return !!(this.nuevaFuncion.peliculaId && 
              this.nuevaFuncion.salaId && 
              this.nuevaFuncion.fecha && 
              this.nuevaFuncion.horaInicio && 
              this.nuevaFuncion.horaFin && 
              this.nuevaFuncion.precioBase > 0);
  }

  eliminarFuncion(id: number) {
    this.funciones = this.funciones.filter(f => f.id !== id);
  }

  cambiarEstadoFuncion(funcion: Funcion, nuevoEstado: 'activa' | 'cancelada' | 'completa') {
    funcion.estado = nuevoEstado;
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
    if (!this.nuevaFuncion.salaId || !this.nuevaFuncion.fecha || !this.nuevaFuncion.horaInicio || !this.nuevaFuncion.horaFin) {
      return false;
    }

    const funcionEditId = this.funcionEditando?.id;
    const funcionesMismaSala = this.funciones.filter(f => 
      f.salaId === this.nuevaFuncion.salaId && 
      f.fecha === this.nuevaFuncion.fecha &&
      f.id !== funcionEditId
    );

    const inicioNueva = new Date(`${this.nuevaFuncion.fecha}T${this.nuevaFuncion.horaInicio}`);
    const finNueva = new Date(`${this.nuevaFuncion.fecha}T${this.nuevaFuncion.horaFin}`);

    return funcionesMismaSala.some(funcion => {
      const inicioExistente = new Date(`${funcion.fecha}T${funcion.horaInicio}`);
      const finExistente = new Date(`${funcion.fecha}T${funcion.horaFin}`);

      return (inicioNueva < finExistente && finNueva > inicioExistente);
    });
  }
}