import { Injectable } from '@angular/core';
import { from, Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { PostgrestResponse, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../../supabase-client';

export interface Funcion {
  funcion_id: number;
  pelicula_id: number;
  sala_id: number;
  fecha_hora_inicio: string; // ISO string
  fecha_hora_fin: string; 
  precio_base: number;
  estado: 'programada' | 'en_curso' | 'cancelada' | 'finalizada';
}

export interface FuncionCompleta extends Funcion {
  pelicula_titulo?: string;
  pelicula_duracion?: number;
  pelicula_genero?: string;
  sala_nombre?: string;
  sala_tipo?: string;
  asientos_disponibles?: number;
  asientos_ocupados?: number;
}

export interface FuncionConDetalles extends Funcion {
  pelicula?: {
    titulo: string;
    duracion: number;
    genero: string;
    clasificacion: string;
  };
  sala?: {
    nombre: string;
    tipo_sala: string;
    capacidad_total: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class FuncionesService {
  
  private readonly TABLE_NAME = 'funcion';
  private readonly PRIMARY_KEY = 'funcion_id';

  private funcionesSubject = new BehaviorSubject<Funcion[]>([]);
  public funciones$: Observable<Funcion[]> = this.funcionesSubject.asObservable();
  
  private currentFunciones: Funcion[] = [];

  constructor() {
    this.fetchInitialDataAndSubscribe();
  }

  private fetchInitialDataAndSubscribe(): void {
    this.getFuncionesREST().subscribe(
      initialList => {
        this.currentFunciones = initialList;
        this.funcionesSubject.next(this.currentFunciones);
        this.subscribeToRealtimeChanges();
      },
      error => {
        console.error('Error al cargar datos iniciales de Funciones:', error);
      }
    );
  }

  private subscribeToRealtimeChanges(): void {
    supabase
      .channel(`public:${this.TABLE_NAME}`)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: this.TABLE_NAME }, 
        (payload: RealtimePostgresChangesPayload<Funcion>) => {
          const newRecord = payload.new as Funcion;
          const oldRecord = payload.old as Funcion;
          const affectedId = newRecord?.[this.PRIMARY_KEY as keyof Funcion] ?? oldRecord?.[this.PRIMARY_KEY as keyof Funcion] ?? 'N/A';
          console.log(`[Realtime Funciones] Evento: ${payload.eventType}, ID afectado: ${affectedId}`);
        
          this.getFuncionesREST().subscribe(
            updatedList => {
              this.currentFunciones = updatedList;
              this.funcionesSubject.next(this.currentFunciones);
            },
            error => console.error('Error al recargar la lista de Funciones en Realtime:', error)
          );
        }
      )
      .subscribe();
  }

  // Obtener todas las funciones
  getListaFunciones(): Observable<Funcion[]> {
    return this.funciones$;
  }

  // Obtener funciones con detalles completos (película y sala)
  getFuncionesConDetalles(): Observable<FuncionConDetalles[]> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .select(`
        *,
        pelicula:pelicula_id(
          titulo,
          duracion,
          genero,
          clasificacion,
          portada_url
        ),
        sala:sala_id(
          nombre,
          tipo_sala,
          capacidad_total,
          estado
        )
      `)
      .order('fecha_hora_inicio', { ascending: true });
    
    return from(promise).pipe(
      map((response: PostgrestResponse<any>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        
        return response.data?.map((item: any) => ({
          ...item,
          pelicula: item.pelicula || null,
          sala: item.sala || null
        })) || [];
      })
    );
  }

  // Obtener funciones con información básica de película y sala
  getFuncionesCompletas(): Observable<FuncionCompleta[]> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .select(`
        *,
        pelicula:pelicula_id(titulo, duracion, genero),
        sala:sala_id(nombre, tipo_sala)
      `)
      .order('fecha_hora_inicio', { ascending: true });
    
    return from(promise).pipe(
      map((response: PostgrestResponse<any>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        
        return response.data?.map((item: any) => ({
          ...item,
          pelicula_titulo: item.pelicula?.titulo,
          pelicula_duracion: item.pelicula?.duracion,
          pelicula_genero: item.pelicula?.genero,
          sala_nombre: item.sala?.nombre,
          sala_tipo: item.sala?.tipo_sala
        })) || [];
      })
    );
  }

  // Obtener funciones por película
  getFuncionesPorPelicula(peliculaId: number): Observable<FuncionCompleta[]> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .select(`
        *,
        pelicula:pelicula_id(titulo, duracion, genero),
        sala:sala_id(nombre, tipo_sala)
      `)
      .eq('pelicula_id', peliculaId)
      .order('fecha_hora_inicio', { ascending: true });
    
    return from(promise).pipe(
      map((response: PostgrestResponse<any>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        
        return response.data?.map((item: any) => ({
          ...item,
          pelicula_titulo: item.pelicula?.titulo,
          pelicula_duracion: item.pelicula?.duracion,
          pelicula_genero: item.pelicula?.genero,
          sala_nombre: item.sala?.nombre,
          sala_tipo: item.sala?.tipo_sala
        })) || [];
      })
    );
  }

  // Obtener funciones por sala
  getFuncionesPorSala(salaId: number): Observable<FuncionCompleta[]> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .select(`
        *,
        pelicula:pelicula_id(titulo, duracion, genero),
        sala:sala_id(nombre, tipo_sala)
      `)
      .eq('sala_id', salaId)
      .order('fecha_hora_inicio', { ascending: true });
    
    return from(promise).pipe(
      map((response: PostgrestResponse<any>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        
        return response.data?.map((item: any) => ({
          ...item,
          pelicula_titulo: item.pelicula?.titulo,
          pelicula_duracion: item.pelicula?.duracion,
          pelicula_genero: item.pelicula?.genero,
          sala_nombre: item.sala?.nombre,
          sala_tipo: item.sala?.tipo_sala
        })) || [];
      })
    );
  }

  // Obtener funciones futuras
  getFuncionesFuturas(): Observable<FuncionCompleta[]> {
    const ahora = new Date().toISOString();
    
    const promise = supabase
      .from(this.TABLE_NAME)
      .select(`
        *,
        pelicula:pelicula_id(titulo, duracion, genero),
        sala:sala_id(nombre, tipo_sala)
      `)
      .gte('fecha_hora_inicio', ahora)
      .order('fecha_hora_inicio', { ascending: true });
    
    return from(promise).pipe(
      map((response: PostgrestResponse<any>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        
        return response.data?.map((item: any) => ({
          ...item,
          pelicula_titulo: item.pelicula?.titulo,
          pelicula_duracion: item.pelicula?.duracion,
          pelicula_genero: item.pelicula?.genero,
          sala_nombre: item.sala?.nombre,
          sala_tipo: item.sala?.tipo_sala
        })) || [];
      })
    );
  }

  // Obtener función por ID
  getFuncionById(id: number): Observable<FuncionConDetalles | null> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .select(`
        *,
        pelicula:pelicula_id(
          titulo,
          duracion,
          genero,
          clasificacion,
          portada_url,
          sinopsis
        ),
        sala:sala_id(
          nombre,
          tipo_sala,
          capacidad_total,
          estado
        )
      `)
      .eq(this.PRIMARY_KEY, id)
      .limit(1)
      .single();
    
    return from(promise).pipe(
      map((response: PostgrestResponse<any>) => {
        if (response.error && response.status !== 406) {
          throw new Error(response.error.message);
        }
        return response.data?.[0] as FuncionConDetalles;
      })
    );
  }

  // Crear función
  createFuncion(funcion: Omit<Funcion, 'funcion_id'>): Observable<Funcion> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .insert(funcion)
      .select();
    
    return from(promise).pipe(
      map((response: PostgrestResponse<Funcion>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        const nuevaFuncion = (response.data?.[0] as Funcion) || null;
        
        // Actualizar el BehaviorSubject
        if (nuevaFuncion) {
          this.currentFunciones = [...this.currentFunciones, nuevaFuncion];
          this.funcionesSubject.next(this.currentFunciones);
        }
        
        return nuevaFuncion;
      })
    );
  }

  // Actualizar función
  updateFuncion(id: number, funcion: Partial<Funcion>): Observable<Funcion> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .update(funcion)
      .eq(this.PRIMARY_KEY, id)
      .select();
    
    return from(promise).pipe(
      map((response: PostgrestResponse<Funcion>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        const funcionActualizada = (response.data?.[0] as Funcion) || null;
        
        // Actualizar el BehaviorSubject
        if (funcionActualizada) {
          const index = this.currentFunciones.findIndex(f => f.funcion_id === id);
          if (index !== -1) {
            this.currentFunciones[index] = { ...this.currentFunciones[index], ...funcionActualizada };
            this.funcionesSubject.next(this.currentFunciones);
          }
        }
        
        return funcionActualizada;
      })
    );
  }

  // Eliminar función
  deleteFuncion(id: number): Observable<void> {
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

  // Cambiar estado de función
  cambiarEstadoFuncion(funcionId: number, estado: 'programada' | 'en_curso' | 'cancelada' | 'finalizada'): Observable<Funcion> {
    return this.updateFuncion(funcionId, { estado });
  }

  // Verificar disponibilidad de sala en un horario
  verificarDisponibilidadSala(salaId: number, fechaInicio: string, fechaFin: string, funcionIdExcluir?: number): Observable<boolean> {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('funcion_id')
      .eq('sala_id', salaId)
      .eq('estado', 'programada')
      .or(`fecha_hora_inicio.lte.${fechaFin},fecha_hora_fin.gte.${fechaInicio}`);
    
    if (funcionIdExcluir) {
      query = query.neq('funcion_id', funcionIdExcluir);
    }
    
    return from(query).pipe(
      map((response: PostgrestResponse<any>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        // Si hay funciones que se superponen, la sala no está disponible
        return response.data?.length === 0;
      })
    );
  }

  // Obtener funciones por rango de fechas
  getFuncionesPorRangoFechas(fechaInicio: string, fechaFin: string): Observable<FuncionCompleta[]> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .select(`
        *,
        pelicula:pelicula_id(titulo, duracion, genero),
        sala:sala_id(nombre, tipo_sala)
      `)
      .gte('fecha_hora_inicio', fechaInicio)
      .lte('fecha_hora_inicio', fechaFin)
      .order('fecha_hora_inicio', { ascending: true });
    
    return from(promise).pipe(
      map((response: PostgrestResponse<any>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        
        return response.data?.map((item: any) => ({
          ...item,
          pelicula_titulo: item.pelicula?.titulo,
          pelicula_duracion: item.pelicula?.duracion,
          pelicula_genero: item.pelicula?.genero,
          sala_nombre: item.sala?.nombre,
          sala_tipo: item.sala?.tipo_sala
        })) || [];
      })
    );
  }

  // Método privado para obtener funciones REST
  private getFuncionesREST(): Observable<Funcion[]> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .order(this.PRIMARY_KEY, { ascending: true });
    
    return from(promise).pipe(
      map((response: PostgrestResponse<Funcion>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        return response.data || [];
      })
    );
  }
}