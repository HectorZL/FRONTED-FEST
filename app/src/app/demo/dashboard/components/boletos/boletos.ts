import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Ticket {
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
  selector: 'app-boletos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './boletos.html',
  styleUrls: ['./boletos.scss']
})
export class Boletos {
  // Add these computed properties
  get activeTicketsCount(): number {
    return this.tickets.filter(t => t.estado === 'activo').length;
  }

  get usedTicketsCount(): number {
    return this.tickets.filter(t => t.estado === 'usado').length;
  }

  get cancelledTicketsCount(): number {
    return this.tickets.filter(t => t.estado === 'cancelado').length;
  }

  tickets: Ticket[] = [
    {
      id: 1,
      pelicula: 'El Padrino',
      fecha: '2025-11-06',
      hora: '19:30',
      sala: 'Sala 4',
      asiento: 'F12',
      precio: 8.50,
      estado: 'activo'
    },
    {
      id: 2,
      pelicula: 'Avengers: Endgame',
      fecha: '2025-11-07',
      hora: '21:00',
      sala: 'Sala 2',
      asiento: 'B07',
      precio: 9.00,
      estado: 'usado'
    },
    {
      id: 3,
      pelicula: 'Inception',
      fecha: '2025-11-08',
      hora: '18:15',
      sala: 'Sala 1',
      asiento: 'D15',
      precio: 8.00,
      estado: 'activo'
    },
    {
      id: 4,
      pelicula: 'The Dark Knight',
      fecha: '2025-11-05',
      hora: '20:45',
      sala: 'Sala 3',
      asiento: 'A05',
      precio: 8.50,
      estado: 'cancelado'
    }
  ];

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'activo':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'usado':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelado':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'activo':
        return '✅';
      case 'usado':
        return '🎬';
      case 'cancelado':
        return '❌';
      default:
        return '📄';
    }
  }

  descargarTicket(ticket: Ticket): void {
    console.log('Descargando ticket:', ticket);
    // Lógica para descargar ticket
  }

  cancelarTicket(ticket: Ticket): void {
    if (ticket.estado === 'activo') {
      ticket.estado = 'cancelado';
      console.log('Ticket cancelado:', ticket);
    }
  }
}