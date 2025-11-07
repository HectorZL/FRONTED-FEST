import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../../supabase-client';
import { PostgrestResponse } from '@supabase/supabase-js';

// ----------------------------------------------------
// 1. INTERFACES DE DATOS RAW (DB)
// ----------------------------------------------------

/**
 * Interface que refleja la estructura EXACTA de la vista 'vista_funciones_cartelera'.
 */
interface DBFuncionCartelera {
  funcion_id: number;
  fecha_hora_inicio: string; // Vienen como string de la DB
  fecha_hora_fin: string;
  precio_base: number;
  estado_funcion: string;

  // Película
   pelicula_id: number;
  pelicula_titulo: string;
  pelicula_sinopsis: string;
  pelicula_duracion_min: number;
  pelicula_clasificacion: string;
  pelicula_genero: string;
  pelicula_url_poster: string;
  pelicula_estado_activa: boolean;

  // Sala
  sala_id: number;
  sala_nombre: string;
  tipo_sala: string;
  capacidad_total: number;
}

// ----------------------------------------------------
// 2. INTERFACES PARA LA APLICACIÓN (Exportables)
// ----------------------------------------------------

/**
 * Estructura de datos limpia y procesada para usar en el componente.
 */
export interface FuncionCartelera {
  id: number; // funcion_id
  precio: number;
  inicio: Date; // Convertido a objeto Date
  fin: Date;
  estado: string;

  pelicula: {
    id: number;
    titulo: string;
    sinopsis: string;
    duracionMin: number;
    clasificacion: string;
    generos: string[];
    posterUrl: string;
    estadoActiva: boolean;
  };
  sala: {
    id: number;
    nombre: string;
    tipo: string;
    capacidad: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class FuncionCarteleraService {

  private readonly VIEW_NAME = 'vista_funciones_cartelera';

  constructor() { }

  /**
   * Mapea los datos crudos de la base de datos a un formato limpio para Angular.
   * @param dbData Objeto de la vista de Supabase.
   * @returns Objeto FuncionCartelera limpio.
   */
  private mapDataToApp(dbData: DBFuncionCartelera): FuncionCartelera {
    return {
      id: dbData.funcion_id,
      precio: dbData.precio_base,
      inicio: new Date(dbData.fecha_hora_inicio),
      fin: new Date(dbData.fecha_hora_fin),
      estado: dbData.estado_funcion,

      pelicula: {
        id: dbData.pelicula_id,
        titulo: dbData.pelicula_titulo,
        sinopsis: dbData.pelicula_sinopsis, // MAPEADA CORRECTAMENTE
        duracionMin: dbData.pelicula_duracion_min,
        clasificacion: dbData.pelicula_clasificacion,
        generos: dbData.pelicula_genero ? dbData.pelicula_genero.split(',').map(g => g.trim()) : [],
        posterUrl: dbData.pelicula_url_poster,
        estadoActiva: dbData.pelicula_estado_activa // MAPEADA CORRECTAMENTE
      },

      sala: {
        id: dbData.sala_id,
        nombre: dbData.sala_nombre,
        tipo: dbData.tipo_sala,
        capacidad: dbData.capacidad_total,
      },
    };
  }

  /**
   * Obtiene todas las funciones disponibles para una película específica y en el futuro.
   * @param peliculaId ID de la película a buscar.
   * @returns Observable con la lista de funciones.
   */
  getFuncionesByPelicula(peliculaId: number): Observable<FuncionCartelera[]> {
    const now = new Date().toISOString();

    return from(
      supabase
        .from(this.VIEW_NAME)
        .select('*')
        .eq('pelicula_id', peliculaId)
        .gte('fecha_hora_inicio', now)
        .order('fecha_hora_inicio', { ascending: true })
    ).pipe(
      map((response: PostgrestResponse<DBFuncionCartelera>) => {
        if (response.error) {
          throw new Error(`Error al cargar funciones: ${response.error.message}`);
        }

        return (response.data || []).map(dbData => this.mapDataToApp(dbData));
      })
    );
  }

  /**
   * Obtiene TODAS las funciones disponibles (nuevo método)
   * @returns Observable con todas las funciones
   */
  getAllFunciones(): Observable<FuncionCartelera[]> {
    const now = new Date().toISOString();

    return from(
      supabase
        .from(this.VIEW_NAME)
        .select('*')
        .gte('fecha_hora_inicio', now)
        .order('fecha_hora_inicio', { ascending: true })
    ).pipe(
      map((response: PostgrestResponse<DBFuncionCartelera>) => {
        if (response.error) {
          throw new Error(`Error al cargar funciones: ${response.error.message}`);
        }

        return (response.data || []).map(dbData => this.mapDataToApp(dbData));
      })
    );
  }

  /**
   * Obtiene todos los detalles de una única película a partir de la vista.
   * @param peliculaId ID de la película.
   * @returns Observable con los detalles de la película y sus funciones.
   */
  getPeliculaDetails(peliculaId: number): Observable<FuncionCartelera | undefined> {
    return from(
        supabase
          .from(this.VIEW_NAME)
          .select('*')
          .eq('pelicula_id', peliculaId)
          .limit(1)
    ).pipe(
        map((response: PostgrestResponse<DBFuncionCartelera>) => {
            if (response.error) {
                console.error("Error al obtener detalles de la película:", response.error);
                return undefined;
            }
            if (!response.data || response.data.length === 0) {
                return undefined;
            }
            return this.mapDataToApp(response.data[0]);
        })
    );
  }

  /**
 * Obtiene TODAS las películas disponibles (sin filtrar por fecha)
 * @returns Observable con todas las películas únicas
 */
getAllPeliculas(): Observable<FuncionCartelera[]> {
  return from(
    supabase
      .from(this.VIEW_NAME)
      .select('*')
      .order('pelicula_titulo', { ascending: true })
  ).pipe(
    map((response: PostgrestResponse<DBFuncionCartelera>) => {
      if (response.error) {
        throw new Error(`Error al cargar películas: ${response.error.message}`);
      }

      // Filtrar películas únicas
      const peliculasUnicas = (response.data || []).reduce((unique: DBFuncionCartelera[], item) => {
        if (!unique.find(p => p.pelicula_id === item.pelicula_id)) {
          unique.push(item);
        }
        return unique;
      }, []);

      return peliculasUnicas.map(dbData => this.mapDataToApp(dbData));
    })
  );
}

/**
 * Obtiene todas las funciones futuras para el carrusel
 * @returns Observable con funciones futuras
 */
getFuncionesFuturas(): Observable<FuncionCartelera[]> {
  const now = new Date().toISOString();

  return from(
    supabase
      .from(this.VIEW_NAME)
      .select('*')
      .gte('fecha_hora_inicio', now)
      .order('fecha_hora_inicio', { ascending: true })
  ).pipe(
    map((response: PostgrestResponse<DBFuncionCartelera>) => {
      if (response.error) {
        throw new Error(`Error al cargar funciones futuras: ${response.error.message}`);
      }
      return (response.data || []).map(dbData => this.mapDataToApp(dbData));
    })
  );
}
}
