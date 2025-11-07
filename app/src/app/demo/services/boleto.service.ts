import { Injectable } from '@angular/core';
import { from, Observable, BehaviorSubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { PostgrestResponse, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../../supabase-client';

export interface BoletoBase {
    boleto_id: number;
    funcion_id: number;
    fecha_reserva: string;
    precio_pagado: number;
    qr: string;
}

export interface BoletoCompleto extends BoletoBase {
    funcion?: {
        fecha_hora_inicio: string;
        fecha_hora_fin: string;
        precio_base: number;
        pelicula_titulo?: string;
        sala_nombre?: string;
        pelicula?: {
            titulo: string;
            duracion: number;
            clasificacion: string;
        };
        sala?: {
            nombre: string;
            capacidad_total: number;
        };
    };
    metricas?: {
        total_vendidos: number;
        ingresos_totales: number;
        asistencias_confirmadas: number;
    };
}

export interface EstadisticasBoletos {
    total_boletos_base: number;
    boletos_vendidos_hoy: number;
    ingresos_totales: number;
    ingresos_hoy: number;
    promedio_precio: number;
    funcion_mas_popular?: string;
    boletos_activos: number;
}

export interface CrearBoletoData {
    funcion_id: number;
    precio_pagado: number;
    qr?: string;
}

@Injectable({
    providedIn: 'root'
})
export class BoletosService {
    private readonly TABLE_NAME = 'boleto';
    private readonly PRIMARY_KEY = 'boleto_id';

    private boletosSubject = new BehaviorSubject<BoletoCompleto[]>([]);
    public boletos$: Observable<BoletoCompleto[]> = this.boletosSubject.asObservable();

    private currentBoletos: BoletoCompleto[] = [];

    constructor() {
        this.fetchInitialDataAndSubscribe();
    }

    private fetchInitialDataAndSubscribe(): void {
        this.getBoletosCompletos().subscribe(
            initialList => {
                this.currentBoletos = initialList;
                this.boletosSubject.next(this.currentBoletos);
                this.subscribeToRealtimeChanges();
            },
            error => {
                console.error('Error al cargar datos iniciales de Boletos:', error);
            }
        );
    }

    private subscribeToRealtimeChanges(): void {
        supabase
            .channel(`public:${this.TABLE_NAME}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: this.TABLE_NAME },
                (payload: RealtimePostgresChangesPayload<BoletoBase>) => {
                    const newRecord = payload.new as BoletoBase | null;
                    const oldRecord = payload.old as BoletoBase | null;

                    const affectedId = newRecord?.boleto_id ?? oldRecord?.boleto_id ?? 'N/A';
                    console.log(`[Realtime Boletos] Evento: ${payload.eventType}, ID afectado: ${affectedId}`);

                    this.getBoletosCompletos().subscribe(
                        updatedList => {
                            this.currentBoletos = updatedList;
                            this.boletosSubject.next(this.currentBoletos);
                        },
                        error => console.error('Error al recargar la lista de Boletos en Realtime:', error)
                    );
                }
            )
            .subscribe();
    }

    // Obtener todos los boletos base con información completa y métricas
    getBoletosCompletos(): Observable<BoletoCompleto[]> {
        const promise = supabase
            .from(this.TABLE_NAME)
            .select(`
        *,
        funcion:funcion_id(
          fecha_hora_inicio,
          fecha_hora_fin,
          precio_base,
          pelicula:pelicula_id(
            titulo,
            duracion,
            clasificacion
          ),
          sala:sala_id(
            nombre,
            capacidad_total
          )
        )
      `)
            .order('fecha_reserva', { ascending: false });

        return from(promise).pipe(
            switchMap((response: PostgrestResponse<any>) => {
                if (response.error) {
                    throw new Error(response.error.message);
                }

                // Para cada boleto, obtener métricas de ventas
                const boletosConMetricas = response.data?.map(async (boleto: any) => {
                    const metricas = await this.obtenerMetricasBoleto(boleto.boleto_id);
                    return {
                        ...boleto,
                        funcion: boleto.funcion ? {
                            ...boleto.funcion,
                            pelicula_titulo: boleto.funcion.pelicula?.titulo,
                            sala_nombre: boleto.funcion.sala?.nombre
                        } : null,
                        metricas
                    };
                }) || [];

                return from(Promise.all(boletosConMetricas));
            })
        );
    }

    // Obtener métricas de ventas para un boleto específico
    private async obtenerMetricasBoleto(boletoId: number): Promise<any> {
        // Contar cuántas veces se ha vendido este boleto
        const { count, error } = await supabase
            .from('usuario_boleto')
            .select('*', { count: 'exact', head: true })
            .eq('boleto_id', boletoId);

        if (error) {
            console.error('Error obteniendo métricas:', error);
            return { total_vendidos: 0, ingresos_totales: 0, asistencias_confirmadas: 0 };
        }

        // Obtener ingresos totales
        const { data: ventas, error: errorVentas } = await supabase
            .from('usuario_boleto')
            .select('precio_final, estado_asistencia')
            .eq('boleto_id', boletoId);

        if (errorVentas) {
            return { total_vendidos: count || 0, ingresos_totales: 0, asistencias_confirmadas: 0 };
        }

        const ingresosTotalesCalculados = ventas?.reduce((sum, venta) => sum + venta.precio_final, 0) || 0;
        const asistenciasConfirmadasCalculadas = ventas?.filter(v => v.estado_asistencia === 'confirmada').length || 0;

        return {
            total_vendidos: count || 0,
            ingresos_totales: ingresosTotalesCalculados,
            asistencias_confirmadas: asistenciasConfirmadasCalculadas
        };
    }

    // CORREGIDO: Crear boleto base (administrador)
    crearBoleto(boletoData: CrearBoletoData): Observable<BoletoCompleto> {
        const boletoCompleto = {
            ...boletoData,
            qr: boletoData.qr || this.generarQRUnico(),
            fecha_reserva: new Date().toISOString()
        };

        const promise = supabase
            .from(this.TABLE_NAME)
            .insert(boletoCompleto)
            .select(`
        *,
        funcion:funcion_id(
          fecha_hora_inicio,
          fecha_hora_fin,
          precio_base,
          pelicula:pelicula_id(
            titulo,
            duracion,
            clasificacion
          ),
          sala:sala_id(
            nombre,
            capacidad_total
          )
        )
      `)
            .single();

        return from(promise).pipe(
            switchMap(async (response: PostgrestResponse<any>) => {
                if (response.error) {
                    throw new Error(response.error.message);
                }

                // Obtener el boleto creado
                const boletoCreado = Array.isArray(response.data) 
                    ? response.data[0] 
                    : response.data;

                // Agregar métricas al boleto creado
                const boletoConMetricas = await this.agregarMetricasABoleto(boletoCreado);

                // ACTUALIZACIÓN CRÍTICA: Actualizar el BehaviorSubject inmediatamente
                this.currentBoletos = [boletoConMetricas, ...this.currentBoletos];
                this.boletosSubject.next(this.currentBoletos);

                return boletoConMetricas;
            })
        );
    }

    // CORREGIDO: Eliminar boleto base
    eliminarBoleto(boletoId: number): Observable<void> {
        const promise = supabase
            .from(this.TABLE_NAME)
            .delete()
            .eq(this.PRIMARY_KEY, boletoId);

        return from(promise).pipe(
            map((response: any) => {
                if (response.error) {
                    throw new Error(response.error.message);
                }

                // ACTUALIZACIÓN CRÍTICA: Actualizar el BehaviorSubject inmediatamente
                this.currentBoletos = this.currentBoletos.filter(b => b.boleto_id !== boletoId);
                this.boletosSubject.next(this.currentBoletos);

                return;
            })
        );
    }

    // Método auxiliar para agregar métricas a un boleto individual
    private async agregarMetricasABoleto(boleto: any): Promise<BoletoCompleto> {
        const metricas = await this.obtenerMetricasBoleto(boleto.boleto_id);

        return {
            ...boleto,
            funcion: boleto.funcion ? {
                ...boleto.funcion,
                pelicula_titulo: boleto.funcion.pelicula?.titulo,
                sala_nombre: boleto.funcion.sala?.nombre
            } : null,
            metricas
        };
    }

    // Obtener estadísticas generales
    getEstadisticasBoletos(): Observable<EstadisticasBoletos> {
        const hoy = new Date().toISOString().split('T')[0];

        return from(Promise.all([
            // Total boletos base
            supabase.from(this.TABLE_NAME).select('*', { count: 'exact' }),
            // Boletos vendidos hoy
            supabase.from('usuario_boleto').select('*', { count: 'exact' })
                .gte('fecha_compra', `${hoy}T00:00:00`)
                .lte('fecha_compra', `${hoy}T23:59:59`),
            // Ingresos totales
            supabase.from('usuario_boleto').select('precio_final'),
            // Boleto más popular
            supabase.from('usuario_boleto').select('boleto_id'),
            // Boletos activos (con ventas)
            supabase.from('usuario_boleto').select('boleto_id', { count: 'exact' })
        ])).pipe(
            map(([totalRes, hoyRes, ingresosRes, boletosRes, activosRes]) => {
                const totalBoletosBase = totalRes.count || 0;
                const boletosVendidosHoy = hoyRes.count || 0;

                const ingresosTotalesCalculados = ingresosRes.data?.reduce((sum, venta) => sum + venta.precio_final, 0) || 0;
                const ingresosHoyCalculados = hoyRes.data?.reduce((sum, venta) => sum + venta.precio_final, 0) || 0;

                const promedioPrecio = totalBoletosBase > 0 ? ingresosTotalesCalculados / totalBoletosBase : 0;
                const boletosActivos = new Set(activosRes.data?.map((v: any) => v.boleto_id) || []).size;

                // Encontrar boleto más popular
                const boletoCounts: { [key: number]: number } = {};
                boletosRes.data?.forEach((venta: any) => {
                    boletoCounts[venta.boleto_id] = (boletoCounts[venta.boleto_id] || 0) + 1;
                });

                const boletoMasPopularId = Object.keys(boletoCounts).reduce((a, b) =>
                    boletoCounts[Number(a)] > boletoCounts[Number(b)] ? a : b, '0'
                );

                return {
                    total_boletos_base: totalBoletosBase,
                    boletos_vendidos_hoy: boletosVendidosHoy,
                    ingresos_totales: ingresosTotalesCalculados,
                    ingresos_hoy: ingresosHoyCalculados,
                    promedio_precio: promedioPrecio,
                    funcion_mas_popular: `Boleto #${boletoMasPopularId}`,
                    boletos_activos: boletosActivos
                };
            })
        );
    }

    // Generar QR único
    private generarQRUnico(): string {
        const timestamp = new Date().getTime();
        const random = Math.random().toString(36).substring(2, 15);
        return btoa(JSON.stringify({ timestamp, random }));
    }

    // Obtener funciones disponibles para crear boletos
    getFuncionesDisponibles(): Observable<any[]> {
        const promise = supabase
            .from('funcion')
            .select(`
        funcion_id,
        fecha_hora_inicio,
        fecha_hora_fin,
        precio_base,
        pelicula:pelicula_id(titulo),
        sala:sala_id(nombre)
      `)
            .gte('fecha_hora_inicio', new Date().toISOString())
            .order('fecha_hora_inicio', { ascending: true });

        return from(promise).pipe(
            map((response: PostgrestResponse<any>) => {
                if (response.error) throw new Error(response.error.message);
                return response.data || [];
            })
        );
    }
}