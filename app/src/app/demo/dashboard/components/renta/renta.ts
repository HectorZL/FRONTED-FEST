import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Sala {
  sala_id: number;
  nombre: string;
  capacidad_total: number;
  tipo_sala: string;
  disponibilidad: DisponibilidadSala[];
  precio_hora: number;
  equipamiento: string[];
  descripcion?: string;
}

interface DisponibilidadSala {
  fecha: Date;
  horarios: Horario[];
}

interface Horario {
  hora: string;
  disponible: boolean;
  reservado_por?: string;
}

interface FiltrosSala {
  fecha: Date | null;
  capacidad_minima: number | null;
  tipo_sala: string;
  hora_inicio: string;
  hora_fin: string;
  precio_maximo: number | null;
}

@Component({
  selector: 'app-renta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './renta.html'
})
export class RentaSalasComponent implements OnInit {
  salas: Sala[] = [];
  salasFiltradas: Sala[] = [];
  salaSeleccionada: Sala | null = null;
  isModalReservaOpen = false;
  isLoading = true;
  fechaSeleccionada: Date = new Date();

  filtros: FiltrosSala = {
    fecha: new Date(),
    capacidad_minima: null,
    tipo_sala: 'todas',
    hora_inicio: '09:00',
    hora_fin: '22:00',
    precio_maximo: null
  };

  tiposSala = [
    { value: 'todas', label: 'Todas las salas' },
    { value: 'standard', label: 'Standard' },
    { value: 'premium', label: 'Premium' },
    { value: 'vip', label: 'VIP' },
    { value: 'imax', label: 'IMAX' },
    { value: '4dx', label: '4DX' }
  ];

