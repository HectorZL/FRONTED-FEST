import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Boletos } from '../boletos/boletos';

// Define the Ticket interface
export interface Ticket {
  id: number;
  pelicula: string;
  fecha: string;
  hora: string;
  sala: string;
  asiento: string;
  precio: number;
  estado: 'activo' | 'usado' | 'cancelado';
}

@Component({
  selector: 'app-ticket-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './boletomodal.html',
  styleUrls: ['./boletomodal.scss']
})
export class TicketModalComponent {
  @Output() ticketAdded = new EventEmitter<Ticket>();
  @Output() modalClosed = new EventEmitter<void>();
  @Input() showModal: boolean = false;

  // Datos del formulario
  newTicket = {
    pelicula: '',
    fecha: '',
    hora: '',
    sala: '',
    asiento: '',
    precio: 0
  };

  // Opciones predefinidas para el formulario
  peliculas = [
    'El Padrino',
    'Pulp Fiction',
    'El Señor de los Anillos',
    'Matrix',
    'Interestelar',
    'Avatar',
    'Titanic',
    'Star Wars: Una Nueva Esperanza'
  ];

  salas = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala 4', 'Sala 5', 'Sala VIP'];
  horas = ['14:00', '16:30', '19:00', '21:30', '23:59'];

  // Obtener fecha mínima (hoy) y máxima (1 año desde hoy)
  get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  get maxDate(): string {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split('T')[0];
  }

  // Generar opciones de asientos
  get asientos(): string[] {
    const asientos = [];
    for (let fila = 1; fila <= 10; fila++) {
      for (let columna = 1; columna <= 8; columna++) {
        asientos.push(`F${fila}-${columna}`);
      }
    }
    return asientos;
  }

  closeModal() {
    this.modalClosed.emit();
    this.resetForm();
  }

  onSubmit() {
    if (this.isFormValid()) {
      const ticket: Ticket = {
        id: this.generateId(),
        ...this.newTicket,
        estado: 'activo'
      };
      
      this.ticketAdded.emit(ticket);
      this.closeModal();
    }
  }

  private isFormValid(): boolean {
    return !!(
      this.newTicket.pelicula &&
      this.newTicket.fecha &&
      this.newTicket.hora &&
      this.newTicket.sala &&
      this.newTicket.asiento &&
      this.newTicket.precio > 0
    );
  }

  private generateId(): number {
    return Math.floor(Math.random() * 1000) + 1;
  }

  private resetForm() {
    this.newTicket = {
      pelicula: '',
      fecha: '',
      hora: '',
      sala: '',
      asiento: '',
      precio: 0
    };
  }

  // Prevenir que el modal se cierre al hacer clic dentro del contenido
  onModalContentClick(event: Event) {
    event.stopPropagation();
  }
}