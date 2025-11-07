import { Injectable } from '@angular/core';
import { from, Observable, BehaviorSubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { PostgrestResponse, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../../supabase-client';

export interface Usuario {
    usuario_id: number;
    cedula: string;
    rol_id: number;
    nombres: string;
    apellidos: string;
    email: string;
    tipo_usuario: 'trabajador' | 'estudiante';
    password_hash: string;
    // No existe fecha_creacion en el schema
}

export interface UsuarioCompleto extends Usuario {
    rol?: {
        nombre: string;
        fecha_creacion: string;
    };
    metricas?: {
        total_boletos_comprados: number;
        total_gastado: number;
        asistencias_totales: number;
        ultima_compra?: string;
    };
}

export interface Rol {
    rol_id: number;
    nombre: string;
    fecha_creacion: string;
}

export interface CrearUsuarioData {
    cedula: string;
    nombres: string;
    apellidos: string;
    email: string;
    tipo_usuario: 'trabajador' | 'estudiante';
    password: string;
}

export interface ActualizarUsuarioData {
    cedula?: string;
    nombres?: string;
    apellidos?: string;
    email?: string;
    tipo_usuario?: 'trabajador' | 'estudiante';
    rol_id?: number;
}

export interface EstadisticasUsuarios {
    total_usuarios: number;
    total_trabajadores: number;
    total_estudiantes: number;
    usuarios_activos_hoy: number;
    nuevos_usuarios_este_mes: number;
    promedio_compras_por_usuario: number;
    usuario_mas_activo?: string;
}

@Injectable({
    providedIn: 'root'
})
export class UsuarioService {
    private readonly TABLE_NAME = 'usuario';
    private readonly PRIMARY_KEY = 'usuario_id';

    private usuariosSubject = new BehaviorSubject<UsuarioCompleto[]>([]);
    public usuarios$: Observable<UsuarioCompleto[]> = this.usuariosSubject.asObservable();

    private currentUsuarios: UsuarioCompleto[] = [];

    constructor() {
        this.fetchInitialDataAndSubscribe();
    }

    

    private fetchInitialDataAndSubscribe(): void {
        this.getUsuariosCompletos().subscribe(
            initialList => {
                this.currentUsuarios = initialList;
                this.usuariosSubject.next(this.currentUsuarios);
                this.subscribeToRealtimeChanges();
            },
            error => {
                console.error('Error al cargar datos iniciales de Usuarios:', error);
            }
        );
    }

    private subscribeToRealtimeChanges(): void {
        supabase
            .channel(`public:${this.TABLE_NAME}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: this.TABLE_NAME },
                (payload: RealtimePostgresChangesPayload<Usuario>) => {
                    const newRecord = payload.new as Usuario | null;
                    const oldRecord = payload.old as Usuario | null;

                    const affectedId = newRecord?.usuario_id ?? oldRecord?.usuario_id ?? 'N/A';
                    console.log(`[Realtime Usuarios] Evento: ${payload.eventType}, ID afectado: ${affectedId}`);

                    this.getUsuariosCompletos().subscribe(
                        updatedList => {
                            this.currentUsuarios = updatedList;
                            this.usuariosSubject.next(this.currentUsuarios);
                        },
                        error => console.error('Error al recargar la lista de Usuarios en Realtime:', error)
                    );
                }
            )
            .subscribe();
    }

    // Obtener todos los usuarios con información completa y métricas
    getUsuariosCompletos(): Observable<UsuarioCompleto[]> {
        const promise = supabase
            .from(this.TABLE_NAME)
            .select(`
        *,
        rol:rol_id(
          nombre,
          fecha_creacion 
        )
      `)
            // CORRECCIÓN: Eliminar ordenamiento por fecha_creacion que no existe
            .order('usuario_id', { ascending: false });

        return from(promise).pipe(
            switchMap((response: PostgrestResponse<any>) => {
                if (response.error) {
                    throw new Error(response.error.message);
                }

                // Para cada usuario, obtener métricas
                const usuariosConMetricas = response.data?.map(async (usuario: any) => {
                    const metricas = await this.obtenerMetricasUsuario(usuario.usuario_id);
                    return {
                        ...usuario,
                        metricas
                    };
                }) || [];

                return from(Promise.all(usuariosConMetricas));
            })
        );
    }

    // Obtener métricas para un usuario específico
    private async obtenerMetricasUsuario(usuarioId: number): Promise<any> {
        // Obtener boletos comprados por el usuario
        const { data: boletos, error } = await supabase
            .from('usuario_boleto')
            .select('precio_final, estado_asistencia, fecha_compra')
            .eq('usuario_id', usuarioId);

        if (error) {
            console.error('Error obteniendo métricas del usuario:', error);
            return {
                total_boletos_comprados: 0,
                total_gastado: 0,
                asistencias_totales: 0
            };
        }

        const totalBoletos = boletos?.length || 0;
        const totalGastado = boletos?.reduce((sum, boleto) => sum + boleto.precio_final, 0) || 0;
        const asistenciasTotales = boletos?.filter(b => b.estado_asistencia === 'confirmada').length || 0;

        // Obtener última compra
        const ultimaCompra = boletos && boletos.length > 0
            ? boletos.reduce((latest, boleto) =>
                boleto.fecha_compra > latest ? boleto.fecha_compra : latest,
                boletos[0].fecha_compra
            )
            : undefined;

        return {
            total_boletos_comprados: totalBoletos,
            total_gastado: totalGastado,
            asistencias_totales: asistenciasTotales,
            ultima_compra: ultimaCompra
        };
    }

    // Crear usuario (por defecto como trabajador)
    crearUsuario(usuarioData: CrearUsuarioData): Observable<UsuarioCompleto> {
        // Por defecto, asignamos rol de trabajador (rol_id = 2 asumiendo que 1 es admin, 2 es trabajador)
        const usuarioCompleto = {
            ...usuarioData,
            rol_id: 2, // Rol trabajador por defecto
            password_hash: usuarioData.password // En una app real, esto debería hashearse en el backend
        };

        const promise = supabase
            .from(this.TABLE_NAME)
            .insert(usuarioCompleto)
            .select(`
        *,
        rol:rol_id(
          nombre,
          fecha_creacion
        )
      `)
            .single();

        return from(promise).pipe(
            switchMap(async (response: PostgrestResponse<any>) => {
                if (response.error) {
                    throw new Error(response.error.message);
                }

                // Obtener el usuario creado
                const usuarioCreado = Array.isArray(response.data)
                    ? response.data[0]
                    : response.data;

                // Agregar métricas al usuario creado
                const usuarioConMetricas = await this.agregarMetricasAUsuario(usuarioCreado);

                // Actualizar el BehaviorSubject inmediatamente
                this.currentUsuarios = [usuarioConMetricas, ...this.currentUsuarios];
                this.usuariosSubject.next(this.currentUsuarios);

                return usuarioConMetricas;
            })
        );
    }

    // Crear usuario trabajador (método específico)
    crearUsuarioTrabajador(trabajadorData: Omit<CrearUsuarioData, 'tipo_usuario'>): Observable<UsuarioCompleto> {
        const data: CrearUsuarioData = {
            ...trabajadorData,
            tipo_usuario: 'trabajador'
        };
        return this.crearUsuario(data);
    }

    // Crear usuario estudiante
    crearUsuarioEstudiante(estudianteData: Omit<CrearUsuarioData, 'tipo_usuario'>): Observable<UsuarioCompleto> {
        const data: CrearUsuarioData = {
            ...estudianteData,
            tipo_usuario: 'estudiante'
        };
        return this.crearUsuario(data);
    }

    // Actualizar usuario
    actualizarUsuario(usuarioId: number, usuarioData: ActualizarUsuarioData): Observable<UsuarioCompleto> {
        const promise = supabase
            .from(this.TABLE_NAME)
            .update(usuarioData)
            .eq(this.PRIMARY_KEY, usuarioId)
            .select(`
        *,
        rol:rol_id(
          nombre,
          fecha_creacion
        )
      `)
            .single();

        return from(promise).pipe(
            switchMap(async (response: PostgrestResponse<any>) => {
                if (response.error) {
                    throw new Error(response.error.message);
                }

                const usuarioActualizado = Array.isArray(response.data)
                    ? response.data[0]
                    : response.data;

                // Agregar métricas al usuario actualizado
                const usuarioConMetricas = await this.agregarMetricasAUsuario(usuarioActualizado);

                // Actualizar el BehaviorSubject inmediatamente
                this.currentUsuarios = this.currentUsuarios.map(usuario =>
                    usuario.usuario_id === usuarioId ? usuarioConMetricas : usuario
                );
                this.usuariosSubject.next(this.currentUsuarios);

                return usuarioConMetricas;
            })
        );
    }

    // Eliminar usuario
    eliminarUsuario(usuarioId: number): Observable<void> {
        const promise = supabase
            .from(this.TABLE_NAME)
            .delete()
            .eq(this.PRIMARY_KEY, usuarioId);

        return from(promise).pipe(
            map((response: any) => {
                if (response.error) {
                    throw new Error(response.error.message);
                }

                // Actualizar el BehaviorSubject inmediatamente
                this.currentUsuarios = this.currentUsuarios.filter(u => u.usuario_id !== usuarioId);
                this.usuariosSubject.next(this.currentUsuarios);

                return;
            })
        );
    }

    // Método auxiliar para agregar métricas a un usuario individual
    private async agregarMetricasAUsuario(usuario: any): Promise<UsuarioCompleto> {
        const metricas = await this.obtenerMetricasUsuario(usuario.usuario_id);
        return {
            ...usuario,
            metricas
        };
    }

    // Obtener roles disponibles
    getRoles(): Observable<Rol[]> {
        const promise = supabase
            .from('rol')
            .select('*')
            .order('nombre', { ascending: true });

        return from(promise).pipe(
            map((response: PostgrestResponse<any>) => {
                if (response.error) throw new Error(response.error.message);
                return response.data || [];
            })
        );
    }

    // Obtener estadísticas generales de usuarios
    getEstadisticasUsuarios(): Observable<EstadisticasUsuarios> {
        const hoy = new Date().toISOString().split('T')[0];
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        return from(Promise.all([
            // Total usuarios
            supabase.from(this.TABLE_NAME).select('*', { count: 'exact' }),
            // Total trabajadores
            supabase.from(this.TABLE_NAME).select('*', { count: 'exact' }).eq('tipo_usuario', 'trabajador'),
            // Total estudiantes
            supabase.from(this.TABLE_NAME).select('*', { count: 'exact' }).eq('tipo_usuario', 'estudiante'),
            // Usuarios activos hoy (que compraron boletos hoy)
            supabase.from('usuario_boleto').select('usuario_id', { count: 'exact' })
                .gte('fecha_compra', `${hoy}T00:00:00`)
                .lte('fecha_compra', `${hoy}T23:59:59`),
            // CORRECCIÓN: Eliminar filtro por fecha_creacion que no existe
            supabase.from(this.TABLE_NAME).select('*', { count: 'exact' }),
            // Todas las compras para calcular promedios
            supabase.from('usuario_boleto').select('usuario_id, precio_final')
        ])).pipe(
            map(([totalRes, trabajadoresRes, estudiantesRes, activosRes, nuevosRes, comprasRes]) => {
                const totalUsuarios = totalRes.count || 0;
                const totalTrabajadores = trabajadoresRes.count || 0;
                const totalEstudiantes = estudiantesRes.count || 0;

                // CORRECCIÓN: Acceder correctamente a usuario_id
                const usuariosActivosHoy = new Set(
                    activosRes.data?.map((v: { usuario_id: number }) => v.usuario_id) || []
                ).size;

                // CORRECCIÓN: No podemos calcular nuevos usuarios este mes sin fecha_creacion
                const nuevosUsuariosEsteMes = 0;

                // Calcular promedio de compras por usuario
                const comprasPorUsuario: { [key: number]: number } = {};
                comprasRes.data?.forEach((compra: { usuario_id: number; precio_final: number }) => {
                    comprasPorUsuario[compra.usuario_id] = (comprasPorUsuario[compra.usuario_id] || 0) + 1;
                });

                const promedioCompras = totalUsuarios > 0
                    ? Object.values(comprasPorUsuario).reduce((sum, count) => sum + count, 0) / totalUsuarios
                    : 0;

                // Encontrar usuario más activo
                const usuarioMasActivoId = Object.keys(comprasPorUsuario).reduce((a, b) =>
                    comprasPorUsuario[Number(a)] > comprasPorUsuario[Number(b)] ? a : b, '0'
                );

                return {
                    total_usuarios: totalUsuarios,
                    total_trabajadores: totalTrabajadores,
                    total_estudiantes: totalEstudiantes,
                    usuarios_activos_hoy: usuariosActivosHoy,
                    nuevos_usuarios_este_mes: nuevosUsuariosEsteMes,
                    promedio_compras_por_usuario: Math.round(promedioCompras * 100) / 100,
                    usuario_mas_activo: usuarioMasActivoId !== '0' ? `Usuario #${usuarioMasActivoId}` : undefined
                };
            })
        );
    }

    // Buscar usuarios por término
    buscarUsuarios(termino: string): Observable<UsuarioCompleto[]> {
        const promise = supabase
            .from(this.TABLE_NAME)
            .select(`
        *,
        rol:rol_id(
          nombre,
          fecha_creacion
        )
      `)
            .or(`nombres.ilike.%${termino}%,apellidos.ilike.%${termino}%,email.ilike.%${termino}%,cedula.ilike.%${termino}%`)
            .order('nombres', { ascending: true });

        return from(promise).pipe(
            switchMap((response: PostgrestResponse<any>) => {
                if (response.error) {
                    throw new Error(response.error.message);
                }

                const usuariosConMetricas = response.data?.map(async (usuario: any) => {
                    const metricas = await this.obtenerMetricasUsuario(usuario.usuario_id);
                    return {
                        ...usuario,
                        metricas
                    };
                }) || [];

                return from(Promise.all(usuariosConMetricas));
            })
        );
    }

    // Verificar si email existe
    verificarEmailExistente(email: string): Observable<boolean> {
        const promise = supabase
            .from(this.TABLE_NAME)
            .select('usuario_id')
            .eq('email', email)
            .maybeSingle();

        return from(promise).pipe(
            map((response: any) => {
                return response.data !== null;
            })
        );
    }

    // Verificar si cédula existe
    verificarCedulaExistente(cedula: string): Observable<boolean> {
        const promise = supabase
            .from(this.TABLE_NAME)
            .select('usuario_id')
            .eq('cedula', cedula)
            .maybeSingle();

        return from(promise).pipe(
            map((response: any) => {
                return response.data !== null;
            })
        );
    }

    // Cambiar rol de usuario
    cambiarRolUsuario(usuarioId: number, nuevoRolId: number): Observable<UsuarioCompleto> {
        return this.actualizarUsuario(usuarioId, { rol_id: nuevoRolId });
    }

    // Métodos auxiliares
    formatearNombreCompleto(usuario: Usuario): string {
        return `${usuario.nombres} ${usuario.apellidos}`;
    }

    // Obtener usuario por ID
    getUsuarioById(usuarioId: number): Observable<UsuarioCompleto> {
        const promise = supabase
            .from(this.TABLE_NAME)
            .select(`
        *,
        rol:rol_id(
          nombre,
          fecha_creacion
        )
      `)
            .eq(this.PRIMARY_KEY, usuarioId)
            .single();

        return from(promise).pipe(
            switchMap(async (response: PostgrestResponse<any>) => {
                if (response.error) {
                    throw new Error(response.error.message);
                }

                const usuario = Array.isArray(response.data) 
                    ? response.data[0] 
                    : response.data;
                const metricas = await this.obtenerMetricasUsuario(usuario.usuario_id);

                return {
                    ...usuario,
                    metricas
                };
            })
        );
    }

    
}