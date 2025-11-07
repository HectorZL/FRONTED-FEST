import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../supabase-client';

export type EstadoTicket = 'activo' | 'usado' | 'cancelado';

export interface Ticket {
  id: number;
  pelicula: string;
  fecha: string;
  hora: string;
  sala: string;
  asiento: string;
  precio: number;
  estado: EstadoTicket;
}

@Injectable({
  providedIn: 'root'
})
export class TicketService implements OnDestroy {
  private tickets: Ticket[] = [];
  private ticketsSubject = new BehaviorSubject<Ticket[]>([]);
  public tickets$ = this.ticketsSubject.asObservable();
  private subscription: RealtimeChannel | null = null;

  constructor() {
    this.loadTickets();
    this.setupRealtimeSubscription();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public async loadTickets() {
    try {
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw error;
      
      if (tickets) {
        this.tickets = tickets as Ticket[];
        this.ticketsSubject.next([...this.tickets]);
      }
    } catch (error) {
      console.error('Error al cargar los boletos:', error);
      throw error;
    }
  }

  private setupRealtimeSubscription() {
    this.subscription = supabase
      .channel('tickets')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tickets' 
        }, 
        (payload) => {
          this.loadTickets(); // Recargar los boletos cuando hay cambios
        }
      )
      .subscribe();
  }

  private isValidTicket(ticket: any): ticket is Ticket {
    return (
      ticket &&
      (ticket.id === undefined || typeof ticket.id === 'number') &&
      typeof ticket.pelicula === 'string' &&
      typeof ticket.fecha === 'string' &&
      typeof ticket.hora === 'string' &&
      typeof ticket.sala === 'string' &&
      typeof ticket.asiento === 'string' &&
      typeof ticket.precio === 'number' &&
      ['activo', 'usado', 'cancelado'].includes(ticket.estado)
    );
  }

  // Obtener todos los boletos
  getTickets(): Observable<Ticket[]> {
    return this.tickets$;
  }

  // Obtener boleto por ID
  async getTicketById(id: number): Promise<Ticket | null> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Ticket;
    } catch (error) {
      console.error('Error al obtener el boleto:', error);
      return null;
    }
  }

  // Agregar nuevo boleto
  async addTicket(ticket: Omit<Ticket, 'id' | 'estado'>): Promise<Ticket> {
    try {
      // Verificar disponibilidad del asiento
      const isAvailable = await this.isSeatAvailable(
        ticket.sala, 
        ticket.asiento, 
        ticket.fecha, 
        ticket.hora
      );

      if (!isAvailable) {
        throw new Error('El asiento seleccionado ya está ocupado para esta función');
      }

      const newTicket: Omit<Ticket, 'id'> = {
        ...ticket,
        estado: 'activo'
      };

      const { data, error } = await supabase
        .from('tickets')
        .insert([newTicket])
        .select()
        .single();

      if (error) throw error;
      
      // La suscripción en tiempo real actualizará la lista automáticamente
      return data as Ticket;
    } catch (error) {
      console.error('Error al agregar el boleto:', error);
      throw error;
    }
  }

  // Actualizar boleto
  async updateTicket(id: number, updates: Partial<Ticket>): Promise<Ticket | null> {
    try {
      // Verificar disponibilidad del asiento si se está actualizando
      if (updates.asiento || updates.sala || updates.fecha || updates.hora) {
        const { data: currentTicket } = await supabase
          .from('tickets')
          .select('*')
          .eq('id', id)
          .single();

        if (!currentTicket) return null;

        const updatedTicket = { ...currentTicket, ...updates };
        const isAvailable = await this.isSeatAvailable(
          updates.sala || currentTicket.sala,
          updates.asiento || currentTicket.asiento,
          updates.fecha || currentTicket.fecha,
          updates.hora || currentTicket.hora,
          id
        );

        if (!isAvailable) {
          throw new Error('El asiento seleccionado ya está ocupado para esta función');
        }
      }

      const { data, error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // La suscripción en tiempo real actualizará la lista automáticamente
      return data as Ticket;
    } catch (error) {
      console.error('Error al actualizar el boleto:', error);
      throw error;
    }
  }

  // Cancelar boleto
  async cancelTicket(id: number): Promise<Ticket | null> {
    return this.updateTicket(id, { estado: 'cancelado' });
  }

  // Marcar boleto como usado
  async useTicket(id: number): Promise<Ticket | null> {
    return this.updateTicket(id, { estado: 'usado' });
  }

  // Eliminar boleto
  async deleteTicket(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // La suscripción en tiempo real actualizará la lista automáticamente
      return true;
    } catch (error) {
      console.error('Error al eliminar el boleto:', error);
      throw error;
    }
  }

  // Obtener estadísticas
  async getStatistics() {
    try {
      const { count: active } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'activo');

      const { count: used } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'usado');

      const { count: cancelled } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'cancelado');

      const { count: total } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      return {
        active: active || 0,
        used: used || 0,
        cancelled: cancelled || 0,
        total: total || 0
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return {
        active: 0,
        used: 0,
        cancelled: 0,
        total: 0
      };
    }
  }

  // Verificar disponibilidad de asiento
  async isSeatAvailable(
    sala: string, 
    asiento: string, 
    fecha: string, 
    hora: string, 
    excludeTicketId?: number
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('tickets')
        .select('*')
        .eq('sala', sala)
        .eq('asiento', asiento)
        .eq('fecha', fecha)
        .eq('hora', hora)
        .eq('estado', 'activo');

      if (excludeTicketId) {
        query = query.neq('id', excludeTicketId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return data.length === 0;
    } catch (error) {
      console.error('Error al verificar disponibilidad de asiento:', error);
      return false;
    }
  }

  // Obtener asientos ocupados para una función específica
  async getOccupiedSeats(sala: string, fecha: string, hora: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('asiento')
        .eq('sala', sala)
        .eq('fecha', fecha)
        .eq('hora', hora)
        .eq('estado', 'activo');

      if (error) throw error;
      
      return data.map(ticket => ticket.asiento);
    } catch (error) {
      console.error('Error al obtener asientos ocupados:', error);
      return [];
    }
  }

  // No necesitamos generar IDs manualmente, Supabase lo hace automáticamente

  // Exportar datos (para descargar)
  async exportTickets(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*');

      if (error) throw error;
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error al exportar boletos:', error);
      throw error;
    }
  }

  // Importar datos
  async importTickets(ticketsData: any[]): Promise<void> {
    try {
      // Validar que los datos tengan el formato correcto
      if (!Array.isArray(ticketsData) || !ticketsData.every(this.isValidTicket)) {
        throw new Error('Formato de datos de tickets inválido');
      }

      // Insertar los tickets en lotes para evitar sobrecargar la base de datos
      const BATCH_SIZE = 50;
      for (let i = 0; i < ticketsData.length; i += BATCH_SIZE) {
        const batch = ticketsData.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('tickets')
          .insert(batch);

        if (error) throw error;
      }
      
      // La suscripción en tiempo real actualizará la lista automáticamente
    } catch (error) {
      console.error('Error al importar boletos:', error);
      throw error;
    }
  }
}