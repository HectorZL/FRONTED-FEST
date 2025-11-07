import { Injectable } from '@angular/core';
import { from, Observable, Subject, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
// Ajuste de ruta: Asumimos que el cliente está un nivel arriba (en src/app/)
import { supabase } from '../../supabase-client'; 
import { PostgrestResponse, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ----------------------------------------------------
// 1. INTERFACE DE LA ENTIDAD (CORREGIDA según las columnas de la tabla)
// ----------------------------------------------------
// Interface que representa la estructura en la base de datos
interface DBPelicula {
  pelicula_id?: number;
  titulo: string;
  sinopsis: string;
  duracion: number;
  clasificacion: string;
  genero: string;
  url_poster: string;
  estado: boolean;
}

// Interface para usar en la aplicación
export interface Pelicula {
  id?: number;
  titulo: string;
  sinopsis: string;
  duracion: number;
  clasificacion: string;
  genero: string[];
  imagenUrl: string;
  estado: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PeliculasService {
  
  private peliculasSubject = new BehaviorSubject<Pelicula[]>([]);
  public peliculas$ = this.peliculasSubject.asObservable();

  private currentPeliculas: Pelicula[] = [];
  private readonly TABLE_NAME = 'pelicula';

  constructor() {
    this.fetchInitialDataAndSubscribe();
  }

  /**
   * Carga los datos iniciales y luego configura la escucha en tiempo real.
   */
  private fetchInitialDataAndSubscribe(): void {
    this.getAllPeliculasREST().subscribe(
      initialList => {
        this.currentPeliculas = initialList;
        this.peliculasSubject.next(this.currentPeliculas);
        this.subscribeToRealtimeChanges();
      },
      error => {
        // El error ya no será de columna inexistente si el ordenamiento es correcto.
        console.error('Error al cargar datos iniciales de Supabase:', error);
      }
    );
  }

  /**
   * Obtiene todas las películas usando REST.
   * CORRECCIÓN: Usa 'titulo' en lugar de 'nombre' para el ordenamiento.
   */
  private getAllPeliculasREST(): Observable<Pelicula[]> {
    return from(
      supabase
        .from(this.TABLE_NAME)
        .select('*')
        .order('titulo', { ascending: true })
    ).pipe(
      map((response: PostgrestResponse<DBPelicula>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        // Mapear los datos de la base de datos al formato de la aplicación
        return (response.data || []).map(dbPelicula => ({
          id: dbPelicula.pelicula_id,
          titulo: dbPelicula.titulo,
          sinopsis: dbPelicula.sinopsis,
          duracion: dbPelicula.duracion,
          clasificacion: dbPelicula.clasificacion,
          genero: dbPelicula.genero ? dbPelicula.genero.split(',').map(g => g.trim()) : [],
          imagenUrl: dbPelicula.url_poster || 'assets/images/movie-placeholder.jpg',
          estado: dbPelicula.estado
        }));
      })
    );
  }

  /**
   * Configura la escucha de eventos en TIEMPO REAL.
   */
  private subscribeToRealtimeChanges(): void {
    supabase
      .channel('public:pelicula') 
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: this.TABLE_NAME }, 
        (payload: RealtimePostgresChangesPayload<DBPelicula>) => {
        
        // Obtener el ID de la película afectada
        const newRecord = payload.new as DBPelicula;
        const oldRecord = payload.old as DBPelicula;
        const affectedId = newRecord?.pelicula_id ?? oldRecord?.pelicula_id ?? 'N/A';

        console.log('Cambio en tiempo real recibido:', payload.eventType, affectedId);
        
        // Recargar la lista completa después del cambio
        this.getAllPeliculasREST().subscribe(
          updatedList => {
            this.currentPeliculas = updatedList;
            this.peliculasSubject.next(this.currentPeliculas); 
          },
          error => console.error('Error al recargar la lista de películas en Realtime:', error)
        );
      })
      .subscribe(); 
  }

  /**
   * Elimina una película por su ID
   * @param id ID de la película a eliminar
   * @returns Observable con el resultado de la operación
   */
  eliminarPelicula(id: number): Observable<{ success: boolean; error?: string }> {
    return from(
      supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('pelicula_id', id)
    ).pipe(
      map((response: any) => {
        if (response.error) {
          console.error('Error al eliminar película:', response.error);
          return { success: false, error: response.error.message };
        }
        
        // Actualizar la lista local
        this.currentPeliculas = this.currentPeliculas.filter(p => p.id !== id);
        this.peliculasSubject.next([...this.currentPeliculas]);
        
        return { success: true };
      })
    );
  }

  /**
   * Método principal para que los componentes se suscriban.
   */
  getListaPeliculas(): Observable<Pelicula[]> {
    return this.peliculas$;
  }

  agregarPelicula(pelicula: Omit<Pelicula, 'id'>): Observable<Pelicula> {
    // Mapear los datos al formato de la base de datos
    const peliculaData: DBPelicula = {
      titulo: pelicula.titulo,
      sinopsis: pelicula.sinopsis,
      duracion: pelicula.duracion,
      clasificacion: pelicula.clasificacion,
      genero: Array.isArray(pelicula.genero) ? pelicula.genero.join(', ') : pelicula.genero,
      url_poster: pelicula.imagenUrl,
      estado: pelicula.estado !== undefined ? pelicula.estado : true
    };

    return from(
      supabase
        .from(this.TABLE_NAME)
        .insert([peliculaData])
        .select()
    ).pipe(
      map((response: PostgrestResponse<DBPelicula>) => {
        if (response.error) {
          throw new Error(`Error al agregar película: ${response.error.message}`);
        }
        const dbPelicula = response.data?.[0];
        if (!dbPelicula) {
          throw new Error('No se recibieron datos de la película guardada');
        }
        // Mapear la respuesta al formato de la aplicación
        return {
          id: dbPelicula.pelicula_id,
          titulo: dbPelicula.titulo,
          sinopsis: dbPelicula.sinopsis,
          duracion: dbPelicula.duracion,
          clasificacion: dbPelicula.clasificacion,
          genero: dbPelicula.genero ? dbPelicula.genero.split(',').map(g => g.trim()) : [],
          imagenUrl: dbPelicula.url_poster || 'assets/images/movie-placeholder.jpg',
          estado: dbPelicula.estado
        };
      })
    );
  }
}