  horariosDisponibles = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', 
    '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  datosReserva = {
    nombre: '',
    email: '',
    telefono: '',
    fecha: new Date(),
    hora_inicio: '',
    hora_fin: '',
    duracion: 2,
    personas: 1
  };

  ngOnInit(): void {
    this.cargarSalasMock();
  }

  // Format date as YYYY-MM-DD for the date input
  getFormattedDate(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  // Handle date change from the date input
  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.datosReserva.fecha = input.valueAsDate || new Date();
  }

  private cargarSalasMock(): void {
    setTimeout(() => {
      this.salas = [
        {
          sala_id: 1,
          nombre: 'Sala Premier 1',
          capacidad_total: 120,
          tipo_sala: 'premium',
          precio_hora: 2500,
          descripcion: 'Sala premium con sonido Dolby Atmos y butacas reclinables',
          equipamiento: ['Dolby Atmos', 'Butacas Reclinables', 'Proyector 4K', 'Sistema de climatización'],
          disponibilidad: this.generarDisponibilidad()
        },
        {
          sala_id: 2,
          nombre: 'Sala Standard A',
          capacidad_total: 80,
          tipo_sala: 'standard',
          precio_hora: 1500,
          descripcion: 'Sala estándar ideal para proyecciones regulares',
          equipamiento: ['Sonido Surround', 'Proyector HD', 'Pantalla grande'],
          disponibilidad: this.generarDisponibilidad()
        },
        {
          sala_id: 3,
          nombre: 'Sala IMAX Experience',
          capacidad_total: 200,
          tipo_sala: 'imax',
          precio_hora: 4000,
          descripcion: 'Sala IMAX con pantalla gigante y sistema de sonido avanzado',
          equipamiento: ['Pantalla IMAX', 'Sonido IMAX', 'Butacas Especiales', 'Sistema 3D'],
          disponibilidad: this.generarDisponibilidad()
        },
        {
          sala_id: 4,
          nombre: 'Sala VIP Intima',
          capacidad_total: 40,
          tipo_sala: 'vip',
          precio_hora: 3500,
          descripcion: 'Sala VIP con servicio de comida y butacas de lujo',
          equipamiento: ['Servicio a butaca', 'Butacas de lujo', 'Menú gourmet', 'Área privada'],
          disponibilidad: this.generarDisponibilidad()
        },
        {
          sala_id: 5,
          nombre: 'Sala 4DX Adventure',
          capacidad_total: 60,
          tipo_sala: '4dx',
          precio_hora: 3000,
          descripcion: 'Sala 4DX con efectos especiales y movimiento',
          equipamiento: ['Butacas en movimiento', 'Efectos especiales', 'Agua y viento', 'Aromas'],
          disponibilidad: this.generarDisponibilidad()
        },
        {
          sala_id: 6,
          nombre: 'Sala Standard B',
          capacidad_total: 100,
          tipo_sala: 'standard',
          precio_hora: 1800,
          descripcion: 'Sala estándar con capacidad media',
          equipamiento: ['Sonido Surround', 'Proyector Full HD', 'Climatización'],
          disponibilidad: this.generarDisponibilidad()
        }
      ];
      this.salasFiltradas = [...this.salas];
      this.isLoading = false;
    }, 1000);
  }

  private generarDisponibilidad(): DisponibilidadSala[] {
    const disponibilidad: DisponibilidadSala[] = [];
    const hoy = new Date();
    
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      
      const horarios: Horario[] = this.horariosDisponibles.map(hora => ({
        hora,
        disponible: Math.random() > 0.3 // 70% de disponibilidad
      }));

      disponibilidad.push({ fecha, horarios });
    }
    
    return disponibilidad;
  }

  aplicarFiltros(): void {
    this.salasFiltradas = this.salas.filter(sala => {
      const coincideTipo = this.filtros.tipo_sala === 'todas' || sala.tipo_sala === this.filtros.tipo_sala;
      const coincideCapacidad = !this.filtros.capacidad_minima || sala.capacidad_total >= this.filtros.capacidad_minima;
      const coincidePrecio = !this.filtros.precio_maximo || sala.precio_hora <= this.filtros.precio_maximo;
      
      return coincideTipo && coincideCapacidad && coincidePrecio;
    });
  }

  limpiarFiltros(): void {
    this.filtros = {
      fecha: new Date(),
      capacidad_minima: null,
      tipo_sala: 'todas',
      hora_inicio: '09:00',
      hora_fin: '22:00',
      precio_maximo: null
    };
    this.salasFiltradas = [...this.salas];
  }

  onSeleccionarSala(sala: Sala): void {
    this.salaSeleccionada = sala;
    this.datosReserva.fecha = this.filtros.fecha || new Date();
    this.isModalReservaOpen = true;
  }

  onReservarSala(): void {
    if (this.salaSeleccionada && this.validarReserva()) {
      // Simular reserva
      console.log('Reserva realizada:', {
        sala: this.salaSeleccionada.nombre,
        datos: this.datosReserva
      });
      
      alert(`¡Reserva confirmada para ${this.salaSeleccionada.nombre}!
      Fecha: ${this.datosReserva.fecha.toLocaleDateString()}
      Horario: ${this.datosReserva.hora_inicio} - ${this.datosReserva.hora_fin}
      Total: $${this.calcularTotal()}`);
      
      this.cerrarModal();
    }
  }

  calcularTotal(): number {
    if (!this.salaSeleccionada) return 0;
    
    const inicio = parseInt(this.datosReserva.hora_inicio.split(':')[0]);
    const fin = parseInt(this.datosReserva.hora_fin.split(':')[0]);
    const horas = fin - inicio;
    
    return this.salaSeleccionada.precio_hora * horas;
  }

  validarReserva(): boolean {
    return !!(
      this.datosReserva.nombre &&
      this.datosReserva.email &&
      this.datosReserva.telefono &&
      this.datosReserva.hora_inicio &&
      this.datosReserva.hora_fin
    );
  }

  cerrarModal(): void {
    this.isModalReservaOpen = false;
    this.salaSeleccionada = null;
    this.datosReserva = {
      nombre: '',
      email: '',
      telefono: '',
      fecha: new Date(),
      hora_inicio: '',
      hora_fin: '',
      duracion: 2,
      personas: 1
    };
  }

  getBadgeColorTipoSala(tipo: string): string {
    const colores: { [key: string]: string } = {
      'standard': 'bg-blue-100 text-blue-800',
      'premium': 'bg-purple-100 text-purple-800',
      'vip': 'bg-yellow-100 text-yellow-800',
      'imax': 'bg-red-100 text-red-800',
      '4dx': 'bg-green-100 text-green-800'
    };
    return `px-3 py-1 rounded-full text-sm font-medium ${colores[tipo] || 'bg-gray-100 text-gray-800'}`;
  }

  getLabelTipoSala(tipo: string): string {
    const labels: { [key: string]: string } = {
      'standard': 'Standard',
      'premium': 'Premium',
      'vip': 'VIP',
      'imax': 'IMAX',
      '4dx': '4DX'
    };
    return labels[tipo] || tipo;
  }

  getDisponibilidadSala(sala: Sala, fecha: Date): Horario[] {
    const disponibilidad = sala.disponibilidad.find(d => 
      d.fecha.toDateString() === fecha.toDateString()
    );
    return disponibilidad?.horarios || [];
  }

  onCambiarDuracion(): void {
    if (this.datosReserva.hora_inicio) {
      const inicio = new Date(`2000-01-01T${this.datosReserva.hora_inicio}`);
      const fin = new Date(inicio.getTime() + this.datosReserva.duracion * 60 * 60 * 1000);
      this.datosReserva.hora_fin = fin.toTimeString().slice(0, 5);
    }
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}