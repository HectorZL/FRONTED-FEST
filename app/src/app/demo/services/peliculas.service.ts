import { Injectable } from '@angular/core';
import { from, Observable, Subject, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
// Ajuste de ruta: Asumimos que el cliente está un nivel arriba (en src/app/)
import { supabase } from '../../supabase-client'; 
import { PostgrestResponse, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ----------------------------------------------------
// 1. INTERFACE DE LA ENTIDAD (CORREGIDA según las columnas de la tabla)
// ----------------------------------------------------
export interface Pelicula {
  // Las columnas de la base de datos
  pelicula_id: number; // Mapea a pelicula_idnumber
  titulo: string;       // Mapea a titulostring (Usado para el ordenamiento)
  descripcion: string;  // Mapea a stringtext
  duracion: number;     // Mapea a numberinteger
  director: string;     // Mapea a stringcharacter varying
  genero: string;       // Mapea a stringcharacter varying
  poster_url: string;   // Mapea a stringcharacter varying
  is_active: boolean;   // Mapea a booleanboolean
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
        .order('titulo', { ascending: true }) // <-- CORRECCIÓN CLAVE
    ).pipe(
      map((response: PostgrestResponse<Pelicula>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        return response.data || [];
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
        (payload: RealtimePostgresChangesPayload<Pelicula>) => {
        
        // Corrección de tipado estricto (as Pelicula) para acceder a 'id' de forma segura
        const newRecord = payload.new as Pelicula;
        const oldRecord = payload.old as Pelicula;

        // Utilizamos pelicula_id como clave primaria
        const affectedId = newRecord?.pelicula_id ?? oldRecord?.pelicula_id ?? 'N/A';

        console.log('Cambio en tiempo real recibido:', payload.eventType, affectedId);
        
        // Recargar la lista completa después del cambio para mantener la coherencia y el orden
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
   * Método principal para que los componentes se suscriban.
   */
  getListaPeliculas(): Observable<Pelicula[]> {
    return this.peliculas$;
  }
}