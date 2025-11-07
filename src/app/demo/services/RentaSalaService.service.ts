import { Injectable } from '@angular/core';
import { from, Observable, BehaviorSubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { PostgrestResponse, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../../supabase-client';

export interface RentaSala {
  renta_id: number;
  sala_id: number;
  usuario_id?: number;
  nombre_evento: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  precio_total: number;
  estado_renta: 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada';
}

export interface RentaSalaCompleta extends RentaSala {
  sala?: {
    nombre: string;
    capacidad_total: number;
    tipo_sala: string;
    estado: string;
  };
  usuario?: {
    nombres: string;
    apellidos: string;
    email: string;
    cedula: string;
  };
  metricas?: {
    duracion_horas: number;
    costo_por_hora: number;
    dias_restantes: number;
  };
}

export interface CrearRentaData {
  sala_id: number;
  usuario_id?: number;
  nombre_evento: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  precio_total: number;
  estado_renta?: 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada';
}

export interface ActualizarRentaData {
  sala_id?: number;
  usuario_id?: number;
  nombre_evento?: string;
  fecha_hora_inicio?: string;
  fecha_hora_fin?: string;
  precio_total?: number;
  estado_renta?: 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada';
}

export interface EstadisticasRentas {
  total_rentas: number;
  rentas_activas: number;
  rentas_pendientes: number;
  ingresos_totales: number;
  ingresos_este_mes: number;
  sala_mas_popular?: string;
  promedio_precio: number;
}

export interface SalaDisponible {
  sala_id: number;
  nombre: string;
  capacidad_total: number;
  tipo_sala: string;
  estado: string;
  disponible: boolean;
  conflictos?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RentaSalaService {
  private readonly TABLE_NAME = 'renta_sala';
  private readonly PRIMARY_KEY = 'renta_id';

  private rentasSubject = new BehaviorSubject<RentaSalaCompleta[]>([]);
  public rentas$: Observable<RentaSalaCompleta[]> = this.rentasSubject.asObservable();

  private currentRentas: RentaSalaCompleta[] = [];

  constructor() {
    this.fetchInitialDataAndSubscribe();
  }

  private fetchInitialDataAndSubscribe(): void {
    this.getRentasCompletas().subscribe(
      initialList => {
        this.currentRentas = initialList;
        this.rentasSubject.next(this.currentRentas);
        this.subscribeToRealtimeChanges();
      },
      error => {
        console.error('Error al cargar datos iniciales de Rentas:', error);
      }
    );
  }

  private subscribeToRealtimeChanges(): void {
    supabase
      .channel(`public:${this.TABLE_NAME}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: this.TABLE_NAME },
        (payload: RealtimePostgresChangesPayload<RentaSala>) => {
          const newRecord = payload.new as RentaSala | null;
          const oldRecord = payload.old as RentaSala | null;

          const affectedId = newRecord?.renta_id ?? oldRecord?.renta_id ?? 'N/A';
          console.log(`[Realtime Rentas] Evento: ${payload.eventType}, ID afectado: ${affectedId}`);

          this.getRentasCompletas().subscribe(
            updatedList => {
              this.currentRentas = updatedList;
              this.rentasSubject.next(this.currentRentas);
            },
            error => console.error('Error al recargar la lista de Rentas en Realtime:', error)
          );
        }
      )
      .subscribe();
  }

  // Obtener todas las rentas con información completa
  getRentasCompletas(): Observable<RentaSalaCompleta[]> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .select(`
        *,
        sala:sala_id(
          nombre,
          capacidad_total,
          tipo_sala,
          estado
        ),
        usuario:usuario_id(
          nombres,
          apellidos,
          email,
          cedula
        )
      `)
      .order('fecha_hora_inicio', { ascending: false });

    return from(promise).pipe(
      switchMap((response: PostgrestResponse<any>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }

        // Para cada renta, obtener métricas
        const rentasConMetricas = response.data?.map(async (renta: any) => {
          const metricas = await this.obtenerMetricasRenta(renta);
          return {
            ...renta,
            metricas
          };
        }) || [];

        return from(Promise.all(rentasConMetricas));
      })
    );
  }

  // Obtener métricas para una renta específica
  private async obtenerMetricasRenta(renta: RentaSala): Promise<any> {
    const inicio = new Date(renta.fecha_hora_inicio);
    const fin = new Date(renta.fecha_hora_fin);
    
    // Calcular duración en horas
    const duracionMs = fin.getTime() - inicio.getTime();
    const duracionHoras = duracionMs / (1000 * 60 * 60);
    
    // Calcular costo por hora
    const costoPorHora = renta.precio_total / duracionHoras;
    
    // Calcular días restantes
    const ahora = new Date();
    const diasRestantes = Math.ceil((inicio.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));

    return {
      duracion_horas: Math.round(duracionHoras * 100) / 100,
      costo_por_hora: Math.round(costoPorHora * 100) / 100,
      dias_restantes: diasRestantes > 0 ? diasRestantes : 0
    };
  }

  // Crear nueva renta
  crearRenta(rentaData: CrearRentaData): Observable<RentaSalaCompleta> {
    const rentaCompleta = {
      ...rentaData,
      estado_renta: rentaData.estado_renta || 'Pendiente'
    };

    const promise = supabase
      .from(this.TABLE_NAME)
      .insert(rentaCompleta)
      .select(`
        *,
        sala:sala_id(
          nombre,
          capacidad_total,
          tipo_sala,
          estado
        ),
        usuario:usuario_id(
          nombres,
          apellidos,
          email,
          cedula
        )
      `)
      .single();

    return from(promise).pipe(
      switchMap(async (response: PostgrestResponse<any>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }

        const rentaCreada = Array.isArray(response.data) 
          ? response.data[0] 
          : response.data;

        // Agregar métricas a la renta creada
        const rentaConMetricas = await this.agregarMetricasARenta(rentaCreada);

        // Actualizar el BehaviorSubject inmediatamente
        this.currentRentas = [rentaConMetricas, ...this.currentRentas];
        this.rentasSubject.next(this.currentRentas);

        return rentaConMetricas;
      })
    );
  }

  // Actualizar renta
  actualizarRenta(rentaId: number, rentaData: ActualizarRentaData): Observable<RentaSalaCompleta> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .update(rentaData)
      .eq(this.PRIMARY_KEY, rentaId)
      .select(`
        *,
        sala:sala_id(
          nombre,
          capacidad_total,
          tipo_sala,
          estado
        ),
        usuario:usuario_id(
          nombres,
          apellidos,
          email,
          cedula
        )
      `)
      .single();

    return from(promise).pipe(
      switchMap(async (response: PostgrestResponse<any>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }

        const rentaActualizada = Array.isArray(response.data) 
          ? response.data[0] 
          : response.data;

        // Agregar métricas a la renta actualizada
        const rentaConMetricas = await this.agregarMetricasARenta(rentaActualizada);

        // Actualizar el BehaviorSubject inmediatamente
        this.currentRentas = this.currentRentas.map(renta =>
          renta.renta_id === rentaId ? rentaConMetricas : renta
        );
        this.rentasSubject.next(this.currentRentas);

        return rentaConMetricas;
      })
    );
  }

  // Eliminar renta
  eliminarRenta(rentaId: number): Observable<void> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .delete()
      .eq(this.PRIMARY_KEY, rentaId);

    return from(promise).pipe(
      map((response: any) => {
        if (response.error) {
          throw new Error(response.error.message);
        }

        // Actualizar el BehaviorSubject inmediatamente
        this.currentRentas = this.currentRentas.filter(r => r.renta_id !== rentaId);
        this.rentasSubject.next(this.currentRentas);

        return;
      })
    );
  }

  // Método auxiliar para agregar métricas a una renta individual
  private async agregarMetricasARenta(renta: any): Promise<RentaSalaCompleta> {
    const metricas = await this.obtenerMetricasRenta(renta);
    return {
      ...renta,
      metricas
    };
  }

  // Obtener salas disponibles para un rango de fechas
  getSalasDisponibles(fechaInicio: string, fechaFin: string): Observable<SalaDisponible[]> {
    return from(Promise.all([
      // Obtener todas las salas
      supabase
        .from('sala')
        .select('*')
        .eq('estado', 'Operativa')
        .order('nombre', { ascending: true }),
      // Obtener rentas que se superponen con el rango de fechas
      supabase
        .from(this.TABLE_NAME)
        .select('sala_id, fecha_hora_inicio, fecha_hora_fin, nombre_evento')
        .or(`estado_renta.eq.Pendiente,estado_renta.eq.Confirmada`)
        .lte('fecha_hora_inicio', fechaFin)
        .gte('fecha_hora_fin', fechaInicio)
    ])).pipe(
      map(([salasRes, rentasRes]) => {
        if (salasRes.error) throw new Error(salasRes.error.message);
        
        const salas = salasRes.data || [];
        const rentasConflictivas = rentasRes.data || [];

        // Verificar disponibilidad para cada sala
        return salas.map(sala => {
          const conflictos = rentasConflictivas
            .filter(renta => renta.sala_id === sala.sala_id)
            .map(renta => 
              `Conflicto con "${renta.nombre_evento}" (${new Date(renta.fecha_hora_inicio).toLocaleString()} - ${new Date(renta.fecha_hora_fin).toLocaleString()})`
            );

          return {
            sala_id: sala.sala_id,
            nombre: sala.nombre,
            capacidad_total: sala.capacidad_total,
            tipo_sala: sala.tipo_sala,
            estado: sala.estado,
            disponible: conflictos.length === 0,
            conflictos: conflictos.length > 0 ? conflictos : undefined
          };
        });
      })
    );
  }

  // Obtener estadísticas generales de rentas
  getEstadisticasRentas(): Observable<EstadisticasRentas> {
    const hoy = new Date().toISOString().split('T')[0];
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    return from(Promise.all([
      // Total rentas
      supabase.from(this.TABLE_NAME).select('*', { count: 'exact' }),
      // Rentas activas (futuras o en curso)
      supabase.from(this.TABLE_NAME).select('*', { count: 'exact' })
        .gte('fecha_hora_fin', new Date().toISOString())
        .or('estado_renta.eq.Pendiente,estado_renta.eq.Confirmada'),
      // Rentas pendientes
      supabase.from(this.TABLE_NAME).select('*', { count: 'exact' })
        .eq('estado_renta', 'Pendiente'),
      // Ingresos totales
      supabase.from(this.TABLE_NAME).select('precio_total'),
      // Ingresos este mes
      supabase.from(this.TABLE_NAME).select('precio_total')
        .gte('fecha_hora_inicio', `${inicioMes}T00:00:00`),
      // Rentas por sala para encontrar la más popular
      supabase.from(this.TABLE_NAME).select('sala_id')
    ])).pipe(
      map(([totalRes, activasRes, pendientesRes, ingresosRes, ingresosMesRes, salasRes]) => {
        const totalRentas = totalRes.count || 0;
        const rentasActivas = activasRes.count || 0;
        const rentasPendientes = pendientesRes.count || 0;

        const ingresosTotales = ingresosRes.data?.reduce((sum, renta) => sum + renta.precio_total, 0) || 0;
        const ingresosEsteMes = ingresosMesRes.data?.reduce((sum, renta) => sum + renta.precio_total, 0) || 0;

        const promedioPrecio = totalRentas > 0 ? ingresosTotales / totalRentas : 0;

        // Encontrar sala más popular
        const salaCounts: { [key: number]: number } = {};
        salasRes.data?.forEach((renta: any) => {
          salaCounts[renta.sala_id] = (salaCounts[renta.sala_id] || 0) + 1;
        });

        const salaMasPopularId = Object.keys(salaCounts).reduce((a, b) =>
          salaCounts[Number(a)] > salaCounts[Number(b)] ? a : b, '0'
        );

        return {
          total_rentas: totalRentas,
          rentas_activas: rentasActivas,
          rentas_pendientes: rentasPendientes,
          ingresos_totales: ingresosTotales,
          ingresos_este_mes: ingresosEsteMes,
          sala_mas_popular: salaMasPopularId !== '0' ? `Sala #${salaMasPopularId}` : undefined,
          promedio_precio: Math.round(promedioPrecio * 100) / 100
        };
      })
    );
  }

  // Cambiar estado de renta
  cambiarEstadoRenta(rentaId: number, nuevoEstado: 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada'): Observable<RentaSalaCompleta> {
    return this.actualizarRenta(rentaId, { estado_renta: nuevoEstado });
  }

  // Verificar disponibilidad de sala
  verificarDisponibilidadSala(salaId: number, fechaInicio: string, fechaFin: string): Observable<boolean> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .select('renta_id')
      .eq('sala_id', salaId)
      .or('estado_renta.eq.Pendiente,estado_renta.eq.Confirmada')
      .lte('fecha_hora_inicio', fechaFin)
      .gte('fecha_hora_fin', fechaInicio)
      .maybeSingle();

    return from(promise).pipe(
      map((response: any) => {
        // Si no encuentra rentas conflictivas, la sala está disponible
        return response.data === null;
      })
    );
  }

  // Buscar rentas por término
  buscarRentas(termino: string): Observable<RentaSalaCompleta[]> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .select(`
        *,
        sala:sala_id(
          nombre,
          capacidad_total,
          tipo_sala,
          estado
        ),
        usuario:usuario_id(
          nombres,
          apellidos,
          email,
          cedula
        )
      `)
      .or(`nombre_evento.ilike.%${termino}%,sala:sala_id(nombre).ilike.%${termino}%,usuario:usuario_id(nombres).ilike.%${termino}%,usuario:usuario_id(apellidos).ilike.%${termino}%`)
      .order('fecha_hora_inicio', { ascending: false });

    return from(promise).pipe(
      switchMap((response: PostgrestResponse<any>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }

        const rentasConMetricas = response.data?.map(async (renta: any) => {
          const metricas = await this.obtenerMetricasRenta(renta);
          return {
            ...renta,
            metricas
          };
        }) || [];

        return from(Promise.all(rentasConMetricas));
      })
    );
  }

  // Obtener renta por ID
  getRentaById(rentaId: number): Observable<RentaSalaCompleta> {
    const promise = supabase
      .from(this.TABLE_NAME)
      .select(`
        *,
        sala:sala_id(
          nombre,
          capacidad_total,
          tipo_sala,
          estado
        ),
        usuario:usuario_id(
          nombres,
          apellidos,
          email,
          cedula
        )
      `)
      .eq(this.PRIMARY_KEY, rentaId)
      .single();

    return from(promise).pipe(
      switchMap(async (response: PostgrestResponse<any>) => {
        if (response.error) {
          throw new Error(response.error.message);
        }

        const renta = Array.isArray(response.data) 
          ? response.data[0] 
          : response.data;
        const metricas = await this.obtenerMetricasRenta(renta);

        return {
          ...renta,
          metricas
        };
      })
    );
  }

  // Métodos auxiliares
  formatearFecha(fechaISO: string): string {
    if (!fechaISO) return 'N/A';
    return new Date(fechaISO).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearPrecio(precio: number): string {
    return `$${precio.toFixed(2)}`;
  }

  // Calcular precio basado en duración y tipo de sala
  calcularPrecio(salaId: number, horas: number, tipoEvento: string): number {
    // Precios base por hora según tipo de sala (puedes ajustar estos valores)
    const preciosBase: { [key: string]: number } = {
      'Estándar': 50,
      'VIP': 100,
      '3D': 75,
      'IMAX': 150
    };

    // Multiplicadores según tipo de evento
    const multiplicadores: { [key: string]: number } = {
      'conferencia': 1.0,
      'fiesta': 1.5,
      'reunión': 1.0,
      'evento_especial': 2.0,
      'otros': 1.2
    };

    // En una implementación real, obtendrías el tipo de sala de la base de datos
    const tipoSala = 'Estándar'; // Por defecto
    const precioBase = preciosBase[tipoSala] || 50;
    const multiplicador = multiplicadores[tipoEvento] || 1.0;

    return precioBase * horas * multiplicador;
  }
}