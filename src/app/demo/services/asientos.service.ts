import { Injectable } from '@angular/core';
import { from, Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { PostgrestResponse, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../../supabase-client';

export interface Asiento {
  asiento_id: number;
  sala_id: number;
  fila: string;
  numero: number;
  tipo_asiento: 'normal' | 'premium' | 'vip' | 'discapacitado';
  estado_asiento: 'disponible' | 'ocupado' | 'mantenimiento';
}

export interface AsientoConSala extends Asiento {
  sala_nombre?: string;
  sala_tipo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AsientosService {
  
  private readonly TABLE_NAME = 'asiento';
  private readonly PRIMARY_KEY = 'asiento_id';

  private asientosSubject = new BehaviorSubject<Asiento[]>([]);
  public asientos$: Observable<Asiento[]> = this.asientosSubject.asObservable();
  
  private currentAsientos: Asiento[] = [];

  constructor() {
    this.fetchInitialDataAndSubscribe();
  }

  private fetchInitialDataAndSubscribe(): void {
    this.getAsientosREST().subscribe(
      initialList => {
        this.currentAsientos = initialList;
        this.asientosSubject.next(this.currentAsientos);
        this.subscribeToRealtimeChanges();
      },
      error => {
        console.error('Error al cargar datos iniciales de Asientos:', error);
      }
    );
  }

  private subscribeToRealtimeChanges(): void {
    supabase
      .channel(`public:${this.TABLE_NAME}`)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: this.TABLE_NAME }, 
        (payload: RealtimePostgresChangesPayload<Asiento>) => {
          const newRecord = payload.new as Asiento;
          const oldRecord = payload.old as Asiento;
          const affectedId = newRecord?.[this.PRIMARY_KEY as keyof Asiento] ?? oldRecord?.[this.PRIMARY_KEY as keyof Asiento] ?? 'N/A';
          console.log(`[Realtime Asientos] Evento: ${payload.eventType}, ID afectado: ${affectedId}`);
        
          this.getAsientosREST().subscribe(
            updatedList => {
              this.currentAsientos = updatedList;
              this.asientosSubject.next(this.currentAsientos);
            },
            error => console.error('Error al recargar la lista de Asientos en Realtime:', error)
          );
        }
      )
      .subscribe();
  }

  // Obtener todos los asientos
  getListaAsientos(): Observable<Asiento[]> {
    return this.asientos$;
  }

  // Obtener asientos con información de sala
  getAsientosConSala(): Observable<AsientoConSala[]> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .select(`
        *,
        sala:sala_id(nombre, tipo_sala)
      `)
      .order('sala_id', { ascending: true })
      .order('fila', { ascending: true })
      .order('numero', { ascending: true });
    
    return from(promise).pipe(
      map((response: PostgrestResponse<any>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        
        return response.data?.map((item: any) => ({
          ...item,
          sala_nombre: item.sala?.nombre,
          sala_tipo: item.sala?.tipo_sala
        })) || [];
      })
    );
  }

  // Obtener asientos por sala
  getAsientosPorSala(salaId: number): Observable<Asiento[]> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('sala_id', salaId)
      .order('fila', { ascending: true })
      .order('numero', { ascending: true });
    
    return from(promise).pipe(
      map((response: PostgrestResponse<Asiento>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        return response.data || [];
      })
    );
  }

  // Obtener asiento por ID
  getAsientoById(id: number): Observable<Asiento | null> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq(this.PRIMARY_KEY, id)
      .limit(1)
      .single();
    
    return from(promise).pipe(
      map((response: PostgrestResponse<Asiento>) => {
        if (response.error && response.status !== 406) {
          throw new Error(response.error.message);
        }
        return response.data?.[0] as Asiento;
      })
    );
  }

// En asientos.service.ts - verifica que createAsiento tenga esto:
createAsiento(asiento: Omit<Asiento, 'asiento_id'>): Observable<Asiento> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .insert(asiento)
      .select();
    
    return from(promise).pipe(
      map((response: PostgrestResponse<Asiento>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        const nuevoAsiento = (response.data?.[0] as Asiento) || null;
        
        // Actualizar el BehaviorSubject con el nuevo asiento
        if (nuevoAsiento) {
          this.currentAsientos = [...this.currentAsientos, nuevoAsiento];
          this.asientosSubject.next(this.currentAsientos);
        }
        
        return nuevoAsiento;
      })
    );
  }

// En asientos.service.ts - updateAsiento
updateAsiento(id: number, asiento: Partial<Asiento>): Observable<Asiento> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .update(asiento)
      .eq(this.PRIMARY_KEY, id)
      .select();
    
    return from(promise).pipe(
      map((response: PostgrestResponse<Asiento>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        const asientoActualizado = (response.data?.[0] as Asiento) || null;
        
        // Actualizar el BehaviorSubject
        if (asientoActualizado) {
          const index = this.currentAsientos.findIndex(a => a.asiento_id === id);
          if (index !== -1) {
            this.currentAsientos[index] = { ...this.currentAsientos[index], ...asientoActualizado };
            this.asientosSubject.next(this.currentAsientos);
          }
        }
        
        return asientoActualizado;
      })
    );
  }

  // Eliminar asiento
  deleteAsiento(id: number): Observable<void> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .delete()
      .eq(this.PRIMARY_KEY, id);
    
    return from(promise).pipe(
      map((response: any) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        return;
      })
    );
  }

  // Cambiar estado de asiento (método específico)
  cambiarEstadoAsiento(asientoId: number, estado: 'disponible' | 'ocupado' | 'mantenimiento'): Observable<Asiento> {
    return this.updateAsiento(asientoId, { estado_asiento: estado });
  }

  // Método privado para obtener asientos REST
  private getAsientosREST(): Observable<Asiento[]> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .order(this.PRIMARY_KEY, { ascending: true });
    
    return from(promise).pipe(
      map((response: PostgrestResponse<Asiento>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        return response.data || [];
      })
    );
  }
}