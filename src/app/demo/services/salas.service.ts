import { Injectable } from '@angular/core';
import { from, Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { PostgrestResponse, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../../supabase-client';

export interface Sala {
    sala_id: number;
    nombre: string;
    capacidad_total: number;
    tipo_sala?: string;
    estado: boolean;
}

export interface Asiento {
    asiento_id: number;
    sala_id: number;
    fila: string;
    numero: number;
    tipo_asiento: string;
    estado_asiento: 'disponible' | 'ocupado' | 'mantenimiento';
}

export interface SalaConAsientos extends Sala {
    asientos_disponibles: Asiento[];
}

export interface EstadisticasSala {
    sala_id: number;
    nombre: string;
    capacidad_total: number;
    total_asientos: number;
    disponibles: number;
    ocupados: number;
    mantenimiento: number;
}

@Injectable({
    providedIn: 'root'
})
export class SalasService {

    private readonly TABLE_NAME = 'sala';
    private readonly PRIMARY_KEY = 'sala_id';

    private salasSubject = new BehaviorSubject<Sala[]>([]);
    public salas$: Observable<Sala[]> = this.salasSubject.asObservable();

    private currentSalas: Sala[] = [];

    constructor() {
        this.fetchInitialDataAndSubscribe();
    }

    private fetchInitialDataAndSubscribe(): void {
        this.getSalasREST().subscribe(
            initialList => {
                this.currentSalas = initialList;
                this.salasSubject.next(this.currentSalas);
                this.subscribeToRealtimeChanges();
            },
            error => {
                console.error('Error al cargar datos iniciales de Salas:', error);
            }
        );
    }

    private subscribeToRealtimeChanges(): void {
        supabase
            .channel(`public:${this.TABLE_NAME}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: this.TABLE_NAME },
                (payload: RealtimePostgresChangesPayload<Sala>) => {
                    const newRecord = payload.new as Sala;
                    const oldRecord = payload.old as Sala;
                    const affectedId = newRecord?.[this.PRIMARY_KEY as keyof Sala] ?? oldRecord?.[this.PRIMARY_KEY as keyof Sala] ?? 'N/A';
                    console.log(`[Realtime Salas] Evento: ${payload.eventType}, ID afectado: ${affectedId}`);

                    this.getSalasREST().subscribe(
                        updatedList => {
                            this.currentSalas = updatedList;
                            this.salasSubject.next(this.currentSalas);
                        },
                        error => console.error('Error al recargar la lista de Salas en Realtime:', error)
                    );
                }
            )
            .subscribe();
    }

    // NUEVO: Obtener salas con asientos disponibles
    getSalasConAsientosDisponibles(): Observable<SalaConAsientos[]> {
        const promise = supabase
            .from(this.TABLE_NAME)
            .select(`
        sala_id,
        nombre,
        capacidad_total,
        tipo_sala,
        estado,
        asiento!inner(
          asiento_id,
          fila,
          numero,
          tipo_asiento,
          estado_asiento
        )
      `)
            .eq('asiento.estado_asiento', 'disponible')
            .order('sala_id', { ascending: true });

        return from(promise).pipe(
            map((response: PostgrestResponse<any>) => {
                if (response.error) {
                    throw new Error(response.error.message);
                }

                const salasMap = new Map<number, SalaConAsientos>();

                response.data?.forEach((item: any) => {
                    if (!salasMap.has(item.sala_id)) {
                        salasMap.set(item.sala_id, {
                            sala_id: item.sala_id,
                            nombre: item.nombre,
                            capacidad_total: item.capacidad_total,
                            tipo_sala: item.tipo_sala,
                            estado: item.estado,
                            asientos_disponibles: []
                        });
                    }

                    if (item.asiento) {
                        salasMap.get(item.sala_id)!.asientos_disponibles.push(item.asiento);
                    }
                });

                return Array.from(salasMap.values());
            })
        );
    }

    // NUEVO: Obtener estadísticas de asientos por sala
    getEstadisticasSalas(): Observable<EstadisticasSala[]> {
        const promise = supabase
            .from(this.TABLE_NAME)
            .select(`
        sala_id,
        nombre,
        capacidad_total,
        asiento(
          asiento_id,
          estado_asiento
        )
      `)
            .order('sala_id', { ascending: true });

        return from(promise).pipe(
            map((response: PostgrestResponse<any>) => {
                if (response.error) {
                    throw new Error(response.error.message);
                }

                return response.data?.map((sala: any) => {
                    const asientos = sala.asiento || [];
                    return {
                        sala_id: sala.sala_id,
                        nombre: sala.nombre,
                        capacidad_total: sala.capacidad_total,
                        total_asientos: asientos.length,
                        disponibles: asientos.filter((a: any) => a.estado_asiento === 'disponible').length,
                        ocupados: asientos.filter((a: any) => a.estado_asiento === 'ocupado').length,
                        mantenimiento: asientos.filter((a: any) => a.estado_asiento === 'mantenimiento').length
                    };
                }) || [];
            })
        );
    }

    // NUEVO: Obtener asientos disponibles de una sala específica
    getAsientosDisponiblesPorSala(salaId: number): Observable<Asiento[]> {
        const promise = supabase
            .from('asiento')
            .select('*')
            .eq('sala_id', salaId)
            .eq('estado_asiento', 'disponible')
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

    // NUEVO: Cambiar estado de un asiento
    cambiarEstadoAsiento(asientoId: number, nuevoEstado: 'disponible' | 'ocupado' | 'mantenimiento'): Observable<Asiento> {
        const promise = supabase
            .from('asiento')
            .update({ estado_asiento: nuevoEstado })
            .eq('asiento_id', asientoId)
            .select()
            .single();

        return from(promise).pipe(
            map((response: PostgrestResponse<Asiento>) => {
                if (response.error) {
                    throw new Error(response.error.message);
                }
                return (response.data?.[0] as Asiento) || null;
            })
        );
    }

    // Métodos existentes (mantener igual)
    getListaSalas(): Observable<Sala[]> {
        return this.salas$;
    }

    private getSalasREST(): Observable<Sala[]> {
        const promise = supabase
            .from(this.TABLE_NAME)
            .select('*')
            .order(this.PRIMARY_KEY, { ascending: true });

        return from(promise).pipe(
            map((response: PostgrestResponse<Sala>) => {
                if (response.error) {
                    throw new Error(response.error.message);
                }
                return response.data || [];
            })
        );
    }

    getSalaById(id: number): Observable<Sala | null> {
        const promise = supabase
            .from(this.TABLE_NAME)
            .select('*')
            .eq(this.PRIMARY_KEY, id)
            .limit(1)
            .single();

        return from(promise).pipe(
            map((response: PostgrestResponse<Sala>) => {
                if (response.error && response.status !== 406) {
                    throw new Error(response.error.message);
                }
                return response.data?.[0] as Sala;
            })
        );
    }

// En salas.service.ts - corregir createSala y updateSala
// En salas.service.ts - actualiza el createSala
createSala(sala: Omit<Sala, 'sala_id'>): Observable<Sala> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .insert(sala)
      .select();
    
    return from(promise).pipe(
      map((response: PostgrestResponse<Sala>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        const nuevaSala = (response.data?.[0] as Sala) || null;
        
        // Actualizar el BehaviorSubject con la nueva sala
        if (nuevaSala) {
          this.currentSalas = [...this.currentSalas, nuevaSala];
          this.salasSubject.next(this.currentSalas);
        }
        
        return nuevaSala;
      })
    );
  }
  
// En salas.service.ts - actualiza updateSala también
updateSala(id: number, sala: Partial<Sala>): Observable<Sala> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .update(sala)
      .eq(this.PRIMARY_KEY, id)
      .select();
    
    return from(promise).pipe(
      map((response: PostgrestResponse<Sala>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        const salaActualizada = (response.data?.[0] as Sala) || null;
        
        // Actualizar el BehaviorSubject
        if (salaActualizada) {
          const index = this.currentSalas.findIndex(s => s.sala_id === id);
          if (index !== -1) {
            this.currentSalas[index] = { ...this.currentSalas[index], ...salaActualizada };
            this.salasSubject.next(this.currentSalas);
          }
        }
        
        return salaActualizada;
      })
    );
  }
    // En salas.service.ts - método deleteSala corregido
    deleteSala(id: number): Observable<void> {
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
    getSalasActivas(): Observable<Sala[]> {
        const promise = supabase
            .from(this.TABLE_NAME)
            .select('*')
            .eq('estado', true)
            .order(this.PRIMARY_KEY, { ascending: true });

        return from(promise).pipe(
            map((response: PostgrestResponse<Sala>) => {
                if (response.error) {
                    throw new Error(response.error.message);
                }
                return response.data || [];
            })
        );
    }


}